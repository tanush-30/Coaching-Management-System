'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  submitHomeworkRecord,
  gradeHomeworkSubmissionRecord,
  type SubmitHomeworkInput,
  type GradeSubmissionInput,
} from './homework-submissions-service';
import {
  computeAllStudentsProgress,
  computeBatchProgressSummary,
  type BatchProgressSummary,
} from './student-progress-service';
import { logAuditEvent } from './audit-service';
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
  HomeworkSubmission,
  StudyMaterial,
  WhatsAppMessage,
  GradeBoundary,
  SchoolInfoSettings,
  NotificationTemplatesSettings,
  GradingScaleSettings,
  TimetableSlot,
  TimetableSlotInput,
  TimetableConflict,
  Announcement,
} from './types';
import { validateAnnouncement } from './announcement-validator';
import {
  detectTimetableConflicts,
  validateTimetableSlotInput,
} from './timetable-utils';
import {
  DEFAULT_SCHOOL_INFO,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_GRADING_SCALE,
} from './settings-defaults';
import { interpolateTemplate } from './settings-service';
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

/**
 * Reads live cached settings for dynamic notifications and grading
 */
function getStoreSettings(): {
  school: SchoolInfoSettings;
  notifs: NotificationTemplatesSettings;
  grading: GradingScaleSettings;
} {
  let school = DEFAULT_SCHOOL_INFO;
  let notifs = DEFAULT_NOTIFICATION_TEMPLATES;
  let grading = DEFAULT_GRADING_SCALE;

  if (typeof window !== 'undefined') {
    try {
      const s = localStorage.getItem('apex_erp_settings_schoolInfo');
      if (s) school = { ...school, ...JSON.parse(s) };
      const n = localStorage.getItem('apex_erp_settings_notificationTemplates');
      if (n) notifs = { ...notifs, ...JSON.parse(n) };
      const g = localStorage.getItem('apex_erp_settings_gradingScale');
      if (g) grading = { ...grading, ...JSON.parse(g) };
    } catch {}
  }

  return { school, notifs, grading };
}

function calculateDynamicGrade(percentage: number, grades: GradeBoundary[]): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F' {
  const match = grades.find((g) => percentage >= g.minScore && percentage <= g.maxScore);
  return (match?.grade as any) || (percentage >= 40 ? 'C' : 'F');
}

