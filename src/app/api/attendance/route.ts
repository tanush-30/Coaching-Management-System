// API Route: /api/attendance
// Server-Side Authorization, Submission Locking (Draft -> Final) & Audit Logging for Attendance

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole, BatchAttendance, AttendanceRecord } from '@/lib/types';

interface SaveAttendanceRequestBody {
  batchId: string;
  batchName?: string;
  date: string;
  records: AttendanceRecord[];
  markedBy?: string;
  status?: 'draft' | 'final';
  reason?: string;
  presentCount?: number;
  absentCount?: number;
}

export async function POST(req: NextRequest) {
  try {
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

    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json(
        { error: 'Forbidden: Only faculty and administrators can mark attendance.' },
        { status: 403 }
      );
    }

    const body: SaveAttendanceRequestBody = await req.json();
    const { batchId, date, records, markedBy, batchName, status = 'draft', reason } = body;

    if (!batchId || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid payload: batchId, date, and records array are required.' },
        { status: 400 }
      );
    }

    const id = `att-${batchId}-${date}`;
    const nowISO = new Date().toISOString();
    const userIdentifier = decoded.email || uid;

    // 1. Fetch existing attendance record to check locking & prepare audit diff
    const existingDoc = await adminDb.collection('attendance').doc(id).get();
    const existingData = existingDoc.exists ? (existingDoc.data() as BatchAttendance) : null;
    const isAlreadyFinal = existingData?.status === 'final';

    // 2. Backend Enforcement: Faculty cannot edit final attendance
    if (role === 'teacher' && isAlreadyFinal) {
      return NextResponse.json(
        {
          error:
            'Attendance for this session is locked as final. Any correction requires an official written request to the administration.',
        },
        { status: 403 }
      );
    }

    // 3. Calculate Counters & Diffs
    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;

    const auditDiffs: Record<string, any>[] = [];
    if (role === 'admin' && isAlreadyFinal && existingData) {
      const oldRecordsMap = new Map<string, AttendanceRecord>();
      (existingData.records || []).forEach((r) => oldRecordsMap.set(r.studentId, r));

      records.forEach((newRec) => {
        const oldRec = oldRecordsMap.get(newRec.studentId);
        if (oldRec && (oldRec.status !== newRec.status || oldRec.remarks !== newRec.remarks)) {
          auditDiffs.push({
            studentId: newRec.studentId,
            studentName: (newRec as any).studentName || newRec.studentId,
            oldStatus: oldRec.status,
            newStatus: newRec.status,
            oldRemarks: oldRec.remarks || '',
            newRemarks: newRec.remarks || '',
          });
        }
      });
    }

    // 4. Construct Attendance Record
    const attendanceDoc: BatchAttendance = {
      id,
      batchId,
      batchName: batchName || existingData?.batchName || 'Classroom Batch',
      date,
      markedBy: markedBy || existingData?.markedBy || 'Faculty',
      markedAt: existingData?.markedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      records,
      whatsappDispatched: status === 'final',
      presentCount,
      absentCount,
      status,
      submittedAt: status === 'final' ? (existingData?.submittedAt || nowISO) : undefined,
      submittedBy: status === 'final' ? (existingData?.submittedBy || userIdentifier) : undefined,
      lastEditedAt: nowISO,
      lastEditedBy: userIdentifier,
    };

    const batch = adminDb.batch();
    const attendanceDocRef = adminDb.collection('attendance').doc(id);
    batch.set(attendanceDocRef, attendanceDoc, { merge: true });

    // 5. Admin Audit Log if modifying final attendance
    if (role === 'admin' && isAlreadyFinal && auditDiffs.length > 0) {
      const auditLogRef = adminDb.collection('audit_logs').doc();
      batch.set(auditLogRef, {
        id: auditLogRef.id,
        admin_id: uid,
        actorUid: uid,
        actorEmail: decoded.email || 'admin@apexacademy.edu',
        actorRole: 'admin',
        record_type: 'attendance',
        record_id: id,
        targetId: id,
        targetRole: 'attendance',
        targetName: `${attendanceDoc.batchName} (${date})`,
        action: 'admin_edit_final_attendance',
        reason: reason?.trim() || 'Official faculty letter/request',
        student_id: auditDiffs[0]?.studentId || 'multiple',
        old_value: auditDiffs[0]?.oldStatus,
        new_value: auditDiffs[0]?.newStatus,
        changes: {
          session: { old: `${attendanceDoc.batchName} - ${date}`, new: `${attendanceDoc.batchName} - ${date}` },
          diffCount: { old: 0, new: auditDiffs.length },
          studentAttendanceChanges: auditDiffs.map((d) => ({
            student_id: d.studentId,
            student_name: d.studentName,
            old_value: d.oldStatus,
            new_value: d.newStatus,
            old_remarks: d.oldRemarks,
            new_remarks: d.newRemarks,
          })),
        },
        timestamp: nowISO,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      data: attendanceDoc,
      presentCount,
      absentCount,
      alertsSent: status === 'final' ? absentCount : 0,
    });
  } catch (error: any) {
    console.error('[API /api/attendance POST] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Firebase Admin unconfigured' }, { status: 500 });
    }

    const snap = await adminDb.collection('attendance').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json(items);
  } catch (error: any) {
    console.error('[API /api/attendance GET] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
