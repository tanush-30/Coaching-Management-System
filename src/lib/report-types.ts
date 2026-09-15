/**
 * Phase 10: Reports & Exports Module — Report Type Definitions & Schema Contracts
 * 
 * Defines the finalized report types, granularities, column specifications,
 * and filter criteria for the coaching management system reports engine.
 */

export type ReportType =
  | 'attendance_summary'
  | 'student_progress'
  | 'homework_completion'
  | 'timetable_schedule';

export type ReportGranularity = 'batch_summary' | 'student_detail';

export type DateRangePreset = 'this_month' | 'last_30_days' | 'current_term' | 'custom';

export type ExportFormat = 'csv' | 'pdf';

export interface ReportFilterCriteria {
  reportType: ReportType;
  batchId?: string; // 'all' | specific batch ID
  studentId?: string; // 'all' | specific student ID
  dateRangePreset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  granularity: ReportGranularity;
  exportFormat?: ExportFormat;
}

// -------------------------------------------------------------
// 1. Attendance Summary Report Schemas
// -------------------------------------------------------------

export interface AttendanceBatchSummaryRow {
  batchId: string;
  batchName: string;
  courseName: string;
  totalEnrolled: number;
  sessionsConducted: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  averageAttendancePercentage: number;
}

export interface AttendanceStudentDetailRow {
  studentId: string;
  rollNo: string;
  studentName: string;
  batchId: string;
  batchName: string;
  parentPhone: string;
  sessionsConducted: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
  standingStatus: 'ELIGIBLE' | 'ATTENDANCE_ALERT';
}

// -------------------------------------------------------------
// 2. Student Progress Export Schemas
// -------------------------------------------------------------

export interface ProgressBatchSummaryRow {
  batchId: string;
  batchName: string;
  examId: string;
  examTitle: string;
  subject: string;
  examDate: string;
  totalMarks: number;
  passingMarks: number;
  averageScorePercentage: number;
  highestScorePercentage: number;
  lowestScorePercentage: number;
  passingRatePercentage: number;
}

export interface ProgressStudentDetailRow {
  studentId: string;
  rollNo: string;
  studentName: string;
  batchId: string;
  batchName: string;
  examId: string;
  examTitle: string;
  subject: string;
  examDate: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  rank: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F';
  teacherRemarks?: string;
}

// -------------------------------------------------------------
// 3. Homework Completion Report Schemas
// -------------------------------------------------------------

export interface HomeworkBatchSummaryRow {
  batchId: string;
  batchName: string;
  subject: string;
  totalHomeworksAssigned: number;
  totalExpectedSubmissions: number;
  totalReceivedSubmissions: number;
  onTimeSubmissions: number;
  lateSubmissions: number;
  batchSubmissionRatePercentage: number;
}

export interface HomeworkStudentDetailRow {
  studentId: string;
  rollNo: string;
  studentName: string;
  batchId: string;
  batchName: string;
  totalAssigned: number;
  submittedCount: number;
  onTimeCount: number;
  lateCount: number;
  pendingCount: number;
  completionRatePercentage: number;
  averageGradedScore?: string;
}

// -------------------------------------------------------------
// 4. Timetable & Schedule Allocation Report Schemas
// -------------------------------------------------------------

export interface TimetableBatchScheduleRow {
  slotId: string;
  batchId: string;
  batchCode?: string;
  batchName: string;
  day: string;
  timeSlot: string;
  subject: string;
  facultyName: string;
  roomName: string;
  slotStatus: 'active' | 'cancelled' | 'rescheduled';
}

export interface TimetableFacultyWorkloadRow {
  teacherId: string;
  facultyId?: string;
  facultyName: string;
  subject: string;
  day: string;
  timeSlot: string;
  batchName: string;
  roomName: string;
  weeklyTotalSlots?: number;
}

// -------------------------------------------------------------
// Report Configuration & Column Metadata Interface
// -------------------------------------------------------------

export interface ReportColumnMetadata {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  widthWeight?: number;
}

