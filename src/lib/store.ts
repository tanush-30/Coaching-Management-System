'use client';

import { useState, useEffect, useRef } from 'react';
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
import { where, QueryConstraint } from 'firebase/firestore';
import { useAuth } from './auth-context';
import { isFirebaseConfigured } from './firebase';
import {
  subscribeToCollection,
  createFirestoreDoc,
  updateFirestoreDoc,
  deleteFirestoreDoc,
  batchWrite,
  checkMemberIdAvailable,
  releaseMemberId,
  BatchOperation,
} from './firestore-service';

const STORAGE_KEYS = {
  STUDENTS: 'apex_erp_students_v5',
  BATCHES: 'apex_erp_batches_v5',
  TEACHERS: 'apex_erp_teachers_v5',
  INSTALLMENTS: 'apex_erp_installments_v5',
  ATTENDANCE: 'apex_erp_attendance_v5',
  EXAMS: 'apex_erp_exams_v5',
  MARKS: 'apex_erp_marks_v5',
  HOMEWORK: 'apex_erp_homework_v5',
  MATERIALS: 'apex_erp_materials_v5',
  WHATSAPP: 'apex_erp_whatsapp_v5',
};

export function normalizeStudent(s: any): Student {
  let batchIds: string[] = [];
  if (Array.isArray(s.batchIds)) {
    batchIds = s.batchIds.flat(Infinity).filter((b: any) => typeof b === 'string' && b.trim() !== '');
  } else if (typeof s.batchId === 'string' && s.batchId.trim() !== '') {
    batchIds = [s.batchId.trim()];
  }
  return {
    ...s,
    batchIds,
  };
}

export function normalizeTeacher(t: any): Teacher {
  let assignedBatches: string[] = [];
  if (Array.isArray(t.assignedBatches)) {
    assignedBatches = t.assignedBatches.flat(Infinity).filter((b: any) => typeof b === 'string' && b.trim() !== '');
  }
  return {
    ...t,
    assignedBatches,
  };
}

