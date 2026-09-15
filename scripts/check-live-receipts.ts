import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    envVars[key] = val;
  }
});

const app = initializeApp({
  credential: cert({
    projectId: envVars.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: envVars.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: envVars.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  storageBucket: envVars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${envVars.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
});

const db = getFirestore(app);
const storage = getStorage(app);

async function checkLiveStatus() {
  console.log('=== CHECKING FIRESTORE & STORAGE STATUS ===');

  // 1. Check Installments
  const instSnap = await db.collection('installments').get();
  console.log(`\nFirestore 'installments' collection: ${instSnap.size} document(s)`);
  instSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`- ID: ${d.id} | StudentId: ${data.studentId} | Status: ${data.status} | Amount: ₹${data.amount} | Receipt: ${data.receiptNumber || 'None'}`);
  });

  // 2. Check Receipts collection
  const receiptSnap = await db.collection('receipts').get();
  console.log(`\nFirestore 'receipts' collection: ${receiptSnap.size} document(s)`);
  receiptSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`- Receipt #: ${data.receiptNumber} | Student: ${data.studentName} | URL: ${data.receiptUrl || data.receiptStoragePath}`);
  });

  // 3. Check Storage bucket files
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({ prefix: 'receipts/' });
    console.log(`\nFirebase Storage 'receipts/' files: ${files.length} file(s)`);
    files.forEach(f => {
      console.log(`- Path: ${f.name} | Size: ${f.metadata.size} bytes`);
    });
  } catch (err: any) {
    console.log(`\nFirebase Storage listing notice: ${err.message}`);
  }
}

checkLiveStatus().catch(console.error);
