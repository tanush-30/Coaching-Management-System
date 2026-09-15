/**
 * Phase 10: Reports & Exports Module — Aggregation Queries Engine
 * 
 * Provides pure, performant aggregation and filtering routines for:
 * 1. Attendance Summary (Batch & Student level)
 * 2. Student Progress & Marksheets (Batch & Student level)
 * 3. Homework & Assignment Completion (Batch & Student level)
 * 4. Timetable & Schedule Allocation (Batch & Faculty level)
 */

import {
  Student,
  Batch,
  Teacher,
  BatchAttendance,
  ExamTest,
  StudentExamMark,
  Homework,
  HomeworkSubmission,
  TimetableSlot,
} from './types';

import {
  ReportFilterCriteria,
  DateRangePreset,
  AttendanceBatchSummaryRow,
  AttendanceStudentDetailRow,
  ProgressBatchSummaryRow,
  ProgressStudentDetailRow,
  HomeworkBatchSummaryRow,
  HomeworkStudentDetailRow,
  TimetableBatchScheduleRow,
  TimetableFacultyWorkloadRow,
  REPORT_DEFINITIONS,
  ReportDefinition,
} from './report-types';

export interface ReportDataStore {
  students: Student[];
  batches: Batch[];
  teachers: Teacher[];
  attendance: BatchAttendance[];
  exams: ExamTest[];
  marks: StudentExamMark[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  timetableSlots: TimetableSlot[];
}

export interface GeneratedReportResult<T = any> {
  definition: ReportDefinition;
  filter: ReportFilterCriteria;
  resolvedDateRange: { startDate: string; endDate: string };
  rows: T[];
  totalRowCount: number;
  generatedAt: string;
}

// -------------------------------------------------------------
// Date Range & Filtering Utilities
// -------------------------------------------------------------

export function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date()
): { startDate: string; endDate: string } {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }

  const todayStr = formatDate(now);

  switch (preset) {
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth),
      };
    }
    case 'last_30_days': {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 30);
      return {
        startDate: formatDate(past30),
        endDate: todayStr,
      };
    }
    case 'current_term': {
      // Academic year term: April 1 to March 31 or current calendar year
      const year = now.getFullYear();
      const isPostMarch = now.getMonth() >= 3;
      const startTerm = isPostMarch ? new Date(year, 3, 1) : new Date(year - 1, 3, 1);
      const endTerm = isPostMarch ? new Date(year + 1, 2, 31) : new Date(year, 2, 31);
      return {
        startDate: formatDate(startTerm),
        endDate: formatDate(endTerm),
      };
    }
    default: {
      return {
        startDate: customStart || todayStr,
        endDate: customEnd || todayStr,
      };
    }
  }
}

export function isDateInRange(dateStr?: string, startDate?: string, endDate?: string): boolean {
  if (!dateStr) return false;
  const target = dateStr.slice(0, 10);
  if (startDate && target < startDate) return false;
  if (endDate && target > endDate) return false;
  return true;
}

// -------------------------------------------------------------
// 1. Attendance Summary Aggregation
// -------------------------------------------------------------

