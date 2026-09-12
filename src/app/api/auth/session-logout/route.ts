// API Route: /api/auth/session-logout
// Clears session cookies server-side

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = cookies();
  cookieStore.delete('session');
  cookieStore.delete('apex_session');
  cookieStore.delete('apex_role');

  const response = NextResponse.json({ success: true, status: 'success' });

  // Explicit response cookie invalidation headers
  response.cookies.set('session', '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('apex_session', '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('apex_role', '', {
    maxAge: 0,
    path: '/',
  });

  return response;
}
