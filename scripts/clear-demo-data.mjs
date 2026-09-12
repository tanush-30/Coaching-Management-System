/**
 * Clear Demo / Sample Data Script
 * 
 * Cleans all sample demo data (students, faculty, batches, fee records, etc.)
 * while keeping your Super Admin account intact.
 * 
 * Usage:
 *   node scripts/clear-demo-data.mjs
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

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  if (snapshot.empty) {
    console.log(`   ℹ️  Collection "${collectionPath}" is already empty.`);
    return;
  }

  const batch = db.batch();
  let count = 0;
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });
  await batch.commit();
  console.log(`   🗑️  Deleted ${count} documents from "${collectionPath}".`);
}

async function cleanData() {
  console.log('🧹 Starting Database Cleanup (Fresh Start Mode)...\n');

  // 1. Clear Firestore Collections
  const collectionsToClear = [
    'students',
    'teachers',
    'batches',
    'member_ids',
    'installments',
    'attendance',
    'exams',
    'marks',
    'homework',
    'materials',
    'whatsapp_logs',
  ];

  console.log('📦 Cleaning Firestore Collections...');
  for (const col of collectionsToClear) {
    await deleteCollection(col);
  }

  // 2. Clear Demo Auth Accounts & user_roles (except Admin)
  console.log('\n👤 Cleaning Demo User Accounts from Firebase Auth & user_roles...');
  const demoEmails = [
    'teacher@apexerp.com',
    'student@apexerp.com',
    'parent@apexerp.com',
  ];

  for (const email of demoEmails) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.deleteUser(user.uid);
      await db.collection('user_roles').doc(user.uid).delete();
      console.log(`   ✅ Deleted demo auth user & role: ${email}`);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Not found, fine
      } else {
        console.warn(`   ⚠️ Could not delete ${email}:`, err.message);
      }
    }
  }

  // 3. Ensure Admin account exists & is configured
  console.log('\n🛡️ Verifying Super Admin Account...');
  let adminUser;
  try {
    adminUser = await auth.getUserByEmail('admin@apexerp.com');
    console.log(`   ✅ Super Admin exists: admin@apexerp.com (UID: ${adminUser.uid})`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('   ➕ Creating Super Admin account (admin@apexerp.com)...');
      adminUser = await auth.createUser({
        email: 'admin@apexerp.com',
        password: 'ApexAdmin@2026',
        displayName: 'Director Sharma',
        emailVerified: true,
      });
    } else {
      throw err;
    }
  }

  // Ensure Admin claims & role doc
  await auth.setCustomUserClaims(adminUser.uid, { role: 'admin' });
  await db.collection('user_roles').doc(adminUser.uid).set({
    role: 'admin',
    email: 'admin@apexerp.com',
    displayName: 'Director Sharma',
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log('   ✅ Super Admin role verified in Firebase Auth & Firestore.');

  console.log('\n🎉 Database is now 100% CLEAN and ready for your real institute data!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Log in to start creating your real batches & enrolling students:');
  console.log('👉 URL: http://localhost:3000/login/admin');
  console.log('👉 Email: admin@apexerp.com');
  console.log('👉 Password: ApexAdmin@2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

cleanData().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
