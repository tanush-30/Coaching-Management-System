# Implementation Plan: UID-Based Authentication System (v2)

Replace email/phone login for Students and Faculty with a **UID + admin-generated password** system backed by Firebase Auth, with phone-based OTP recovery, forced first-login reset, and in-dashboard password changes.

## What changed from v1

v1 correctly mapped the feature to real files in this codebase — that structure is kept. Added here:
- **Firestore Security Rules** for the new collections (`member_ids`, `otp_requests`) — v1 never specified these, and without them a client could read/write OTP records directly.
- **Explicit scope note**: Admin login is unaffected; only Student/Faculty move to UID auth.
- **Shared constants module** so the internal-email domain and password rule aren't duplicated between client and server code.
- **A flag on `QuickLoginModal`**: adding a "UID tab" to a *public landing page* modal needs a hard constraint spelled out, or it risks becoming a credential-exposure bug.
- **Session revocation** wired into both `verify-and-reset` and `change-password`, not just password update.
- **Enumeration-safe responses** specified for `send-otp` and login (same response whether or not the UID/phone exists).
- **OTP cleanup via Firestore TTL** instead of relying on manual deletion only.
- **Migration note** for any Students/Faculty that may already have email/password accounts under the old system.
- **Concurrency test** for the `member_ids` uniqueness lock, since a manual click-test won't catch a race condition.

## User Review Required
> [!IMPORTANT]
> - **Scope**: Only `student` and `teacher` roles move to UID + password. Admin login keeps email/password — confirm this is correct before the login page changes ship.
> - **Internal Identifier**: `${customId.toLowerCase()}@studenterp.internal`, defined **once** in a shared constants module, imported by both client and server code (not re-derived independently in multiple files, which is how these drift out of sync).
> - **Password Rule**: `lowercase(first 4 letters of First Name, or full name if <4 letters) + DOB as DDMM` (e.g., "Ananya", 14-03-2010 → `anan1403`).
> - **OTP Delivery Provider — decision needed before Section 5 is built**: (a) bridge through Firebase Phone Auth, or (b) a dedicated SMS API (Twilio/MSG91/etc.) with OTPs generated and checked server-side. Recommend (b) — it avoids force-fitting a login-oriented API into a recovery flow and gives direct control over expiry/attempt limits. This choice determines what `send-otp/route.ts` actually calls.
> - **Existing accounts**: if any Student/Faculty already log in with email/password today, this plan needs a migration step (Section 3.1) before their login screen changes — otherwise they're locked out on ship day.

---

## Proposed Changes

### 1. Auth Utilities & Password Generator
#### [NEW] [auth-utils.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/lib/auth-utils.ts)
- `generateDefaultPassword(firstName: string, dob: string): string` — handle names under 4 letters (use full name) and strip non-alphabetic characters before truncating.
- `getInternalEmail(customId: string): string` — single source of truth for the `@studenterp.internal` mapping; both `enroll-member/route.ts` and the login page import this, never redefine it.
- `maskPhoneNumber(phone: string): string`
- `INTERNAL_EMAIL_DOMAIN` exported as a named constant, not inlined as a string literal elsewhere.

**Acceptance criteria:** unit tests cover the password generator for names of length 1–3 (fallback path), names with hyphens/apostrophes, and the standard 4+ letter case.

---

### 2. Admin Enrollment Forms (Student & Faculty)
#### [MODIFY] [AddStudentModal.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/erp/AddStudentModal.tsx)
- Split Name into **First Name** and **Last Name**.
- Require **Date of Birth** (`dob`).
- Custom UID field with **live uniqueness check** (debounced call to a `checkCustomIdAvailable` endpoint) — surface "This ID is already in use" inline before submit, not only as a submit-time failure.
- Live preview of auto-generated temporary password (`anan1403`), using the shared `generateDefaultPassword` util so the preview can never drift from what the server actually generates.
- Show confirmation dialog displaying assigned `UID` and `Default Password` **once**, with a note that it won't be shown again — do not persist or log this plaintext password anywhere after this screen.

