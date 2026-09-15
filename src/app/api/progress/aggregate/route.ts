// API Route: /api/progress/aggregate
// Aggregates student progress data across Exams, Attendance, and Homework domains

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import {
  Student,
  Batch,
  StudentExamMark,
  ExamTest,
  BatchAttendance,
  Homework,
  HomeworkSubmission,
  StudentProgress,
} from '@/lib/types';
import { computeAllStudentsProgress } from '@/lib/student-progress-service';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body is acceptable
    }

    const targetBatchId = body.batchId as string | undefined;
    const periodId = body.periodId || 'all-time';

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({
        success: true,
        message: 'Aggregated in local development mode.',
        totalProcessed: 0,
      });
    }

    const adminDb = getAdminDb();

    // Fetch collections concurrently
    const [
      studentsSnap,
      batchesSnap,
      marksSnap,
      examsSnap,
      attendanceSnap,
      homeworkSnap,
      submissionsSnap,
    ] = await Promise.all([
      adminDb.collection('students').get(),
      adminDb.collection('batches').get(),
      adminDb.collection('marks').get(),
      adminDb.collection('exams').get(),
      adminDb.collection('batchAttendance').get(),
      adminDb.collection('homework').get(),
      adminDb.collection('homeworkSubmissions').get(),
    ]);

    const students: Student[] = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
    const batches: Batch[] = batchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Batch));
    const marks: StudentExamMark[] = marksSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentExamMark));
    const exams: ExamTest[] = examsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ExamTest));
    const attendance: BatchAttendance[] = attendanceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BatchAttendance));
    const homework: Homework[] = homeworkSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Homework));
    const submissions: HomeworkSubmission[] = submissionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as HomeworkSubmission));

    // Filter students if batchId is specified
    const filteredStudents = targetBatchId
      ? students.filter((s) => (s.batchIds || []).includes(targetBatchId))
      : students;

    const progressRecords: StudentProgress[] = computeAllStudentsProgress(
      filteredStudents,
      batches,
      marks,
      exams,
      attendance,
      homework,
      submissions,
      { periodId }
    );

    // Batch write to Firestore (chunked in batches of 400 for safety)
    const chunkSize = 400;
    for (let i = 0; i < progressRecords.length; i += chunkSize) {
      const chunk = progressRecords.slice(i, i + chunkSize);
      const writeBatch = adminDb.batch();
      chunk.forEach((rec) => {
        const docRef = adminDb.collection('studentProgress').doc(rec.id);
        writeBatch.set(docRef, rec, { merge: true });
      });
      await writeBatch.commit();
    }

    return NextResponse.json({
      success: true,
      totalProcessed: progressRecords.length,
      periodId,
      atRiskCount: progressRecords.filter((p) => p.isAtRisk).length,
      records: progressRecords,
    });
  } catch (error: any) {
    console.error('[API /api/progress/aggregate] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to aggregate student progress data.' },
      { status: 500 }
    );
  }
}
