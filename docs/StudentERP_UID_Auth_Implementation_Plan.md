# StudentERP – UID-Based Authentication Implementation Plan

## 1. Goal

Replace email/phone login for Students and Faculty with a **UID + admin-generated password** system, built on top of Firebase Auth (not a custom auth system), with:

- No email or phone required to log in.
- Password auto-generated at enrollment from name + date of birth.
- Self-service password recovery via phone OTP (phone collected only for this purpose, never shown as a login field).
- In-dashboard password change with current/new/confirm-new fields.

This plan combines the Firebase architecture (custom-ID-to-internal-email mapping) with the enrollment/recovery/change-password feature set into one buildable sequence.

---

## 2. Core Architecture Decision

Firebase Auth requires an internal unique identifier (normally email), but the user never needs to see it. Each account is created with a **synthetic internal email derived from the custom UID**:

```
Custom UID (e.g. "STU00123")  →  internal email: "stu00123@studenterp.internal"
```

This keeps Firebase Auth's built-in protections (password hashing, brute-force rate limiting, session/refresh token handling, revocation) while the user-facing login screen only ever shows **UID** and **Password** fields.

`@studenterp.internal` is an arbitrary domain you don't own — Firebase never sends real mail to it, so it doesn't need to be deliverable (leave email verification disabled).

---

## 3. Data Model

### 3.1 Enrollment fields (Student & Faculty forms)

| Field | Purpose |
|---|---|
| Custom UID | Globally unique across Students + Faculty (from the earlier uniqueness-check plan) |
| First Name | Used in password generation + display |
| Last Name | Display only |
| Date of Birth | Used in password generation |
| Phone Number | **Recovery only** — never a login credential, never shown on the login screen |
| Photo | Uploaded file, optional — no auto-generated placeholder photos |

### 3.2 Firestore documents

```text
students/{customId}
  authUid          → Firebase Auth uid (system-generated, internal linkage)
  customId
  firstName
  lastName
  dob
  phone            → recovery-only, store, don't expose in student-facing UI lists
  photoUrl          → null until admin/student uploads a real photo
  createdAt

faculty/{customId}
  (same shape)

member_ids/{customId}   ← central uniqueness lock, written inside a transaction
  role: "student" | "faculty"
  reservedAt
```

---

## 4. Password Generation Rule

Define this precisely before implementation — ambiguity here is the most common source of "admin can't log a student in" bugs.

```text
password = lowercase(first 4 letters of First Name, or all letters if name < 4 chars)
           + DOB formatted as DDMM

Example: First Name "Ananya", DOB 14-03-2010 → "anan1403"
Example: First Name "Al", DOB 02-11-2011     → "al0211"   (name < 4 letters: use full name)
```

- Strip non-alphabetic characters from the name portion before truncating (e.g. hyphenated names).
- No separators between name-part and DOB-part (matches the example format above) — confirm this with whoever reviews the UX, since it affects what the admin communicates to first-time users.
- This generated password is a **default/temporary** password only — see §7 for forcing a change on first login.

---

## 5. Enrollment Flow (Admin creates the account) — server-side only

Must run through the **Firebase Admin SDK**, never the client SDK, since the admin is creating an account on someone else's behalf.

```ts
// server: /api/enroll-student (API route or Cloud Function)
import { getAuth } from "firebase-admin/auth";
import { db, FieldValue } from "./firebase-admin";

async function enrollStudent(input: {
  customId: string;
  firstName: string;
  lastName: string;
  dob: string;        // "YYYY-MM-DD"
  phone: string;
  photoUrl?: string | null;
}) {
  const internalEmail = `${input.customId.toLowerCase()}@studenterp.internal`;
  const password = generateDefaultPassword(input.firstName, input.dob);

  // 1. Reserve the custom ID first, inside a transaction, so two
  //    simultaneous enrollments can never collide on the same ID.
  await db.runTransaction(async (tx) => {
    const ref = db.collection("member_ids").doc(input.customId);
    const existing = await tx.get(ref);
    if (existing.exists) {
      throw new Error("This ID is already in use.");
    }
    tx.set(ref, { role: "student", reservedAt: FieldValue.serverTimestamp() });
  });

  // 2. Create the Firebase Auth user
  const userRecord = await getAuth().createUser({
    email: internalEmail,
    password,
    displayName: `${input.firstName} ${input.lastName}`,
  });

  // 3. Custom claims: role, customId, and a forced-reset flag
  await getAuth().setCustomUserClaims(userRecord.uid, {
    role: "student",
    customId: input.customId,
    mustChangePassword: true,
  });

  // 4. Firestore record, keyed by the custom ID (not the Auth uid)
  await db.collection("students").doc(input.customId).set({
    authUid: userRecord.uid,
    customId: input.customId,
    firstName: input.firstName,
    lastName: input.lastName,
    dob: input.dob,
    phone: input.phone,
    photoUrl: input.photoUrl ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { customId: input.customId, temporaryPassword: password };
}
```

