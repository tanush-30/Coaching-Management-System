# Step 1 — Server-Side Role Verification (Foundation)

**Goal:** Establish the actual security boundary. This is the control everything else in the plan depends on — if this step is weak, nothing built on top of it matters.

---

## 1.1 Custom Claims Setup (Firebase example)

Set a **custom claim** on the auth token at user creation or role assignment — never a Firestore field the client reads and trusts:

```ts
await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

- Client-side role checks (e.g., "show the admin menu") are **UX only**. A user can edit client state, but they cannot forge a signed token — so the real check must always happen server-side.

## 1.2 Verify on Every Admin Request

**Firestore rules:**
```js
function isAdmin() {
  return request.auth != null && request.auth.token.role == 'admin';
}
match /adminOnlyCollection/{doc} {
  allow read, write: if isAdmin();
}
```

**Next.js middleware / API routes:** decode and verify the ID token server-side on every request to an admin route or admin API — never trust a cookie flag or client header claiming "I'm an admin."

```ts
const decodedToken = await admin.auth().verifyIdToken(idToken);
if (decodedToken.role !== 'admin') {
  return new Response('Not found', { status: 404 }); // see Step 4
}
```

## 1.3 Token Freshness

- Custom claims are embedded in the ID token at issue time. If a role is revoked, the old token stays valid until refresh.
- Force a token refresh (or use short expiry + refresh cycle) when a role changes, so a de-provisioned admin can't keep using a stale token.

---

## Deliverable for This Step

- Custom claims implemented for `admin` / `teacher` / `student` / `parent`
- Firestore rules and all admin API routes verify the claim server-side
- Role revocation triggers a token refresh, not just a DB flag change

This unblocks Step 2 (rate limiting), which protects the same login endpoint this step secures.