export function aggregateAttendanceReport(
  students: Student[],
  batches: Batch[],
  attendanceList: BatchAttendance[],
  filter: ReportFilterCriteria
): AttendanceBatchSummaryRow[] | AttendanceStudentDetailRow[] {
  const { startDate, endDate } = resolveDateRange(filter.dateRangePreset, filter.startDate, filter.endDate);

  // Filter attendance records by date range and batch
  const filteredSessions = attendanceList.filter((att) => {
    if (filter.batchId && filter.batchId !== 'all' && att.batchId !== filter.batchId) return false;
    return isDateInRange(att.date, startDate, endDate);
  });

  const targetBatches =
    filter.batchId && filter.batchId !== 'all'
      ? batches.filter((b) => b.id === filter.batchId)
      : batches;

  if (filter.granularity === 'batch_summary') {
    return targetBatches.map((batch) => {
      const batchSessions = filteredSessions.filter((s) => s.batchId === batch.id);
      const enrolledInBatch = students.filter(
        (st) => st.batchIds?.includes(batch.id) && st.status !== 'inactive'
      );

      let totalPresents = 0;
      let totalAbsents = 0;
      let totalLates = 0;

      batchSessions.forEach((session) => {
        session.records?.forEach((rec) => {
          if (rec.status === 'present') totalPresents++;
          else if (rec.status === 'absent') totalAbsents++;
          else if (rec.status === 'late') totalLates++;
        });
      });

      const totalMarked = totalPresents + totalAbsents + totalLates;
      const averageAttendancePercentage =
        totalMarked > 0
          ? Math.round(((totalPresents + totalLates * 0.5) / totalMarked) * 100)
          : 0;

      return {
        batchId: batch.id,
        batchName: batch.name,
        courseName: batch.courseName || batch.subject || 'Standard Course',
        totalEnrolled: enrolledInBatch.length,
        sessionsConducted: batchSessions.length,
        presentCount: totalPresents,
        absentCount: totalAbsents,
        lateCount: totalLates,
        averageAttendancePercentage,
      };
    });
  }

  // Student Detail Granularity
  const targetStudents = students.filter((st) => {
    if (st.status === 'inactive') return false;
    if (filter.batchId && filter.batchId !== 'all' && !st.batchIds?.includes(filter.batchId)) return false;
    if (filter.studentId && filter.studentId !== 'all' && st.id !== filter.studentId) return false;
    return true;
  });

  return targetStudents.map((st) => {
    const studentBatch = batches.find((b) => st.batchIds?.includes(b.id));
    const batchSessions = filteredSessions.filter((s) => st.batchIds?.includes(s.batchId));

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    batchSessions.forEach((session) => {
      const studentRecord = session.records?.find((r) => r.studentId === st.id);
      if (studentRecord) {
        if (studentRecord.status === 'present') presentCount++;
        else if (studentRecord.status === 'absent') absentCount++;
        else if (studentRecord.status === 'late') lateCount++;
      }
    });

    const sessionsConducted = batchSessions.length;
    const totalMarked = presentCount + absentCount + lateCount;
    const attendancePercentage =
      sessionsConducted > 0
        ? Math.round(((presentCount + lateCount * 0.5) / sessionsConducted) * 100)
        : 0;

    const standingStatus: 'ELIGIBLE' | 'ATTENDANCE_ALERT' =
      attendancePercentage >= 75 ? 'ELIGIBLE' : 'ATTENDANCE_ALERT';

    return {
      studentId: st.id,
      rollNo: st.rollNo || 'N/A',
      studentName: st.name,
      batchId: studentBatch?.id || 'none',
      batchName: studentBatch?.name || 'General Program',
      parentPhone: st.parentPhone || st.phone || 'N/A',
      sessionsConducted,
      presentCount,
      absentCount,
      lateCount,
      attendancePercentage,
      standingStatus,
    };
  });
}

// -------------------------------------------------------------
// 2. Student Progress & Marksheets Aggregation
// -------------------------------------------------------------

export function aggregateProgressReport(
  students: Student[],
  batches: Batch[],
  exams: ExamTest[],
  marks: StudentExamMark[],
  filter: ReportFilterCriteria
): ProgressBatchSummaryRow[] | ProgressStudentDetailRow[] {
  const { startDate, endDate } = resolveDateRange(filter.dateRangePreset, filter.startDate, filter.endDate);

  const filteredExams = exams.filter((exam) => {
    if (filter.batchId && filter.batchId !== 'all' && exam.batchId !== filter.batchId) return false;
    return isDateInRange(exam.examDate, startDate, endDate);
  });

  if (filter.granularity === 'batch_summary') {
    return filteredExams.map((exam) => {
      const examMarks = marks.filter((m) => m.examId === exam.id);
      const batch = batches.find((b) => b.id === exam.batchId);

      let totalScorePct = 0;
      let highestScore = 0;
      let lowestScore = 100;
      let passCount = 0;

      if (examMarks.length > 0) {
        examMarks.forEach((m) => {
          const pct = m.percentage || (m.totalMarks > 0 ? (m.marksObtained / m.totalMarks) * 100 : 0);
          totalScorePct += pct;
          if (pct > highestScore) highestScore = pct;
          if (pct < lowestScore) lowestScore = pct;
          if (m.marksObtained >= exam.passingMarks) passCount++;
        });
      } else {
        lowestScore = 0;
      }

      const avgScore = examMarks.length > 0 ? Math.round(totalScorePct / examMarks.length) : 0;
      const passRate = examMarks.length > 0 ? Math.round((passCount / examMarks.length) * 100) : 0;

      return {
        batchId: exam.batchId,
        batchName: batch?.name || exam.batchName || 'General Batch',
        examId: exam.id,
        examTitle: exam.title,
        subject: exam.subject,
        examDate: exam.examDate,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        averageScorePercentage: avgScore,
        highestScorePercentage: Math.round(highestScore),
        lowestScorePercentage: Math.round(lowestScore),
        passingRatePercentage: passRate,
      };
    });
  }

  // Student Detail Granularity
  const rows: ProgressStudentDetailRow[] = [];

  filteredExams.forEach((exam) => {
    const examMarks = marks.filter((m) => m.examId === exam.id);
    const batch = batches.find((b) => b.id === exam.batchId);

    // Filter by student if specified
    const targetMarks =
      filter.studentId && filter.studentId !== 'all'
        ? examMarks.filter((m) => m.studentId === filter.studentId)
        : examMarks;

    targetMarks.forEach((m) => {
      const student = students.find((s) => s.id === m.studentId);
      const pct = m.percentage || (m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0);

      rows.push({
        studentId: m.studentId,
        rollNo: m.rollNo || student?.rollNo || 'N/A',
        studentName: m.studentName || student?.name || 'Unknown Student',
        batchId: exam.batchId,
        batchName: batch?.name || exam.batchName || 'General Batch',
        examId: exam.id,
        examTitle: exam.title,
        subject: exam.subject,
        examDate: exam.examDate,
        totalMarks: m.totalMarks || exam.totalMarks,
        marksObtained: m.marksObtained,
        percentage: pct,
        rank: m.rank || 1,
        grade: m.grade || (pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'F'),
        teacherRemarks: m.teacherRemarks || '',
      });
    });
  });

  return rows;
}