export interface ReportDefinition {
  id: ReportType;
  title: string;
  description: string;
  availableGranularities: ReportGranularity[];
  supportedFormats: ExportFormat[];
  columns: {
    batch_summary: ReportColumnMetadata[];
    student_detail: ReportColumnMetadata[];
  };
}

export const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  attendance_summary: {
    id: 'attendance_summary',
    title: 'Attendance Summary',
    description: 'Track presence rates, session totals, and at-risk attendance alerts per batch or student.',
    availableGranularities: ['batch_summary', 'student_detail'],
    supportedFormats: ['csv', 'pdf'],
    columns: {
      batch_summary: [
        { key: 'batchName', header: 'Batch Name', align: 'left', widthWeight: 3 },
        { key: 'courseName', header: 'Course / Grade', align: 'left', widthWeight: 2 },
        { key: 'totalEnrolled', header: 'Enrolled', align: 'center', widthWeight: 1 },
        { key: 'sessionsConducted', header: 'Conducted', align: 'center', widthWeight: 1 },
        { key: 'presentCount', header: 'Presents', align: 'center', widthWeight: 1 },
        { key: 'absentCount', header: 'Absents', align: 'center', widthWeight: 1 },
        { key: 'lateCount', header: 'Lates', align: 'center', widthWeight: 1 },
        { key: 'averageAttendancePercentage', header: 'Avg Attendance %', align: 'right', widthWeight: 2 },
      ],
      student_detail: [
        { key: 'rollNo', header: 'Roll No', align: 'left', widthWeight: 2 },
        { key: 'studentName', header: 'Student Name', align: 'left', widthWeight: 3 },
        { key: 'batchName', header: 'Batch', align: 'left', widthWeight: 2 },
        { key: 'parentPhone', header: 'Parent Contact', align: 'center', widthWeight: 2 },
        { key: 'sessionsConducted', header: 'Conducted', align: 'center', widthWeight: 1 },
        { key: 'presentCount', header: 'Present', align: 'center', widthWeight: 1 },
        { key: 'absentCount', header: 'Absent', align: 'center', widthWeight: 1 },
        { key: 'lateCount', header: 'Late', align: 'center', widthWeight: 1 },
        { key: 'attendancePercentage', header: 'Attendance %', align: 'right', widthWeight: 2 },
        { key: 'standingStatus', header: 'Standing', align: 'center', widthWeight: 2 },
      ],
    },
  },
  student_progress: {
    id: 'student_progress',
    title: 'Student Progress & Marksheets',
    description: 'Export unit test results, rank standings, scorecards, and academic trends.',
    availableGranularities: ['batch_summary', 'student_detail'],
    supportedFormats: ['csv', 'pdf'],
    columns: {
      batch_summary: [
        { key: 'batchName', header: 'Batch Name', align: 'left', widthWeight: 3 },
        { key: 'examTitle', header: 'Exam Title', align: 'left', widthWeight: 3 },
        { key: 'subject', header: 'Subject', align: 'left', widthWeight: 2 },
        { key: 'examDate', header: 'Date', align: 'center', widthWeight: 2 },
        { key: 'totalMarks', header: 'Total Marks', align: 'center', widthWeight: 1 },
        { key: 'averageScorePercentage', header: 'Avg Score %', align: 'right', widthWeight: 2 },
        { key: 'highestScorePercentage', header: 'Highest %', align: 'right', widthWeight: 2 },
        { key: 'passingRatePercentage', header: 'Pass Rate %', align: 'right', widthWeight: 2 },
      ],
      student_detail: [
        { key: 'rollNo', header: 'Roll No', align: 'left', widthWeight: 2 },
        { key: 'studentName', header: 'Student Name', align: 'left', widthWeight: 3 },
        { key: 'batchName', header: 'Batch', align: 'left', widthWeight: 2 },
        { key: 'examTitle', header: 'Exam Title', align: 'left', widthWeight: 3 },
        { key: 'subject', header: 'Subject', align: 'left', widthWeight: 2 },
        { key: 'totalMarks', header: 'Total Marks', align: 'center', widthWeight: 1 },
        { key: 'marksObtained', header: 'Obtained', align: 'center', widthWeight: 1 },
        { key: 'percentage', header: 'Percentage %', align: 'right', widthWeight: 2 },
        { key: 'rank', header: 'Rank', align: 'center', widthWeight: 1 },
        { key: 'grade', header: 'Grade', align: 'center', widthWeight: 1 },
      ],
    },
  },
  homework_completion: {
    id: 'homework_completion',
    title: 'Homework & Assignment Completion',
    description: 'Analyze daily DPP submissions, completion percentages, and missing task lists.',
    availableGranularities: ['batch_summary', 'student_detail'],
    supportedFormats: ['csv', 'pdf'],
    columns: {
      batch_summary: [
        { key: 'batchName', header: 'Batch Name', align: 'left', widthWeight: 3 },
        { key: 'subject', header: 'Subject', align: 'left', widthWeight: 2 },
        { key: 'totalHomeworksAssigned', header: 'Assignments', align: 'center', widthWeight: 2 },
        { key: 'totalExpectedSubmissions', header: 'Expected Submissions', align: 'center', widthWeight: 2 },
        { key: 'totalReceivedSubmissions', header: 'Received', align: 'center', widthWeight: 2 },
        { key: 'batchSubmissionRatePercentage', header: 'Completion %', align: 'right', widthWeight: 2 },
      ],
      student_detail: [
        { key: 'rollNo', header: 'Roll No', align: 'left', widthWeight: 2 },
        { key: 'studentName', header: 'Student Name', align: 'left', widthWeight: 3 },
        { key: 'batchName', header: 'Batch', align: 'left', widthWeight: 2 },
        { key: 'totalAssigned', header: 'Assigned', align: 'center', widthWeight: 1 },
        { key: 'submittedCount', header: 'Submitted', align: 'center', widthWeight: 1 },
        { key: 'onTimeCount', header: 'On-Time', align: 'center', widthWeight: 1 },
        { key: 'lateCount', header: 'Late', align: 'center', widthWeight: 1 },
        { key: 'pendingCount', header: 'Missing', align: 'center', widthWeight: 1 },
        { key: 'completionRatePercentage', header: 'Completion %', align: 'right', widthWeight: 2 },
      ],
    },
  },
  timetable_schedule: {
    id: 'timetable_schedule',
    title: 'Timetable & Room Schedule Allocation',
    description: 'Export batch class schedules, room allocations, and faculty teaching workload.',
    availableGranularities: ['batch_summary', 'student_detail'],
    supportedFormats: ['csv', 'pdf'],
    columns: {
      batch_summary: [
        { key: 'batchCode', header: 'Batch Code', align: 'left', widthWeight: 2 },
        { key: 'batchName', header: 'Batch Name', align: 'left', widthWeight: 3 },
        { key: 'day', header: 'Day', align: 'left', widthWeight: 2 },
        { key: 'timeSlot', header: 'Time Slot', align: 'center', widthWeight: 2 },
        { key: 'subject', header: 'Subject', align: 'left', widthWeight: 2 },
        { key: 'facultyName', header: 'Faculty', align: 'left', widthWeight: 3 },
        { key: 'roomName', header: 'Room / Venue', align: 'left', widthWeight: 2 },
        { key: 'slotStatus', header: 'Status', align: 'center', widthWeight: 1 },
      ],
      student_detail: [
        { key: 'facultyName', header: 'Faculty Name', align: 'left', widthWeight: 3 },
        { key: 'subject', header: 'Subject', align: 'left', widthWeight: 2 },
        { key: 'day', header: 'Day', align: 'left', widthWeight: 2 },
        { key: 'timeSlot', header: 'Time Slot', align: 'center', widthWeight: 2 },
        { key: 'batchName', header: 'Assigned Batch', align: 'left', widthWeight: 3 },
        { key: 'roomName', header: 'Room', align: 'left', widthWeight: 2 },
      ],
    },
  },
};
