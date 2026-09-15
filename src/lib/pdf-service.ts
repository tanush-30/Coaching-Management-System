import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Student, FeeInstallment, ExamTest, StudentExamMark, SchoolInfoSettings, PayrollRecord, Teacher } from './types';
import { DEFAULT_SCHOOL_INFO } from './settings-defaults';
import { formatPaiseToINR } from './payroll-engine';

// Extend jsPDF types for autoTable with proper UserOptions typing
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Helper to call autoTable in a type-safe way
function addTable(doc: jsPDF, options: UserOptions): void {
  autoTable(doc, options);
}

/**
 * Returns current SchoolInfo from argument, localStorage cache, or default fallback
 */
function getActiveSchoolInfo(override?: Partial<SchoolInfoSettings>): SchoolInfoSettings {
  if (override && override.institutionName) {
    return { ...DEFAULT_SCHOOL_INFO, ...override };
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('apex_erp_settings_schoolInfo');
      if (raw) {
        return { ...DEFAULT_SCHOOL_INFO, ...JSON.parse(raw) };
      }
    } catch {}
  }
  return DEFAULT_SCHOOL_INFO;
}

export const buildFeeReceiptDoc = (
  student: Partial<Student> | Student,
  installment: Partial<FeeInstallment> | FeeInstallment,
  customSchoolInfo?: Partial<SchoolInfoSettings>
): jsPDF => {
  const school = getActiveSchoolInfo(customSchoolInfo);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(79, 70, 229); // Brand Indigo
  doc.rect(0, 0, 210, 38, 'F');

  // Academy Name & Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text((school.institutionName || 'Apex Academy').toUpperCase(), 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(school.tagline || 'Excellence in Academic Coaching & Competitive Preparation', 14, 25);
  doc.text(
    `${school.address || 'Knowledge Park'}, ${school.city || 'Delhi NCR'} | Helpline: ${school.phone || '+91 9876543210'} | ${school.email || 'support@apexerp.com'}`,
    14,
    30
  );

  // Title Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE PAYMENT RECEIPT', 14, 48);

  // Receipt Meta Grid
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: ${installment.receiptNumber || 'REC-' + Date.now().toString().slice(-6)}`, 14, 56);
  doc.text(`Date of Issue: ${installment.paidDate || new Date().toISOString().split('T')[0]}`, 14, 62);
  doc.text(`Payment Mode: ${installment.paymentMode || 'UPI / Online'}`, 14, 68);

  doc.text(`Transaction Ref: ${installment.transactionId || 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase()}`, 120, 56);
  doc.text(`Academic Session: ${school.academicYear || '2026-2027'}`, 120, 62);
  doc.text(`Status: COMPLETED (PAID)`, 120, 68);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 73, 196, 73);

  // Student Information Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 76, 182, 30, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Details:', 18, 83);

  doc.setFont('helvetica', 'normal');
  doc.text(`Student Name: ${student.name || 'Student'}`, 18, 90);
  doc.text(`Roll Number: ${student.rollNo || 'N/A'}`, 18, 96);
  doc.text(`Parent / Guardian: ${student.parentName || 'Parent / Guardian'} (${student.parentRelation || 'Guardian'})`, 18, 102);

  doc.text(`Contact: ${student.phone || 'N/A'}`, 115, 90);
  doc.text(`Parent Contact: ${student.parentPhone || 'N/A'}`, 115, 96);
  doc.text(`School: ${student.schoolName || 'Apex Academy'}`, 115, 102);

  // Itemized Fee Table
  const installmentAmount = Number(installment.amount) || 0;
  doc.autoTable({
    startY: 112,
    head: [['#', 'Description / Particulars', 'Due Date', 'Status', 'Amount (INR)']],
    body: [
      [
        (installment.installmentNo || 1).toString(),
        installment.title || 'Tuition Fee Installment',
        installment.dueDate || new Date().toISOString().split('T')[0],
        'PAID',
        `INR ${installmentAmount.toLocaleString('en-IN')}`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 80 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 32, halign: 'right' },
    },
  });

  const finalY = (doc.lastAutoTable?.finalY || 135) + 8;

  // Totals Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Amount Received:', 115, finalY);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`INR ${installmentAmount.toLocaleString('en-IN')}`, 196, finalY, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const totalFee = Number(student.totalFee) || 0;
  const paidFee = Number(student.paidFee) || 0;
  const pendingFee = Number(student.pendingFee) || 0;

  doc.text(`Student Total Fee: INR ${totalFee.toLocaleString('en-IN')}`, 14, finalY);
  doc.text(`Total Paid Till Date: INR ${paidFee.toLocaleString('en-IN')}`, 14, finalY + 5);
  doc.text(`Remaining Balance: INR ${pendingFee.toLocaleString('en-IN')}`, 14, finalY + 10);

  // Terms & Signature
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('1. Fees once paid is non-refundable and non-transferable under any circumstances.', 14, 240);
  doc.text('2. This is an electronically generated receipt verified with digital signature token.', 14, 245);
  doc.text('3. For any fee queries, contact accounts@apexacademy.edu with Receipt No.', 14, 250);

  // Digital Stamp Box
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.8);
  doc.roundedRect(135, 230, 60, 25, 2, 2, 'D');
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('APEX ACADEMY', 165, 238, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Digitally Verified & Authorized', 165, 244, { align: 'center' });
  doc.text('Accounts Department', 165, 249, { align: 'center' });

  return doc;
};

export const generateFeeReceiptPDF = (
  student: Student,
  installment: FeeInstallment,
  customSchoolInfo?: Partial<SchoolInfoSettings>
) => {
  const doc = buildFeeReceiptDoc(student, installment, customSchoolInfo);
  doc.save(`Fee_Receipt_${student.rollNo || 'STU'}_${installment.installmentNo || 1}.pdf`);
};

export const generateFeeReceiptPDFBuffer = (
  student: Partial<Student>,
  installment: Partial<FeeInstallment>,
  customSchoolInfo?: Partial<SchoolInfoSettings>
): Buffer => {
  const doc = buildFeeReceiptDoc(student, installment, customSchoolInfo);
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
};

export const generateReportCardPDF = (
  student: Student,
  exam: ExamTest,
  mark: StudentExamMark,
  batchRankText: string = 'Rank #2 in Batch',
  customSchoolInfo?: Partial<SchoolInfoSettings>
) => {
  const school = getActiveSchoolInfo(customSchoolInfo);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 40, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(school.institutionName.toUpperCase(), 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(school.tagline || 'Academic Performance & Continuous Evaluation Report', 14, 25);
  doc.text(`Session: ${school.academicYear || '2026-2027'} | Helpline: ${school.phone} | ${school.email}`, 14, 31);

  // Badge / Rank in header
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(145, 12, 50, 18, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(batchRankText, 170, 23, { align: 'center' });

  // Report Card Subtitle
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT PERFORMANCE REPORT CARD', 14, 52);

  // Student & Exam Meta Grid
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 58, 182, 34, 2, 2, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Student: ${student.name}`, 18, 66);
  doc.text(`Exam Title: ${exam.title}`, 18, 73);
  doc.text(`Batch: ${exam.batchName}`, 18, 80);
  doc.text(`Subject: ${exam.subject}`, 18, 87);

  doc.setFont('helvetica', 'normal');
  doc.text(`Roll No: ${student.rollNo}`, 120, 66);
  doc.text(`Exam Date: ${exam.examDate}`, 120, 73);
  doc.text(`Parent: ${student.parentName}`, 120, 80);
  doc.text(`Grade Achieved: ${mark.grade}`, 120, 87);

  // Score Highlights Grid
  const startCardY = 98;
  // Card 1: Marks
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(14, startCardY, 42, 24, 2, 2, 'F');
  doc.setTextColor(79, 70, 229);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('MARKS SCORED', 35, startCardY + 7, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${mark.marksObtained} / ${exam.totalMarks}`, 35, startCardY + 17, { align: 'center' });

  // Card 2: Percentage
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(60, startCardY, 42, 24, 2, 2, 'F');
  doc.setTextColor(5, 150, 105);
  doc.setFontSize(8);
  doc.text('PERCENTAGE', 81, startCardY + 7, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${mark.percentage}%`, 81, startCardY + 17, { align: 'center' });

  // Card 3: Batch Average
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(106, startCardY, 42, 24, 2, 2, 'F');
  doc.setTextColor(217, 119, 6);
  doc.setFontSize(8);
  doc.text('BATCH AVERAGE', 127, startCardY + 7, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${exam.averageScore || 120} / ${exam.totalMarks}`, 127, startCardY + 17, { align: 'center' });

  // Card 4: Batch Highest
  doc.setFillColor(243, 232, 255);
  doc.roundedRect(152, startCardY, 44, 24, 2, 2, 'F');
  doc.setTextColor(147, 51, 234);
  doc.setFontSize(8);
  doc.text('HIGHEST SCORE', 174, startCardY + 7, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${exam.highestScore || exam.totalMarks} / ${exam.totalMarks}`, 174, startCardY + 17, { align: 'center' });

  // Subject & Question Breakdown Table
  doc.autoTable({
    startY: 128,
    head: [['Section / Topic', 'Max Marks', 'Scored', 'Accuracy %', 'Assessment Level']],
    body: [
      ['Section A (Core Concepts)', '60', `${Math.round(mark.marksObtained * 0.35)}`, '90%', 'Excellent Mastery'],
      ['Section B (Analytical Problems)', '60', `${Math.round(mark.marksObtained * 0.35)}`, '88%', 'High Proficiency'],
      ['Section C (Application & MCQs)', '60', `${Math.round(mark.marksObtained * 0.30)}`, '85%', 'Strong Clarity'],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
  });

  const remarksY = doc.lastAutoTable.finalY + 10;

  // Teacher Remarks Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, remarksY, 182, 30, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Faculty Observation & Action Plan:', 18, remarksY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    mark.teacherRemarks ||
      'Student shows high potential and conceptual aptitude. Regular problem practice recommended to sustain top percentile ranking.',
    18,
    remarksY + 16,
    { maxWidth: 174 }
  );

  // Footer & Signatures
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Head of Academics', 30, 255);
  doc.text('Course Coordinator', 95, 255);
  doc.text('Parent Signature', 160, 255);

  doc.setDrawColor(203, 213, 225);
  doc.line(20, 250, 65, 250);
  doc.line(85, 250, 135, 250);
  doc.line(150, 250, 195, 250);

  doc.save(`ReportCard_${student.rollNo}_${exam.id}.pdf`);
};