#### [MODIFY] [AddTeacherModal.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/erp/AddTeacherModal.tsx)
- Same changes as above, "Faculty UID" labeling.

---

### 3. Server-Side Member Enrollment APIs (Firebase Admin SDK)
#### [NEW] [route.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/api/admin/enroll-member/route.ts)
- Server endpoint using `adminAuth.createUser` with internal email from `getInternalEmail(customId)`.
- Sets custom claims `{ role, customId, mustChangePassword: true }`.
- Transactionally locks `member_ids/{customId}` **before** creating the Auth user — if the transaction fails (ID taken), abort before any Auth/Firestore write happens, so a rejected enrollment never leaves a half-created account.
- Writes student/teacher document in Firestore, keyed by `customId`.

#### 3.1 [NEW] Migration note (if existing email/password accounts exist)
- If Students/Faculty currently have email-based accounts, write a one-time script that: assigns each existing user a `customId`, sets `getInternalEmail(customId)` as a *secondary* internal email is not possible in Firebase Auth (email is the primary key) — so migration means either (a) recreating the Auth account under the internal email and manually notifying the user of their new UID + a fresh temporary password, or (b) keeping legacy accounts on email login via a feature flag until they're individually migrated.
- Decide (a) vs (b) explicitly; don't let this surface as a surprise during rollout. If there are no existing Student/Faculty accounts yet, skip this subsection entirely.

---

### 4. Login Screens & OTP Recovery
#### [MODIFY] [page.tsx (Role Login)](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/login/%5Brole%5D/page.tsx)
- For `student` and `teacher` roles only: remove email/phone mode toggle, show **UID** + **Password** fields. (Admin role login is untouched — see scope note above.)
- Map `customId` → `getInternalEmail(customId)` before `signInWithEmailAndPassword`.
- On auth failure, show one generic message ("Invalid UID or password") regardless of whether the UID doesn't exist or the password is wrong — do not let the error message reveal which case occurred.
- "Forgot Password?" modal, 3 steps: (1) Enter UID, (2) Verify Phone OTP, (3) Set New Password + Confirm New Password.
- Forced first-login password change if `mustChangePassword === true`, reusing the Section 6 modal with "Current Password" pre-understood to be the generated default.

#### [MODIFY] [QuickLoginModal.tsx](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/components/landing/QuickLoginModal.tsx)
- **Constraint to confirm before building this:** this modal lives on the public landing page. A "UID tab for quick student/faculty authentication" must only be a UID **input field that submits to the real login flow** — it must never pre-fill or display any real student/faculty UID or password as a demo/shortcut, since that would expose real credentials publicly. If the intent was a demo-account quick-login (common on marketing landing pages), that demo account must be a dedicated non-real seed account, clearly separate from actual enrolled users.

---

### 5. Server-Side Phone OTP Recovery & Password Change APIs
#### [NEW] [send-otp/route.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/api/auth/forgot-password/send-otp/route.ts)
- Looks up registered phone for the given UID in `students` or `teachers`.
- Enforces rate limiting **per IP and per UID** (e.g. max 3 requests / 15 min) — implement via a counter document (`rate_limits/{key}`) checked/incremented server-side, or an edge middleware if the hosting platform supports it.
- Stores 6-digit OTP in `otp_requests/{customId}` with a 10-minute expiry field, plus an `attempts` counter capped at 5.
- Sends the OTP via the provider chosen in the "User Review Required" section.
- **Response is identical whether or not the UID/phone exists** ("If this ID exists, an OTP has been sent") — prevents UID/phone enumeration via this endpoint.

