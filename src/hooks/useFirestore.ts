// React Query hooks for all Firestore collections
// Each hook handles loading/error states and auto-refreshes on window focus

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Student,
  Batch,
  Teacher,
  FeeInstallment,
  BatchAttendance,
  ExamTest,
  StudentExamMark,
  Homework,
  StudyMaterial,
  WhatsAppMessage,
  AttendanceRecord,
} from '@/lib/types';

// ── Helper ────────────────────────────────────────────────────────────────────
function stripId<T extends { id: string }>(item: T): Omit<T, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = item;
  return rest;
}

// ── STUDENTS ─────────────────────────────────────────────────────────────────

export function useStudents() {
  return useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'students'), orderBy('enrollmentDate', 'desc'))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Student);
    },
  });
}

export function useAddStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<Student, 'id'> & {
        installmentPlan?: { count: number; amounts: number[]; dueDates: string[] };
      }
    ) => {
      const { installmentPlan, ...studentData } = payload;
      const id = crypto.randomUUID();

      // Write student
      await setDoc(doc(db, 'students', id), {
        ...studentData,
        id,
        createdAt: serverTimestamp(),
      });

      // Write installments if plan provided
      if (installmentPlan && installmentPlan.count > 0) {
        for (let i = 0; i < installmentPlan.amounts.length; i++) {
          const instId = crypto.randomUUID();
          await setDoc(doc(db, 'fee_installments', instId), {
            id: instId,
            studentId: id,
            installmentNo: i + 1,
            title: `Term ${i + 1} Installment`,
            dueDate: installmentPlan.dueDates[i] || new Date().toISOString().split('T')[0],
            amount: installmentPlan.amounts[i],
            status: 'pending',
            paymentLink: `https://pages.razorpay.com/pl_apex_term${i + 1}`,
            createdAt: serverTimestamp(),
          });
        }
      }

      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['fee_installments'] });
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Student> }) => {
      await updateDoc(doc(db, 'students', id), updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      // Hard delete: remove student + all related records
      await deleteDoc(doc(db, 'students', studentId));

      // Delete related fee installments
      const instSnap = await getDocs(collection(db, 'fee_installments'));
      for (const d of instSnap.docs) {
        if (d.data().studentId === studentId) await deleteDoc(d.ref);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['fee_installments'] });
    },
  });
}

// ── BATCHES ───────────────────────────────────────────────────────────────────

export function useBatches() {
  return useQuery<Batch[]>({
    queryKey: ['batches'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'batches'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Batch);
    },
  });
}

export function useAddBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchData: Omit<Batch, 'id' | 'enrolledCount'>) => {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'batches', id), {
        ...batchData,
        id,
        enrolledCount: 0,
        createdAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Batch> }) => {
      await updateDoc(doc(db, 'batches', id), updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string) => {
      await deleteDoc(doc(db, 'batches', batchId));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });
}

// ── TEACHERS ──────────────────────────────────────────────────────────────────

export function useTeachers() {
  return useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'teachers'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Teacher);
    },
  });
}

// ── FEE INSTALLMENTS ──────────────────────────────────────────────────────────

