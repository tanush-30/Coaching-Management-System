// Firebase Client SDK — browser-only singleton
// IMPORTANT: Firebase Client SDK must never run on the server.
// This module guards against SSR by checking typeof window.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy singleton — only initializes in the browser, never during SSR/build
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('your_api_key')
);

function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('[Firebase] Client SDK accessed during SSR — use useEffect or lazy hooks.');
  }
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase API Key is missing. Please add NEXT_PUBLIC_FIREBASE_API_KEY to your .env.local file. See .env.example for details.'
    );
  }
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

// Proxy-based lazy exports — safe to import anywhere; only throws if called server-side
export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getFirebaseApp());
    return _db[prop as keyof Firestore];
  },
});

export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getFirebaseApp());
    return _auth[prop as keyof Auth];
  },
});

export default { get app() { return getFirebaseApp(); } };
