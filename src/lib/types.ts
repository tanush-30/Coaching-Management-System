export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export interface AdminClaims {
  role: 'admin';
  mustChangePassword?: boolean;
}

export interface TeacherClaims {
  role: 'teacher';
  batchIds: string[];
  customId?: string;
  mustChangePassword?: boolean;
}

export interface StudentClaims {
  role: 'student';
  studentId: string;
  batchId: string;
  customId?: string;
  mustChangePassword?: boolean;
}

export interface ParentClaims {
  role: 'parent';
  childIds: string[];
}

export type UserClaims = AdminClaims | TeacherClaims | StudentClaims | ParentClaims;

export type AuditActionType =
  | 'PAYMENT_STATUS_CHANGE'
  | 'PAYMENT_RECONCILE'
  | 'SETTINGS_UPDATE'
  | 'MARKS_EDIT'
  | 'ATTENDANCE_EDIT'
  | 'STUDENT_RECORD_EDIT'
  | 'STUDENT_ENROLL'
  | 'STUDENT_STATUS_CHANGE'
  | 'FACULTY_RECORD_EDIT'
  | 'FACULTY_ENROLL'
  | 'TIMETABLE_CHANGE'
  | 'ANNOUNCEMENT_BROADCAST'
  | 'PAYROLL_GENERATE'
  | 'PAYROLL_APPROVE'
  | 'PAYROLL_PAY'
  | 'PAYROLL_CANCEL'
  | 'SALARY_STRUCTURE_CREATE'
  | 'SALARY_STRUCTURE_UPDATE';

export type AuditTargetType =
  | 'student'
  | 'faculty'
  | 'teacher'
  | 'parent'
  | 'payment'
  | 'settings'
  | 'marks'
  | 'exam'
  | 'attendance'
  | 'timetable'
  | 'announcement'
  | 'payroll'
  | 'salary_structure';

export interface AuditFieldDiff {
  old: any;
  new: any;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole: UserRole | 'admin' | 'system' | string;
  action: AuditActionType | string;
  targetType?: AuditTargetType | string;
  targetRole?: AuditTargetType | string;
  targetId: string;
  targetName?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  changes?: Record<string, AuditFieldDiff>;
  timestamp: string;
  ip?: string;
  metadata?: Record<string, any> | null;
  // Backward-compatibility snake_case aliases
  actor_id?: string;
  actor_role?: string;
  target_type?: string;
  target_id?: string;
  student_id?: string;
  old_value?: any;
  new_value?: any;
}

export interface Student {
  id: string;
  rollNo: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  address: string;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  parentRelation: 'Father' | 'Mother' | 'Guardian';
  batchIds: string[];
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'alumni';
  totalFee: number;
  paidFee: number;
  pendingFee: number;
  monthlyInstallment?: number;
  installments?: any[];
  whatsappHistory?: any[];
  dateOfJoining?: string;
}

export interface MemberIdRegistry {
  id: string; // The globally unique custom ID (e.g. STU-2026-001, FAC-2026-001, BAT-2026-001)
  memberType: 'student' | 'faculty' | 'batch';
  name: string;
  memberRefId: string;
  assignedAt: string;
}

export interface Teacher {
  id: string;
  facultyId?: string; // Custom Admin-Assigned Unique Identifier
  firstName?: string;
  lastName?: string;
  dob?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  subjects: string[];
  qualifications: string;
  joiningDate: string;
  status: 'active' | 'on_leave';
  assignedBatches: string[];
  subject?: string;
  batchIds?: string[];
}

export interface Batch {
  id: string;
  batchCode?: string; // Custom Admin-Assigned Unique Identifier (e.g. BAT-2026-001)
  name: string;
  courseName: string;
  grade: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  scheduleDays: string[]; // e.g. ['Mon', 'Wed', 'Fri']
  startTime: string; // '04:00 PM'
  endTime: string; // '05:30 PM'
  room: string;
  capacity: number;
  enrolledCount: number;
  annualFee: number;
  accentColor: string;
  academicYear: string;
}

export interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