Return the temporary password to the admin's screen once, clearly labeled "share this with the student — it won't be shown again," rather than storing/displaying it anywhere else afterward.

**Acceptance criteria:** duplicate `customId` submissions are rejected with a clear error; two enrollments submitted at nearly the same instant with the same ID cannot both succeed (verify with a concurrency test, not just a manual click test).

---

## 6. Login Flow (Student/Faculty types UID + Password)

Client-side, with one lookup step before calling Firebase Auth:

```ts
async function loginWithCustomId(customId: string, password: string) {
  const internalEmail = `${customId.toLowerCase()}@studenterp.internal`;

  const userCredential = await signInWithEmailAndPassword(auth, internalEmail, password);

  const idTokenResult = await userCredential.user.getIdTokenResult();
  if (idTokenResult.claims.mustChangePassword) {
    router.push("/first-login-password-reset");
  } else {
    router.push(`/${idTokenResult.claims.role}`); // /student or /faculty
  }
}
```

Login screen shows **only** "UID" and "Password" fields — no email/phone field anywhere on this screen.

**Acceptance criteria:** wrong password is rejected with Firebase's standard rate-limiting kicking in after repeated failures; non-existent UID gives the same generic error as a wrong password (don't reveal whether a UID exists via a different error message — this prevents UID enumeration).

---

## 7. Forced Password Change (First Login)

Any account with `mustChangePassword: true` is redirected straight to a reset screen before reaching the dashboard. This reuses the same three-field form as §9 (Change Password), except "Current Password" is the auto-generated one they just logged in with. On success:

```ts
await getAuth().setCustomUserClaims(uid, { ...existingClaims, mustChangePassword: false });
```

---

## 8. Forgot Password — Phone OTP Recovery

Phone number is collected at enrollment **solely** for this flow — never displayed to other users, never usable as a login field.

### Flow

```text
1. User clicks "Forgot Password?" on the login screen.
2. User enters their UID (not phone number — phone stays looked up
   internally, so the UI never reveals which UID maps to which number).
3. Server looks up the phone number on file for that UID and sends an OTP.
4. User enters the OTP.
5. On correct OTP: user sets New Password + Confirm New Password.
6. Password is updated via Admin SDK; mustChangePassword is left false
   (this is a deliberate reset, not a first login); user is sent to
   the normal login screen to sign in with the new password.
```

### Implementation choice: two viable approaches — pick one before building

**Option A — Firebase Phone Auth as a verification bridge**
Use Firebase's built-in Phone Auth to verify the OTP in a throwaway client-side auth session, then use the Admin SDK server-side to reset the *actual* account's password once verified. Pros: no separate SMS provider/billing setup, reuses Firebase infrastructure. Cons: Phone Auth is designed for *login*, so bridging it to "verify identity, then reset a different account" needs a small custom Cloud Function to validate the phone-auth token server-side before touching the real account.

**Option B — Custom SMS OTP (Twilio, MSG91, etc.)**
Generate a 6-digit OTP server-side, store it in Firestore with a short expiry (e.g. `otp_requests/{customId}` with `code`, `expiresAt`, `attempts`), send via your SMS provider's API, and verify manually against Firestore before calling the Admin SDK to reset the password. Pros: more direct control over expiry/attempt-limiting/costs; not force-fitting a login-oriented API into a recovery flow. Cons: another vendor/API key to manage.

