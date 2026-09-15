// Phase 7: Student Progress Schema Definition & Metric Types

/**
 * Detailed breakdown of a student's performance across individual subjects
 */
export interface SubjectProgressBreakdown {
  subject: string;
  examAverage: number;
  examsCount: number;
  homeworkCompletionRate: number;
  homeworkAssigned: number;
  homeworkSubmitted: number;
}

/**
 * Summary of an individual exam score included in the aggregate
 */
export interface StudentExamSummary {
  examId: string;
  examTitle: string;
  subject: string;
  examDate: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

/**
 * Primary Student Progress Record Schema (Firestore Collection: `studentProgress`)
 * Represents a consolidated academic standing view for a student over a specific period.
 */
export interface StudentProgress {
  /** Document ID: `${studentId}_${periodId}` or `${studentId}_${batchId}_${periodId}` */
  id: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  batchId: string;
  batchName: string;
  
  /** Time granularity identifier: 'all-time', 'term-1', 'term-2', '2026-09', etc. */
  periodId: string;
  academicYear?: string;

  // 1. EXAM METRICS (Source: marks collection / StudentExamMark)
  /** Average percentage across all evaluated exams (0 - 100) */
  examAverage: number;
  /** Total number of evaluated exams taken */
  examsCount: number;
  /** Highest percentage scored in any exam */
  highestExamScore?: number;
  /** Lowest percentage scored in any exam */
  lowestExamScore?: number;
  /** List of recent individual exam performances */
  recentExams?: StudentExamSummary[];

  // 2. ATTENDANCE METRICS (Source: batchAttendance collection)
  /** Attendance percentage (present + late counted appropriately) (0 - 100) */
  attendancePercentage: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalAttendanceDays: number;

  // 3. HOMEWORK METRICS (Source: homework & homeworkSubmissions collections)
  /** Homework submission completion percentage (0 - 100) */
  homeworkCompletionRate: number;
  homeworkAssigned: number;
  homeworkSubmitted: number;
  homeworkGraded: number;
  homeworkLate: number;
  homeworkPending: number;

  // 4. COMPOSITE STANDING & AT-RISK STATUS
  /** Weighted composite score (0 - 100) combining Exams (40%), Attendance (30%), Homework (30%) */
  overallScore: number;
  /** Performance standing tier */
  performanceTier: 'Outstanding' | 'Good' | 'Average' | 'Needs Attention' | 'At Risk';
  /** Stored boolean flag for rapid querying in Teacher/Admin At-Risk filters */
  isAtRisk: boolean;
  /** Human-readable reasons why the student is flagged as at-risk */
  atRiskReasons: string[];

  // 5. SUBJECT BREAKDOWN
  /** Subject-wise breakdown for multi-subject batches */
  subjectBreakdown?: Record<string, SubjectProgressBreakdown>;

  /** Timestamp of when this record was calculated/synced */
  lastUpdatedAt: string;
}

/**
 * Standard configuration weights for computing composite progress score
 */
export interface ProgressWeightsConfig {
  examWeight: number;       // default: 0.40 (40%)
  attendanceWeight: number; // default: 0.30 (30%)
  homeworkWeight: number;   // default: 0.30 (30%)
}

export const DEFAULT_PROGRESS_WEIGHTS: ProgressWeightsConfig = {
  examWeight: 0.40,
  attendanceWeight: 0.30,
  homeworkWeight: 0.30,
};

/**
 * Threshold criteria for flagging a student as "At Risk"
 */
export interface AtRiskThresholds {
  minAttendancePercentage: number;     // e.g. < 75%
  minExamAveragePercentage: number;    // e.g. < 40%
  minHomeworkCompletionRate: number;   // e.g. < 50%
  minOverallScore: number;             // e.g. < 45%
}

export const DEFAULT_AT_RISK_THRESHOLDS: AtRiskThresholds = {
  minAttendancePercentage: 75,
  minExamAveragePercentage: 40,
  minHomeworkCompletionRate: 50,
  minOverallScore: 45,
};