export function useFeeInstallments() {
  return useQuery<FeeInstallment[]>({
    queryKey: ['fee_installments'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'fee_installments'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as FeeInstallment);
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      installmentId,
      paymentMode,
      transactionId,
    }: {
      installmentId: string;
      paymentMode: FeeInstallment['paymentMode'];
      transactionId?: string;
    }) => {
      const instRef = doc(db, 'fee_installments', installmentId);

      // Atomic transaction — prevents double payment race condition
      await runTransaction(db, async (tx) => {
        const instSnap = await tx.get(instRef);
        if (!instSnap.exists()) throw new Error('Installment not found');
        if (instSnap.data().status === 'paid') {
          throw new Error('This installment has already been paid');
        }

        const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        const paidDate = new Date().toISOString().split('T')[0];
        const finalTxnId = transactionId || `TXN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

        tx.update(instRef, {
          status: 'paid',
          paidDate,
          paymentMode,
          transactionId: finalTxnId,
          receiptNumber,
        });

        // Update student's paidFee / pendingFee
        const instData = instSnap.data() as FeeInstallment;
        const studentRef = doc(db, 'students', instData.studentId);
        const studentSnap = await tx.get(studentRef);
        if (studentSnap.exists()) {
          const s = studentSnap.data() as Student;
          const newPaid = s.paidFee + instData.amount;
          const newPending = Math.max(0, s.totalFee - newPaid);
          tx.update(studentRef, { paidFee: newPaid, pendingFee: newPending });
        }
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee_installments'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['whatsapp_logs'] });
    },
  });
}

// ── ATTENDANCE ────────────────────────────────────────────────────────────────

export function useAttendance() {
  return useQuery<BatchAttendance[]>({
    queryKey: ['attendance'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'batch_attendance'), orderBy('date', 'desc'))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as BatchAttendance);
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batchId,
      batchName,
      date,
      markedBy,
      records,
    }: {
      batchId: string;
      batchName: string;
      date: string;
      markedBy: string;
      records: AttendanceRecord[];
    }) => {
      // Validate: no future dates
      const today = new Date().toISOString().split('T')[0];
      if (date > today) throw new Error('Attendance cannot be marked for future dates');

      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;
      const id = crypto.randomUUID();
      const markedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await setDoc(doc(db, 'batch_attendance', id), {
        id,
        batchId,
        batchName,
        date,
        markedBy,
        markedAt,
        records,
        whatsappDispatched: false, // Will be set true only after real WhatsApp API call
        presentCount,
        absentCount,
        createdAt: serverTimestamp(),
      });

      return { presentCount, absentCount };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

// ── EXAMS & MARKS ─────────────────────────────────────────────────────────────

export function useExams() {
  return useQuery<ExamTest[]>({
    queryKey: ['exams'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'exams'), orderBy('examDate', 'desc'))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ExamTest);
    },
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (examData: Omit<ExamTest, 'id' | 'status'>) => {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'exams', id), {
        ...examData,
        id,
        status: 'scheduled',
        createdAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  });
}

export function useMarks() {
  return useQuery<StudentExamMark[]>({
    queryKey: ['marks'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'student_exam_marks'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as StudentExamMark);
    },
  });
}

export function useSaveExamMarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      examId,
      evaluatedMarks,
      exam,
      students,
    }: {
      examId: string;
      evaluatedMarks: { studentId: string; marksObtained: number; teacherRemarks?: string }[];
      exam: ExamTest;
      students: Student[];
    }) => {
      const totalExamMarks = exam.totalMarks || 100;
      const sorted = [...evaluatedMarks].sort((a, b) => b.marksObtained - a.marksObtained);

      let scoreSum = 0;
      let highest = 0;

      for (let index = 0; index < sorted.length; index++) {
        const entry = sorted[index];
        const student = students.find(s => s.id === entry.studentId);
        const score = Math.max(0, Math.min(totalExamMarks, entry.marksObtained));
        const percentage = Number(((score / totalExamMarks) * 100).toFixed(1));
        scoreSum += score;
        if (score > highest) highest = score;

        let grade: StudentExamMark['grade'] = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 40) grade = 'C';

        const markId = `mark-${examId}-${entry.studentId}`;
        await setDoc(doc(db, 'student_exam_marks', markId), {
          id: markId,
          examId,
          studentId: entry.studentId,
          studentName: student?.name ?? 'Student',
          rollNo: student?.rollNo ?? 'APX-2026-XXX',
          marksObtained: score,
          totalMarks: totalExamMarks,
          percentage,
          rank: index + 1,
          grade,
          teacherRemarks: entry.teacherRemarks || 'Good conceptual performance.',
          whatsappSent: false, // Real WhatsApp dispatch handled separately
        });
      }

      const averageScore = Math.round(scoreSum / sorted.length);

      // Update exam status
      await updateDoc(doc(db, 'exams', examId), {
        status: 'evaluated',
        averageScore,
        highestScore: highest,
      });

      return { evaluatedCount: sorted.length, averageScore, highestScore: highest };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marks'] });
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

// ── HOMEWORK ──────────────────────────────────────────────────────────────────

export function useHomework() {
  return useQuery<Homework[]>({
    queryKey: ['homework'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'homework'), orderBy('assignedDate', 'desc'))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Homework);
    },
  });
}

export function useAddHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hwData: Omit<Homework, 'id' | 'submissionCount'>) => {
      const id = crypto.randomUUID();
      await setDoc(doc(db, 'homework', id), {
        ...hwData,
        id,
        submissionCount: 0,
        createdAt: serverTimestamp(),
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  });
}

// ── STUDY MATERIALS ───────────────────────────────────────────────────────────

export function useStudyMaterials() {
  return useQuery<StudyMaterial[]>({
    queryKey: ['study_materials'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'study_materials'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as StudyMaterial);
    },
  });
}

// ── WHATSAPP LOGS ─────────────────────────────────────────────────────────────

export function useWhatsappLogs() {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp_logs'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'whatsapp_logs'), orderBy('createdAt', 'desc'))
      );
      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WhatsAppMessage);
    },
  });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetStudents,
      batchName,
      subjectTitle,
      messageBody,
    }: {
      targetStudents: Student[];
      batchName: string;
      subjectTitle: string;
      messageBody: string;
    }) => {
      for (const student of targetStudents) {
        const id = crypto.randomUUID();
        await addDoc(collection(db, 'whatsapp_logs'), {
          id,
          recipientName: `${student.parentName} (Parent of ${student.name})`,
          recipientPhone: student.parentPhone,
          recipientRole: 'parent',
          type: 'broadcast',
          content: `📢 *Apex Academy Announcement: ${subjectTitle}*\n\nDear Parent of *${student.name}* (${batchName}),\n\n${messageBody}\n\nWarm regards,\n*Apex Academy of Excellence*`,
          status: 'sent',
          createdAt: serverTimestamp(),
          meta: { studentName: student.name, batchName },
        });
      }
      return targetStudents.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp_logs'] }),
  });
}
