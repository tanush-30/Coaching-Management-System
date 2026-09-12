// User role lookup from Firestore `user_roles` collection
// Roles are ONLY writable by Admin SDK (server-side) — never from client
// This prevents self-elevation attacks where users set their own role via client SDK

import { doc, getDoc } from 'firebase/firestore';
import { getClientDb } from './firebase';
import type { UserRole } from './types';

export async function getUserRole(uid: string): Promise<UserRole | null> {
  try {
    const snap = await getDoc(doc(getClientDb(), 'user_roles', uid));
    if (!snap.exists()) return null;
    return snap.data().role as UserRole;
  } catch {
    return null;
  }
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  // This function must only be called from server-side API routes using firebase-admin
  // Never call this from a client component
  throw new Error('setUserRole must be called from a server-side API route using firebase-admin');
}
