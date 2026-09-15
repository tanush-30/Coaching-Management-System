// Homework Submissions Service Layer — Firestore CRUD operations & status calculations
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getClientDb, isFirebaseConfigured } from './firebase';
import type { HomeworkSubmission } from './types';

export interface SubmitHomeworkInput {
  assignmentId: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  batchId: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  storagePath: string;
  dueDate?: string;
}

/**
 * Determines whether a submission is late compared to the assignment due date
 */
export function isSubmissionLate(dueDateStr?: string, submissionDate: Date = new Date()): boolean {
  if (!dueDateStr) return false;
  try {
    // Parse dueDate (e.g. '2026-09-15' or ISO)
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return false;
    
    // Set due date to the end of the specified day (23:59:59.999) if it was just YYYY-MM-DD
    if (dueDateStr.length === 10) {
      due.setHours(23, 59, 59, 999);
    }
    
    return submissionDate.getTime() > due.getTime();
  } catch {
    return false;
  }
}

/**
 * Creates or updates a student homework submission record in Firestore
 */
export async function submitHomeworkRecord(
  input: SubmitHomeworkInput
): Promise<HomeworkSubmission> {
  if (!input.assignmentId?.trim()) throw new Error('Assignment ID is required.');
  if (!input.studentId?.trim()) throw new Error('Student ID is required.');
  if (!input.fileUrl?.trim()) throw new Error('Uploaded file URL is required.');

  const submissionDocId = `${input.assignmentId}_${input.studentId}`;
  const now = new Date();
  const submittedAt = now.toISOString();
  const isLate = isSubmissionLate(input.dueDate, now);

  const submission: HomeworkSubmission = {
    id: submissionDocId,
    assignmentId: input.assignmentId.trim(),
    studentId: input.studentId.trim(),
    studentName: input.studentName.trim() || 'Student',
    rollNo: input.rollNo || '',
    batchId: input.batchId.trim(),
    fileUrl: input.fileUrl.trim(),
    fileName: input.fileName.trim(),
    fileSize: input.fileSize.trim(),
    storagePath: input.storagePath.trim(),
    submittedAt,
    status: isLate ? 'late' : 'submitted',
    grade: null,
    feedback: null,
    gradedBy: null,
    gradedAt: null,
  };

  if (!isFirebaseConfigured) {
    // Local offline simulation
    return submission;
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, 'homeworkSubmissions', submissionDocId);
    
    // Check if doc exists to preserve previous grade if any
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as Partial<HomeworkSubmission>;
      if (existingData.status === 'graded') {
        throw new Error('This homework assignment has already been graded and can no longer be resubmitted.');
      }
    }

    await setDoc(docRef, {
      ...submission,
      updatedAt: serverTimestamp(),
    });

    return submission;
  } catch (err: any) {
    console.error('[HomeworkSubmissionsService] Failed to record submission:', err);
    throw new Error(err.message || 'Failed to record homework submission.');
  }
}

/**
 * Fetches all submissions for a given student
 */
export async function getStudentSubmissions(studentId: string): Promise<HomeworkSubmission[]> {
  if (!studentId?.trim()) return [];
  if (!isFirebaseConfigured) return [];

  try {
    const db = getClientDb();
    const q = query(
      collection(db, 'homeworkSubmissions'),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HomeworkSubmission));
  } catch (err) {
    console.error('[HomeworkSubmissionsService] Error fetching student submissions:', err);
    return [];
  }
}

export interface GradeSubmissionInput {
  submissionId: string;
  grade: string;
  feedback?: string;
  gradedBy: string;
}

/**
 * Grades a student homework submission and records feedback in Firestore
 */
export async function gradeHomeworkSubmissionRecord(
  input: GradeSubmissionInput
): Promise<HomeworkSubmission> {
  if (!input.submissionId?.trim()) throw new Error('Submission ID is required.');
  if (!input.grade?.trim()) throw new Error('Grade is required.');

  const gradedAt = new Date().toISOString();

  if (!isFirebaseConfigured) {
    return {
      id: input.submissionId,
      assignmentId: '',
      studentId: '',
      studentName: '',
      batchId: '',
      fileUrl: '',
      fileName: '',
      fileSize: '',
      storagePath: '',
      submittedAt: gradedAt,
      status: 'graded',
      grade: input.grade.trim(),
      feedback: input.feedback?.trim() || null,
      gradedBy: input.gradedBy || 'Faculty',
      gradedAt,
    };
  }

  try {
    const db = getClientDb();
    const docRef = doc(db, 'homeworkSubmissions', input.submissionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Submission document ${input.submissionId} not found.`);
    }

    const currentData = docSnap.data() as HomeworkSubmission;
    const updated: HomeworkSubmission = {
      ...currentData,
      status: 'graded',
      grade: input.grade.trim(),
      feedback: input.feedback?.trim() || null,
      gradedBy: input.gradedBy || 'Faculty',
      gradedAt,
    };

    await updateDoc(docRef, {
      status: 'graded',
      grade: input.grade.trim(),
      feedback: input.feedback?.trim() || null,
      gradedBy: input.gradedBy || 'Faculty',
      gradedAt,
      updatedAt: serverTimestamp(),
    });

    return updated;
  } catch (err: any) {
    console.error('[HomeworkSubmissionsService] Failed to grade submission:', err);
    throw new Error(err.message || 'Failed to save grade and feedback.');
  }
}

/**
 * Fetches all submissions for a specific homework assignment (for teacher review)
 */
export async function getAssignmentSubmissions(assignmentId: string): Promise<HomeworkSubmission[]> {
  if (!assignmentId?.trim()) return [];
  if (!isFirebaseConfigured) return [];

  try {
    const db = getClientDb();
    const q = query(
      collection(db, 'homeworkSubmissions'),
      where('assignmentId', '==', assignmentId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HomeworkSubmission));
  } catch (err) {
    console.error('[HomeworkSubmissionsService] Error fetching assignment submissions:', err);
    return [];
  }
}
