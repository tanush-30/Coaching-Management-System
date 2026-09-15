// Firebase Client SDK — browser-only singleton
// IMPORTANT: Firebase Client SDK must never run on the server.
// This module guards against SSR by checking typeof window.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('your_api_key')
);

let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;
let _storage: FirebaseStorage | undefined;

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

// In the browser, initialize singletons immediately so SDK functions (doc, collection, writeBatch) receive real instances
if (typeof window !== 'undefined' && isFirebaseConfigured) {
  try {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    _db = getFirestore(_app);
    _auth = getAuth(_app);
    _storage = getStorage(_app);
  } catch (e) {
    console.warn('[Firebase] Client initialization warning:', e);
  }
}

export const db: Firestore = (_db || ({} as Firestore));
export const auth: Auth = (_auth || ({} as Auth));
export const storage: FirebaseStorage = (_storage || ({} as FirebaseStorage));

export function getClientDb(): Firestore {
  if (!_db) {
    const app = getFirebaseApp();
    _db = getFirestore(app);
  }
  return _db;
}

export function getClientAuth(): Auth {
  if (!_auth) {
    const app = getFirebaseApp();
    _auth = getAuth(app);
  }
  return _auth;
}

export function getClientStorage(): FirebaseStorage {
  if (!_storage) {
    const app = getFirebaseApp();
    _storage = getStorage(app);
  }
  return _storage;
}

export default {
  get app() { return getFirebaseApp(); },
  get db() { return getClientDb(); },
  get auth() { return getClientAuth(); },
  get storage() { return getClientStorage(); },
};

