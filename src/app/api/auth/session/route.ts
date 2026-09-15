// API Route: /api/auth/session
// Exchanges Firebase ID Token for a secure HttpOnly Firebase Session Cookie

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, expectedRole } = body as { idToken?: string; expectedRole?: UserRole };

    if (!idToken) {
      return NextResponse.json(
        { error: 'MISSING_ID_TOKEN', message: 'Missing Firebase ID token in request body.' },
        { status: 400 }
      );
    }

    // 1. Verify token is fresh and unrevoked
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    let role = (decoded.role as UserRole) || null;

    // Fallback: Check Firestore user_roles collection if claim is not yet populated
    if (!role) {
      try {
        const userDoc = await adminDb.collection('user_roles').doc(decoded.uid).get();
        if (userDoc.exists) {
          role = (userDoc.data()?.role as UserRole) || null;
        } else if (decoded.email) {
          const emailSnap = await adminDb
            .collection('user_roles')
            .where('email', '==', decoded.email.toLowerCase())
            .limit(1)
            .get();
          if (!emailSnap.empty) {
            role = (emailSnap.docs[0].data()?.role as UserRole) || null;
          }
        }
      } catch (err) {
        console.warn('[SessionRoute] user_roles lookup error:', err);
      }
    }

    // Secondary Fallback: Infer role from email pattern and auto-heal
    if (!role) {
      const email = (decoded.email || '').toLowerCase();
      if (email.startsWith('stu-') || email.includes('@studenterp.internal') || expectedRole === 'student') {
        role = 'student';
      } else if (email.startsWith('fac-') || email.startsWith('tea-') || expectedRole === 'teacher') {
        role = 'teacher';
      } else if (email.startsWith('par-') || expectedRole === 'parent') {
        role = 'parent';
      } else if (email.includes('admin') || expectedRole === 'admin' || !expectedRole) {
        role = 'admin';
      }

      if (role) {
        try {
          await adminAuth.setCustomUserClaims(decoded.uid, { role });
          await adminDb.collection('user_roles').doc(decoded.uid).set({
            role,
            email: decoded.email || '',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('[SessionRoute] Auto-heal sync error:', e);
        }
      }
    }

    // Role enforcement if expectedRole is passed
    if (expectedRole && role && expectedRole !== role) {
      return NextResponse.json(
        {
          error: 'ROLE_MISMATCH',
          message: "We couldn't sign you in here. Please check you're using the correct portal.",
        },
        { status: 403 }
      );
    }

    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const cookieStore = cookies();
    const cookieOptions = {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    // Set both 'session' and 'apex_session' for backwards compatibility
    cookieStore.set('session', sessionCookie, cookieOptions);
    cookieStore.set('apex_session', sessionCookie, cookieOptions);

    // Remove legacy client-accessible plain role cookie
    cookieStore.delete('apex_role');

    return NextResponse.json({
      status: 'success',
      role: role ?? 'user',
      uid: decoded.uid,
    });
  } catch (error: any) {
    console.error('[SessionRoute] Error creating session cookie:', error);
    return NextResponse.json(
      { error: 'AUTH_FAILED', message: error?.message || 'Failed to exchange token for session.' },
      { status: 401 }
    );
  }
}
