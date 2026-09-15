// Phase 7: Student Progress Aggregation Service
// Computes unified academic standing metrics from Exams, Attendance, and Homework domains

import {
  Student,
  Batch,
  StudentExamMark,
  ExamTest,
  BatchAttendance,
  Homework,
  HomeworkSubmission,
  StudentProgress,
  SubjectProgressBreakdown,
  StudentExamSummary,
  ProgressWeightsConfig,
  AtRiskThresholds,
  DEFAULT_PROGRESS_WEIGHTS,
  DEFAULT_AT_RISK_THRESHOLDS,
} from './types';
import { db, isFirebaseConfigured } from './firebase';
import { doc, setDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';

export interface AggregationOptions {
  periodId?: string; // 'all-time', 'term-1', '2026-09', etc.
  weights?: ProgressWeightsConfig;
  thresholds?: AtRiskThresholds;
}

/**
 * Pure calculation engine to compute a single student's academic progress record
 */
export function computeStudentProgress(
  student: Student,
  studentBatches: Batch[],
  allMarks: StudentExamMark[],
  allExams: ExamTest[],
  allAttendance: BatchAttendance[],
  allHomework: Homework[],
  allSubmissions: HomeworkSubmission[],
  options?: AggregationOptions
): StudentProgress {
  const periodId = options?.periodId || 'all-time';
  const weights = options?.weights || DEFAULT_PROGRESS_WEIGHTS;
  const thresholds = options?.thresholds || DEFAULT_AT_RISK_THRESHOLDS;

  const primaryBatch = studentBatches[0];
  const batchId = primaryBatch?.id || (student.batchIds && student.batchIds[0]) || 'unassigned';
  const batchName = primaryBatch?.name || 'Unassigned Batch';

  // 1. EXAM METRICS
  const studentMarks = allMarks.filter((m) => m.studentId === student.id);
  const examMap = new Map(allExams.map((e) => [e.id, e]));

  const recentExams: StudentExamSummary[] = studentMarks.map((m) => {
    const examDoc = examMap.get(m.examId);
    return {
      examId: m.examId,
      examTitle: examDoc?.title || 'Exam',
      subject: examDoc?.subject || 'General',
      examDate: examDoc?.examDate || new Date().toISOString().split('T')[0],
      marksObtained: m.marksObtained,
      totalMarks: m.totalMarks || 100,
      percentage: m.percentage || (m.totalMarks ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0),
      grade: m.grade || 'N/A',
    };
  });

  const examsCount = recentExams.length;
  const examAverage =
    examsCount > 0
      ? Math.round(recentExams.reduce((acc, curr) => acc + curr.percentage, 0) / examsCount)
      : 100; // default 100% (neutral) if no exams taken yet
  
  const highestExamScore = examsCount > 0 ? Math.max(...recentExams.map((e) => e.percentage)) : undefined;
  const lowestExamScore = examsCount > 0 ? Math.min(...recentExams.map((e) => e.percentage)) : undefined;

  // 2. ATTENDANCE METRICS
  // Search through all batch attendance entries where this student is enrolled
  const enrolledBatchIds = new Set(student.batchIds || [batchId]);
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;

  allAttendance.forEach((att) => {
    if (enrolledBatchIds.has(att.batchId)) {
      const record = (att.records || []).find((r) => r.studentId === student.id);
      if (record) {
        if (record.status === 'present') presentDays += 1;
        else if (record.status === 'absent') absentDays += 1;
        else if (record.status === 'late') lateDays += 1;
      }
    }
  });

  const totalAttendanceDays = presentDays + absentDays + lateDays;
  const attendancePercentage =
    totalAttendanceDays > 0
      ? Math.round(((presentDays + lateDays * 0.5) / totalAttendanceDays) * 100)
      : 100; // default 100% if no attendance records recorded yet

  // 3. HOMEWORK METRICS
  const relevantHomework = allHomework.filter((h) => enrolledBatchIds.has(h.batchId));
  const studentSubmissions = allSubmissions.filter((s) => s.studentId === student.id);
  const subMap = new Map(studentSubmissions.map((s) => [s.assignmentId, s]));

  const homeworkAssigned = relevantHomework.length;
  let homeworkSubmitted = 0;
  let homeworkGraded = 0;
  let homeworkLate = 0;

  relevantHomework.forEach((hw) => {
    const sub = subMap.get(hw.id);
    if (sub) {
      homeworkSubmitted += 1;
      if (sub.status === 'graded') homeworkGraded += 1;
      if (sub.status === 'late') homeworkLate += 1;
    }
  });

  const homeworkPending = Math.max(0, homeworkAssigned - homeworkSubmitted);
  const homeworkCompletionRate =
    homeworkAssigned > 0
      ? Math.round((homeworkSubmitted / homeworkAssigned) * 100)
      : 100; // default 100% if no homework assigned yet

  // 4. COMPOSITE STANDING & AT-RISK STATUS
  // Normalization: If a domain has 0 events (e.g. no exams yet), we calculate proportionally
  const effectiveExamScore = examsCount > 0 ? examAverage : 100;
  const effectiveAttendance = totalAttendanceDays > 0 ? attendancePercentage : 100;
  const effectiveHomework = homeworkAssigned > 0 ? homeworkCompletionRate : 100;

  const overallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        effectiveExamScore * weights.examWeight +
        effectiveAttendance * weights.attendanceWeight +
        effectiveHomework * weights.homeworkWeight
      )
    )
  );

  let performanceTier: StudentProgress['performanceTier'] = 'Average';
  if (overallScore >= 85) performanceTier = 'Outstanding';
  else if (overallScore >= 70) performanceTier = 'Good';
  else if (overallScore >= 55) performanceTier = 'Average';
  else if (overallScore >= 45) performanceTier = 'Needs Attention';
  else performanceTier = 'At Risk';

  // Flag At-Risk conditions
  const atRiskReasons: string[] = [];
  if (totalAttendanceDays > 0 && attendancePercentage < thresholds.minAttendancePercentage) {
    atRiskReasons.push(`Attendance is below ${thresholds.minAttendancePercentage}% (${attendancePercentage}%)`);
  }
  if (examsCount > 0 && examAverage < thresholds.minExamAveragePercentage) {
    atRiskReasons.push(`Exam average is below ${thresholds.minExamAveragePercentage}% (${examAverage}%)`);
  }
  if (homeworkAssigned > 0 && homeworkCompletionRate < thresholds.minHomeworkCompletionRate) {
    atRiskReasons.push(`Homework completion is below ${thresholds.minHomeworkCompletionRate}% (${homeworkCompletionRate}%)`);
  }
  if (overallScore < thresholds.minOverallScore) {
    atRiskReasons.push(`Overall academic composite score is critical (${overallScore}%)`);
  }

  const isAtRisk = atRiskReasons.length > 0;

  // 5. SUBJECT BREAKDOWN
  const subjectBreakdown: Record<string, SubjectProgressBreakdown> = {};
  
  // Group exams by subject
  recentExams.forEach((e) => {
    const sName = e.subject || 'General';
    if (!subjectBreakdown[sName]) {
      subjectBreakdown[sName] = {
        subject: sName,
        examAverage: 0,
        examsCount: 0,
        homeworkCompletionRate: 100,
        homeworkAssigned: 0,
        homeworkSubmitted: 0,
      };
    }
  });

  // Group homework by subject
  relevantHomework.forEach((hw) => {
    const sName = hw.subject || 'General';
    if (!subjectBreakdown[sName]) {
      subjectBreakdown[sName] = {
        subject: sName,
        examAverage: 100,
        examsCount: 0,
        homeworkCompletionRate: 0,
        homeworkAssigned: 0,
        homeworkSubmitted: 0,
      };
    }
    subjectBreakdown[sName].homeworkAssigned += 1;
    if (subMap.has(hw.id)) {
      subjectBreakdown[sName].homeworkSubmitted += 1;
    }
  });

  // Compute subject averages
  Object.keys(subjectBreakdown).forEach((sName) => {
    const sExams = recentExams.filter((e) => (e.subject || 'General').toLowerCase() === sName.toLowerCase());
    if (sExams.length > 0) {
      subjectBreakdown[sName].examsCount = sExams.length;
      subjectBreakdown[sName].examAverage = Math.round(
        sExams.reduce((sum, e) => sum + e.percentage, 0) / sExams.length
      );
    }
    const item = subjectBreakdown[sName];
    if (item.homeworkAssigned > 0) {
      item.homeworkCompletionRate = Math.round((item.homeworkSubmitted / item.homeworkAssigned) * 100);
    }
  });

  return {
    id: `${student.id}_${periodId}`,
    studentId: student.id,
    studentName: student.name,
    rollNo: student.rollNo,
    batchId,
    batchName,
    periodId,
    examAverage,
    examsCount,
    highestExamScore,
    lowestExamScore,
    recentExams,
    attendancePercentage,
    presentDays,
    absentDays,
    lateDays,
    totalAttendanceDays,
    homeworkCompletionRate,
    homeworkAssigned,
    homeworkSubmitted,
    homeworkGraded,
    homeworkLate,
    homeworkPending,
    overallScore,
    performanceTier,
    isAtRisk,
    atRiskReasons,
    subjectBreakdown,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Computes progress for all students across all batches
 */
export function computeAllStudentsProgress(
  students: Student[],
  batches: Batch[],
  allMarks: StudentExamMark[],
  allExams: ExamTest[],
  allAttendance: BatchAttendance[],
  allHomework: Homework[],
  allSubmissions: HomeworkSubmission[],
  options?: AggregationOptions
): StudentProgress[] {
  const batchMap = new Map(batches.map((b) => [b.id, b]));

  return students.map((student) => {
    const studentBatches = (student.batchIds || [])
      .map((bId) => batchMap.get(bId))
      .filter(Boolean) as Batch[];
    return computeStudentProgress(
      student,
      studentBatches,
      allMarks,
      allExams,
      allAttendance,
      allHomework,
      allSubmissions,
      options
    );
  });
}

/**
 * Batch progress summary for teacher & admin batch analytics
 */
export interface BatchProgressSummary {
  batchId: string;
  batchName: string;
  totalStudents: number;
  averageOverallScore: number;
  averageExamScore: number;
  averageAttendance: number;
  averageHomeworkRate: number;
  atRiskCount: number;
  topPerformers: StudentProgress[];
  atRiskStudents: StudentProgress[];
}

export function computeBatchProgressSummary(
  batchId: string,
  progressRecords: StudentProgress[],
  batchName?: string
): BatchProgressSummary {
  const batchRecords = progressRecords.filter((p) => p.batchId === batchId);
  const total = batchRecords.length;

  if (total === 0) {
    return {
      batchId,
      batchName: batchName || 'Batch',
      totalStudents: 0,
      averageOverallScore: 0,
      averageExamScore: 0,
      averageAttendance: 0,
      averageHomeworkRate: 0,
      atRiskCount: 0,
      topPerformers: [],
      atRiskStudents: [],
    };
  }

  const averageOverallScore = Math.round(batchRecords.reduce((acc, p) => acc + p.overallScore, 0) / total);
  const averageExamScore = Math.round(batchRecords.reduce((acc, p) => acc + p.examAverage, 0) / total);
  const averageAttendance = Math.round(batchRecords.reduce((acc, p) => acc + p.attendancePercentage, 0) / total);
  const averageHomeworkRate = Math.round(batchRecords.reduce((acc, p) => acc + p.homeworkCompletionRate, 0) / total);

  const atRiskStudents = batchRecords.filter((p) => p.isAtRisk);
  const topPerformers = [...batchRecords].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);

  return {
    batchId,
    batchName: batchName || batchRecords[0]?.batchName || 'Batch',
    totalStudents: total,
    averageOverallScore,
    averageExamScore,
    averageAttendance,
    averageHomeworkRate,
    atRiskCount: atRiskStudents.length,
    topPerformers,
    atRiskStudents,
  };
}

/**
 * Persists an aggregated progress record to Firestore
 */
export async function saveStudentProgressToFirestore(progress: StudentProgress): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const docRef = doc(db, 'studentProgress', progress.id);
    await setDoc(docRef, progress, { merge: true });
  } catch (err) {
    console.error('[StudentProgressService] Error saving progress doc:', err);
  }
}

/**
 * Persists multiple progress records in a single batch write
 */
export async function batchSaveStudentProgress(records: StudentProgress[]): Promise<void> {
  if (!isFirebaseConfigured || records.length === 0) return;
  try {
    const batch = writeBatch(db);
    records.forEach((rec) => {
      const docRef = doc(db, 'studentProgress', rec.id);
      batch.set(docRef, rec, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('[StudentProgressService] Error in batch progress commit:', err);
  }
}
