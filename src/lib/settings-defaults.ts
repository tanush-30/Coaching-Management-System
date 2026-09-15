// Default seed configurations for ApexERP Global Settings
// Provides guaranteed production fallback values when Firestore documents are uninitialized

import {
  SchoolInfoSettings,
  FeeStructureSettings,
  NotificationTemplatesSettings,
  GradingScaleSettings,
  GlobalSettings,
} from './types';

export const DEFAULT_AUDIT_META = {
  updatedAt: new Date().toISOString(),
  updatedBy: 'system-bootstrap@apexcoaching.com',
  version: 1,
};

export const DEFAULT_SCHOOL_INFO: SchoolInfoSettings = {
  ...DEFAULT_AUDIT_META,
  id: 'schoolInfo',
  institutionName: 'Apex Institute of Science & Commerce',
  tagline: 'Empowering Future Leaders with Academic Excellence',
  affiliationNumber: 'AFF-2026-CBSE-9941',
  taxNumber: 'GSTIN27AAACR1234F1Z5',
  email: 'contact@apexcoaching.com',
  phone: '+91 98765 43210',
  alternatePhone: '+91 98765 43211',
  website: 'https://apexcoaching.edu',
  address: 'Plot 42, Knowledge Park III, Silicon Valley Enclave',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560100',
  logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&h=200&fit=crop&crop=faces',
  stampUrl: '',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  academicYear: '2026-2027',
};

export const DEFAULT_FEE_STRUCTURE: FeeStructureSettings = {
  ...DEFAULT_AUDIT_META,
  id: 'feeStructure',
  academicYear: '2026-2027',
  defaultInstallmentCount: 3,
  availablePlans: [
    {
      id: 'plan-single',
      name: 'Full Lump-Sum (Single Payment)',
      installmentCount: 1,
      splitPercentages: [100],
      description: '100% tuition paid upfront at enrollment with 5% early discount',
    },
    {
      id: 'plan-bi-annual',
      name: 'Bi-Annual (2 Installments)',
      installmentCount: 2,
      splitPercentages: [50, 50],
      description: 'Paid in 2 equal half-yearly terms (Term 1 & Term 2)',
    },
    {
      id: 'plan-tri-term',
      name: 'Tri-Term (3 Installments - Recommended)',
      installmentCount: 3,
      splitPercentages: [40, 30, 30],
      description: '40% upon admission, 30% at mid-term, 30% before finals',
    },
    {
      id: 'plan-quarterly',
      name: 'Quarterly (4 Installments)',
      installmentCount: 4,
      splitPercentages: [25, 25, 25, 25],
      description: '4 equal quarterly installments across academic session',
    },
  ],
  lateFeeEnabled: true,
  lateFeeGraceDays: 7,
  lateFeeDailyAmount: 50,
  lateFeeMaxCap: 1500,
  allowedPaymentModes: ['UPI', 'Cash', 'Card', 'Bank Transfer', 'Razorpay'],
  autoSendRemindersDaysBeforeDue: [7, 3, 1],
  upiId: 'apexcoaching@icici',
  upiPayeeName: 'Apex Institute of Science & Commerce',
};

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplatesSettings = {
  ...DEFAULT_AUDIT_META,
  id: 'notificationTemplates',
  defaultSenderChannel: 'whatsapp',
  templates: {
    absenceAlert: {
      id: 'template-absence',
      title: 'Daily Student Absence Alert',
      category: 'absence_alert',
      channel: 'whatsapp',
      enabled: true,
      subject: 'Urgent: Student Attendance Alert - {{schoolName}}',
      bodyTemplate:
        'Dear Parent, this is to notify you that {{studentName}} was marked ABSENT today ({{date}}) in batch {{batchName}}. Please contact the institute at {{schoolPhone}} if this was unexpected.',
      variables: ['studentName', 'date', 'batchName', 'schoolName', 'schoolPhone'],
    },
    feeReminder: {
      id: 'template-fee-reminder',
      title: 'Fee Installment Due Reminder',
      category: 'fee_reminder',
      channel: 'whatsapp',
      enabled: true,
      subject: 'Fee Due Reminder: {{installmentTitle}} - {{studentName}}',
      bodyTemplate:
        'Dear Parent, a friendly reminder that the fee installment "{{installmentTitle}}" of {{currencySymbol}}{{amount}} for {{studentName}} is due on {{dueDate}}. Pay instantly online: {{paymentLink}}',
      variables: ['installmentTitle', 'amount', 'currencySymbol', 'studentName', 'dueDate', 'paymentLink', 'schoolName'],
    },
    paymentReceipt: {
      id: 'template-payment-receipt',
      title: 'Fee Payment Confirmation & Receipt',
      category: 'payment_receipt',
      channel: 'whatsapp',
      enabled: true,
      subject: 'Payment Receipt: {{receiptNumber}} - {{schoolName}}',
      bodyTemplate:
        'Payment of {{currencySymbol}}{{amount}} received for {{studentName}} via {{paymentMode}} (Txn ID: {{transactionId}}, Receipt: {{receiptNumber}}). Thank you for your prompt payment! Download receipt: {{receiptUrl}}',
      variables: ['amount', 'currencySymbol', 'studentName', 'paymentMode', 'transactionId', 'receiptNumber', 'receiptUrl', 'schoolName'],
    },
    reportCard: {
      id: 'template-report-card',
      title: 'Exam Scorecard & Rank Notification',
      category: 'report_card',
      channel: 'whatsapp',
      enabled: true,
      subject: 'Exam Results: {{examTitle}} - {{studentName}}',
      bodyTemplate:
        'Exam scorecard declared for {{studentName}} in {{examTitle}} ({{subject}}). Score: {{marksObtained}}/{{totalMarks}} ({{percentage}}%), Grade: {{grade}}, Rank: #{{rank}}. Keep up the great work!',
      variables: ['studentName', 'examTitle', 'subject', 'marksObtained', 'totalMarks', 'percentage', 'grade', 'rank', 'teacherRemarks'],
    },
    broadcast: {
      id: 'template-broadcast',
      title: 'General Institute Broadcast',
      category: 'broadcast',
      channel: 'whatsapp',
      enabled: true,
      subject: 'Important Announcement from {{schoolName}}',
      bodyTemplate:
        'Important notice from {{schoolName}}: {{messageContent}} - Admin Office ({{schoolPhone}}).',
      variables: ['schoolName', 'messageContent', 'schoolPhone'],
    },
    batchAnnouncement: {
      id: 'template-batch-announcement',
      title: 'Batch Class Schedule / Homework Notice',
      category: 'batch_announcement',
      channel: 'whatsapp',
      enabled: true,
      subject: 'Batch Update: {{batchName}}',
      bodyTemplate:
        'Notice for {{batchName}}: {{announcementText}}. Assigned by {{teacherName}}.',
      variables: ['batchName', 'announcementText', 'teacherName', 'schoolName'],
    },
  },
};

