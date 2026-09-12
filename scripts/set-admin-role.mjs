/**
 * Server-Side Script to Set Admin Custom User Claim
 * 
 * Usage:
 *   node scripts/set-admin-role.mjs <uid_or_email>
 * 
 * Example:
 *   node scripts/set-admin-role.mjs admin@apexerp.com
 *   node scripts/set-admin-role.mjs 4h8Snd9X20Klsa82
 * 
 * Note: Never expose this as a public API endpoint.
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
  console.error('Please verify FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY');
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

async function setAdminRole(identifier) {
  if (!identifier) {
    console.error('❌ Usage: node scripts/set-admin-role.mjs <uid_or_email>');
    process.exit(1);
  }

  try {
    let user;
    if (identifier.includes('@')) {
      console.log(`🔍 Looking up user by email: ${identifier}...`);
      user = await auth.getUserByEmail(identifier);
    } else {
      console.log(`🔍 Looking up user by UID: ${identifier}...`);
      user = await auth.getUser(identifier);
    }

    console.log(`👤 Found user: ${user.displayName || 'No Name'} (${user.email}) [UID: ${user.uid}]`);

    // 1. Set Custom User Claims on Firebase Auth
    await auth.setCustomUserClaims(user.uid, { role: 'admin' });
    console.log('✅ Firebase Auth Custom Claims set: { role: "admin" }');

    // 2. Revoke Refresh Tokens so new claims take effect on next token refresh
    await auth.revokeRefreshTokens(user.uid);
    console.log('🔄 Stale refresh tokens revoked.');

    // 3. Write/merge user_roles document in Firestore
    await db.collection('user_roles').doc(user.uid).set({
      role: 'admin',
      email: user.email || '',
      displayName: user.displayName || 'Administrator',
      updatedAt: new Date().toISOString(),
      updatedBy: 'scripts/set-admin-role.mjs',
    }, { merge: true });
    console.log(`💾 Firestore document user_roles/${user.uid} updated.`);

    console.log(`\n🎉 Success! User ${user.email} is now a verified Super Admin.`);
  } catch (error) {
    console.error('❌ Failed to set admin role:', error.message || error);
    process.exit(1);
  }
}

const target = process.argv[2];
setAdminRole(target);
