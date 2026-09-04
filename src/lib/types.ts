export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export interface Student {
  id: string;
  rollNo: string;
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
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  subjects: string[];
  qualifications: string;
  joiningDate: string;
  status: 'active' | 'on_leave';
  assignedBatches: string[];
}

export interface Batch {
  id: string;
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
  paymentLink?: string;
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
  status: 'scheduled' | 'evaluated';
  averageScore?: number;
  highestScore?: number;
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
}

export interface Homework {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  subject: string;
  teacherName: string;
  assignedDate: string;
  dueDate: string;
  description: string;
  submissionCount: number;
  totalStudents: number;
  attachments?: { name: string; size: string }[];
}

export interface StudyMaterial {
  id: string;
  title: string;
  batchId: string;
  batchName: string;
  subject: string;
  type: 'pdf' | 'video' | 'notes';
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  batchName: string;
  subject: string;
  teacherName: string;
  room: string;
  color: string;
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
