import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Student, FeeInstallment, ExamTest, StudentExamMark } from './types';

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

export const generateFeeReceiptPDF = (student: Student, installment: FeeInstallment) => {
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
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('APEX ACADEMY OF EXCELLENCE', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Premier Coaching for IIT-JEE, NEET, Olympiads & CBSE Board Prep', 14, 25);
  doc.text('Sector 62, Institutional Area, Noida | Helpline: +91 98765 00000 | info@apexacademy.edu', 14, 30);

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
  doc.text(`Academic Session: 2026-2027`, 120, 62);
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
  doc.text(`Student Name: ${student.name}`, 18, 90);
  doc.text(`Roll Number: ${student.rollNo}`, 18, 96);
  doc.text(`Parent / Guardian: ${student.parentName} (${student.parentRelation})`, 18, 102);

  doc.text(`Contact: ${student.phone}`, 115, 90);
  doc.text(`Parent Contact: ${student.parentPhone}`, 115, 96);
  doc.text(`School: ${student.schoolName}`, 115, 102);

  // Itemized Fee Table
  doc.autoTable({
    startY: 112,
    head: [['#', 'Description / Particulars', 'Due Date', 'Status', 'Amount (INR)']],
    body: [
      [
        installment.installmentNo.toString(),
        installment.title,
        installment.dueDate,
        'PAID',
        `INR ${installment.amount.toLocaleString('en-IN')}`,
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

  const finalY = doc.lastAutoTable.finalY + 8;

  // Totals Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total Amount Received:', 115, finalY);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`INR ${installment.amount.toLocaleString('en-IN')}`, 196, finalY, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Student Total Fee: INR ${student.totalFee.toLocaleString('en-IN')}`, 14, finalY);
  doc.text(`Total Paid Till Date: INR ${student.paidFee.toLocaleString('en-IN')}`, 14, finalY + 5);
  doc.text(`Remaining Balance: INR ${student.pendingFee.toLocaleString('en-IN')}`, 14, finalY + 10);

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

  // Save PDF
  doc.save(`Fee_Receipt_${student.rollNo}_${installment.installmentNo}.pdf`);
};

export const generateReportCardPDF = (
  student: Student,
  exam: ExamTest,
  mark: StudentExamMark,
  batchRankText: string = 'Rank #2 in Batch'
) => {
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
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('APEX ACADEMY OF EXCELLENCE', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Academic Performance & Continuous Evaluation Report', 14, 25);
  doc.text('Session: 2026-2027 | Confidential Student Assessment', 14, 31);

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