export interface BatchAttendance {
  id: string;
  batchId: string;
  batchName: string;
  date: string; // YYYY-MM-DD
  markedBy: string;
  markedAt: string;
  records: AttendanceRecord[];
  whatsappDispatched: boolean;
  absentCount: number;
  presentCount: number;
  status?: 'draft' | 'final';
  submittedAt?: string;
  submittedBy?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export interface FeeInstallment {
  id: string;
  studentId: string;
  installmentNo: number;
  title: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidDate?: string;
  paymentMode?: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'Razorpay';
  transactionId?: string;
  receiptNumber?: string;
  receiptGenerated?: boolean;
  receiptGeneratedAt?: string;
  receiptStoragePath?: string;
  receiptUrl?: string;
  paymentLink?: string;
}

export interface FeeReceiptRecord {
  id: string; // usually receiptNumber
  receiptNumber: string;
  studentId: string;
  studentName?: string;
  rollNo?: string;
  installmentId?: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  title: string;
  paymentMode: string;
  paidDate: string;
  receiptStoragePath: string;
  receiptUrl?: string;
  receiptPdfSize?: number;
  createdAt: string;
  generatedAt: string;
  status: 'active' | 'cancelled';
}

export interface ExamTest {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  subject: string;
  examDate: string;
  totalMarks: number;
  passingMarks: number;
  status: 'scheduled' | 'draft' | 'evaluated';
  marksStatus?: 'draft' | 'final';
  averageScore?: number;
  highestScore?: number;
  marksSubmittedAt?: string;
  marksSubmittedBy?: string;
  marksLastEditedAt?: string;
  marksLastEditedBy?: string;
}

export interface StudentExamMark {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  rank: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F';
  teacherRemarks?: string;
  whatsappSent?: boolean;
  status?: 'draft' | 'final';
  submittedAt?: string;
  submittedBy?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export interface Homework {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  subject: string;
  teacherName: string;
  assignedBy?: string; // Teacher UID/ID
  assignedDate: string;
  assignedAt?: string; // ISO timestamp
  dueDate: string;
  dueContext?: string; // e.g. "Due before next Math lecture (Wednesday, 10:00 AM)"
  targetSlotId?: string;
  description: string;
  attachmentUrl?: string | null;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentSize?: string | null;
  submissionCount: number;
  totalStudents: number;
  attachments?: { name: string; size: string; url?: string; storagePath?: string }[];
}

export interface HomeworkSubmission {
  id: string; // `${assignmentId}_${studentId}`
  assignmentId: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  batchId: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  storagePath: string;
  submittedAt: string; // ISO timestamp
  status: 'submitted' | 'late' | 'graded';
  grade?: string | null;
  feedback?: string | null;
  gradedBy?: string | null;
  gradedAt?: string | null;
}

export interface ScheduleChangeEvent {
  slotId: string;
  batchId: string;
  batchName: string;
  subjectName: string;
  changes: {
    field: 'day' | 'time' | 'room' | 'teacher';
    oldValue: string;
    newValue: string;
  }[];
  generatedAnnouncementText: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  subject: string;
  type: 'pdf' | 'video' | 'notes' | 'document' | 'other';
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  downloadUrl?: string;
  storagePath?: string;
  uploaderId?: string;
  uploaderName?: string;
  description?: string;
}

// ==========================================
// Phase 4: Timetable Module Schema & Types
// ==========================================

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimetableSlot {
  id: string;
  batchId: string;
  batchName: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  day: DayOfWeek;
  startTime: string; // 24-hour format "HH:mm" (e.g. "10:00")
  endTime: string;   // 24-hour format "HH:mm" (e.g. "10:45")
  roomId: string;
  roomName: string;
  color?: string;    // Hex accent color for UI badge / calendar cell
  academicYear?: string; // e.g. "2026-2027"
  status?: 'active' | 'cancelled' | 'rescheduled';
  // Legacy UI convenience aliases (for backwards compatibility)
  subject?: string;
  time?: string;
  room?: string;
  createdAt: string; // ISO 8601 string timestamp
  updatedAt: string; // ISO 8601 string timestamp
  createdBy?: string;
}

export type TimetableConflictType = 'teacher' | 'room' | 'batch';

export interface TimetableConflict {
  type: TimetableConflictType;
  conflictingSlot: TimetableSlot;
  message: string;
}

export interface TimetableSlotInput {
  batchId: string;
  batchName?: string;
  subjectId: string;
  subjectName?: string;
  teacherId: string;
  teacherName?: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName?: string;
  color?: string;
  academicYear?: string;
}

export interface TimetableQueryFilter {
  batchId?: string;
  teacherId?: string;
  roomId?: string;
  day?: DayOfWeek;
  academicYear?: string;
}

export interface WhatsAppMessage {
  id: string;
  recipientName: string;
  recipientPhone: string;
  recipientRole: 'parent' | 'student' | 'teacher';
  type: 'absence_alert' | 'fee_reminder' | 'payment_receipt' | 'report_card' | 'broadcast';
  content: string;
  status: 'delivered' | 'sent' | 'read';
  timestamp: string;
  meta?: {
    studentName?: string;
    batchName?: string;
    amount?: number;
    paymentLink?: string;
    pdfType?: string;
    announcementId?: string;
    announcementTitle?: string;
    priority?: string;
  };
}

export interface DashboardStats {
  totalStudents: number;
  activeBatches: number;
  monthlyRevenue: number;
  pendingFeeTotal: number;
  todayAttendancePercent: number;
  totalAbsenteesToday: number;
  upcomingTestsCount: number;
  whatsAppMessagesSentToday: number;
}

// ==========================================
// Phase 1: Settings Module Schema & Types
// ==========================================

export interface SettingsAuditMeta {
  updatedAt: string;       // ISO 8601 string timestamp
  updatedBy: string;       // User ID or Email of the updating admin
  version: number;         // Incremental version number
}

export interface SchoolInfoSettings extends SettingsAuditMeta {
  id: 'schoolInfo';
  institutionName: string;
  tagline: string;
  affiliationNumber?: string;
  taxNumber?: string;      // GSTIN or Tax Reg ID
  email: string;
  phone: string;
  alternatePhone?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logoUrl: string;
  stampUrl?: string;
  currency: string;        // e.g. 'INR', 'USD'
  currencySymbol: string;  // e.g. '₹', '$'
  timezone: string;        // e.g. 'Asia/Kolkata'
  academicYear: string;    // e.g. '2026-2027'
}

export interface InstallmentPlanOption {
  id: string;
  name: string;            // e.g. 'Lump-Sum (Single Pay)', 'Quarterly (4 Installments)'
  installmentCount: number;
  splitPercentages: number[]; // e.g. [40, 30, 30] or [100]
  description?: string;
}

export interface FeeStructureSettings extends SettingsAuditMeta {
  id: 'feeStructure';
  academicYear: string;
  defaultInstallmentCount: number;
  availablePlans: InstallmentPlanOption[];
  lateFeeEnabled: boolean;
  lateFeeGraceDays: number;         // Number of grace days after due date before late fee starts
  lateFeeDailyAmount: number;       // Fine per day after grace period
  lateFeeMaxCap: number;            // Maximum late fee cap amount
  allowedPaymentModes: ('UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'Razorpay')[];
  autoSendRemindersDaysBeforeDue: number[]; // e.g. [7, 3, 1] days prior to due date
  upiId?: string;                   // Institute UPI VPA (e.g. apexcoaching@icici)
  upiPayeeName?: string;            // Official Payee Name
}

export interface NotificationTemplateItem {
  id: string;
  title: string;
  category: 'absence_alert' | 'fee_reminder' | 'payment_receipt' | 'report_card' | 'broadcast' | 'batch_announcement';
  channel: 'whatsapp' | 'sms' | 'email';
  enabled: boolean;
  subject?: string;                 // For email notifications
  bodyTemplate: string;             // Text body with {{variable}} placeholders
  variables: string[];              // List of supported variables, e.g. ['studentName', 'date']
}

export interface NotificationTemplatesSettings extends SettingsAuditMeta {
  id: 'notificationTemplates';
  defaultSenderChannel: 'whatsapp' | 'sms' | 'email';
  templates: {
    absenceAlert: NotificationTemplateItem;
    feeReminder: NotificationTemplateItem;
    paymentReceipt: NotificationTemplateItem;
    reportCard: NotificationTemplateItem;
    broadcast: NotificationTemplateItem;
    batchAnnouncement: NotificationTemplateItem;
  };
}

export interface GradeBoundary {
  grade: string;                    // e.g. 'A+', 'A', 'B+', 'B', 'C', 'D', 'F'
  minScore: number;                 // e.g. 90
  maxScore: number;                 // e.g. 100
  gpaPoint: number;                 // e.g. 10.0 or 4.0
  remarks: string;                  // e.g. 'Outstanding Performance'
  colorHex: string;                 // e.g. '#10b981'
}

export interface GradingScaleSettings extends SettingsAuditMeta {
  id: 'gradingScale';
  scaleName: string;                // e.g. 'Standard 10-Point Grading Scale'
  evaluationMode: 'percentage' | 'marks' | 'gpa';
  passingPercentage: number;        // e.g. 40
  passingGrade: string;             // e.g. 'D'
  grades: GradeBoundary[];
}

export interface GlobalSettings {
  schoolInfo: SchoolInfoSettings;
  feeStructure: FeeStructureSettings;
  notificationTemplates: NotificationTemplatesSettings;
  gradingScale: GradingScaleSettings;
}

// Re-export Phase 7 Student Progress Types
export * from './student-progress-types';

// ==========================================
// Phase 9: Announcement Module Schema & Types
// ==========================================

export type AnnouncementAudienceType = 'all' | 'batch' | 'individual';
export type AnnouncementChannel = 'in-app' | 'whatsapp' | 'email';
export type AnnouncementStatus = 'draft' | 'sent' | 'failed';
export type AnnouncementPriority = 'normal' | 'urgent' | 'pinned';

export interface Announcement {
  id: string; // Primary Key: `ann-${Date.now()}-${random}`
  title: string; // Short announcement heading
  message: string; // Main announcement body
  audienceType: AnnouncementAudienceType; // 'all' | 'batch' | 'individual'
  audienceIds: string[]; // Batch IDs or specific member IDs; empty if audienceType is 'all'
  channels: AnnouncementChannel[]; // ['in-app', 'whatsapp', 'email']
  senderId: string; // Admin / Faculty UID who created the announcement
  senderName?: string; // Display name of creator (e.g., "Director / Administration")
  senderRole?: 'admin' | 'teacher';
  status: AnnouncementStatus; // 'draft' | 'sent' | 'failed'
  priority?: AnnouncementPriority; // Default: 'normal'
  templateId?: string | null; // Optional link to Settings NotificationTemplateItem
  batchNames?: string[]; // Denormalized batch names for fast display in feeds
  targetRoles?: ('student' | 'teacher' | 'parent')[]; // Role filter if audienceType === 'all'
  createdAt: string; // ISO 8601 string
  sentAt?: string | null; // ISO 8601 string (set upon actual dispatch)
  updatedAt?: string; // ISO 8601 string

