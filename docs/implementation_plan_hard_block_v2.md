# Role-Gated Login with Server-Side Hard Block Enforcement — v2 (Hardened)

## Changes from v1
- Removed the separate `apex_role` cookie — role is decoded server-side from the signed
  `apex_session` cookie only, closing a reintroduced spoofing gap.
- Added rate limiting / lockout to prevent brute-force role-probing across the 4 login routes.
- Replaced role-revealing rejection messages with a generic message that doesn't confirm account
  existence or leak the account's actual role.
- Added explicit handling for accounts with no claims set yet.
- Extended hard-block enforcement to the Phone OTP flow, not just email/password.
- Added audit logging of repeated mismatch attempts per account.
- Added `/login/[role]` param validation and CSRF/replay protection on the session endpoint.

---

## 1. Overview
Replace the generic login screen with a role-selector portal at `/login` with 4 role doorways:
1. **Enter as Admin** (`/login/admin`)
2. **Enter as Teacher** (`/login/teacher`)
3. **Enter as Student** (`/login/student`)
4. **Enter as Parent** (`/login/parent`)

Each route presents a role-specific login form. Authentication enforces **server-side hard-block
verification** — the only enforcement that actually matters. The client-side check exists purely
for fast UX feedback and must never be treated as a security boundary.

- **Server-Side Hard Block (`/api/auth/session-login`)**: Admin SDK verifies the ID token,
  resolves custom claims, and validates `claims.role === expectedRole`.
  - **Mismatch** → `403 Forbidden`, no session cookie issued, client signs out
    (`auth.signOut()`), generic rejection message shown.
  - **No claims set** → `403 Forbidden` with a distinct "account not yet configured" message,
    directing the user to contact the admin — not treated the same as a wrong-role mismatch.
  - **Match** → server issues one signed session cookie and the client redirects into the
    matching dashboard (`/admin`, `/teacher`, `/student`, `/parent`).

---

## 2. Proposed Architecture & Changes

### A. Role Selector Portal — `src/app/login/page.tsx`
- 4 persona cards (Admin / Teacher / Student / Parent) with role-specific styling and direct
  buttons routing to `/login/[role]`.

### B. Dedicated Role Login Forms — `src/app/login/[role]/page.tsx`
- **Validate the `role` param on load** against the fixed set `['admin','teacher','student','parent']`.
  Any other value → `notFound()` (404), not a broken/blank form.
- Role-customized branding and helper text.
- Supports Email/Password and Phone OTP — **both** flows funnel into the same
  `session-login` verification step once an ID token exists; OTP is not a separate/weaker path.
- Phone OTP request step includes reCAPTCHA (already required by Firebase) plus a server-side
  per-number rate limit (e.g., max 5 OTP requests / hour) to prevent SMS-cost abuse.
- Displays a **generic rejection banner** on mismatch (see error copy below) — does not reveal
  which role the account actually belongs to.
- After 5 consecutive failed attempts (auth failure or role mismatch combined) on the same login
  route within 15 minutes, disables the form client-side with a cooldown timer; server enforces
  the real lockout regardless of client state (see D).

### C. Server-Side Session & Role Gating API — `src/app/api/auth/session-login/route.ts`
- Accepts `{ idToken, expectedRole }`.
- **CSRF/replay protection**: requires a fresh token (checked via Firebase's `auth_time` /
  `iat` claim being recent), and the route only accepts same-origin requests
  (`sameSite=strict` cookie + explicit origin check).
- Verifies token via `adminAuth.verifyIdToken(idToken, checkRevoked=true)`.
- Resolves `role` from custom claims (source of truth — not the `user_roles` Firestore doc, which
  is display-only backup).
- **Three outcomes:**
  1. No claims / no role on the account → `403`, code `ROLE_NOT_CONFIGURED`, generic
     "Your account isn't fully set up yet — please contact your administrator" message. Also
     logged for admin follow-up.
  2. `claims.role !== expectedRole` → `403`, code `ROLE_MISMATCH`, **generic** message:
     *"We couldn't sign you in here. Please check you're using the correct portal."*
     (Deliberately does not confirm the account exists or state its real role.)
  3. `claims.role === expectedRole` → issues **one** signed session cookie
     (`apex_session`, httpOnly, secure, sameSite=strict) containing the verified role + scope.
     No separate `apex_role` cookie. Redirect target returned to client.
- **Rate limiting / lockout**: per-account and per-IP counters (e.g., Firestore or Redis-backed)
  — after 5 failed attempts (any failure type) in 15 minutes for a given account, hard-lock further
  attempts for that account for 15 minutes and return `429` regardless of credential validity.
  This must be enforced server-side; the client-side cooldown in section B is UX only.
- **Audit logging**: every `ROLE_MISMATCH` and `ROLE_NOT_CONFIGURED` event appended to
  `audit_logs` with `{ uid, attemptedRoute, actualRole (server-only, never returned to client),
  ip, timestamp }`. A pattern of repeated mismatches on one account across sessions is worth
  surfacing to the admin dashboard as a security signal.

### D. Middleware — `src/middleware.ts`
- Reads and verifies the **single signed session cookie** (`apex_session`) — same verification
  logic as the earlier RBAC plan. No plain-text role cookie is read anywhere.
- Role and scope for route-gating are decoded from the verified cookie payload only.

---

## 3. Error Copy (client-facing, deliberately non-revealing)

| Scenario | Message shown |
|---|---|
| Wrong role for this portal | "We couldn't sign you in here. Please check you're using the correct portal." |
| Account has no role configured | "Your account isn't fully set up yet. Please contact your administrator." |
| Too many attempts | "Too many attempts. Please try again in 15 minutes." |
| Invalid credentials (normal auth failure) | Standard Firebase Auth error (unchanged) |

None of these messages should differ in a way that lets an attacker distinguish "wrong password"
from "right password, wrong role" from "account doesn't exist" — keep response timing and wording
consistent across these paths where practical.

---

## 4. Verification Plan

### Automated
- `npx tsc --noEmit` and `npm run build` — zero errors across all routes.
- Emulator/integration tests hitting `session-login` directly (bypassing UI) to confirm:
  - Server-side enforcement holds even with a forged/altered `expectedRole` in the request body.
  - Lockout triggers after the configured failure threshold and resets correctly after cooldown.

### Manual Scenarios
1. **4 Role-Match Successes** — Admin/Teacher/Student/Parent each logging in via their own
   route → single signed session cookie issued → correct dashboard redirect.
2. **12 Role-Mismatch Rejections** — every wrong combination → `403 ROLE_MISMATCH`, no cookie,
   generic message, client signed out, no dashboard shown.
3. **No-claims account** → `403 ROLE_NOT_CONFIGURED`, distinct message, event logged.
4. **Brute-force simulation** — 6 rapid failed attempts on one account → 6th request returns
   `429` before even reaching credential/role checks.
5. **Invalid role param** — visiting `/login/superadmin` or `/login/xyz` → 404, not a blank form.
6. **OTP path parity** — repeat scenario 1 and 2 using Phone OTP instead of email/password;
   same enforcement and messages apply.
7. **Devtools bypass attempt** — call `/api/auth/session-login` directly with a valid Teacher ID
   token but `expectedRole: "admin"` in the body → still hard-blocked (proves server doesn't
   trust the client-supplied `expectedRole` as anything more than a label to check against the
   verified claim).
