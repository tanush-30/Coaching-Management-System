# Admin Authentication Implementation Plan
### Coaching Management System (Apex ERP) — Next.js 14 + Firebase

---

## Objective

Implement production-grade authentication for the Admin role. Remove any existing bypass, hardcoded admin access, or "demo mode" that allows viewing `/admin` routes without a real login — including for the developer.

---

## Requirements

1. Admin login must go through Firebase Authentication (email/password), same as other roles.
2. On successful login, verify the user's **custom claim** (`role: "admin"`) via Firebase Admin SDK before granting access — role must live in custom claims or a locked Firestore `users` collection, never in client-side state alone.
3. Use **Firebase session cookies** (via Admin SDK, `createSessionCookie`) instead of relying only on client SDK tokens, so `middleware.ts` can verify server-side on every request.
4. Update `src/middleware.ts` to check the session cookie + role claim on every request to `/admin/**` and redirect to `/login` if missing, invalid, or wrong role.
5. Remove any `NODE_ENV === "development"` bypass, mock user, or hardcoded `isAdmin = true` in layout/page/component code.
6. Add a secure logout route that clears the session cookie server-side.
7. Add Firestore Security Rules so admin-only collections reject reads/writes unless `request.auth.token.role == "admin"`.
8. (Optional) Rate-limit login attempts using Firebase App Check or a simple Firestore-backed counter.

---

## Implementation Steps

### 1. Set the Admin Role as a Custom Claim (Server-Side Only)

This must be done via the **Firebase Admin SDK**, never from the client.

```ts
// scripts/setAdminRole.ts (run once, manually, via CLI — not exposed as an API route)
import { adminAuth } from "@/lib/firebase-admin";

async function setAdmin(uid: string) {
  await adminAuth.setCustomUserClaims(uid, { role: "admin" });
}
```

> ⚠️ Never create a public API endpoint that lets anyone set their own claims.

---

### 2. Login Flow — Exchange ID Token for a Session Cookie

```ts
// src/app/api/auth/session/route.ts
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { idToken } = await req.json();

  // Verify token is fresh (avoid replay of stale tokens)
  const decoded = await adminAuth.verifyIdToken(idToken, true);

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

  cookies().set("session", sessionCookie, {
    maxAge: expiresIn / 1000,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return Response.json({ status: "success", role: decoded.role ?? "user" });
}
```

The client-side login page calls Firebase client SDK's `signInWithEmailAndPassword`, retrieves the ID token, then POSTs it to this route.

---

### 3. Logout Route

```ts
// src/app/api/auth/logout/route.ts
import { cookies } from "next/headers";

export async function POST() {
  cookies().delete("session");
  return Response.json({ status: "success" });
}
```

---

### 4. Middleware — Real Server-Side Gate

```ts
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  if (!isAdminRoute) return NextResponse.next();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Middleware runs on the Edge runtime; Admin SDK requires Node runtime,
  // so verification happens through an internal API call.
  const verifyRes = await fetch(new URL("/api/auth/verify", req.url), {
    headers: { Cookie: `session=${session}` },
  });

  if (!verifyRes.ok) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { role } = await verifyRes.json();
  if (role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

```ts
// src/app/api/auth/verify/route.ts (Node runtime, not Edge)
export const runtime = "nodejs";
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function GET() {
  const session = cookies().get("session")?.value;
  if (!session) return Response.json({ error: "no session" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return Response.json({ role: decoded.role ?? "user", uid: decoded.uid });
  } catch {
    return Response.json({ error: "invalid session" }, { status: 401 });
  }
}
```

---

### 5. Remove Existing Bypasses

Search the codebase for patterns like:

```bash
grep -rn "isAdmin = true" src/
grep -rn "DEMO_MODE" src/
grep -rn "NODE_ENV === 'development'" src/
grep -rn "bypassAuth" src/
```

Delete or replace any hardcoded role checks in layout files under `src/app/admin/`.

---

### 6. Firestore Security Rules

```js
match /students/{docId} {
  allow read, write: if request.auth != null && request.auth.token.role == "admin";
}
```

Apply the same pattern to all admin-only collections (fee ledgers, exams, attendance, etc.).

---

### 7. Protect API Route Handlers Too

Any `/api/admin/*` route should independently re-verify the session cookie server-side — middleware alone isn't sufficient, since API routes can sometimes be reached directly depending on configuration or future changes.

---

## Checklist

- [ ] Custom claim `role: "admin"` set via Admin SDK script (not a public endpoint)
- [ ] `/api/auth/session` route created — exchanges ID token for session cookie
- [ ] `/api/auth/logout` route created — clears session cookie
- [ ] `/api/auth/verify` route created — verifies session cookie server-side (Node runtime)
- [ ] `middleware.ts` updated to gate `/admin/**` via session + role check
- [ ] All hardcoded `isAdmin`, `DEMO_MODE`, and dev-only bypasses removed
- [ ] Firestore Security Rules updated for admin-only collections
- [ ] All `/api/admin/*` routes independently verify the session
- [ ] (Optional) Rate limiting added on login attempts

---

## Notes

- Session cookies are `httpOnly`, `secure`, and `sameSite: "lax"` — never accessible to client-side JavaScript.
- The admin role should never be trusted from client state, request body, or query params — always re-derive it server-side from the verified token/session.
- This plan applies equally to the developer/owner account: there should be no special-cased UID or environment flag that skips these checks.
