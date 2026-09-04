'use client';

import { useState, useEffect } from 'react';
import {
  Student,
  Batch,
  FeeInstallment,
  Teacher,
  BatchAttendance,
  AttendanceRecord,
  ExamTest,
  StudentExamMark,
  Homework,
  StudyMaterial,
  WhatsAppMessage,
} from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_BATCHES,
  INITIAL_TEACHERS,
  INITIAL_INSTALLMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_EXAMS,
  INITIAL_MARKS,
  INITIAL_HOMEWORK,
  INITIAL_STUDY_MATERIALS,
  INITIAL_WHATSAPP_LOGS,
} from './mock-data';

const STORAGE_KEYS = {
  STUDENTS: 'apex_erp_students_v4',
  BATCHES: 'apex_erp_batches_v4',
  TEACHERS: 'apex_erp_teachers_v4',
  INSTALLMENTS: 'apex_erp_installments_v4',
  ATTENDANCE: 'apex_erp_attendance_v4',
  EXAMS: 'apex_erp_exams_v4',
  MARKS: 'apex_erp_marks_v4',
  HOMEWORK: 'apex_erp_homework_v4',
  MATERIALS: 'apex_erp_materials_v4',
  WHATSAPP: 'apex_erp_whatsapp_v4',
};

export function useERPStore() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [installments, setInstallments] = useState<FeeInstallment[]>(INITIAL_INSTALLMENTS);
  const [attendance, setAttendance] = useState<BatchAttendance[]>(INITIAL_ATTENDANCE);
  const [exams, setExams] = useState<ExamTest[]>(INITIAL_EXAMS);
  const [marks, setMarks] = useState<StudentExamMark[]>(INITIAL_MARKS);
  const [homework, setHomework] = useState<Homework[]>(INITIAL_HOMEWORK);
  const [materials, setMaterials] = useState<StudyMaterial[]>(INITIAL_STUDY_MATERIALS);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessage[]>(INITIAL_WHATSAPP_LOGS);

  useEffect(() => {
    try {
      const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (savedStudents) setStudents(JSON.parse(savedStudents));

      const savedBatches = localStorage.getItem(STORAGE_KEYS.BATCHES);
      if (savedBatches) setBatches(JSON.parse(savedBatches));

      const savedInstallments = localStorage.getItem(STORAGE_KEYS.INSTALLMENTS);
      if (savedInstallments) setInstallments(JSON.parse(savedInstallments));

      const savedAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (savedAttendance) setAttendance(JSON.parse(savedAttendance));

      const savedExams = localStorage.getItem(STORAGE_KEYS.EXAMS);
      if (savedExams) setExams(JSON.parse(savedExams));

      const savedMarks = localStorage.getItem(STORAGE_KEYS.MARKS);
      if (savedMarks) setMarks(JSON.parse(savedMarks));

      const savedHw = localStorage.getItem(STORAGE_KEYS.HOMEWORK);
      if (savedHw) setHomework(JSON.parse(savedHw));

      const savedWhatsapp = localStorage.getItem(STORAGE_KEYS.WHATSAPP);
      if (savedWhatsapp) setWhatsappLogs(JSON.parse(savedWhatsapp));
    } catch (e) {
      console.warn('Failed to load store from localStorage', e);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
      localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(installments));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
      localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify(marks));
      localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(homework));
      localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(whatsappLogs));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }, [students, batches, installments, attendance, exams, marks, homework, whatsappLogs, isHydrated]);

  // STUDENT ACTIONS
  const addStudent = (newStudent: Omit<Student, 'id' | 'rollNo' | 'paidFee' | 'pendingFee'>, installmentPlan?: { count: number; amounts: number[]; dueDates: string[] }) => {
    const nextNum = students.length + 1;
    const rollNo = `APX-2026-${String(nextNum).padStart(3, '0')}`;
    const id = `student-${Date.now()}`;

    const student: Student = {
      ...newStudent,
      id,
      rollNo,
      paidFee: 0,
      pendingFee: newStudent.totalFee,
    };

    setStudents(prev => [student, ...prev]);

    if (student.batchIds.length > 0) {
      setBatches(prev =>
        prev.map(b => (student.batchIds.includes(b.id) ? { ...b, enrolledCount: b.enrolledCount + 1 } : b))
      );
    }

    if (installmentPlan && installmentPlan.count > 0) {
      const generatedInstallments: FeeInstallment[] = installmentPlan.amounts.map((amount, idx) => ({
        id: `inst-${Date.now()}-${idx + 1}`,
        studentId: id,
        installmentNo: idx + 1,
        title: `Term ${idx + 1} Installment`,
        dueDate: installmentPlan.dueDates[idx] || new Date().toISOString().split('T')[0],
        amount,
        status: 'pending',
        paymentLink: `https://pages.razorpay.com/pl_apex_${student.name.toLowerCase().replace(/\s+/g, '_')}_term${idx + 1}`,
      }));
      setInstallments(prev => [...prev, ...generatedInstallments]);
    }

    return student;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteStudent = (id: string) => {
    const student = students.find(s => s.id === id);
    if (student && student.batchIds.length > 0) {
      setBatches(prev =>
        prev.map(b => (student.batchIds.includes(b.id) ? { ...b, enrolledCount: Math.max(0, b.enrolledCount - 1) } : b))
      );
    }
    setStudents(prev => prev.filter(s => s.id !== id));
    setInstallments(prev => prev.filter(inst => inst.studentId !== id));
  };

  // BATCH ACTIONS
  const addBatch = (newBatch: Omit<Batch, 'id' | 'enrolledCount'>) => {
    const id = `batch-${Date.now()}`;
    const batch: Batch = {
      ...newBatch,
      id,
      enrolledCount: 0,
    };
    setBatches(prev => [...prev, batch]);
    return batch;
  };

  const updateBatch = (id: string, updates: Partial<Batch>) => {
    setBatches(prev => prev.map(b => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBatch = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  // ATTENDANCE ACTIONS
  const markBatchAttendance = (
    batchId: string,
    date: string,
    records: AttendanceRecord[],
    markedBy: string
  ) => {
    const batch = batches.find(b => b.id === batchId);
    const batchName = batch ? batch.name : 'Classroom Batch';

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    const newAttendanceEntry: BatchAttendance = {
      id: `att-${batchId}-${date}-${Date.now()}`,
      batchId,
      batchName,
      date,
      markedBy,
      markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      records,
      whatsappDispatched: true,
      presentCount,
      absentCount,
    };

    setAttendance(prev => {
      const filtered = prev.filter(a => !(a.batchId === batchId && a.date === date));
      return [newAttendanceEntry, ...filtered];
    });

    const newWhatsappAlerts: WhatsAppMessage[] = [];
    const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    records.forEach(rec => {
      if (rec.status === 'absent') {
        const student = students.find(s => s.id === rec.studentId);
        if (student) {
          newWhatsappAlerts.push({
            id: `wa-abs-${Date.now()}-${student.id}`,
            recipientName: `${student.parentName} (Parent of ${student.name})`,
            recipientPhone: student.parentPhone,
            recipientRole: 'parent',
            type: 'absence_alert',
            content: `🚨 *Apex Academy Attendance Alert*\n\nDear ${student.parentName},\nThis is to notify you that *${student.name}* was marked *ABSENT* for *${batchName}* today (${formattedDate}) at ${newAttendanceEntry.markedAt}.\n\n${rec.remarks ? `Note from Faculty: "${rec.remarks}"\n\n` : ''}For any queries or leave notifications, contact front-desk at +91 98765 00000.`,
            status: 'delivered',
            timestamp: `Today, ${newAttendanceEntry.markedAt}`,
            meta: { studentName: student.name, batchName },
          });
        }
      }
    });

    if (newWhatsappAlerts.length > 0) {
      setWhatsappLogs(prev => [...newWhatsappAlerts, ...prev]);
    }

    return { presentCount, absentCount, alertsSent: newWhatsappAlerts.length };
  };

  // EXAMS & MARKS
  const createExam = (examData: Omit<ExamTest, 'id' | 'status'>) => {
    const id = `exam-${Date.now()}`;
    const newExam: ExamTest = {
      ...examData,
      id,
      status: 'scheduled',
    };
    setExams(prev => [newExam, ...prev]);
    return newExam;
  };

  const saveExamMarks = (
    examId: string,
    evaluatedMarks: { studentId: string; marksObtained: number; teacherRemarks?: string }[]
  ) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const sortedEvaluated = [...evaluatedMarks].sort((a, b) => b.marksObtained - a.marksObtained);
    const totalExamMarks = exam.totalMarks || 100;

    let scoreSum = 0;
    let highest = 0;

    const generatedMarks: StudentExamMark[] = sortedEvaluated.map((entry, index) => {
      const student = students.find(s => s.id === entry.studentId);
      const score = Math.max(0, Math.min(totalExamMarks, entry.marksObtained));
      const percentage = Number(((score / totalExamMarks) * 100).toFixed(1));
      scoreSum += score;
      if (score > highest) highest = score;

      let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F' = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B+';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 40) grade = 'C';

      return {
        id: `mark-${examId}-${entry.studentId}`,
        examId,
        studentId: entry.studentId,
        studentName: student ? student.name : 'Student',
        rollNo: student ? student.rollNo : 'APX-2026-XXX',
        marksObtained: score,
        totalMarks: totalExamMarks,
        percentage,
        rank: index + 1,
        grade,
        teacherRemarks: entry.teacherRemarks || 'Good conceptual performance. Continue structured practice.',
        whatsappSent: true,
      };
    });

    const averageScore = Math.round(scoreSum / evaluatedMarks.length);

    setMarks(prev => {
      const filtered = prev.filter(m => m.examId !== examId);
      return [...generatedMarks, ...filtered];
    });

    setExams(prev =>
      prev.map(e =>
        e.id === examId
          ? {
              ...e,
              status: 'evaluated',
              averageScore,
              highestScore: highest,
            }
          : e
      )
    );

    const reportCardWhatsappAlerts: WhatsAppMessage[] = [];
    generatedMarks.forEach(m => {
      const student = students.find(s => s.id === m.studentId);
      if (student) {
        reportCardWhatsappAlerts.push({
          id: `wa-rep-${Date.now()}-${m.studentId}`,
          recipientName: `${student.parentName} (Parent of ${student.name})`,
          recipientPhone: student.parentPhone,
          recipientRole: 'parent',
          type: 'report_card',
          content: `📊 *Apex Academy — Test Report Published*\n\nDear ${student.parentName},\n*${student.name}* scored *${m.marksObtained} / ${m.totalMarks} (${m.percentage}%)* with *Rank #${m.rank}* in *${exam.title}*.\n\nGrade: *${m.grade}* | Batch Avg: ${averageScore}/${totalExamMarks}\n\n📄 Official PDF Report Card with subject breakdown has been generated.\nView in Parent Portal: https://apexacademy.app/parent`,
          status: 'delivered',
          timestamp: 'Just now',
          meta: { studentName: student.name, batchName: exam.batchName, pdfType: 'Report Card' },
        });
      }
    });

    if (reportCardWhatsappAlerts.length > 0) {
      setWhatsappLogs(prev => [...reportCardWhatsappAlerts, ...prev]);
    }

    return { evaluatedCount: generatedMarks.length, averageScore, highestScore: highest };
  };

  // HOMEWORK (Phase 5)
  const addHomework = (newHw: Omit<Homework, 'id' | 'submissionCount'>) => {
    const id = `hw-${Date.now()}`;
    const hwItem: Homework = {
      ...newHw,
      id,
      submissionCount: 0,
    };
    setHomework(prev => [hwItem, ...prev]);
    return hwItem;
  };

  // BROADCAST
  const sendBroadcastMessage = (batchId: string, subjectTitle: string, messageBody: string) => {
    const targetStudents = batchId === 'all' 
      ? students 
      : students.filter(s => s.batchIds.includes(batchId));

    const batch = batches.find(b => b.id === batchId);
    const targetBatchName = batch ? batch.name : 'All Batches';

    const newLogs: WhatsAppMessage[] = targetStudents.map(student => ({
      id: `wa-bc-${Date.now()}-${student.id}`,
      recipientName: `${student.parentName} (Parent of ${student.name})`,
      recipientPhone: student.parentPhone,
      recipientRole: 'parent',
      type: 'broadcast',
      content: `📢 *Apex Academy Announcement: ${subjectTitle}*\n\nDear Parent of *${student.name}* (${targetBatchName}),\n\n${messageBody}\n\nWarm regards,\n*Apex Academy of Excellence*`,
      status: 'delivered',
      timestamp: 'Just now',
      meta: { studentName: student.name, batchName: targetBatchName },
    }));

    setWhatsappLogs(prev => [...newLogs, ...prev]);
    return newLogs.length;
  };

  // FEES
  const recordPayment = (
    installmentId: string,
    paymentMode: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'Razorpay',
    transactionId?: string
  ) => {
    const inst = installments.find(i => i.id === installmentId);
    if (!inst) return;

    const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const paidDate = new Date().toISOString().split('T')[0];

    setInstallments(prev =>
      prev.map(i =>
        i.id === installmentId
          ? {
              ...i,
              status: 'paid',
              paidDate,
              paymentMode,
              transactionId: transactionId || `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
              receiptNumber,
            }
          : i
      )
    );

    setStudents(prev =>
      prev.map(s => {
        if (s.id === inst.studentId) {
          const newPaid = s.paidFee + inst.amount;
          const newPending = Math.max(0, s.totalFee - newPaid);
          return {
            ...s,
            paidFee: newPaid,
            pendingFee: newPending,
          };
        }
        return s;
      })
    );

    const student = students.find(s => s.id === inst.studentId);
    if (student) {
      const waMsg: WhatsAppMessage = {
        id: `wa-${Date.now()}`,
        recipientName: `${student.parentName} (Parent of ${student.name})`,
        recipientPhone: student.parentPhone,
        recipientRole: 'parent',
        type: 'payment_receipt',
        content: `✅ *Payment Received — Apex Academy*\n\nDear ${student.parentName},\nWe successfully received *₹${inst.amount.toLocaleString(
          'en-IN'
        )}* for *${student.name}* (Receipt #${receiptNumber}).\n\nInstant digital receipt has been generated in your Parent Portal.\nThank you!`,
        status: 'delivered',
        timestamp: 'Just now',
        meta: { studentName: student.name, amount: inst.amount },
      };
      setWhatsappLogs(prev => [waMsg, ...prev]);
    }
  };

  const sendFeeReminder = (installmentId: string) => {
    const inst = installments.find(i => i.id === installmentId);
    if (!inst) return;
    const student = students.find(s => s.id === inst.studentId);
    if (!student) return;

    const waMsg: WhatsAppMessage = {
      id: `wa-${Date.now()}`,
      recipientName: `${student.parentName} (Parent of ${student.name})`,
      recipientPhone: student.parentPhone,
      recipientRole: 'parent',
      type: 'fee_reminder',
      content: `💳 *Apex Academy Fee Reminder*\n\nDear ${student.parentName},\nFee installment of *₹${inst.amount.toLocaleString(
        'en-IN'
      )}* for *${student.name}* (${inst.title}) is due on *${inst.dueDate}*.\n\nPay securely via 1-Click UPI:\n👉 ${inst.paymentLink || 'https://pages.razorpay.com/apex_pay'}\n\nInstant digital receipt will be generated automatically.`,
      status: 'sent',
      timestamp: 'Just now',
      meta: { studentName: student.name, amount: inst.amount, paymentLink: inst.paymentLink },
    };

    setWhatsappLogs(prev => [waMsg, ...prev]);
  };

  const resetToDefaults = () => {
    setStudents(INITIAL_STUDENTS);
    setBatches(INITIAL_BATCHES);
    setTeachers(INITIAL_TEACHERS);
    setInstallments(INITIAL_INSTALLMENTS);
    setAttendance(INITIAL_ATTENDANCE);
    setExams(INITIAL_EXAMS);
    setMarks(INITIAL_MARKS);
    setHomework(INITIAL_HOMEWORK);
    setMaterials(INITIAL_STUDY_MATERIALS);
    setWhatsappLogs(INITIAL_WHATSAPP_LOGS);
    localStorage.clear();
  };

  return {
    isHydrated,
    students,
    batches,
    teachers,
    installments,
    attendance,
    exams,
    marks,
    homework,
    materials,
    whatsappLogs,
    // Actions
    addStudent,
    updateStudent,
    deleteStudent,
    addBatch,
    updateBatch,
    deleteBatch,
    markBatchAttendance,
    createExam,
    saveExamMarks,
    addHomework,
    sendBroadcastMessage,
    recordPayment,
    sendFeeReminder,
    resetToDefaults,
  };
}
