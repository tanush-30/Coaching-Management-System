/**
 * CLI Script to Create or Enroll a Super Admin Account in Firebase
 * 
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> [displayName]
 * 
 * Example:
 *   node scripts/create-admin.mjs admin@apexerp.com ApexAdmin@2026 "Director Sharma"
 *   node scripts/create-admin.mjs myemail@example.com MyStrongPass123! "My Name"
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
  console.error('Please verify FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are set in .env.local');
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

async function createAdmin(email, password, displayName = 'Administrator') {
  if (!email || !password) {
    console.error('❌ Error: Email and password are required.');
    console.log('Usage: node scripts/create-admin.mjs <email> <password> [displayName]');
    process.exit(1);
  }

  try {
    let user;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`ℹ️  Existing user found with email "${email}" (UID: ${user.uid}). Updating password & claims...`);
      await auth.updateUser(user.uid, {
        password,
        displayName,
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        console.log(`➕ Creating new user account for "${email}"...`);
        user = await auth.createUser({
          email,
          password,
          displayName,
          emailVerified: true,
        });
      } else {
        throw err;
      }
    }

    // 1. Assign custom claim role: "admin"
    await auth.setCustomUserClaims(user.uid, { role: 'admin' });
    console.log('✅ Custom user claim { role: "admin" } assigned.');

    // 2. Revoke refresh tokens to force immediate claim refresh
    await auth.revokeRefreshTokens(user.uid);
    console.log('🔄 Token revoked for immediate synchronization.');

    // 3. Save to user_roles collection
    await db.collection('user_roles').doc(user.uid).set({
      role: 'admin',
      email,
      displayName,
      updatedAt: new Date().toISOString(),
      updatedBy: 'cli-create-admin',
    }, { merge: true });
    console.log(`💾 Firestore document user_roles/${user.uid} updated.`);

    console.log(`\n🎉 Super Admin enrolled successfully!`);
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name:     ${displayName}`);
    console.log(`🆔 UID:      ${user.uid}`);
    console.log(`\nYou can now log in at: http://localhost:3000/login/admin`);
  } catch (error) {
    console.error('❌ Failed to enroll admin:', error.message || error);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const email = args[0] || 'admin@apexerp.com';
const password = args[1] || 'ApexAdmin@2026';
const displayName = args[2] || 'Director Sharma';

createAdmin(email, password, displayName);
