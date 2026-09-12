// API Route: /api/fees/[id]
// Server-Side Data-Level Authorization for Fee Ledgers and Receipts

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole, StudentClaims, ParentClaims } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feeId = params.id;
    if (!feeId) {
      return NextResponse.json({ error: 'Missing fee record ID parameter' }, { status: 400 });
    }

    const cookieStore = cookies();
    const sessionCookie =
      cookieStore.get('session')?.value ||
      cookieStore.get('apex_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Firebase Admin unconfigured' }, { status: 500 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    const role = (decoded.role as UserRole) || null;

    let feeDoc = await adminDb.collection('fee_ledgers').doc(feeId).get();
    if (!feeDoc.exists) {
      feeDoc = await adminDb.collection('installments').doc(feeId).get();
    }

    if (!feeDoc.exists) {
      return NextResponse.json({ error: 'Fee record not found' }, { status: 404 });
    }

    const feeData = feeDoc.data()!;

    if (role === 'admin') {
      return NextResponse.json(feeData);
    }

    if (role === 'student') {
      const studentId = (decoded as any).studentId || uid;
      if (feeData.studentId !== studentId) {
        return NextResponse.json({ error: 'Forbidden: You cannot view another student\'s fee records.' }, { status: 403 });
      }
      return NextResponse.json(feeData);
    }

    if (role === 'parent') {
      const childIds: string[] = (decoded as any).childIds || [];
      if (!childIds.includes(feeData.studentId)) {
        return NextResponse.json({ error: 'Forbidden: You cannot view this student\'s fee records.' }, { status: 403 });
      }
      return NextResponse.json(feeData);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    console.error('[API /api/fees/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
