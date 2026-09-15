# Step 4 — 404 Cloaking on Unauthorized `/admin` Access

**Goal:** Prevent outsiders from confirming the admin route even exists. Cheap to add, worth doing — but only after Steps 1–3 are solid, since this stops *enumeration*, not authentication bypass.

**Depends on:** Step 1 (role verification middleware), Step 3 (admin routes defined and guarded)

---

## 4.1 Middleware Behavior

- Unauthenticated or non-admin request to any `/admin/*` route → return a standard **404**, not a 401/403 or a visible "you don't have access" page.
- Reasoning: a 403 confirms the route exists (you're just not allowed in). A 404 gives an attacker no information either way.

```ts
// middleware.ts
export async function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value;
  const decoded = token ? await verifyIdToken(token) : null;

  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.rewrite(new URL('/404', req.url));
    }
  }
  return NextResponse.next();
}
```

## 4.2 Consistency Check

- Make sure the cloaked 404 is indistinguishable from a genuine 404 — same page, same headers, and as close to the same response time as possible.
- A slow, custom-rendered fake 404 can itself leak that something's being deliberately hidden, via timing analysis.

## 4.3 What This Does and Doesn't Do

- **Does:** stop a casual visitor or scanner from confirming `/admin` exists.
- **Doesn't:** replace authentication or authorization. If Step 1's role check has a bug, cloaking the response won't save you — it only hides the door, it doesn't lock it.

---

## Deliverable for This Step

- `/admin/*` returns a genuine-looking 404 to unauthorized requests
- Verified that no headers, timing, or content differences give away the route's existence

This unblocks Step 5 (MFA), the final hardening layer for the accounts these routes protect.
