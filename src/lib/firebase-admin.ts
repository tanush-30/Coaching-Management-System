// Firebase Admin SDK — server-side only (v12+ modular API)
// Used in Next.js API routes (never import in client components)
//
// IMPORTANT: This module uses lazy initialization — the Admin SDK is only
// initialized on first access, not at module load time. This prevents
// Next.js from crashing during `next build` when env vars are absent.

import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) return getApp();

  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    throw new Error(
      'FIREBASE_ADMIN_PROJECT_ID is not set. Add it to .env.local and restart the dev server.'
    );
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      // Next.js stores \n literally in env strings — convert back to real newlines
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Lazy getters — only call these inside request handlers, never at module scope
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// Convenience named exports (resolved lazily on first use)
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    return getAdminDb()[prop as keyof Firestore];
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return getAdminAuth()[prop as keyof Auth];
  },
});