// -------------------------------------------------------------
// 3. Homework Completion Aggregation
// -------------------------------------------------------------

export function aggregateHomeworkReport(
  students: Student[],
  batches: Batch[],
  homeworkList: Homework[],
  submissions: HomeworkSubmission[],
  filter: ReportFilterCriteria
): HomeworkBatchSummaryRow[] | HomeworkStudentDetailRow[] {
  const { startDate, endDate } = resolveDateRange(filter.dateRangePreset, filter.startDate, filter.endDate);

  const filteredHw = homeworkList.filter((hw) => {
    if (filter.batchId && filter.batchId !== 'all' && hw.batchId !== filter.batchId) return false;
    const refDate = hw.assignedDate || hw.dueDate;
    return isDateInRange(refDate, startDate, endDate);
  });

  if (filter.granularity === 'batch_summary') {
    const targetBatches =
      filter.batchId && filter.batchId !== 'all'
        ? batches.filter((b) => b.id === filter.batchId)
        : batches;

    return targetBatches.map((batch) => {
      const batchHw = filteredHw.filter((h) => h.batchId === batch.id);
      const enrolledStudents = students.filter(
        (s) => s.batchIds?.includes(batch.id) && s.status !== 'inactive'
      );

      const totalExpected = batchHw.length * enrolledStudents.length;
      let totalReceived = 0;
      let onTimeCount = 0;
      let lateCount = 0;

      batchHw.forEach((hw) => {
        const hwSubs = submissions.filter((sub) => sub.assignmentId === hw.id);
        totalReceived += hwSubs.length;
        hwSubs.forEach((s) => {
          if (s.status === 'late') lateCount++;
          else onTimeCount++;
        });
      });

      const submissionRate =
        totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

      return {
        batchId: batch.id,
        batchName: batch.name,
        subject: batch.subject || 'All Subjects',
        totalHomeworksAssigned: batchHw.length,
        totalExpectedSubmissions: totalExpected,
        totalReceivedSubmissions: totalReceived,
        onTimeSubmissions: onTimeCount,
        lateSubmissions: lateCount,
        batchSubmissionRatePercentage: submissionRate,
      };
    });
  }

  // Student Detail Granularity
  const targetStudents = students.filter((st) => {
    if (st.status === 'inactive') return false;
    if (filter.batchId && filter.batchId !== 'all' && !st.batchIds?.includes(filter.batchId)) return false;
    if (filter.studentId && filter.studentId !== 'all' && st.id !== filter.studentId) return false;
    return true;
  });

  return targetStudents.map((st) => {
    const studentBatch = batches.find((b) => st.batchIds?.includes(b.id));
    const assignedHw = filteredHw.filter((h) => st.batchIds?.includes(h.batchId));
    const studentSubs = submissions.filter((sub) => sub.studentId === st.id);

    let submittedCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    assignedHw.forEach((hw) => {
      const sub = studentSubs.find((s) => s.assignmentId === hw.id);
      if (sub) {
        submittedCount++;
        if (sub.status === 'late') lateCount++;
        else onTimeCount++;
      }
    });

    const totalAssigned = assignedHw.length;
    const pendingCount = Math.max(0, totalAssigned - submittedCount);
    const completionRate =
      totalAssigned > 0 ? Math.round((submittedCount / totalAssigned) * 100) : 0;

    return {
      studentId: st.id,
      rollNo: st.rollNo || 'N/A',
      studentName: st.name,
      batchId: studentBatch?.id || 'none',
      batchName: studentBatch?.name || 'General Batch',
      totalAssigned,
      submittedCount,
      onTimeCount,
      lateCount,
      pendingCount,
      completionRatePercentage: completionRate,
    };
  });
}

