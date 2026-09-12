// API Route: /api/auth/verify
// Verifies Firebase Session Cookie server-side using Firebase Admin SDK

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';

async function verifySession(request?: NextRequest) {
  const cookieStore = cookies();
  const session =
    cookieStore.get('session')?.value ||
    cookieStore.get('apex_session')?.value ||
    request?.cookies.get('session')?.value ||
    request?.cookies.get('apex_session')?.value;

  if (!session) {
    return NextResponse.json({ error: 'no session' }, { status: 401 });
  }

  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { error: 'firebase_admin_not_configured', message: 'Firebase Admin credentials missing.' },
      { status: 500 }
    );
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    let role = (decoded.role as UserRole) || null;

    // Fallback: Check Firestore user_roles collection if custom claim is not set yet
    if (!role) {
      try {
        const userDoc = await adminDb.collection('user_roles').doc(decoded.uid).get();
        if (userDoc.exists) {
          role = (userDoc.data()?.role as UserRole) || null;
        }
      } catch (err) {
        console.warn('[VerifyRoute] user_roles lookup error:', err);
      }
    }

    return NextResponse.json({
      role: role ?? 'user',
      uid: decoded.uid,
      email: decoded.email || null,
      claims: {
        role: role ?? 'user',
        studentId: decoded.studentId,
        batchIds: decoded.batchIds,
        childIds: decoded.childIds,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'invalid session', message: err?.message }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  return verifySession(request);
}

export async function POST(request: NextRequest) {
  return verifySession(request);
}
