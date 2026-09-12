// Firestore Service — Type-safe cloud database operations for ApexERP
// Handles real-time subscriptions, single-doc CRUD, atomic batch writes, and error mapping

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  runTransaction,
  query,
  QueryConstraint,
  Unsubscribe,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { getClientDb, isFirebaseConfigured } from './firebase';

export class FirestoreServiceError extends Error {
  code: string;
  originalError?: unknown;

  constructor(message: string, code: string = 'unknown', originalError?: unknown) {
    super(message);
    this.name = 'FirestoreServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Subscribes to a real-time Firestore collection with optional constraints.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (error: FirestoreServiceError) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  try {
    const db = getClientDb();
    const colRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as T[];
        onData(items);
      },
      (err: FirestoreError) => {
        const serviceError = new FirestoreServiceError(
          `Failed to listen to collection ${collectionName}: ${err.message}`,
          err.code,
          err
        );
        console.error(`[FirestoreService] onSnapshot error on ${collectionName}:`, serviceError);
        if (onError) onError(serviceError);
      }
    );

    return unsubscribe;
  } catch (err: unknown) {
    console.warn(`[FirestoreService] Failed to establish listener for ${collectionName}:`, err);
    return () => {};
  }
}

/**
 * Recursively cleans objects to remove any undefined fields before sending to Firestore.
 */
export function cleanFirestoreData(val: any): any {
  if (val === undefined) return null;
  if (val === null) return null;
  if (Array.isArray(val)) {
    return val.map(cleanFirestoreData);
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        cleaned[k] = cleanFirestoreData(v);
      }
    }
    return cleaned;
  }
  return val;
}

/**
 * Creates or overwrites a document with a specified ID.
 */
export async function createFirestoreDoc<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const db = getClientDb();
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, cleanFirestoreData(data));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Firestore error';
    throw new FirestoreServiceError(
      `Failed to create document ${docId} in ${collectionName}: ${message}`,
      'create-failed',
      err
    );
  }
}

/**
 * Updates specific fields of an existing document.
 */
export async function updateFirestoreDoc<T extends DocumentData>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const db = getClientDb();
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, cleanFirestoreData(updates) as DocumentData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Firestore error';
    throw new FirestoreServiceError(
      `Failed to update document ${docId} in ${collectionName}: ${message}`,
      'update-failed',
      err
    );
  }
}

/**
 * Deletes a document by ID.
 */
export async function deleteFirestoreDoc(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const db = getClientDb();
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown Firestore error';
    throw new FirestoreServiceError(
      `Failed to delete document ${docId} in ${collectionName}: ${message}`,
      'delete-failed',
      err
    );
  }
}

export type BatchOperation =
  | { type: 'set'; collection: string; id: string; data: DocumentData }
  | { type: 'update'; collection: string; id: string; data: DocumentData }
  | { type: 'delete'; collection: string; id: string };

/**
 * Performs atomic multi-document writes (batch operations).
 * Either all writes succeed, or none are applied.
 */
export async function batchWrite(operations: BatchOperation[]): Promise<void> {
  if (!isFirebaseConfigured || operations.length === 0) return;

  try {
    const db = getClientDb();
    const batch = writeBatch(db);

    for (const op of operations) {
      const docRef = doc(db, op.collection, op.id);
      if (op.type === 'set') {
        batch.set(docRef, cleanFirestoreData(op.data));
      } else if (op.type === 'update') {
        batch.update(docRef, cleanFirestoreData(op.data));
      } else if (op.type === 'delete') {
        batch.delete(docRef);
      }
    }

    await batch.commit();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Atomic batch commit failed';
    throw new FirestoreServiceError(
      `Atomic batch operation failed: ${message}`,
      'batch-failed',
      err
    );
  }
}

/**
 * Checks if a custom Member ID / Enrollment ID is already taken in the system.
 */
export async function checkMemberIdAvailable(customId: string): Promise<{
  available: boolean;
  existingMemberType?: 'student' | 'faculty';
  existingName?: string;
}> {
  const normalizedId = customId.trim().toUpperCase();
  if (!normalizedId) return { available: true };
  if (!isFirebaseConfigured) return { available: true };

  try {
    const db = getClientDb();
    const docRef = doc(db, 'member_ids', normalizedId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as { memberType: 'student' | 'faculty'; name: string };
      return {
        available: false,
        existingMemberType: data.memberType,
        existingName: data.name,
      };
    }
    return { available: true };
  } catch (err) {
    console.warn('[FirestoreService] checkMemberIdAvailable error:', err);
    return { available: true };
  }
}

/**
 * Releases a registered custom Member ID when a student/teacher is removed.
 */
export async function releaseMemberId(customId: string): Promise<void> {
  const normalizedId = customId.trim().toUpperCase();
  if (!normalizedId || !isFirebaseConfigured) return;
  try {
    const db = getClientDb();
    const docRef = doc(db, 'member_ids', normalizedId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[FirestoreService] Failed to release member ID ${normalizedId}:`, err);
  }
}