export function useERPStore(options?: { overrideScope?: boolean }) {
  const { role, claims } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [students, setStudents] = useState<Student[]>(() => isFirebaseConfigured ? [] : INITIAL_STUDENTS.map(normalizeStudent));
  const [batches, setBatches] = useState<Batch[]>(() => isFirebaseConfigured ? [] : INITIAL_BATCHES);
  const [teachers, setTeachers] = useState<Teacher[]>(() => isFirebaseConfigured ? [] : INITIAL_TEACHERS);
  const [installments, setInstallments] = useState<FeeInstallment[]>(() => isFirebaseConfigured ? [] : INITIAL_INSTALLMENTS);
  const [attendance, setAttendance] = useState<BatchAttendance[]>(() => isFirebaseConfigured ? [] : INITIAL_ATTENDANCE);
  const [exams, setExams] = useState<ExamTest[]>(() => isFirebaseConfigured ? [] : INITIAL_EXAMS);
  const [marks, setMarks] = useState<StudentExamMark[]>(() => isFirebaseConfigured ? [] : INITIAL_MARKS);
  const [homework, setHomework] = useState<Homework[]>(() => isFirebaseConfigured ? [] : INITIAL_HOMEWORK);
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => isFirebaseConfigured ? [] : INITIAL_STUDY_MATERIALS);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessage[]>(() => isFirebaseConfigured ? [] : INITIAL_WHATSAPP_LOGS);

  // Track active Firestore subscription teardowns
  const unsubscribersRef = useRef<(() => void)[]>([]);

  // 1. Initial Local Storage Hydration (Immediate 0ms render)
  useEffect(() => {
    try {
      const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (savedStudents) setStudents(JSON.parse(savedStudents));

      const savedBatches = localStorage.getItem(STORAGE_KEYS.BATCHES);
      if (savedBatches) setBatches(JSON.parse(savedBatches));

      const savedTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      if (savedTeachers) setTeachers(JSON.parse(savedTeachers));

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

      const savedMat = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (savedMat) setMaterials(JSON.parse(savedMat));

      const savedWhatsapp = localStorage.getItem(STORAGE_KEYS.WHATSAPP);
      if (savedWhatsapp) setWhatsappLogs(JSON.parse(savedWhatsapp));
    } catch (e) {
      console.warn('[ERPStore] Failed to load store from localStorage', e);
    }
    setIsHydrated(true);
  }, []);

  // 2. Real-Time Cloud Firestore Listeners Setup with Strict Query Scoping
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    // Clean up any existing listeners before creating new ones
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    const isScopeRestricted = !options?.overrideScope && role !== 'admin';
    const unsubs: (() => void)[] = [];

    if (role === 'teacher' && isScopeRestricted) {
      const teacherBatchIds = (claims && 'batchIds' in claims ? claims.batchIds : []) || [];
      const batchChunks = teacherBatchIds.slice(0, 30);
      const batchConstraints = batchChunks.length > 0 ? [where('id', 'in', batchChunks)] : [];

      unsubs.push(
        subscribeToCollection<Student>('students', (items) => setStudents(items.map(normalizeStudent))),
        subscribeToCollection<Batch>('batches', (items) => setBatches(items), undefined, batchConstraints),
        subscribeToCollection<Teacher>('teachers', (items) => setTeachers(items.map(normalizeTeacher))),
        subscribeToCollection<BatchAttendance>('attendance', (items) => setAttendance(items)),
        subscribeToCollection<ExamTest>('exams', (items) => setExams(items)),
        subscribeToCollection<StudentExamMark>('marks', (items) => setMarks(items)),
        subscribeToCollection<Homework>('homework', (items) => setHomework(items)),
        subscribeToCollection<StudyMaterial>('materials', (items) => setMaterials(items))
      );
      // Teachers have zero access to installments & whatsapp logs
      setInstallments([]);
      setWhatsappLogs([]);
    } else if (role === 'student' && isScopeRestricted) {
      const studentId = claims && 'studentId' in claims ? claims.studentId : '';

      const markConstraints = studentId ? [where('studentId', '==', studentId)] : [];
      const installmentConstraints = studentId ? [where('studentId', '==', studentId)] : [];

      unsubs.push(
        subscribeToCollection<Student>('students', (items) => setStudents(items.map(normalizeStudent))),
        subscribeToCollection<Batch>('batches', (items) => setBatches(items)),
        subscribeToCollection<FeeInstallment>('installments', (items) => setInstallments(items), undefined, installmentConstraints),
        subscribeToCollection<BatchAttendance>('attendance', (items) => setAttendance(items)),
        subscribeToCollection<ExamTest>('exams', (items) => setExams(items)),
        subscribeToCollection<StudentExamMark>('marks', (items) => setMarks(items), undefined, markConstraints),
        subscribeToCollection<Homework>('homework', (items) => setHomework(items)),
        subscribeToCollection<StudyMaterial>('materials', (items) => setMaterials(items))
      );
      setWhatsappLogs([]);
    } else if (role === 'parent' && isScopeRestricted) {
      const childIds = (claims && 'childIds' in claims ? claims.childIds : []) || [];
      const childChunks = childIds.slice(0, 30);
      const childConstraints = childChunks.length > 0 ? [where('studentId', 'in', childChunks)] : [];

      unsubs.push(
        subscribeToCollection<Student>('students', (items) => setStudents(items.map(normalizeStudent))),
        subscribeToCollection<Batch>('batches', (items) => setBatches(items)),
        subscribeToCollection<FeeInstallment>('installments', (items) => setInstallments(items), undefined, childConstraints),
        subscribeToCollection<BatchAttendance>('attendance', (items) => setAttendance(items)),
        subscribeToCollection<ExamTest>('exams', (items) => setExams(items)),
        subscribeToCollection<StudentExamMark>('marks', (items) => setMarks(items), undefined, childConstraints),
        subscribeToCollection<Homework>('homework', (items) => setHomework(items)),
        subscribeToCollection<StudyMaterial>('materials', (items) => setMaterials(items))
      );
      setWhatsappLogs([]);
    } else {
      // Admin / Full Access Override
      unsubs.push(
        subscribeToCollection<Student>('students', (items) => setStudents(items.map(normalizeStudent))),
        subscribeToCollection<Batch>('batches', (items) => setBatches(items)),
        subscribeToCollection<Teacher>('teachers', (items) => setTeachers(items.map(normalizeTeacher))),
        subscribeToCollection<FeeInstallment>('installments', (items) => setInstallments(items)),
        subscribeToCollection<BatchAttendance>('attendance', (items) => setAttendance(items)),
        subscribeToCollection<ExamTest>('exams', (items) => setExams(items)),
        subscribeToCollection<StudentExamMark>('marks', (items) => setMarks(items)),
        subscribeToCollection<Homework>('homework', (items) => setHomework(items)),
        subscribeToCollection<StudyMaterial>('materials', (items) => setMaterials(items)),
        subscribeToCollection<WhatsAppMessage>('whatsapp_logs', (items) => setWhatsappLogs(items))
      );
    }

    unsubscribersRef.current = unsubs;

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [role, claims, options?.overrideScope]);

  // 3. Keep Local Storage in Sync for Instant Fallback
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
      localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(installments));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
      localStorage.setItem(STORAGE_KEYS.MARKS, JSON.stringify(marks));
      localStorage.setItem(STORAGE_KEYS.HOMEWORK, JSON.stringify(homework));
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
      localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(whatsappLogs));
    } catch (e) {
      console.warn('[ERPStore] Failed to save to localStorage', e);
    }
  }, [students, batches, teachers, installments, attendance, exams, marks, homework, materials, whatsappLogs, isHydrated]);

  // GLOBAL ID AVAILABILITY CHECKER
  const checkIdAvailability = async (idToCheck: string): Promise<{ available: boolean; reason?: string }> => {
    const normalized = idToCheck.trim().toUpperCase();
    if (!normalized) return { available: true };

    // 1. Check local state
    const studentConflict = students.find((s) => s.rollNo.toUpperCase() === normalized);
    if (studentConflict) {
      return { available: false, reason: `Assigned to student "${studentConflict.name}"` };
    }

    const teacherConflict = teachers.find((t) => t.facultyId?.toUpperCase() === normalized);
    if (teacherConflict) {
      return { available: false, reason: `Assigned to faculty "${teacherConflict.name}"` };
    }

    const batchConflict = batches.find((b) => (b.batchCode || b.id).toUpperCase() === normalized);
    if (batchConflict) {
      return { available: false, reason: `Assigned to batch "${batchConflict.name}"` };
    }

    // 2. Check cloud Firestore member_ids
    const cloudCheck = await checkMemberIdAvailable(normalized);
    if (!cloudCheck.available) {
      return {
        available: false,
        reason: `Assigned to a ${cloudCheck.existingMemberType} (${cloudCheck.existingName})`,
      };
    }

    return { available: true };
  };

  // STUDENT ACTIONS
  const addStudent = async (
    newStudent: Omit<Student, 'id' | 'paidFee' | 'pendingFee'> & { id?: string; rollNo?: string },
    installmentPlan?: { count: number; amounts: number[]; dueDates: string[] }
  ) => {
    const rawId = newStudent.rollNo?.trim() || `STU-2026-${String(students.length + 1).padStart(3, '0')}`;
    const rollNo = rawId.trim().toUpperCase();

    // Verify global uniqueness across Students and Faculty
    const availability = await checkIdAvailability(rollNo);
    if (!availability.available) {
      throw new Error(`Enrollment ID "${rollNo}" is already in use: ${availability.reason}`);
    }

    const id = newStudent.id || `student-${Date.now()}`;
    const student: Student = {
      ...newStudent,
      id,
      rollNo,
      avatar: newStudent.avatar || '',
      paidFee: 0,
      pendingFee: newStudent.totalFee,
    };

    // Optimistic local state update
    setStudents((prev) => [student, ...prev]);

    const operations: BatchOperation[] = [
      { type: 'set', collection: 'students', id, data: student },
      {
        type: 'set',
        collection: 'member_ids',
        id: rollNo,
        data: {
          id: rollNo,
          memberType: 'student',
          name: student.name,
          memberRefId: id,
          assignedAt: new Date().toISOString(),
        },
      },
    ];

    if (student.batchIds.length > 0) {
      setBatches((prev) =>
        prev.map((b) => {
          if (student.batchIds.includes(b.id)) {
            const updatedBatch = { ...b, enrolledCount: b.enrolledCount + 1 };
            operations.push({
              type: 'update',
              collection: 'batches',
              id: b.id,
              data: { enrolledCount: updatedBatch.enrolledCount },
            });
            return updatedBatch;
          }
          return b;
        })
      );
    }

    if (installmentPlan && installmentPlan.count > 0) {
      const generatedInstallments: FeeInstallment[] = installmentPlan.amounts.map((amount, idx) => {
        const instId = `inst-${Date.now()}-${idx + 1}`;
        const instData: FeeInstallment = {
          id: instId,
          studentId: id,
          installmentNo: idx + 1,
          title: `Term ${idx + 1} Installment`,
          dueDate: installmentPlan.dueDates[idx] || new Date().toISOString().split('T')[0],
          amount,
          status: 'pending',
          paymentLink: `https://pages.razorpay.com/pl_apex_${student.name.toLowerCase().replace(/\s+/g, '_')}_term${idx + 1}`,
        };
        operations.push({ type: 'set', collection: 'installments', id: instId, data: instData });
        return instData;
      });
      setInstallments((prev) => [...prev, ...generatedInstallments]);
    }

    // Persist to Cloud Firestore
    try {
      await batchWrite(operations);
    } catch (err) {
      console.error('[ERPStore] Failed to save student to Firestore:', err);
      throw err;
    }

    return student;
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    // Optimistic update
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      await updateFirestoreDoc('students', id, updates);
    } catch (err) {
      console.error('[ERPStore] Failed to update student in Firestore:', err);
    }
  };

  const deleteStudent = async (id: string) => {
    const student = students.find((s) => s.id === id);
    const operations: BatchOperation[] = [
      { type: 'delete', collection: 'students', id },
    ];

    if (student) {
      operations.push({ type: 'delete', collection: 'member_ids', id: student.rollNo.toUpperCase() });
    }

    if (student && student.batchIds.length > 0) {
      setBatches((prev) =>
        prev.map((b) => {
          if (student.batchIds.includes(b.id)) {
            const updatedCount = Math.max(0, b.enrolledCount - 1);
            operations.push({
              type: 'update',
              collection: 'batches',
              id: b.id,
              data: { enrolledCount: updatedCount },
            });
            return { ...b, enrolledCount: updatedCount };
          }
          return b;
        })
      );
    }

    // Delete student fee installments
    const studentInsts = installments.filter((inst) => inst.studentId === id);
    studentInsts.forEach((inst) => {
      operations.push({ type: 'delete', collection: 'installments', id: inst.id });
    });

    setStudents((prev) => prev.filter((s) => s.id !== id));
    setInstallments((prev) => prev.filter((inst) => inst.studentId !== id));

    try {
      await batchWrite(operations);
      if (student) await releaseMemberId(student.rollNo);
    } catch (err) {
      console.error('[ERPStore] Failed to delete student from Firestore:', err);
    }
  };

  // BATCH ACTIONS
  const addBatch = async (newBatch: Omit<Batch, 'id' | 'enrolledCount'> & { batchCode?: string }) => {
    const rawCode = newBatch.batchCode?.trim() || `BAT-2026-${String(batches.length + 1).padStart(3, '0')}`;
    const batchCode = rawCode.trim().toUpperCase();

    // Verify global uniqueness across Students, Faculty, and Batches
    const availability = await checkIdAvailability(batchCode);
    if (!availability.available) {
      throw new Error(`Batch Code / UID "${batchCode}" is already in use: ${availability.reason}`);
    }

    const id = `batch-${Date.now()}`;
    const batch: Batch = {
      ...newBatch,
      id,
      batchCode,
      enrolledCount: 0,
    };

    setBatches((prev) => [...prev, batch]);

    const operations: BatchOperation[] = [
      { type: 'set', collection: 'batches', id, data: batch },
      {
        type: 'set',
        collection: 'member_ids',
        id: batchCode,
        data: {
          id: batchCode,
          memberType: 'batch',
          name: batch.name,
          memberRefId: id,
          assignedAt: new Date().toISOString(),
        },
      },
    ];

    try {
      await batchWrite(operations);
    } catch (err) {
      console.error('[ERPStore] Failed to create batch in Firestore:', err);
      throw err;
    }

    return batch;
  };

  const updateBatch = async (id: string, updates: Partial<Batch>) => {
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    try {
      await updateFirestoreDoc('batches', id, updates);
    } catch (err) {
      console.error('[ERPStore] Failed to update batch in Firestore:', err);
    }
  };

  const deleteBatch = async (id: string) => {
    const batch = batches.find((b) => b.id === id);
    setBatches((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteFirestoreDoc('batches', id);
      if (batch && batch.batchCode) {
        await releaseMemberId(batch.batchCode);
      }
    } catch (err) {
      console.error('[ERPStore] Failed to delete batch from Firestore:', err);
    }
  };

  // TEACHER ACTIONS
  const addTeacher = async (newTeacher: Omit<Teacher, 'id'> & { id?: string; facultyId?: string }) => {
    const rawId = newTeacher.facultyId?.trim() || `FAC-2026-${String(teachers.length + 1).padStart(3, '0')}`;
    const facultyId = rawId.trim().toUpperCase();

    // Verify global uniqueness across Students and Faculty
    const availability = await checkIdAvailability(facultyId);
    if (!availability.available) {
      throw new Error(`Faculty Member ID "${facultyId}" is already in use: ${availability.reason}`);
    }

    const id = newTeacher.id || `teacher-${Date.now()}`;
    const teacher: Teacher = {
      ...newTeacher,
      id,
      facultyId,
      avatar: newTeacher.avatar || '',
    };

    setTeachers((prev) => [...prev, teacher]);

    const operations: BatchOperation[] = [
      { type: 'set', collection: 'teachers', id, data: teacher },
      {
        type: 'set',
        collection: 'member_ids',
        id: facultyId,
        data: {
          id: facultyId,
          memberType: 'faculty',
          name: teacher.name,
          memberRefId: id,
          assignedAt: new Date().toISOString(),
        },
      },
    ];

    if (newTeacher.assignedBatches && newTeacher.assignedBatches.length > 0) {
      setBatches((prev) =>
        prev.map((b) => {
          if (newTeacher.assignedBatches.includes(b.id)) {
            operations.push({
              type: 'update',
              collection: 'batches',
              id: b.id,
              data: { teacherId: id, teacherName: teacher.name },
            });
            return { ...b, teacherId: id, teacherName: teacher.name };
          }
          return b;
        })
      );
    }

    try {
      await batchWrite(operations);
    } catch (err) {
      console.error('[ERPStore] Failed to create teacher in Firestore:', err);
      throw err;
    }

    return teacher;
  };

  const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

    if (updates.name) {
      setBatches((prev) =>
        prev.map((b) => (b.teacherId === id ? { ...b, teacherName: updates.name! } : b))
      );
    }

    try {
      await updateFirestoreDoc('teachers', id, updates);
    } catch (err) {
      console.error('[ERPStore] Failed to update teacher in Firestore:', err);
    }
  };

  const deleteTeacher = async (id: string) => {
    const teacher = teachers.find((t) => t.id === id);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setBatches((prev) =>
      prev.map((b) => (b.teacherId === id ? { ...b, teacherId: '', teacherName: 'Unassigned' } : b))
    );
    try {
      await deleteFirestoreDoc('teachers', id);
      if (teacher && teacher.facultyId) {
        await releaseMemberId(teacher.facultyId);
      }
    } catch (err) {
      console.error('[ERPStore] Failed to delete teacher from Firestore:', err);
    }
  };

  // ATTENDANCE ACTIONS
  const markBatchAttendance = async (
    batchId: string,
    date: string,
    records: AttendanceRecord[],
    markedBy: string
  ) => {
    const batch = batches.find((b) => b.id === batchId);
    const batchName = batch ? batch.name : 'Classroom Batch';

    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;

    const id = `att-${batchId}-${date}`;
    const newAttendanceEntry: BatchAttendance = {
      id,
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

    // Optimistic attendance update
    setAttendance((prev) => {
      const filtered = prev.filter((a) => !(a.batchId === batchId && a.date === date));
      return [newAttendanceEntry, ...filtered];
    });

    // 1. Direct Attendance Document Write to Firestore + API route fallback
    try {
      await createFirestoreDoc('attendance', id, newAttendanceEntry);
      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAttendanceEntry),
      }).catch(() => {});
    } catch (err) {
      console.warn('[ERPStore] Direct Firestore write failed, using server API fallback...', err);
      try {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAttendanceEntry),
        });
      } catch (apiErr) {
        console.error('[ERPStore] Server API attendance save failed:', apiErr);
      }
    }

    // 2. Dispatch Parent WhatsApp Absence Alerts
    const newWhatsappAlerts: WhatsAppMessage[] = [];
    const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    records.forEach((rec) => {
      if (rec.status === 'absent') {
        const student = students.find((s) => s.id === rec.studentId || s.rollNo === rec.studentId);
        if (student) {
          const waId = `wa-abs-${Date.now()}-${student.id}`;
          const waMsg: WhatsAppMessage = {
            id: waId,
            recipientName: `${student.parentName} (Parent of ${student.name})`,
            recipientPhone: student.parentPhone,
            recipientRole: 'parent',
            type: 'absence_alert',
            content: `🚨 *Apex Academy Attendance Alert*\n\nDear ${student.parentName},\nThis is to notify you that *${student.name}* was marked *ABSENT* for *${batchName}* today (${formattedDate}) at ${newAttendanceEntry.markedAt}.\n\n${rec.remarks ? `Note from Faculty: "${rec.remarks}"\n\n` : ''}For any queries or leave notifications, contact front-desk at +91 98765 00000.`,
            status: 'delivered',
            timestamp: `Today, ${newAttendanceEntry.markedAt}`,
            meta: { studentName: student.name, batchName },
          };
          newWhatsappAlerts.push(waMsg);
          createFirestoreDoc('whatsapp_logs', waId, waMsg).catch((e) =>
            console.warn('[ERPStore] WhatsApp log async write failed:', e)
          );
        }
      }
    });

    if (newWhatsappAlerts.length > 0) {
      setWhatsappLogs((prev) => [...newWhatsappAlerts, ...prev]);
    }

    return { presentCount, absentCount, alertsSent: newWhatsappAlerts.length };
  };

  // EXAMS & MARKS
  const createExam = async (examData: Omit<ExamTest, 'id' | 'status'>) => {
    const id = `exam-${Date.now()}`;
    const newExam: ExamTest = {
      ...examData,
      id,
      status: 'scheduled',
    };

    setExams((prev) => [newExam, ...prev]);

    try {
      await createFirestoreDoc('exams', id, newExam);
    } catch (err) {
      console.error('[ERPStore] Failed to create exam in Firestore:', err);
    }

    return newExam;
  };

  const saveExamMarks = async (
    examId: string,
    marksData: { studentId: string; marksObtained: number; remarks?: string }[]
  ) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;

    const sortedByScore = [...marksData].sort((a, b) => b.marksObtained - a.marksObtained);
    const totalStudents = marksData.length;
    const scores = marksData.map((m) => m.marksObtained);
    const highestMark = Math.max(...scores, 0);
    const averageMark = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const operations: BatchOperation[] = [];

    const newMarksEntries: StudentExamMark[] = sortedByScore.map((entry, idx) => {
      const student = students.find((s) => s.id === entry.studentId);
      const studentName = student ? student.name : 'Unknown';
      const percentage = exam.totalMarks > 0 ? Math.round((entry.marksObtained / exam.totalMarks) * 100) : 0;
      const rank = idx + 1;
      const percentile = totalStudents > 1 ? Math.round(((totalStudents - rank) / (totalStudents - 1)) * 100) : 100;
      const markId = `mark-${examId}-${entry.studentId}`;

      const markRecord: StudentExamMark = {
        id: markId,
        examId,
        studentId: entry.studentId,
        studentName,
        rollNo: student?.rollNo || '',
        marksObtained: entry.marksObtained,
        totalMarks: exam.totalMarks,
        percentage,
        rank,
        grade: percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F',
        teacherRemarks: entry.remarks,
        whatsappSent: true,
      };

      operations.push({ type: 'set', collection: 'marks', id: markId, data: markRecord });
      return markRecord;
    });

    const updatedExamUpdates = {
      status: 'evaluated' as const,
      highestScore: highestMark,
      averageScore: averageMark,
    };
    operations.push({ type: 'update', collection: 'exams', id: examId, data: updatedExamUpdates });

    // Optimistic updates
    setMarks((prev) => {
      const filtered = prev.filter((m) => m.examId !== examId);
      return [...filtered, ...newMarksEntries];
    });

    setExams((prev) =>
      prev.map((e) => (e.id === examId ? { ...e, ...updatedExamUpdates } : e))
    );

    // Auto WhatsApp Result notifications
    const whatsappReports: WhatsAppMessage[] = [];
    newMarksEntries.forEach((m) => {
      const student = students.find((s) => s.id === m.studentId);
      if (student) {
        const waId = `wa-res-${Date.now()}-${student.id}`;
        const waMsg: WhatsAppMessage = {
          id: waId,
          recipientName: `${student.parentName} (Parent of ${student.name})`,
          recipientPhone: student.parentPhone,
          recipientRole: 'parent',
          type: 'report_card',
          content: `📊 *Apex Academy Test Result Published*\n\nDear ${student.parentName},\nResult for *${exam.title}* (${exam.subject}):\n• Student: *${student.name}*\n• Score: *${m.marksObtained}/${m.totalMarks}* (${m.percentage}%)\n• Batch Rank: *#${m.rank}*\n• Grade: *${m.grade}*\n• Batch Average: ${averageMark}/${exam.totalMarks}\n\nView full analysis & solution key on Parent Portal: https://apexerp.co/parent/portal`,
          status: 'delivered',
          timestamp: 'Just now',
          meta: { studentName: student.name, batchName: exam.batchName, pdfType: 'Exam Result' },
        };
        whatsappReports.push(waMsg);
        operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: waMsg });
      }
    });

    if (whatsappReports.length > 0) {
      setWhatsappLogs((prev) => [...whatsappReports, ...prev]);
    }

    try {
      await batchWrite(operations);
    } catch (err) {
      console.error('[ERPStore] Failed to save exam marks to Firestore:', err);
    }
  };

  // HOMEWORK & ASSIGNMENTS
  const addHomework = async (newHw: Omit<Homework, 'id' | 'submissionCount'>) => {
    const id = `hw-${Date.now()}`;
    const hwEntry: Homework = {
      ...newHw,
      id,
      submissionCount: 0,
    };

    setHomework((prev) => [hwEntry, ...prev]);

    try {
      await createFirestoreDoc('homework', id, hwEntry);
    } catch (err) {
      console.error('[ERPStore] Failed to create homework in Firestore:', err);
    }

    return hwEntry;
  };

  // WHATSAPP BROADCASTS
  const sendBroadcastMessage = async (
    targetBatchIdOrIds: string | string[],
    subjectTitleOrRole: string,
    messageTemplateOrBody?: string
  ): Promise<number> => {
    let targetBatchIds: string[] = [];
    if (Array.isArray(targetBatchIdOrIds)) {
      targetBatchIds = targetBatchIdOrIds;
    } else if (targetBatchIdOrIds && targetBatchIdOrIds !== 'all') {
      targetBatchIds = [targetBatchIdOrIds];
    }

    const recipientRole = ['parent', 'student', 'all'].includes(subjectTitleOrRole)
      ? (subjectTitleOrRole as 'parent' | 'student' | 'all')
      : 'parent';

    const messageTemplate = messageTemplateOrBody || subjectTitleOrRole;

    const targetStudents = students.filter(
      (s) => targetBatchIds.length === 0 || (s.batchIds || []).some((bId) => targetBatchIds.includes(bId))
    );

    const newLogs: WhatsAppMessage[] = [];
    const operations: BatchOperation[] = [];

    targetStudents.forEach((st) => {
      const waId = `wa-bc-${Date.now()}-${st.id}`;
      const customizedContent = messageTemplate
        .replace(/{student_name}/g, st.name)
        .replace(/{parent_name}/g, st.parentName)
        .replace(/{roll_no}/g, st.rollNo);

      const msg: WhatsAppMessage = {
        id: waId,
        recipientName: recipientRole === 'student' ? st.name : `${st.parentName} (${st.name})`,
        recipientPhone: recipientRole === 'student' ? st.phone : st.parentPhone,
        recipientRole: recipientRole === 'all' ? 'parent' : recipientRole,
        type: 'broadcast',
        content: customizedContent,
        status: 'delivered',
        timestamp: 'Just now',
        meta: { studentName: st.name },
      };

      newLogs.push(msg);
      operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: msg });
    });

    setWhatsappLogs((prev) => [...newLogs, ...prev]);

    try {
      await batchWrite(operations);
    } catch (err) {
      console.error('[ERPStore] Failed to save broadcast logs in Firestore:', err);
    }

    return newLogs.length;
  };

  // FEE PAYMENT & RECEIPTING
  const recordPayment = async (
    installmentId: string,
    paymentMode: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'Razorpay',
    transactionId?: string
  ) => {
    const inst = installments.find((i) => i.id === installmentId);
    if (!inst) return;

    const student = students.find((s) => s.id === inst.studentId);
    if (!student) return;

    const receiptNumber = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const paidDate = new Date().toISOString().split('T')[0];

    const updatedInst: FeeInstallment = {
      ...inst,
      status: 'paid',
      paidDate,
      paymentMode,
      transactionId: transactionId || (paymentMode === 'UPI' ? `UPI-${Date.now().toString().slice(-8)}` : `TXN-${Date.now().toString().slice(-6)}`),
      receiptNumber,
    };

    const newPaidFee = student.paidFee + inst.amount;
    const newPendingFee = Math.max(0, student.totalFee - newPaidFee);
    const studentUpdates = { paidFee: newPaidFee, pendingFee: newPendingFee };

    // Optimistic local update
    setInstallments((prev) => prev.map((i) => (i.id === installmentId ? updatedInst : i)));
    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, ...studentUpdates } : s)));

    const waId = `wa-rec-${Date.now()}-${student.id}`;
    const waMsg: WhatsAppMessage = {
      id: waId,
      recipientName: `${student.parentName} (Parent of ${student.name})`,
      recipientPhone: student.parentPhone,
      recipientRole: 'parent',
      type: 'payment_receipt',
      content: `🧾 *Apex Academy Fee Receipt Confirmed*\n\nDear ${student.parentName},\nWe have successfully received *₹${inst.amount.toLocaleString('en-IN')}* for *${student.name}* (${inst.title}).\n• Receipt No: *${receiptNumber}*\n• Mode: *${paymentMode}*\n• Remaining Balance: *₹${newPendingFee.toLocaleString('en-IN')}*\n\nDownload official GST PDF Receipt: https://apexerp.co/receipt/${receiptNumber}`,
      status: 'delivered',
      timestamp: 'Just now',
      meta: { studentName: student.name, amount: inst.amount, pdfType: 'Fee Receipt' },
    };

    setWhatsappLogs((prev) => [waMsg, ...prev]);

    // Atomic Cloud Firestore updates
    const operations: BatchOperation[] = [
      { type: 'update', collection: 'installments', id: installmentId, data: updatedInst },
      { type: 'update', collection: 'students', id: student.id, data: studentUpdates },
      { type: 'set', collection: 'whatsapp_logs', id: waId, data: waMsg },
    ];

    try {
      await batchWrite(operations);
    } catch (err) {
      console.error('[ERPStore] Failed to record payment in Firestore:', err);
    }

    return { receiptNumber, updatedInstallment: updatedInst };
  };

  const sendFeeReminder = async (installmentId: string) => {
    const inst = installments.find((i) => i.id === installmentId);
    if (!inst) return;
    const student = students.find((s) => s.id === inst.studentId);
    if (!student) return;

    const waId = `wa-rem-${Date.now()}-${student.id}`;
    const waMsg: WhatsAppMessage = {
      id: waId,
      recipientName: `${student.parentName} (Parent of ${student.name})`,
      recipientPhone: student.parentPhone,
      recipientRole: 'parent',
      type: 'fee_reminder',
      content: `💳 *Apex Academy Fee Installment Reminder*\n\nDear ${student.parentName},\nThis is a gentle reminder that *${inst.title}* of *₹${inst.amount.toLocaleString('en-IN')}* for *${student.name}* is due on *${inst.dueDate}*.\n\nPay instantly with 1-click via UPI / NetBanking:\n${inst.paymentLink || 'https://pay.apexerp.co/quickpay'}\n\nImmediate digital receipt with GST will be issued upon payment confirmation.`,
      status: 'delivered',
      timestamp: 'Just now',
      meta: { studentName: student.name, amount: inst.amount, paymentLink: inst.paymentLink },
    };

    setWhatsappLogs((prev) => [waMsg, ...prev]);

    try {
      await createFirestoreDoc('whatsapp_logs', waId, waMsg);
    } catch (err) {
      console.error('[ERPStore] Failed to send reminder log to Firestore:', err);
    }
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
    addTeacher,
    updateTeacher,
    deleteTeacher,
    checkIdAvailability,
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