export const DEFAULT_GRADING_SCALE: GradingScaleSettings = {
  ...DEFAULT_AUDIT_META,
  id: 'gradingScale',
  scaleName: 'CBSE / State Board Standard 10-Point Grading Scale',
  evaluationMode: 'percentage',
  passingPercentage: 40,
  passingGrade: 'D',
  grades: [
    {
      grade: 'A+',
      minScore: 90,
      maxScore: 100,
      gpaPoint: 10.0,
      remarks: 'Outstanding Performance',
      colorHex: '#10b981',
    },
    {
      grade: 'A',
      minScore: 80,
      maxScore: 89.99,
      gpaPoint: 9.0,
      remarks: 'Excellent Mastery',
      colorHex: '#059669',
    },
    {
      grade: 'B+',
      minScore: 70,
      maxScore: 79.99,
      gpaPoint: 8.0,
      remarks: 'Very Good Understanding',
      colorHex: '#3b82f6',
    },
    {
      grade: 'B',
      minScore: 60,
      maxScore: 69.99,
      gpaPoint: 7.0,
      remarks: 'Good Competency',
      colorHex: '#6366f1',
    },
    {
      grade: 'C',
      minScore: 50,
      maxScore: 59.99,
      gpaPoint: 6.0,
      remarks: 'Satisfactory Progress',
      colorHex: '#f59e0b',
    },
    {
      grade: 'D',
      minScore: 40,
      maxScore: 49.99,
      gpaPoint: 5.0,
      remarks: 'Pass / Minimum Threshold',
      colorHex: '#ea580c',
    },
    {
      grade: 'F',
      minScore: 0,
      maxScore: 39.99,
      gpaPoint: 0.0,
      remarks: 'Needs Remedial Support / Re-evaluation',
      colorHex: '#ef4444',
    },
  ],
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  schoolInfo: DEFAULT_SCHOOL_INFO,
  feeStructure: DEFAULT_FEE_STRUCTURE,
  notificationTemplates: DEFAULT_NOTIFICATION_TEMPLATES,
  gradingScale: DEFAULT_GRADING_SCALE,
};
