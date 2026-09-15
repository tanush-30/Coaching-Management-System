// API Route: /api/marks/save
// Server-Side Authorization, Locking & Audit Logging for Test Marks

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole, StudentExamMark } from '@/lib/types';

interface SaveMarksRequestBody {
  examId: string;
  status: 'draft' | 'final';
  reason?: string;
  marksData: {
    studentId: string;
    marksObtained: number;
    teacherRemarks?: string;
    remarks?: string;
  }[];
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
        { error: 'Forbidden: Only faculty and administrators can enter marks.' },
        { status: 403 }
      );
    }

    const body: SaveMarksRequestBody = await req.json();
    const { examId, status = 'draft', marksData, reason } = body;

    if (!examId || !Array.isArray(marksData)) {
      return NextResponse.json(
        { error: 'Invalid payload: examId and marksData array are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Exam Document
    const examDoc = await adminDb.collection('exams').doc(examId).get();
    if (!examDoc.exists) {
      return NextResponse.json({ error: 'Exam test record not found' }, { status: 404 });
    }

    const exam = examDoc.data()!;

    // 2. Fetch existing marks to check locking & prepare audit diff
    const existingMarksSnap = await adminDb
      .collection('marks')
      .where('examId', '==', examId)
      .get();

    const existingMarksMap = new Map<string, FirebaseFirestore.DocumentData>();
    let isAlreadyFinal = exam.marksStatus === 'final' || exam.status === 'evaluated';

    existingMarksSnap.forEach((doc) => {
      const data = doc.data();
      existingMarksMap.set(data.studentId, data);
      if (data.status === 'final') {
        isAlreadyFinal = true;
      }
    });

    // 3. Backend Enforcement: Faculty cannot edit final marks
    if (role === 'teacher' && isAlreadyFinal) {
      return NextResponse.json(
        {
          error:
            'Marks for this test are locked as final. Any correction requires an official letter/request to the administration.',
        },
        { status: 403 }
      );
    }

    // 4. Calculate Scores, Percentiles & Grades
    const totalExamMarks = exam.totalMarks || 100;
    const sortedByScore = [...marksData].sort((a, b) => b.marksObtained - a.marksObtained);
    const scores = marksData.map((m) => Math.max(0, Math.min(totalExamMarks, m.marksObtained)));
    const highestMark = scores.length > 0 ? Math.max(...scores, 0) : 0;
    const averageMark =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Fetch students to get names and roll numbers
    const studentsSnap = await adminDb.collection('students').get();
    const studentMap = new Map<string, any>();
    studentsSnap.forEach((d) => studentMap.set(d.id, d.data()));

    const batch = adminDb.batch();
    const nowISO = new Date().toISOString();
    const userIdentifier = decoded.email || uid;

    const newMarksRecords: StudentExamMark[] = [];
    const auditDiffs: Record<string, any>[] = [];

    sortedByScore.forEach((entry, idx) => {
      const student = studentMap.get(entry.studentId);
      const studentName = student?.name || 'Student';
      const rollNo = student?.rollNo || '';
      const score = Math.max(0, Math.min(totalExamMarks, entry.marksObtained));
      const percentage = totalExamMarks > 0 ? Math.round((score / totalExamMarks) * 100) : 0;
      const rank = idx + 1;
      const remarks = entry.teacherRemarks || entry.remarks || 'Good effort. Keep improving.';
      const markId = `mark-${examId}-${entry.studentId}`;

      // Grade calculation
      let grade: StudentExamMark['grade'] = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 40) grade = 'C';

      const existingRecord = existingMarksMap.get(entry.studentId);

      const markRecord: StudentExamMark = {
        id: markId,
        examId,
        studentId: entry.studentId,
        studentName,
        rollNo,
        marksObtained: score,
        totalMarks: totalExamMarks,
        percentage,
        rank,
        grade,
        teacherRemarks: remarks,
        whatsappSent: status === 'final',
        status,
        submittedAt: status === 'final' ? (existingRecord?.submittedAt || nowISO) : undefined,
        submittedBy: status === 'final' ? (existingRecord?.submittedBy || userIdentifier) : undefined,
        lastEditedBy: userIdentifier,
        lastEditedAt: nowISO,
      };

      // If Admin is editing final marks, record field diff
      if (role === 'admin' && isAlreadyFinal && existingRecord) {
        if (
          existingRecord.marksObtained !== score ||
          existingRecord.teacherRemarks !== remarks
        ) {
          auditDiffs.push({
            studentId: entry.studentId,
            studentName,
            oldScore: existingRecord.marksObtained,
            newScore: score,
            oldRemarks: existingRecord.teacherRemarks,
            newRemarks: remarks,
          });
        }
      }

      const markDocRef = adminDb.collection('marks').doc(markId);
      batch.set(markDocRef, markRecord, { merge: true });
      newMarksRecords.push(markRecord);
    });

    // 5. Update Exam Test Document
    const examUpdates: Record<string, any> = {
      status: status === 'final' ? 'evaluated' : 'draft',
      marksStatus: status,
      highestScore: highestMark,
      averageScore: averageMark,
      marksLastEditedAt: nowISO,
      marksLastEditedBy: userIdentifier,
    };

    if (status === 'final') {
      examUpdates.marksSubmittedAt = exam.marksSubmittedAt || nowISO;
      examUpdates.marksSubmittedBy = exam.marksSubmittedBy || userIdentifier;
    }

    const examDocRef = adminDb.collection('exams').doc(examId);
    batch.update(examDocRef, examUpdates);

    // 6. Admin Audit Log if modifying final marks
    if (role === 'admin' && isAlreadyFinal && auditDiffs.length > 0) {
      const auditLogRef = adminDb.collection('audit_logs').doc();
      batch.set(auditLogRef, {
        id: auditLogRef.id,
        admin_id: uid,
        actorUid: uid,
        actorEmail: decoded.email || 'admin@apexacademy.edu',
        actorRole: 'admin',
        record_type: 'marks',
        record_id: examId,
        targetId: examId,
        targetRole: 'marks',
        targetName: `${exam.title || 'Exam'} (${exam.batchName || 'Batch'})`,
        action: 'admin_edit_final_marks',
        reason: reason?.trim() || 'Official faculty letter/request',
        student_id: auditDiffs[0]?.studentId || 'multiple',
        old_value: auditDiffs[0]?.oldScore,
        new_value: auditDiffs[0]?.newScore,
        changes: {
          examId: { old: examId, new: examId },
          diffCount: { old: 0, new: auditDiffs.length },
          studentUpdates: auditDiffs.map((d) => ({
            student_id: d.studentId,
            student_name: d.studentName,
            old_value: d.oldScore,
            new_value: d.newScore,
            old_remarks: d.oldRemarks,
            new_remarks: d.newRemarks,
          })),
        },
        timestamp: nowISO,
      });
    }

    // Commit all changes atomically
    await batch.commit();

    return NextResponse.json({
      success: true,
      examId,
      status,
      evaluatedCount: newMarksRecords.length,
      averageScore: averageMark,
      highestScore: highestMark,
      marks: newMarksRecords,
    });
  } catch (error: any) {
    console.error('[API /api/marks/save] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
