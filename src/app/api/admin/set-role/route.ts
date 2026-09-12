// API route: /api/admin/set-role
// Sets a user's role in Firestore user_roles collection and custom user claims
// Only callable by existing admins (verified server-side via Firebase Admin)

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import type { UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['admin', 'teacher', 'parent', 'student'];

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured) {
      return NextResponse.json(
        { error: 'Firebase Admin credentials missing.' },
        { status: 500 }
      );
    }

    // 1. Verify caller session cookie or Bearer token
    const authHeader = request.headers.get('Authorization');
    const sessionCookie =
      request.cookies.get('session')?.value ||
      request.cookies.get('apex_session')?.value;

    let callerUid = '';
    let callerRole = '';

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = await adminAuth.verifyIdToken(token);
      callerUid = decoded.uid;
      callerRole = (decoded.role as string) || '';
    } else if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      callerUid = decoded.uid;
      callerRole = (decoded.role as string) || '';
    } else {
      return NextResponse.json({ error: 'Unauthorized: missing token or session' }, { status: 401 });
    }

    // Check caller is admin via custom claim or Firestore user_roles
    if (callerRole !== 'admin') {
      const callerRoleDoc = await adminDb.collection('user_roles').doc(callerUid).get();
      if (!callerRoleDoc.exists || callerRoleDoc.data()?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden — admins only' }, { status: 403 });
      }
    }

    // 2. Parse and validate body
    const body = await request.json();
    const { targetUid, role } = body as { targetUid: string; role: UserRole };

    if (!targetUid || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid targetUid or role' }, { status: 400 });
    }

    // 3. Set custom claims and update user_roles
    await adminAuth.setCustomUserClaims(targetUid, { role });
    await adminAuth.revokeRefreshTokens(targetUid);
    await adminDb.collection('user_roles').doc(targetUid).set({
      role,
      updatedAt: new Date().toISOString(),
      updatedBy: callerUid,
    }, { merge: true });

    return NextResponse.json({ success: true, uid: targetUid, role });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