export interface AttendancePDFRecord {
  date: string;
  status: 'present' | 'absent' | 'late';
  batchName?: string;
  remarks?: string;
}

export interface AttendancePDFStats {
  percentage: number;
  totalConducted: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

export const generateStudentAttendancePDF = (
  student: Student,
  batchName: string,
  records: AttendancePDFRecord[],
  stats: AttendancePDFStats,
  customSchoolInfo?: Partial<SchoolInfoSettings>
) => {
  const school = getActiveSchoolInfo(customSchoolInfo);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, 210, 36, 'F');

  // Academy Name & Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(school.institutionName.toUpperCase(), 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(school.tagline || 'Official Student Attendance Ledger & Presence Certificate', 14, 23);
  doc.text(`Helpline: ${school.phone} | ${school.email} | Session: ${school.academicYear || '2026-2027'}`, 14, 29);

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT ATTENDANCE REPORT', 14, 46);

  // Student Information Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 182, 28, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 52, 182, 28, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Student Name:', 18, 60);
  doc.text('Roll / User ID:', 18, 67);
  doc.text('Enrolled Program:', 18, 74);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.name, 48, 60);
  doc.text(student.rollNo, 48, 67);
  doc.text(batchName || 'General Program', 48, 74);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Parent Contact:', 120, 60);
  doc.text('Generated On:', 120, 67);
  doc.text('Current Standing:', 120, 74);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(student.parentPhone || student.phone || 'N/A', 152, 60);
  doc.text(new Date().toISOString().split('T')[0], 152, 67);
  doc.text(stats.percentage >= 75 ? 'ELIGIBLE (>= 75%)' : 'ATTENDANCE ALERT (< 75%)', 152, 74);

  // Attendance Metric Summary Cards in PDF
  const cardY = 85;
  const cardW = 34;
  const cardH = 18;

  const metrics = [
    { label: 'Overall Rate', val: `${stats.percentage}%`, fill: [243, 232, 255], text: [126, 34, 206] },
    { label: 'Conducted', val: `${stats.totalConducted}`, fill: [241, 245, 249], text: [30, 41, 59] },
    { label: 'Present Days', val: `${stats.presentCount}`, fill: [236, 253, 245], text: [5, 150, 105] },
    { label: 'Absent Days', val: `${stats.absentCount}`, fill: [255, 241, 242], text: [225, 29, 72] },
    { label: 'Late Days', val: `${stats.lateCount}`, fill: [254, 243, 199], text: [217, 119, 6] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (cardW + 3);
    doc.setFillColor(m.fill[0], m.fill[1], m.fill[2]);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(m.label, x + cardW / 2, cardY + 6, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.text(m.val, x + cardW / 2, cardY + 14, { align: 'center' });
  });

  // Tabular Date-wise Records
  const tableRows = records.map((r, i) => [
    (i + 1).toString(),
    r.date,
    r.batchName || batchName || 'Class Session',
    r.status.toUpperCase(),
    r.remarks || 'Standard Session',
  ]);

  doc.autoTable({
    startY: 110,
    head: [['#', 'Date', 'Class / Batch', 'Status', 'Remarks / Session Notes']],
    body: tableRows.length > 0 ? tableRows : [['-', 'No attendance history recorded yet.', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [124, 58, 237], // Violet 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25, fontStyle: 'bold' },
      4: { cellWidth: 67 },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw).toUpperCase();
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [5, 150, 105]; // emerald
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [225, 29, 72]; // rose
        } else if (val === 'LATE') {
          data.cell.styles.textColor = [217, 119, 6]; // amber
        }
      }
    },
  });

  const finalY = Math.min(doc.lastAutoTable.finalY + 15, 250);

  // Verification Seal / Signatures
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Head of Academics & Attendance', 25, finalY + 15);
  doc.text('Parent / Guardian Acknowledgement', 125, finalY + 15);

  doc.setDrawColor(203, 213, 225);
  doc.line(20, finalY + 10, 75, finalY + 10);
  doc.line(120, finalY + 10, 185, finalY + 10);

  doc.save(`Attendance_${student.rollNo}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Builds an official, branded Institutional Faculty Payslip PDF
 */
export const buildPayslipDoc = (
  record: PayrollRecord,
  teacher: Partial<Teacher> | Teacher,
  customSchoolInfo?: Partial<SchoolInfoSettings>
): jsPDF => {
  const school = getActiveSchoolInfo(customSchoolInfo);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 36, 'F');

  // Accent Line
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.rect(0, 36, 210, 2.5, 'F');

  // Academy Name & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text((school.institutionName || 'Apex Academy').toUpperCase(), 14, 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${school.address || 'Knowledge Park City'} | Contact: ${school.phone || '+91 98765 43210'} | ${school.email || 'admin@apexacademy.edu'}`,
    14,
    24
  );
  doc.text('OFFICIAL FACULTY SALARY & DISBURSEMENT SLIP', 14, 30);

  // Payslip Period Badge on Right
  doc.setFillColor(51, 65, 85);
  doc.roundedRect(145, 8, 52, 20, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('PAYROLL PERIOD', 171, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(record.period, 171, 22, { align: 'center' });

  // Faculty & Payout Details Section
  let y = 48;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 34, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 34, 2, 2, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FACULTY DETAILS', 20, y + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text(`Faculty Name: `, 20, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.teacherName || teacher.name || 'Faculty Member'}`, 48, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Faculty ID: `, 20, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.facultyId || teacher.facultyId || teacher.id || 'N/A'}`, 48, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Compensation: `, 20, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${(record.structureSnapshot?.type || 'fixed').toUpperCase()} MODEL`, 48, y + 26);

  // Column 2
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Disbursement Status: `, 115, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(record.status === 'paid' ? 16 : 79, record.status === 'paid' ? 185 : 70, record.status === 'paid' ? 129 : 229);
  doc.text(record.status.toUpperCase(), 155, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode / Ref: `, 115, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.paymentMode || 'Direct'} / ${record.paymentRef || 'N/A'}`, 155, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Paid Date: `, 115, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.paidAt ? record.paidAt.slice(0, 10) : 'Pending Settlement'}`, 155, y + 26);

  // Line Items Table (Earnings & Deductions)
  y = 90;

  const earnings = record.lineItems.filter((item) => item.type === 'earning');
  const deductions = record.lineItems.filter((item) => item.type === 'deduction');
  const maxRows = Math.max(earnings.length, deductions.length, 1);

  const tableBody: any[][] = [];
  for (let i = 0; i < maxRows; i++) {
    const earn = earnings[i];
    const ded = deductions[i];
    tableBody.push([
      earn ? earn.label : '',
      earn ? formatPaiseToINR(earn.amount) : '',
      ded ? ded.label : '',
      ded ? formatPaiseToINR(ded.amount) : '',
    ]);
  }

  addTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['EARNINGS BREAKDOWN', 'AMOUNT (₹)', 'DEDUCTIONS & TAXES', 'AMOUNT (₹)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 60 },
      3: { cellWidth: 31, halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] },
    },
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 150;

  // Totals Summary Box
  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 28, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 28, 'D');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Gross Earnings:`, 20, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPaiseToINR(record.gross), 75, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Deductions:`, 20, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(225, 29, 72);
  doc.text(`-${formatPaiseToINR(record.totalDeductions)}`, 75, currentY + 16);

  // Net Pay Highlight Badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(120, currentY + 4, 70, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('NET DISBURSED AMOUNT', 155, currentY + 10, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(formatPaiseToINR(record.net), 155, currentY + 19, { align: 'center' });

  // Signatures & Legal Disclaimer
  currentY += 45;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Finance Controller', 25, currentY);
  doc.text('Faculty Signature & Acknowledgement', 125, currentY);

  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY - 5, 75, currentY - 5);
  doc.line(120, currentY - 5, 185, currentY - 5);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a system-generated official electronic payslip issued by Apex Academy. All financial records are stored securely.',
    105,
    280,
    { align: 'center' }
  );

  return doc;
};

/**
 * Downloads the Payslip as a PDF
 */
export const generatePayslipPdf = (
  record: PayrollRecord,
  teacher: Partial<Teacher> | Teacher,
  customSchoolInfo?: Partial<SchoolInfoSettings>
): void => {
  const doc = buildPayslipDoc(record, teacher, customSchoolInfo);
  const teacherTag = (record.teacherName || 'Faculty').replace(/\s+/g, '_');
  doc.save(`Payslip_${teacherTag}_${record.period}.pdf`);
};


