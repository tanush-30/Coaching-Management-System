/**
 * CLI Script to Delete a User and Remove All Roles from Firebase
 * 
 * Usage:
 *   node scripts/remove-user.mjs <email_or_uid>
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Error: Missing Firebase Admin credentials in .env.local');
  process.exit(1);
}

const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

async function removeUser(identifier) {
  if (!identifier) {
    console.error('❌ Usage: node scripts/remove-user.mjs <email_or_uid>');
    process.exit(1);
  }

  try {
    let user;
    if (identifier.includes('@')) {
      console.log(`🔍 Finding user by email: ${identifier}...`);
      user = await auth.getUserByEmail(identifier);
    } else {
      console.log(`🔍 Finding user by UID: ${identifier}...`);
      user = await auth.getUser(identifier);
    }

    const uid = user.uid;
    const email = user.email;

    // 1. Delete Firestore user_roles document
    try {
      await db.collection('user_roles').doc(uid).delete();
      console.log(`🗑️  Deleted Firestore document: user_roles/${uid}`);
    } catch (e) {
      console.warn('Notice deleting user_roles doc:', e.message);
    }

    // 2. Delete from Firebase Auth
    await auth.deleteUser(uid);
    console.log(`✅ Deleted user account from Firebase Auth (${email}, UID: ${uid})`);

    console.log(`\n🎉 User "${identifier}" has been completely removed.`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`ℹ️ User "${identifier}" was not found in Firebase Auth.`);
    } else {
      console.error('❌ Error removing user:', err.message || err);
      process.exit(1);
    }
  }
}

const target = process.argv[2] || 'your-personal-email@gmail.com';
removeUser(target);