  // Snake_case aliases for backwards / external schema compatibility
  audience_type?: AnnouncementAudienceType;
  audience_ids?: string[];
  sender_id?: string;
  created_at?: string;
  sent_at?: string | null;
}

// ==========================================
// Phase 12: Faculty Payroll & Salary Module
// ==========================================

export type SalaryStructureType = 'fixed' | 'per_lecture' | 'hybrid';

export interface SalaryStructure {
  id: string;                  // structure ID (e.g. struct_teach123_timestamp)
  teacherId: string;
  teacherName?: string;
  facultyId?: string;          // Custom ID (e.g. "FAC-2026-001")
  type: SalaryStructureType;
  baseAmount: number;          // In paise (e.g. 5000000 = ₹50,000); 0 for pure per_lecture
  perLectureRate: number;      // In paise (e.g. 80000 = ₹800); 0 for pure fixed
  effectiveFrom: string;       // ISO date string; never edited in place — superseded by a new row
  effectiveTo: string | null;  // null = currently active
  createdBy: string;
  createdAt: string;
}

export type PayrollStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface LineItem {
  id?: string;
  label: string;               // e.g. "Monthly Base Salary", "42 Lectures @ ₹800", "TDS Deduction"
  type: 'earning' | 'deduction';
  amount: number;              // In paise, always positive
  meta?: Record<string, unknown>; // e.g. { lectureCount: 42, hourlyRate: 80000 }
}

export interface PayrollRecord {
  id: string;                  // Deterministic ID: `${teacherId}_${period}` (e.g. "teach123_2026-09")
  teacherId: string;
  teacherName?: string;
  facultyId?: string;
  period: string;              // "YYYY-MM" (e.g. "2026-09")
  status: PayrollStatus;
  lineItems: LineItem[];
  gross: number;               // In paise
  totalDeductions: number;     // In paise
  net: number;                 // In paise (gross - totalDeductions, clamped >= 0)
  structureSnapshot: SalaryStructure; // Frozen rates snapshot used for this record
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  paymentMode?: 'UPI' | 'Bank Transfer' | 'Cheque' | 'Cash';
  paymentRef?: string;         // UTR / Cheque / Transaction reference
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollAuditEntry {
  id: string;
  action: 'generate' | 'approve' | 'markPaid' | 'cancel' | 'update_structure';
  recordId: string;
  actorUid: string;
  actorName?: string;
  before: Partial<PayrollRecord | SalaryStructure> | null;
  after: Partial<PayrollRecord | SalaryStructure>;
  timestamp: string;
}