const STORAGE_KEYS = {
  STUDENTS: 'apex_erp_students_v5',
  BATCHES: 'apex_erp_batches_v5',
  TEACHERS: 'apex_erp_teachers_v5',
  INSTALLMENTS: 'apex_erp_installments_v5',
  ATTENDANCE: 'apex_erp_attendance_v5',
  EXAMS: 'apex_erp_exams_v5',
  MARKS: 'apex_erp_marks_v5',
  HOMEWORK: 'apex_erp_homework_v5',
  HOMEWORK_SUBMISSIONS: 'apex_erp_hw_submissions_v5',
  MATERIALS: 'apex_erp_materials_v5',
  WHATSAPP: 'apex_erp_whatsapp_v5',
  TIMETABLE: 'apex_erp_timetable_v5',
  ANNOUNCEMENTS: 'apex_erp_announcements_v5',
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
  const { user, role, claims } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [students, setStudents] = useState<Student[]>(() => isFirebaseConfigured ? [] : INITIAL_STUDENTS.map(normalizeStudent));
  const [batches, setBatches] = useState<Batch[]>(() => isFirebaseConfigured ? [] : INITIAL_BATCHES);
  const [teachers, setTeachers] = useState<Teacher[]>(() => isFirebaseConfigured ? [] : INITIAL_TEACHERS);
  const [installments, setInstallments] = useState<FeeInstallment[]>(() => isFirebaseConfigured ? [] : INITIAL_INSTALLMENTS);
  const [attendance, setAttendance] = useState<BatchAttendance[]>(() => isFirebaseConfigured ? [] : INITIAL_ATTENDANCE);
  const [exams, setExams] = useState<ExamTest[]>(() => isFirebaseConfigured ? [] : INITIAL_EXAMS);
  const [marks, setMarks] = useState<StudentExamMark[]>(() => isFirebaseConfigured ? [] : INITIAL_MARKS);
  const [homework, setHomework] = useState<Homework[]>(() => isFirebaseConfigured ? [] : INITIAL_HOMEWORK);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>(() => isFirebaseConfigured ? [] : INITIAL_STUDY_MATERIALS);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppMessage[]>(() => isFirebaseConfigured ? [] : INITIAL_WHATSAPP_LOGS);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

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

      const savedSubmissions = localStorage.getItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS);
      if (savedSubmissions) setSubmissions(JSON.parse(savedSubmissions));

      const savedMat = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (savedMat) setMaterials(JSON.parse(savedMat));

      const savedWhatsapp = localStorage.getItem(STORAGE_KEYS.WHATSAPP);
      if (savedWhatsapp) setWhatsappLogs(JSON.parse(savedWhatsapp));

      const savedTimetable = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
      if (savedTimetable) setTimetableSlots(JSON.parse(savedTimetable));

      const savedAnnouncements = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (savedAnnouncements) setAnnouncements(JSON.parse(savedAnnouncements));
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
        subscribeToCollection<HomeworkSubmission>('homeworkSubmissions', (items) => setSubmissions(items)),
        subscribeToCollection<StudyMaterial>('materials', (items) => setMaterials(items))
      );
      // Teachers have zero access to installments & whatsapp logs
      setInstallments([]);
      setWhatsappLogs([]);
    } else if (role === 'student' && isScopeRestricted) {
      const studentId = claims && 'studentId' in claims ? claims.studentId : '';

      const installmentConstraints = studentId ? [where('studentId', '==', studentId)] : [];

      unsubs.push(
        subscribeToCollection<Student>('students', (items) => setStudents(items.map(normalizeStudent))),
        subscribeToCollection<Batch>('batches', (items) => setBatches(items)),
        subscribeToCollection<FeeInstallment>('installments', (items) => setInstallments(items), undefined, installmentConstraints),
        subscribeToCollection<BatchAttendance>('attendance', (items) => setAttendance(items)),
        subscribeToCollection<ExamTest>('exams', (items) => setExams(items)),
        subscribeToCollection<StudentExamMark>('marks', (items) => setMarks(items)),
        subscribeToCollection<Homework>('homework', (items) => setHomework(items)),
        subscribeToCollection<HomeworkSubmission>('homeworkSubmissions', (items) => setSubmissions(items)),
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
        subscribeToCollection<HomeworkSubmission>('homeworkSubmissions', (items) => setSubmissions(items), undefined, childConstraints),
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
        subscribeToCollection<HomeworkSubmission>('homeworkSubmissions', (items) => setSubmissions(items)),
        subscribeToCollection<StudyMaterial>('materials', (items) => setMaterials(items)),
        subscribeToCollection<WhatsAppMessage>('whatsapp_logs', (items) => setWhatsappLogs(items)),
        subscribeToCollection<TimetableSlot>('timetableSlots', (items) => setTimetableSlots(items)),
        subscribeToCollection<Announcement>('announcements', (items) => setAnnouncements(items))
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
      localStorage.setItem(STORAGE_KEYS.HOMEWORK_SUBMISSIONS, JSON.stringify(submissions));
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
      localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(whatsappLogs));
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
    } catch (e) {
      console.warn('[ERPStore] Failed to save to localStorage', e);
    }
  }, [students, batches, teachers, installments, attendance, exams, marks, homework, submissions, materials, whatsappLogs, announcements, isHydrated]);

  // GLOBAL ID AVAILABILITY CHECKER
  const checkIdAvailability = async (idToCheck: string): Promise<{ available: boolean; reason?: string }> => {
    const normalized = idToCheck?.trim().toUpperCase();
    if (!normalized) return { available: true };

    try {
      // 1. Check local student records
      const studentConflict = students.find(
        (s) => (s.rollNo && s.rollNo.toUpperCase() === normalized) || (s.id && s.id.toUpperCase() === normalized)
      );
      if (studentConflict) {
        return {
          available: false,
          reason: `This ID is already assigned to student "${studentConflict.name}" (${studentConflict.rollNo || studentConflict.id})`,
        };
      }

      // 2. Check local faculty records
      const teacherConflict = teachers.find(
        (t) => (t.facultyId && t.facultyId.toUpperCase() === normalized) || (t.id && t.id.toUpperCase() === normalized)
      );
      if (teacherConflict) {
        return {
          available: false,
          reason: `This ID is already assigned to faculty member "${teacherConflict.name}" (${teacherConflict.facultyId || teacherConflict.id})`,
        };
      }

      // 3. Check local batch records
      const batchConflict = batches.find(
        (b) => (b.batchCode && b.batchCode.toUpperCase() === normalized) || (b.id && b.id.toUpperCase() === normalized)
      );
      if (batchConflict) {
        return {
          available: false,
          reason: `This ID is already assigned to batch "${batchConflict.name}" (${batchConflict.batchCode || batchConflict.id})`,
        };
      }

      // 4. Check cloud Firestore member_ids
      const cloudCheck = await checkMemberIdAvailable(normalized);
      if (!cloudCheck.available) {
        const typeLabel =
          cloudCheck.existingMemberType === 'faculty'
            ? 'faculty member'
            : cloudCheck.existingMemberType === 'student'
            ? 'student'
            : cloudCheck.existingMemberType === 'batch'
            ? 'batch'
            : 'member';
        return {
          available: false,
          reason: `This ID is already assigned to ${typeLabel} "${cloudCheck.existingName || normalized}"`,
        };
      }

      return { available: true };
    } catch (err) {
      console.warn('[checkIdAvailability] Check error, falling back to local verification:', err);
      return { available: true };
    }
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
    const previousStudent = students.find((s) => s.id === id);
    // Optimistic update
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      await updateFirestoreDoc('students', id, updates);
      if (previousStudent) {
        await logAuditEvent({
          actorId: user?.uid || 'admin-session',
          actorEmail: user?.email || 'admin@apexacademy.edu',
          actorRole: (role as any) || 'admin',
          action: 'STUDENT_RECORD_EDIT',
          targetType: 'student',
          targetId: id,
          targetName: updates.name || previousStudent.name,
          before: previousStudent,
          after: { ...previousStudent, ...updates },
        });
      }
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
    const previousTeacher = teachers.find((t) => t.id === id);
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

    if (updates.name) {
      setBatches((prev) =>
        prev.map((b) => (b.teacherId === id ? { ...b, teacherName: updates.name! } : b))
      );
    }

    try {
      await updateFirestoreDoc('teachers', id, updates);
      if (previousTeacher) {
        await logAuditEvent({
          actorId: user?.uid || 'admin-session',
          actorEmail: user?.email || 'admin@apexacademy.edu',
          actorRole: (role as any) || 'admin',
          action: 'FACULTY_RECORD_EDIT',
          targetType: 'faculty',
          targetId: id,
          targetName: updates.name || previousTeacher.name,
          before: previousTeacher,
          after: { ...previousTeacher, ...updates },
        });
      }
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
    markedBy: string,
    submissionStatus: 'draft' | 'final' = 'final',
    reason?: string
  ) => {
    const batch = batches.find((b) => b.id === batchId);
    const batchName = batch ? batch.name : 'Classroom Batch';

    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    const nowISO = new Date().toISOString();

    const id = `att-${batchId}-${date}`;
    const newAttendanceEntry: BatchAttendance = {
      id,
      batchId,
      batchName,
      date,
      markedBy,
      markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      records,
      whatsappDispatched: submissionStatus === 'final',
      presentCount,
      absentCount,
      status: submissionStatus,
      submittedAt: submissionStatus === 'final' ? nowISO : undefined,
      lastEditedAt: nowISO,
    };

    // Optimistic attendance update
    setAttendance((prev) => {
      const filtered = prev.filter((a) => !(a.batchId === batchId && a.date === date));
      return [newAttendanceEntry, ...filtered];
    });

    // 1. Server API Call for Role & Lock Enforcement
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          batchName,
          date,
          records,
          markedBy,
          status: submissionStatus,
          reason,
          presentCount,
          absentCount,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to save attendance (${response.status})`);
      }
    } catch (apiErr) {
      console.warn('[ERPStore] Attendance API call failed, attempting direct Firestore write...', apiErr);
      try {
        await createFirestoreDoc('attendance', id, newAttendanceEntry);
      } catch (err) {
        console.error('[ERPStore] Direct Firestore attendance write also failed:', err);
      }
      throw apiErr;
    }

    // 2. Dispatch Parent WhatsApp Absence Alerts for Final Submissions
    const newWhatsappAlerts: WhatsAppMessage[] = [];
    if (submissionStatus === 'final') {
      const formattedDate = new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const { school, notifs } = getStoreSettings();

      records.forEach((rec) => {
        if (rec.status === 'absent') {
          const student = students.find((s) => s.id === rec.studentId || s.rollNo === rec.studentId);
          if (student) {
            const waId = `wa-abs-${Date.now()}-${student.id}`;
            const messageContent = interpolateTemplate(notifs.templates.absenceAlert.bodyTemplate, {
              studentName: student.name,
              date: formattedDate,
              batchName,
              schoolName: school.institutionName,
              schoolPhone: school.phone,
            });

            const waMsg: WhatsAppMessage = {
              id: waId,
              recipientName: `${student.parentName} (Parent of ${student.name})`,
              recipientPhone: student.parentPhone,
              recipientRole: 'parent',
              type: 'absence_alert',
              content: `🚨 *${school.institutionName} Attendance Alert*\n\n${messageContent}${rec.remarks ? `\n\nNote from Faculty: "${rec.remarks}"` : ''}`,
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
    marksData: { studentId: string; marksObtained: number; teacherRemarks?: string; remarks?: string }[],
    submissionStatus: 'draft' | 'final' = 'final',
    reason?: string
  ) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;

    const { school, notifs, grading } = getStoreSettings();

    const sortedByScore = [...marksData].sort((a, b) => b.marksObtained - a.marksObtained);
    const totalStudents = marksData.length;
    const scores = marksData.map((m) => m.marksObtained);
    const highestMark = Math.max(...scores, 0);
    const averageMark = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const operations: BatchOperation[] = [];
    const nowISO = new Date().toISOString();

    const newMarksEntries: StudentExamMark[] = sortedByScore.map((entry, idx) => {
      const student = students.find((s) => s.id === entry.studentId);
      const studentName = student ? student.name : 'Unknown';
      const percentage = exam.totalMarks > 0 ? Math.round((entry.marksObtained / exam.totalMarks) * 100) : 0;
      const rank = idx + 1;
      const calculatedGrade = calculateDynamicGrade(percentage, grading.grades);
      const markId = `mark-${examId}-${entry.studentId}`;
      const remarks = entry.teacherRemarks || entry.remarks || '';

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
        grade: calculatedGrade,
        teacherRemarks: remarks,
        whatsappSent: submissionStatus === 'final',
        status: submissionStatus,
        submittedAt: submissionStatus === 'final' ? nowISO : undefined,
        lastEditedAt: nowISO,
      };

      operations.push({ type: 'set', collection: 'marks', id: markId, data: markRecord });
      return markRecord;
    });

    const updatedExamUpdates = {
      status: (submissionStatus === 'final' ? 'evaluated' : 'draft') as any,
      marksStatus: submissionStatus,
      highestScore: highestMark,
      averageScore: averageMark,
      marksLastEditedAt: nowISO,
      ...(submissionStatus === 'final' ? { marksSubmittedAt: nowISO } : {}),
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

    // Call server-side API for validation, strict locking, and audit logging
    try {
      const response = await fetch('/api/marks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          status: submissionStatus,
          reason,
          marksData: marksData.map((m) => ({
            studentId: m.studentId,
            marksObtained: m.marksObtained,
            teacherRemarks: m.teacherRemarks || m.remarks,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to save marks (${response.status})`);
      }
    } catch (apiErr) {
      console.warn('[ERPStore] API /api/marks/save call notice:', apiErr);
      // Fallback local Firestore batch write if API call was bypassed or network error
      try {
        await batchWrite(operations);
      } catch (err) {
        console.error('[ERPStore] Failed to save exam marks to Firestore:', err);
      }
      throw apiErr;
    }

    // Auto WhatsApp Result notifications for final submission
    if (submissionStatus === 'final') {
      const whatsappReports: WhatsAppMessage[] = [];
      newMarksEntries.forEach((m) => {
        const student = students.find((s) => s.id === m.studentId);
        if (student) {
          const waId = `wa-res-${Date.now()}-${student.id}`;
          const templateContent = interpolateTemplate(notifs.templates.reportCard.bodyTemplate, {
            studentName: student.name,
            examTitle: exam.title,
            subject: exam.subject,
            marksObtained: m.marksObtained,
            totalMarks: exam.totalMarks,
            percentage: m.percentage,
            grade: m.grade,
            rank: m.rank,
            schoolName: school.institutionName,
            teacherRemarks: m.teacherRemarks,
          });

          const waMsg: WhatsAppMessage = {
            id: waId,
            recipientName: `${student.parentName} (Parent of ${student.name})`,
            recipientPhone: student.parentPhone,
            recipientRole: 'parent',
            type: 'report_card',
            content: `📊 *${school.institutionName} Scorecard Declared*\n\n${templateContent}\n\n• Batch Average: ${averageMark}/${exam.totalMarks}`,
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
    }
  };

  // HOMEWORK & ASSIGNMENTS
  const addHomework = async (newHw: Omit<Homework, 'submissionCount'> & { id?: string }) => {
    const id = newHw.id || `hw-${Date.now()}`;
    const hwEntry: Homework = {
      ...newHw,
      id,
      submissionCount: 0,
      assignedAt: newHw.assignedAt || new Date().toISOString(),
    };

    setHomework((prev) => [hwEntry, ...prev]);

    try {
      await createFirestoreDoc('homework', id, hwEntry);
    } catch (err) {
      console.error('[ERPStore] Failed to create homework in Firestore:', err);
    }

    return hwEntry;
  };

  const deleteHomework = async (homeworkId: string) => {
    setHomework((prev) => prev.filter((h) => h.id !== homeworkId));
    try {
      await deleteFirestoreDoc('homework', homeworkId);
    } catch (err) {
      console.error('[ERPStore] Failed to delete homework from Firestore:', err);
    }
  };

  // HOMEWORK SUBMISSIONS
  const submitHomework = async (input: SubmitHomeworkInput) => {
    const record = await submitHomeworkRecord(input);
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });
    setHomework((prev) =>
      prev.map((hw) =>
        hw.id === input.assignmentId
          ? { ...hw, submissionCount: (hw.submissionCount || 0) + 1 }
          : hw
      )
    );
    return record;
  };

  const gradeSubmission = async (input: GradeSubmissionInput) => {
    const updated = await gradeHomeworkSubmissionRecord(input);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    return updated;
  };

  // STUDENT PROGRESS & ACADEMIC AGGREGATIONS (PHASE 7)
  const studentProgressList = useMemo(() => {
    return computeAllStudentsProgress(
      students,
      batches,
      marks,
      exams,
      attendance,
      homework,
      submissions
    );
  }, [students, batches, marks, exams, attendance, homework, submissions]);

  const getStudentProgress = (studentId: string) => {
    return studentProgressList.find((p) => p.studentId === studentId);
  };

  const getBatchProgress = (batchId: string): BatchProgressSummary => {
    return computeBatchProgressSummary(batchId, studentProgressList);
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
      console.error('[ERPStore] Failed to dispatch WhatsApp broadcasts to Firestore:', err);
    }

    return newLogs.length;
  };

  // ANNOUNCEMENTS (PHASE 9)
  const addAnnouncement = async (
    data: Partial<Announcement>,
    status: 'draft' | 'sent' = 'sent'
  ): Promise<{
    success: boolean;
    announcement?: Announcement;
    recipientCount: number;
    inAppCount: number;
    whatsappCount: number;
    failedCount: number;
    error?: string;
  }> => {
    const validation = validateAnnouncement({
      ...data,
      status,
      senderId: data.senderId || (claims && 'uid' in claims ? (claims as any).uid : 'admin-001'),
      senderName: data.senderName || (role === 'admin' ? 'Apex Administration' : 'Faculty Member'),
      senderRole: role === 'teacher' ? 'teacher' : 'admin',
    });

    if (!validation.valid || !validation.sanitized) {
      throw new Error(validation.errors.join(' '));
    }

    const newAnnouncement = validation.sanitized;
    setAnnouncements((prev) => [newAnnouncement, ...prev]);

    // Calculate in-app recipient count
    let inAppCount = 0;
    if (newAnnouncement.audienceType === 'all') {
      inAppCount = students.length + teachers.length;
    } else if (newAnnouncement.audienceType === 'batch') {
      const targetedStudents = students.filter((s) => (s.batchIds || []).some((bId) => newAnnouncement.audienceIds.includes(bId)));
      inAppCount = targetedStudents.length;
    } else if (newAnnouncement.audienceType === 'individual') {
      inAppCount = newAnnouncement.audienceIds.length;
    }

    let whatsappCount = 0;
    let failedCount = 0;

    // If channel includes whatsapp and status === 'sent', dispatch broadcast logs
    if (status === 'sent' && newAnnouncement.channels.includes('whatsapp')) {
      try {
        const newLogs: WhatsAppMessage[] = [];
        const operations: BatchOperation[] = [];
        const headerAndBody = `📢 *Apex Academy Announcement: ${newAnnouncement.title}*\n\n${newAnnouncement.message}`;

        if (newAnnouncement.audienceType === 'all') {
          // Dispatch to all active students (parent contact)
          students.forEach((st) => {
            const waId = `wa-ann-${Date.now()}-${st.id}`;
            const customizedContent = headerAndBody
              .replace(/{student_name}/g, st.name)
              .replace(/{parent_name}/g, st.parentName || st.name)
              .replace(/{roll_no}/g, st.rollNo || '');

            const msg: WhatsAppMessage = {
              id: waId,
              recipientName: `${st.parentName || st.name} (${st.name})`,
              recipientPhone: st.parentPhone || st.phone || '',
              recipientRole: 'parent',
              type: 'broadcast',
              content: customizedContent,
              status: 'delivered',
              timestamp: 'Just now',
              meta: {
                announcementId: newAnnouncement.id,
                announcementTitle: newAnnouncement.title,
                studentName: st.name,
                priority: newAnnouncement.priority,
              },
            };
            newLogs.push(msg);
            operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: msg });
          });

          // Dispatch to all faculty members
          teachers.forEach((tch) => {
            const waId = `wa-ann-${Date.now()}-${tch.id}`;
            const customizedContent = headerAndBody
              .replace(/{student_name}/g, tch.name)
              .replace(/{parent_name}/g, tch.name)
              .replace(/{roll_no}/g, tch.facultyId || 'Faculty');

            const msg: WhatsAppMessage = {
              id: waId,
              recipientName: tch.name,
              recipientPhone: tch.phone || '',
              recipientRole: 'parent',
              type: 'broadcast',
              content: customizedContent,
              status: 'delivered',
              timestamp: 'Just now',
              meta: {
                announcementId: newAnnouncement.id,
                announcementTitle: newAnnouncement.title,
                priority: newAnnouncement.priority,
              },
            };
            newLogs.push(msg);
            operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: msg });
          });
        } else if (newAnnouncement.audienceType === 'batch') {
          // Deduplicate students enrolled in target batches
          const targetStudents = students.filter((s) =>
            (s.batchIds || []).some((bId) => newAnnouncement.audienceIds.includes(bId))
          );

          targetStudents.forEach((st) => {
            const waId = `wa-ann-${Date.now()}-${st.id}`;
            const customizedContent = headerAndBody
              .replace(/{student_name}/g, st.name)
              .replace(/{parent_name}/g, st.parentName || st.name)
              .replace(/{roll_no}/g, st.rollNo || '');

            const msg: WhatsAppMessage = {
              id: waId,
              recipientName: `${st.parentName || st.name} (${st.name})`,
              recipientPhone: st.parentPhone || st.phone || '',
              recipientRole: 'parent',
              type: 'broadcast',
              content: customizedContent,
              status: 'delivered',
              timestamp: 'Just now',
              meta: {
                announcementId: newAnnouncement.id,
                announcementTitle: newAnnouncement.title,
                studentName: st.name,
                priority: newAnnouncement.priority,
              },
            };
            newLogs.push(msg);
            operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: msg });
          });
        } else if (newAnnouncement.audienceType === 'individual') {
          newAnnouncement.audienceIds.forEach((id) => {
            const student = students.find((s) => s.id === id);
            const teacher = teachers.find((t) => t.id === id);

            if (student) {
              const waId = `wa-ann-${Date.now()}-${student.id}`;
              const customizedContent = headerAndBody
                .replace(/{student_name}/g, student.name)
                .replace(/{parent_name}/g, student.parentName || student.name)
                .replace(/{roll_no}/g, student.rollNo || '');

              const msg: WhatsAppMessage = {
                id: waId,
                recipientName: `${student.parentName || student.name} (${student.name})`,
                recipientPhone: student.parentPhone || student.phone || '',
                recipientRole: 'parent',
                type: 'broadcast',
                content: customizedContent,
                status: 'delivered',
                timestamp: 'Just now',
                meta: {
                  announcementId: newAnnouncement.id,
                  announcementTitle: newAnnouncement.title,
                  studentName: student.name,
                  priority: newAnnouncement.priority,
                },
              };
              newLogs.push(msg);
              operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: msg });
            } else if (teacher) {
              const waId = `wa-ann-${Date.now()}-${teacher.id}`;
              const customizedContent = headerAndBody
                .replace(/{student_name}/g, teacher.name)
                .replace(/{parent_name}/g, teacher.name)
                .replace(/{roll_no}/g, teacher.facultyId || 'Faculty');

              const msg: WhatsAppMessage = {
                id: waId,
                recipientName: teacher.name,
                recipientPhone: teacher.phone || '',
                recipientRole: 'parent',
                type: 'broadcast',
                content: customizedContent,
                status: 'delivered',
                timestamp: 'Just now',
                meta: {
                  announcementId: newAnnouncement.id,
                  announcementTitle: newAnnouncement.title,
                  priority: newAnnouncement.priority,
                },
              };
              newLogs.push(msg);
              operations.push({ type: 'set', collection: 'whatsapp_logs', id: waId, data: msg });
            } else {
              failedCount++;
            }
          });
        }

        if (newLogs.length > 0) {
          setWhatsappLogs((prev) => [...newLogs, ...prev]);
          if (operations.length > 0) {
            await batchWrite(operations).catch((err) => {
              console.warn('[ERPStore] Batch write to whatsapp_logs warning:', err);
            });
          }
          whatsappCount = newLogs.length;
        }
      } catch (err) {
        console.warn('[ERPStore] WhatsApp broadcast dispatch notice:', err);
        failedCount++;
      }
    }

    try {
      await createFirestoreDoc('announcements', newAnnouncement.id, newAnnouncement);
    } catch (err) {
      console.error('[ERPStore] Failed to save announcement to Firestore:', err);
    }

    const totalRecipients = Math.max(1, inAppCount);

    return {
      success: true,
      announcement: newAnnouncement,
      recipientCount: totalRecipients,
      inAppCount,
      whatsappCount,
      failedCount,
    };
  };

  const deleteAnnouncement = async (announcementId: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    try {
      await deleteFirestoreDoc('announcements', announcementId);
    } catch (err) {
      console.error('[ERPStore] Failed to delete announcement from Firestore:', err);
    }
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

    const { school, notifs } = getStoreSettings();

    const waId = `wa-rec-${Date.now()}-${student.id}`;
    const paymentReceiptTemplate = interpolateTemplate(notifs.templates.paymentReceipt.bodyTemplate, {
      amount: inst.amount.toLocaleString('en-IN'),
      currencySymbol: school.currencySymbol || '₹',
      studentName: student.name,
      paymentMode,
      transactionId: updatedInst.transactionId,
      receiptNumber,
      receiptUrl: `https://apexerp.co/receipt/${receiptNumber}`,
      schoolName: school.institutionName,
    });

    const waMsg: WhatsAppMessage = {
      id: waId,
      recipientName: `${student.parentName} (Parent of ${student.name})`,
      recipientPhone: student.parentPhone,
      recipientRole: 'parent',
      type: 'payment_receipt',
      content: `🧾 *${school.institutionName} Payment Confirmed*\n\n${paymentReceiptTemplate}\n• Remaining Balance: ${school.currencySymbol || '₹'}${newPendingFee.toLocaleString('en-IN')}`,
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
      await logAuditEvent({
        actorId: user?.uid || 'admin-session',
        actorEmail: user?.email || 'admin@apexacademy.edu',
        actorRole: (role as any) || 'admin',
        action: 'PAYMENT_STATUS_CHANGE',
        targetType: 'payment',
        targetId: installmentId,
        targetName: `${student.name} - ${inst.title}`,
        before: { status: inst.status, paidFee: student.paidFee, pendingFee: student.pendingFee },
        after: { status: 'paid', paidFee: newPaidFee, pendingFee: newPendingFee, receiptNumber, paymentMode },
        metadata: { receiptNumber, amount: inst.amount, paymentMode, studentId: student.id },
      });
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

    const { school, notifs } = getStoreSettings();

    const waId = `wa-rem-${Date.now()}-${student.id}`;
    const reminderTemplate = interpolateTemplate(notifs.templates.feeReminder.bodyTemplate, {
      installmentTitle: inst.title,
      amount: inst.amount.toLocaleString('en-IN'),
      currencySymbol: school.currencySymbol || '₹',
      studentName: student.name,
      dueDate: inst.dueDate,
      paymentLink: inst.paymentLink || 'https://pay.apexerp.co/quickpay',
      schoolName: school.institutionName,
    });

    const waMsg: WhatsAppMessage = {
      id: waId,
      recipientName: `${student.parentName} (Parent of ${student.name})`,
      recipientPhone: student.parentPhone,
      recipientRole: 'parent',
      type: 'fee_reminder',
      content: `💳 *${school.institutionName} Fee Reminder*\n\n${reminderTemplate}\n\nImmediate digital receipt with tax invoice will be issued upon payment confirmation.`,
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

  const addTimetableSlot = async (
    slotInput: TimetableSlotInput
  ): Promise<{ success: boolean; conflict?: TimetableConflict; error?: string; slotId?: string }> => {
    // 1. Field validation
    const validation = validateTimetableSlotInput(slotInput);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    // 2. Conflict detection
    const conflicts = detectTimetableConflicts(timetableSlots, slotInput);
    if (conflicts.length > 0) {
      return { success: false, conflict: conflicts[0], error: conflicts[0].message };
    }

    // 3. Construct persistent slot
    const slotId = `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newSlot: TimetableSlot = {
      id: slotId,
      batchId: slotInput.batchId,
      batchName: slotInput.batchName || '',
      subjectId: slotInput.subjectId,
      subjectName: slotInput.subjectName || slotInput.subjectId,
      teacherId: slotInput.teacherId,
      teacherName: slotInput.teacherName || '',
      day: slotInput.day,
      startTime: slotInput.startTime,
      endTime: slotInput.endTime,
      roomId: slotInput.roomId,
      roomName: slotInput.roomName || slotInput.roomId,
      color: slotInput.color || '#4f46e5',
      academicYear: slotInput.academicYear || '2026-2027',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    setTimetableSlots((prev) => {
      const updated = [...prev, newSlot];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(updated));
      }
      return updated;
    });

    if (isFirebaseConfigured) {
      try {
        await createFirestoreDoc('timetableSlots', slotId, newSlot);
      } catch (err: any) {
        console.error('[ERPStore] Failed to save timetable slot to Firestore:', err);
      }
    }

    return { success: true, slotId };
  };

  const updateTimetableSlot = async (
    id: string,
    slotInput: Partial<TimetableSlotInput>
  ): Promise<{ success: boolean; conflict?: TimetableConflict; error?: string }> => {
    const existing = timetableSlots.find((s) => s.id === id);
    if (!existing) {
      return { success: false, error: 'Timetable slot not found.' };
    }

    const mergedInput: TimetableSlotInput & { id: string } = {
      id,
      batchId: slotInput.batchId || existing.batchId,
      batchName: slotInput.batchName !== undefined ? slotInput.batchName : existing.batchName,
      subjectId: slotInput.subjectId || existing.subjectId,
      subjectName: slotInput.subjectName !== undefined ? slotInput.subjectName : existing.subjectName,
      teacherId: slotInput.teacherId || existing.teacherId,
      teacherName: slotInput.teacherName !== undefined ? slotInput.teacherName : existing.teacherName,
      day: slotInput.day || existing.day,
      startTime: slotInput.startTime || existing.startTime,
      endTime: slotInput.endTime || existing.endTime,
      roomId: slotInput.roomId || existing.roomId,
      roomName: slotInput.roomName !== undefined ? slotInput.roomName : existing.roomName,
      color: slotInput.color || existing.color,
      academicYear: slotInput.academicYear || existing.academicYear,
    };

    // 1. Validation
    const validation = validateTimetableSlotInput(mergedInput);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    // 2. Conflict detection with self-exclusion
    const conflicts = detectTimetableConflicts(timetableSlots, mergedInput, id);
    if (conflicts.length > 0) {
      return { success: false, conflict: conflicts[0], error: conflicts[0].message };
    }

    const updatedSlot: TimetableSlot = {
      ...existing,
      ...mergedInput,
      updatedAt: new Date().toISOString(),
    };

    setTimetableSlots((prev) => {
      const updated = prev.map((s) => (s.id === id ? updatedSlot : s));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(updated));
      }
      return updated;
    });

    if (isFirebaseConfigured) {
      try {
        await updateFirestoreDoc('timetableSlots', id, updatedSlot);
      } catch (err: any) {
        console.error('[ERPStore] Failed to update timetable slot in Firestore:', err);
      }
    }

    return { success: true };
  };

  const deleteTimetableSlot = async (id: string): Promise<{ success: boolean; error?: string }> => {
    setTimetableSlots((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(updated));
      }
      return updated;
    });

    if (isFirebaseConfigured) {
      try {
        await deleteFirestoreDoc('timetableSlots', id);
      } catch (err: any) {
        console.error('[ERPStore] Failed to delete timetable slot from Firestore:', err);
      }
    }

    return { success: true };
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
    setTimetableSlots([]);
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
    submissions,
    materials,
    whatsappLogs,
    timetableSlots,
    announcements,
    studentProgressList,
    getStudentProgress,
    getBatchProgress,
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
    deleteHomework,
    submitHomework,
    gradeSubmission,
    sendBroadcastMessage,
    addAnnouncement,
    deleteAnnouncement,
    recordPayment,
    sendFeeReminder,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    resetToDefaults,
  };
}
