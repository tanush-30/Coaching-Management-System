// API Route: /api/attendance/[id]
// Server-Side Data-Level Authorization for Attendance Records

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole, TeacherClaims, StudentClaims, ParentClaims } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordId = params.id;
    if (!recordId) {
      return NextResponse.json({ error: 'Missing record ID parameter' }, { status: 400 });
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

    const attDoc = await adminDb.collection('attendance').doc(recordId).get();
    if (!attDoc.exists) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    const attData = attDoc.data()!;

    if (role === 'admin') {
      return NextResponse.json(attData);
    }

    if (role === 'teacher') {
      const teacherBatchIds: string[] = (decoded as any).batchIds || [];
      const isTeacherBatch =
        attData.teacherId === uid ||
        teacherBatchIds.includes(attData.batchId);

      if (!isTeacherBatch) {
        return NextResponse.json({ error: 'Forbidden: You do not teach this batch.' }, { status: 403 });
      }
      return NextResponse.json(attData);
    }

    if (role === 'student') {
      const studentId = (decoded as any).studentId || uid;
      const studentBatchId = (decoded as any).batchId;

      if (attData.batchId !== studentBatchId && !attData.records?.some((r: any) => r.studentId === studentId)) {
        return NextResponse.json({ error: 'Forbidden: Attendance record not accessible.' }, { status: 403 });
      }

      // Filter to only return this student's individual attendance status
      const filteredRecords = (attData.records || []).filter((r: any) => r.studentId === studentId);
      return NextResponse.json({
        ...attData,
        records: filteredRecords,
      });
    }

    if (role === 'parent') {
      const childIds: string[] = (decoded as any).childIds || [];
      const filteredRecords = (attData.records || []).filter((r: any) => childIds.includes(r.studentId));
      if (filteredRecords.length === 0) {
        return NextResponse.json({ error: 'Forbidden: No linked children in this attendance register.' }, { status: 403 });
      }
      return NextResponse.json({
        ...attData,
        records: filteredRecords,
      });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    console.error('[API /api/attendance/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
