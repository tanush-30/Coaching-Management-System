# Step 2 — Rate Limiting & Account Lockout

**Goal:** Protect the login endpoint itself from brute-force and credential-stuffing attempts, regardless of which URL it lives at.

**Depends on:** Step 1 (role verification in place — this step hardens the same endpoint)

---

## 2.1 Rate Limiting

- Apply per-IP and per-account rate limits on the login endpoint — e.g., via Firebase App Check + Cloud Functions rate limiting, or an API gateway rule.
- Suggested starting point: 5 failed attempts per account per 15 minutes; adjust based on real usage patterns once live.

## 2.2 Account Lockout / Backoff

- After repeated failures, apply exponential backoff or a temporary lockout on that account.
- Provide a recovery path for legitimate users who get locked out — e.g., an email-based reset/unlock link.
- Log failed attempts with timestamp + IP for later review. This data matters more for admin accounts than any other role, since they're the highest-value target.

## 2.3 Monitoring Admin Accounts Specifically

- Flag repeated failed attempts on admin-role accounts for closer/faster review than standard user accounts — a lockout on a student account is routine; a lockout pattern on an admin account may indicate a targeted attempt.

---

## Deliverable for This Step

- Rate limiting active on the login endpoint
- Lockout/backoff behavior tested with repeated bad credentials
- Failed-attempt logging in place, with admin accounts flagged for closer monitoring

This unblocks Step 3 (unified login UX), which sits on top of an endpoint that's now both authorization-checked and abuse-resistant.