#### [NEW] [verify-and-reset/route.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/api/auth/forgot-password/verify-and-reset/route.ts)
- Verifies the 6-digit OTP against `otp_requests`, rejecting after 5 failed attempts (forcing a fresh OTP request).
- Updates the user's password in Firebase Auth via `adminAuth.updateUser`.
- Deletes the OTP record and clears `mustChangePassword`.
- Calls `adminAuth.revokeRefreshTokens(uid)` so any other active session is signed out after a recovery reset (a completed OTP reset likely means the account was locked out or compromised — don't leave old sessions alive).

#### [NEW] [change-password/route.ts](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/api/auth/change-password/route.ts)
- Accepts `currentPassword`, `newPassword`, `confirmPassword` from an authenticated session.
- Re-authenticates against the current password before allowing the change.
- Updates password; clears `mustChangePassword` claim.
- Calls `adminAuth.revokeRefreshTokens(uid)` after a successful change, so other logged-in devices are signed out (surface this in the UI: "You've been signed out of other devices").

---

### 6. In-Dashboard Password Change Modals
#### [MODIFY] [page.tsx (Student Portal)](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/student/page.tsx)
- Add "Change Password" modal: `Current Password`, `New Password`, `Confirm New Password`. Client-side check that New and Confirm match before hitting the API; server-side re-verification regardless (never trust client-side match alone).

#### [MODIFY] [page.tsx (Teacher Portal)](file:///c:/Users/bunny/Documents/projects/Coaching%20Management%20System/src/app/teacher/page.tsx)
- Same as above.

---

### 7. Firestore Security Rules (new — not in v1)
#### [MODIFY] `firestore.rules`
```text
member_ids/{id}
  → no client read or write access at all; only the Admin SDK
    (server-side, bypasses rules) touches this collection.

otp_requests/{customId}
  → no client read or write access at all; created, read, and
    deleted exclusively by the send-otp / verify-and-reset server
    routes via the Admin SDK.

students/{customId}, teachers/{customId}
  → phone field must not be readable by any role other than the
    owning user themself and admin — it's recovery-only data, not
    something classmates/other-faculty should see in a general read.
```
Add a rules-unit-test asserting that an authenticated client (any role, including the account owner) cannot read or write `otp_requests` or `member_ids` directly — these must be Admin-SDK-only paths.

#### [NEW] Firestore TTL policy on `otp_requests.expiresAt`
Enable a Firestore TTL policy on this field so expired OTP documents are automatically purged, instead of relying solely on the `verify-and-reset` route to delete them (a request that's never completed would otherwise leave stale OTP documents indefinitely).

---

## Verification Plan

### Automated Checks
- `cmd.exe /c npx tsc --noEmit` — verify 0 TypeScript errors.
- `cmd.exe /c npm run build` — verify successful Next.js build.
- Firestore rules-unit tests for `member_ids` and `otp_requests` (client access must fail).
- Unit tests for `generateDefaultPassword` covering the edge cases in Section 1.

### Functional Verification
1. **Password Generation**: `generateDefaultPassword('Ananya', '2010-03-14')` → `'anan1403'`; also test a name under 4 letters.
2. **Duplicate UID Rejection**: attempt to enroll two students with the same custom UID — second one must fail with a clear error, both via the UI and a direct API call.
3. **Concurrency**: fire two enrollment requests with the same UID at nearly the same time (e.g. `Promise.all`) — exactly one must succeed.
4. **Student & Faculty Enrollment**: verify default password generation and one-time credentials display.
5. **UID Login**: log in with UID + temporary password; verify redirect to forced-reset screen; complete reset; verify redirect to dashboard.
6. **Admin Login Unaffected**: confirm admin login still works via email/password, unchanged.
7. **Phone OTP Recovery**: trigger forgot password for a real UID; confirm OTP delivery; confirm wrong-OTP is rejected up to 5 tries then locks; confirm expired OTP is rejected.
8. **Enumeration Check**: trigger forgot-password for a UID that doesn't exist — response must be identical to a UID that does exist.
9. **In-Dashboard Password Change**: update password with correct current password; verify old sessions are signed out on a second device/session.
10. **QuickLoginModal**: confirm no real student/faculty credentials are pre-filled or visible on the public landing page.