**Recommendation:** Option B is usually cleaner for this specific "verify identity, then admin-reset" use case, since it avoids the awkward bridge in Option A. Confirm which one before implementation — this is a meaningful branch point, not a detail to leave implicit.

### Guardrails (required regardless of which option is chosen)

```text
- Rate-limit OTP requests per UID and per IP (e.g. max 3 requests / 15 min).
  UIDs are a known, guessable format (STU00123, STU00124...) — without
  rate limiting, this endpoint becomes an SMS-cost-draining attack surface.
- OTP expires quickly (5–10 minutes) and is single-use.
- Cap OTP verification attempts (e.g. 5 wrong tries locks the request,
  requiring a fresh OTP).
- Never reveal in the response whether a given UID exists or has a
  phone on file — respond identically either way ("If this ID exists,
  an OTP has been sent") to prevent UID/phone-number enumeration.
```

**Acceptance criteria:** an attacker who doesn't know the phone number on file cannot brute-force the OTP within its validity window (test with the rate limits in place); repeated OTP requests for the same UID are throttled.

---

## 9. Change Password (Logged-in Dashboard)

Same UI in both Student and Faculty dashboards:

| Field | Validation |
|---|---|
| Current Password | Must re-authenticate against Firebase Auth before allowing a change (`reauthenticateWithCredential`) |
| New Password | Minimum strength rule (length + not identical to current) |
| Confirm New Password | Must exactly match New Password |

```ts
async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser!;
  const internalEmail = user.email!; // the synthetic internal email
  const credential = EmailAuthProvider.credential(internalEmail, currentPassword);

  // Re-authenticate: proves they actually know the current password,
  // not just that they have a valid active session.
  await reauthenticateWithCredential(user, credential);

  await updatePassword(user, newPassword);

  // Optional but recommended: invalidate other active sessions
  await getAuth().revokeRefreshTokens(user.uid); // server-side, via Admin SDK endpoint
}
```

**Acceptance criteria:** wrong "Current Password" is rejected before any change is made; mismatched New/Confirm fields are caught client-side before submission; after a successful change, previously active sessions on other devices are signed out (verify by checking a second logged-in session gets invalidated).

---

## 10. Security Summary (applies across §6–9)

```text
- Firebase Auth still owns password hashing, brute-force protection,
  and token issuance — none of this is custom crypto.
- UID enumeration is prevented by using identical, generic error/response
  messages regardless of whether the UID or phone exists.
- OTP recovery is rate-limited per UID and per IP.
- Every password-set path (enrollment, forced first-login reset,
  self-service OTP reset, dashboard change) ends in the same state:
  a real Firebase Auth password the user alone knows.
- Firestore Security Rules are unaffected by this change — rules still
  key off request.auth.uid (the real Firebase Auth uid), with customId
  available via custom claims if a rule needs to check it.
```

---

## 11. Build Order

```text
1. Central member_ids collection + transactional uniqueness check
2. Enrollment API (Admin SDK): creates Auth user + Firestore record + claims
3. Login screen: UID + Password → internal-email translation → sign in
4. Forced first-login password reset screen
5. Dashboard "Change Password" (current/new/confirm)
6. Forgot-password OTP flow (pick Option A or B first)
7. Rate limiting + enumeration-safe responses on the OTP endpoint
8. End-to-end test pass: enrollment → first login → forced reset →
   normal login → dashboard password change → forgot-password recovery
```

---

## 12. Open Decisions Before Implementation

1. **OTP approach** — Firebase Phone Auth bridge (Option A) vs. custom SMS OTP (Option B, recommended). This determines whether you need an SMS provider account/billing set up.
2. **Password-part separator** — confirm `first4+DDMM` with no separator matches what should be communicated to first-time users (e.g. printed on an ID card or welcome slip).
3. **Session invalidation on password change** — confirm revoking other sessions on every change is desired (it is standard practice, but worth confirming it doesn't conflict with any "stay logged in on this device" expectation).