// -------------------------------------------------------------
// 4. Timetable & Schedule Allocation Aggregation
// -------------------------------------------------------------

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

export function aggregateTimetableReport(
  batches: Batch[],
  teachers: Teacher[],
  timetableSlots: TimetableSlot[],
  filter: ReportFilterCriteria
): TimetableBatchScheduleRow[] | TimetableFacultyWorkloadRow[] {
  const filteredSlots = timetableSlots.filter((slot) => {
    if (filter.batchId && filter.batchId !== 'all' && slot.batchId !== filter.batchId) return false;
    return true;
  });

  // Sort slots by Day of week and Start Time
  const sortedSlots = [...filteredSlots].sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);
    if (dayDiff !== 0) return dayDiff;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  if (filter.granularity === 'batch_summary') {
    return sortedSlots.map((slot) => {
      const batch = batches.find((b) => b.id === slot.batchId);
      return {
        slotId: slot.id,
        batchId: slot.batchId,
        batchCode: batch?.batchCode || batch?.id || 'BAT-01',
        batchName: slot.batchName || batch?.name || 'Standard Batch',
        day: slot.day,
        timeSlot: `${slot.startTime} - ${slot.endTime}`,
        subject: slot.subjectName || slot.subject || 'General',
        facultyName: slot.teacherName || 'Assigned Faculty',
        roomName: slot.roomName || slot.room || 'Room 101',
        slotStatus: slot.status || 'active',
      };
    });
  }

  // Faculty Workload Granularity
  const workloadRows: TimetableFacultyWorkloadRow[] = [];

  teachers.forEach((teacher) => {
    const teacherSlots = sortedSlots.filter(
      (s) => s.teacherId === teacher.id || s.teacherName === teacher.name
    );

    if (teacherSlots.length === 0) {
      workloadRows.push({
        teacherId: teacher.id,
        facultyId: teacher.facultyId || teacher.id,
        facultyName: teacher.name,
        subject: teacher.subject || teacher.subjects?.[0] || 'General',
        day: 'No Slots',
        timeSlot: '-',
        batchName: '-',
        roomName: '-',
        weeklyTotalSlots: 0,
      });
      return;
    }

    teacherSlots.forEach((slot) => {
      workloadRows.push({
        teacherId: teacher.id,
        facultyId: teacher.facultyId || teacher.id,
        facultyName: teacher.name,
        subject: slot.subjectName || slot.subject || teacher.subject || 'General',
        day: slot.day,
        timeSlot: `${slot.startTime} - ${slot.endTime}`,
        batchName: slot.batchName || 'Assigned Batch',
        roomName: slot.roomName || slot.room || 'Main Hall',
        weeklyTotalSlots: teacherSlots.length,
      });
    });
  });

  return workloadRows;
}

// -------------------------------------------------------------
// Unified Master Report Dispatcher
// -------------------------------------------------------------

export function generateReportData(
  filter: ReportFilterCriteria,
  store: ReportDataStore
): GeneratedReportResult {
  const definition = REPORT_DEFINITIONS[filter.reportType];
  const dateRange = resolveDateRange(filter.dateRangePreset, filter.startDate, filter.endDate);

  let rows: any[] = [];

  switch (filter.reportType) {
    case 'attendance_summary':
      rows = aggregateAttendanceReport(store.students, store.batches, store.attendance, filter);
      break;
    case 'student_progress':
      rows = aggregateProgressReport(store.students, store.batches, store.exams, store.marks, filter);
      break;
    case 'homework_completion':
      rows = aggregateHomeworkReport(
        store.students,
        store.batches,
        store.homework,
        store.homeworkSubmissions,
        filter
      );
      break;
    case 'timetable_schedule':
      rows = aggregateTimetableReport(store.batches, store.teachers, store.timetableSlots, filter);
      break;
    default:
      rows = [];
  }

  return {
    definition,
    filter,
    resolvedDateRange: dateRange,
    rows,
    totalRowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}
