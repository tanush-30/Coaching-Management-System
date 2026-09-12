// API Route: /api/admin/set-claims
// Strictly sets custom user claims, revokes stale refresh tokens, and records an audit log

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserClaims, UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['admin', 'teacher', 'parent', 'student'];

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller session / ID token
    const authHeader = request.headers.get('Authorization');
    const sessionCookie =
      request.cookies.get('session')?.value ||
      request.cookies.get('apex_session')?.value;

    let callerUid: string = '';
    let callerRole: string = '';

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

    // Fallback role check via user_roles if not in token
    if (callerRole !== 'admin') {
      const callerDoc = await adminDb.collection('user_roles').doc(callerUid).get();
      if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // 2. Parse and validate payload
    const body = await request.json();
    const { targetUid, role, batchIds, studentId, batchId, childIds } = body as {
      targetUid?: string;
      role?: UserRole;
      batchIds?: string[];
      studentId?: string;
      batchId?: string;
      childIds?: string[];
    };

    if (!targetUid || typeof targetUid !== 'string') {
      return NextResponse.json({ error: 'Invalid targetUid' }, { status: 400 });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    // Build structured claims based on role
    let newClaims: UserClaims;
    if (role === 'admin') {
      newClaims = { role: 'admin' };
    } else if (role === 'teacher') {
      const sanitizedBatchIds = Array.isArray(batchIds) ? batchIds.slice(0, 30) : [];
      newClaims = { role: 'teacher', batchIds: sanitizedBatchIds };
    } else if (role === 'student') {
      newClaims = {
        role: 'student',
        studentId: studentId || targetUid,
        batchId: batchId || '',
      };
    } else if (role === 'parent') {
      const sanitizedChildIds = Array.isArray(childIds) ? childIds.slice(0, 30) : [];
      newClaims = { role: 'parent', childIds: sanitizedChildIds };
    } else {
      newClaims = { role: 'admin' };
    }

    // 3. Fetch prior claims for audit diff
    let priorData: Record<string, any> = {};
    try {
      const priorUserDoc = await adminDb.collection('user_roles').doc(targetUid).get();
      if (priorUserDoc.exists) {
        priorData = priorUserDoc.data() || {};
      }
    } catch {
      // ignore
    }

    // 4. Set Custom User Claims on Firebase Auth
    await adminAuth.setCustomUserClaims(targetUid, newClaims);

    // 5. Revoke existing refresh tokens so stale claims are immediately invalidated
    await adminAuth.revokeRefreshTokens(targetUid);

    // 6. Update denormalized backup in user_roles collection
    const userRoleData = {
      ...newClaims,
      updatedAt: new Date().toISOString(),
      updatedBy: callerUid,
    };
    await adminDb.collection('user_roles').doc(targetUid).set(userRoleData, { merge: true });

    // 7. Write audit log entry (Layer 6)
    const auditLogRef = adminDb.collection('audit_logs').doc();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    await auditLogRef.set({
      id: auditLogRef.id,
      actorUid: callerUid,
      actorRole: 'admin',
      action: 'UPDATE_ROLE_CLAIMS',
      targetId: targetUid,
      before: priorData,
      after: userRoleData,
      timestamp: new Date().toISOString(),
      ip: clientIp,
    });

    return NextResponse.json({
      success: true,
      targetUid,
      claims: newClaims,
      message: 'Claims updated, tokens revoked, and audit log recorded successfully',
    });
  } catch (err: unknown) {
    console.error('[SetClaims] Error setting claims:', err);
    const message = err instanceof Error ? err.message : 'Internal error setting claims';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
