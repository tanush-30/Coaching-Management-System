import {
  Student,
  Teacher,
  Batch,
  BatchAttendance,
  FeeInstallment,
  ExamTest,
  StudentExamMark,
  Homework,
  StudyMaterial,
  TimetableSlot,
  WhatsAppMessage,
} from './types';

// Clean initial state (All mock/fake sample records removed)
// You can enroll real students, create real batches, teachers, fees, and exams via the ERP!
export const INITIAL_BATCHES: Batch[] = [];
export const INITIAL_TEACHERS: Teacher[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const INITIAL_INSTALLMENTS: FeeInstallment[] = [];
export const INITIAL_ATTENDANCE: BatchAttendance[] = [];
export const INITIAL_EXAMS: ExamTest[] = [];
export const INITIAL_MARKS: StudentExamMark[] = [];
export const INITIAL_HOMEWORK: Homework[] = [];
export const INITIAL_STUDY_MATERIALS: StudyMaterial[] = [];
export const INITIAL_TIMETABLE: TimetableSlot[] = [];
export const INITIAL_WHATSAPP_LOGS: WhatsAppMessage[] = [];
