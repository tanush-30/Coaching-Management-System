import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { UserRole } from '@/lib/types';

// Public routes that do not require authentication
const PUBLIC_PREFIXES = ['/login', '/privacy', '/terms'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public landing page (root) and public routes through
  if (pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 2. Allow Next.js internals, API endpoints, and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 3. Read session cookie (check both 'session' and 'apex_session')
  const sessionCookie =
    request.cookies.get('session')?.value ||
    request.cookies.get('apex_session')?.value;

  // Determine target role from route prefix if accessing role portal
  const isTargetAdmin = pathname.startsWith('/admin');
  const isTargetTeacher = pathname.startsWith('/teacher');
  const isTargetStudent = pathname.startsWith('/student');
  const isTargetParent = pathname.startsWith('/parent');
  const isAppGateway = pathname === '/app' || pathname === '/app/';

  const fallbackLoginPath = isTargetAdmin
    ? '/login/admin'
    : isTargetTeacher
    ? '/login/teacher'
    : isTargetStudent
    ? '/login/student'
    : isTargetParent
    ? '/login/parent'
    : '/login';

  // 4. If no session cookie exists:
  //    - Admin routes → 404 cloak (a redirect would confirm the route exists)
  //    - All other protected routes → redirect to their login portal
  if (!sessionCookie) {
    if (isTargetAdmin) {
      // Step 4: Cloak — return a genuine-looking 404, not a redirect that leaks /admin exists
      return NextResponse.rewrite(new URL('/_not-found', request.url));
    }
    const loginUrl = new URL(fallbackLoginPath, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Server-Side Verification: Middleware calls internal Node-runtime verification route
  try {
    const verifyUrl = new URL('/api/auth/verify', request.url);
    const verifyRes = await fetch(verifyUrl, {
      headers: {
        Cookie: `session=${sessionCookie}; apex_session=${sessionCookie}`,
      },
      cache: 'no-store',
    });

    if (!verifyRes.ok) {
      const loginUrl = new URL(fallbackLoginPath, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(loginUrl);
    }

    const data = await verifyRes.json();
    const userRole = (data.role as UserRole) || null;

    if (!userRole) {
      return NextResponse.redirect(new URL(fallbackLoginPath, request.url));
    }

    // 6. Gateway Route (/app) -> redirect to assigned role dashboard
    if (isAppGateway) {
      const targetDashboard =
        userRole === 'teacher'
          ? '/teacher'
          : userRole === 'student'
          ? '/student'
          : userRole === 'parent'
          ? '/parent'
          : '/admin';
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }

    // 7. Strict Admin Route Gating: Must have verified custom claim `role: 'admin'`
    if (isTargetAdmin) {
      if (userRole !== 'admin') {
        // Step 4: Cloak — non-admin authenticated users also get a 404, not a 403/redirect.
        // A 302 to /login/admin?error=unauthorized confirms the route exists to a logged-in attacker.
        return NextResponse.rewrite(new URL('/_not-found', request.url));
      }
      return NextResponse.next();
    }

    // 8. Role-Based Route Gating for other portals (Admin has super-access)
    if (userRole === 'admin') {
      return NextResponse.next();
    }

    if (isTargetTeacher && userRole !== 'teacher') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }

    if (isTargetStudent && userRole !== 'student') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }

    if (isTargetParent && userRole !== 'parent') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }

    return NextResponse.next();
  } catch (err) {
    console.error('[Middleware] Error verifying session:', err);
    return NextResponse.redirect(new URL(fallbackLoginPath, request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
