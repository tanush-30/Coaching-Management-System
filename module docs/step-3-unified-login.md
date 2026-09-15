# Step 3 — Unified Login with Role-Based Redirect

**Goal:** Provide one public login entry point that routes users to the correct portal by role — the UX layer Option 1 is really about.

**Depends on:** Step 1 (role verification), Step 2 (rate limiting) — this step is UX built on top of both, not a replacement for either.

---

## 3.1 Single Public Entry Point

- Public site shows one generic login form at `/login`.
- No visible "Admin" tab, button, or link anywhere in the public UI.

## 3.2 Redirect Logic

```ts
// After successful auth + token verification:
switch (decodedToken.role) {
  case 'admin':
    redirect('/admin/dashboard');
    break;
  case 'teacher':
    redirect('/faculty/dashboard');
    break;
  case 'student':
  case 'parent':
    redirect('/portal/dashboard');
    break;
  default:
    redirect('/unauthorized');
}
```

- The redirect decision must be made **server-side**, after token verification — not client-side based on a role value trusted from the login response body alone.
- Re-verify the token before redirecting; don't just trust whatever the login call returned to the client.

## 3.3 Post-Redirect Guard

- Every admin page under `/admin/*` independently re-checks the role via the Step 1 middleware on load.
- The redirect from `/login` is a convenience, not a security boundary — someone bookmarking `/admin/dashboard` and visiting it directly must hit the exact same check as someone arriving via redirect.

---

## Deliverable for This Step

- Single `/login` route live, with no admin-specific UI exposed publicly
- Server-side redirect by role, re-verified against the token rather than trusted from client state
- Every admin route independently guarded, not just the login redirect path

This unblocks Step 4 (404 cloaking), which further hardens the same `/admin/*` routes this step now redirects into.
