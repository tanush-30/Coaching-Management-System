// API Route: /api/marks/[id]
// Server-Side Data-Level Authorization for Exam Scores and Marks

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
    const markId = params.id;
    if (!markId) {
      return NextResponse.json({ error: 'Missing mark ID parameter' }, { status: 400 });
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

    const markDoc = await adminDb.collection('marks').doc(markId).get();
    if (!markDoc.exists) {
      return NextResponse.json({ error: 'Mark record not found' }, { status: 404 });
    }

    const markData = markDoc.data()!;

    if (role === 'admin') {
      return NextResponse.json(markData);
    }

    if (role === 'student') {
      const studentId = (decoded as any).studentId || uid;
      if (markData.studentId !== studentId) {
        return NextResponse.json({ error: 'Forbidden: You cannot view another student\'s scores.' }, { status: 403 });
      }
      return NextResponse.json(markData);
    }

    if (role === 'teacher') {
      const teacherBatchIds: string[] = (decoded as any).batchIds || [];
      const isBatchTeacher = markData.batchId && teacherBatchIds.includes(markData.batchId);
      if (!isBatchTeacher && markData.teacherId !== uid) {
        return NextResponse.json({ error: 'Forbidden: You do not teach this student\'s batch.' }, { status: 403 });
      }
      return NextResponse.json(markData);
    }

    if (role === 'parent') {
      const childIds: string[] = (decoded as any).childIds || [];
      if (!childIds.includes(markData.studentId)) {
        return NextResponse.json({ error: 'Forbidden: You cannot view this student\'s scores.' }, { status: 403 });
      }
      return NextResponse.json(markData);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    console.error('[API /api/marks/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
