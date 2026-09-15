// Study Materials Service Layer — Firestore CRUD operations and batch query scoping
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getClientDb, isFirebaseConfigured } from './firebase';
import type { StudyMaterial } from './types';

export interface CreateStudyMaterialInput {
  title: string;
  batchId: string;
  batchName: string;
  subject: string;
  fileName: string;
  fileSize: string;
  fileType?: string;
  type?: 'pdf' | 'video' | 'notes' | 'document' | 'other';
  downloadUrl: string;
  storagePath?: string;
  uploaderId?: string;
  uploaderName?: string;
  description?: string;
}

export interface UpdateStudyMaterialInput {
  title?: string;
  description?: string;
  subject?: string;
}

/**
 * Derives material type ('pdf' | 'video' | 'notes' | 'document' | 'other') from filename
 */
export function deriveMaterialType(fileName: string): StudyMaterial['type'] {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video';
  if (['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'].includes(ext)) return 'document';
  if (['.txt', '.md'].includes(ext)) return 'notes';
  return 'other';
}

/**
 * Creates a new Study Material metadata record in Firestore
 */
export async function createStudyMaterialRecord(
  input: CreateStudyMaterialInput
): Promise<StudyMaterial> {
  if (!input.title?.trim()) throw new Error('Study material title is required.');
  if (!input.batchId?.trim()) throw new Error('Target batch is required.');
  if (!input.downloadUrl?.trim()) throw new Error('File download URL is required.');

  const id = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const uploadedAt = new Date().toISOString();
  const derivedType = input.type || deriveMaterialType(input.fileName);

  const materialRecord: StudyMaterial = {
    id,
    title: input.title.trim(),
    batchId: input.batchId.trim(),
    batchName: input.batchName.trim() || 'Assigned Batch',
    subject: input.subject?.trim() || 'General',
    type: derivedType,
    fileName: input.fileName,
    fileSize: input.fileSize,
    uploadedAt,
    downloadUrl: input.downloadUrl,
    storagePath: input.storagePath || '',
    uploaderId: input.uploaderId || '',
    uploaderName: input.uploaderName || '',
    description: input.description?.trim() || '',
  };

  if (isFirebaseConfigured && typeof window !== 'undefined') {
    const db = getClientDb();
    await setDoc(doc(db, 'studyMaterials', id), materialRecord);
  }

  return materialRecord;
}

/**
 * Fetches study materials scoped by batch and optional subject filter
 */
export async function getStudyMaterials(
  batchId?: string,
  subject?: string
): Promise<StudyMaterial[]> {
  if (!isFirebaseConfigured || typeof window === 'undefined') {
    return [];
  }

  const db = getClientDb();
  const materialsRef = collection(db, 'studyMaterials');

  let q;
  if (batchId && batchId !== 'all') {
    if (subject && subject !== 'all') {
      q = query(materialsRef, where('batchId', '==', batchId), where('subject', '==', subject));
    } else {
      q = query(materialsRef, where('batchId', '==', batchId));
    }
  } else if (subject && subject !== 'all') {
    q = query(materialsRef, where('subject', '==', subject));
  } else {
    q = query(materialsRef);
  }

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudyMaterial));

  // Sort latest first
  return items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

/**
 * Updates a study material's title, subject, or description
 */
export async function updateStudyMaterialRecord(
  id: string,
  updates: UpdateStudyMaterialInput
): Promise<void> {
  if (!isFirebaseConfigured || typeof window === 'undefined') return;

  const db = getClientDb();
  const docRef = doc(db, 'studyMaterials', id);

  const cleanUpdates: Record<string, any> = {};
  if (updates.title !== undefined) cleanUpdates.title = updates.title.trim();
  if (updates.description !== undefined) cleanUpdates.description = updates.description.trim();
  if (updates.subject !== undefined) cleanUpdates.subject = updates.subject.trim();

  await updateDoc(docRef, cleanUpdates);
}

/**
 * Deletes a study material metadata record from Firestore
 */
export async function deleteStudyMaterialRecord(id: string): Promise<void> {
  if (!isFirebaseConfigured || typeof window === 'undefined') return;

  const db = getClientDb();
  await deleteDoc(doc(db, 'studyMaterials', id));
}
