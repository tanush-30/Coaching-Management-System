# Step 5 — MFA for Admin Accounts

**Goal:** Add the highest-leverage individual account protection for the highest-value target — admin accounts. Not part of the original 4 options, but the strongest addition to the overall plan.

**Depends on:** Step 1 (role claims exist to key MFA enforcement off of)

---

## 5.1 Enforce MFA on Admin Role

- Require a second factor (TOTP authenticator app, or SMS/email OTP as a fallback) specifically for accounts with `role: 'admin'`.
- Firebase Auth supports multi-factor enrollment — enforce it at sign-in for admin-role accounts specifically, rather than making it optional across all users.

## 5.2 Enrollment Flow

- On first admin login (or on promotion of an existing account to admin), require MFA enrollment before granting access to any `/admin` route.
- Block admin dashboard access entirely until enrollment is complete — no "remind me later" path for this role.

## 5.3 Recovery Path

- Provide a secure account-recovery process for admins who lose their second factor (e.g., backup codes issued at enrollment, or a verified manual reset process handled by another admin/super-admin).
- Avoid a recovery flow that itself becomes a bypass — e.g., a "forgot MFA device" flow that only requires the password is a hole in this control.

---

## Deliverable for This Step

- MFA enrollment mandatory and enforced for all admin-role accounts
- No path for an admin account to access `/admin/*` without a verified second factor
- A secure, non-bypassable recovery process for lost MFA devices

---

## Overall Build Order Recap

| Priority | Step | Why This Order |
|---|---|---|
| 1 | Server-side role verification | The actual security boundary — everything else assumes this is solid |
| 2 | Rate limiting & lockout | Protects the login endpoint itself, independent of URL visibility |
| 3 | Unified login + redirect | UX layer — reduces noise, but only as strong as Step 1 underneath it |
| 4 | 404 cloaking | Cheap add-on, stops enumeration, not auth bypass |
| 5 | MFA for admin accounts | Highest-leverage protection for the highest-value target |

This is the final step. With all five in place, the admin login is both hidden from casual discovery and, more importantly, genuinely resistant to anyone who does find it.
