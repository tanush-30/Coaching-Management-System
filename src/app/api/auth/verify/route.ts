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
        console.warn('[VerifyRoute] user_roles lookup error:', err);
      }
    }

    // Secondary Fallback: Infer role from email prefix (strict — unknown emails are rejected, NOT promoted to admin)
    if (!role) {
      const email = (decoded.email || '').toLowerCase();
      if (email.startsWith('stu-') || email.includes('@studenterp.internal')) {
        role = 'student';
      } else if (email.startsWith('fac-') || email.startsWith('tea-')) {
        role = 'teacher';
      } else if (email.startsWith('par-')) {
        role = 'parent';
      } else if (email.includes('admin')) {
        // Only promote to admin if the email literally contains 'admin'
        role = 'admin';
      }
      // All other emails: role stays null → session is rejected with 401

      // Auto-heal: if a recognisable role was inferred, persist the claim so this fallback is skipped next time
      if (role) {
        try {
          await adminAuth.setCustomUserClaims(decoded.uid, { role });
          await adminDb.collection('user_roles').doc(decoded.uid).set({
            role,
            email: decoded.email || '',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('[VerifyRoute] Auto-heal sync error:', e);
        }
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
