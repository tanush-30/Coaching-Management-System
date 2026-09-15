import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function inspect() {
  const collections = [
    'whatsapp_logs',
    'attendance',
    'students',
    'teachers',
    'batches',
    'installments',
    'exams',
    'marks',
    'homework',
    'announcements',
    'audit_logs',
  ];

  console.log('--- Current Firestore Document Counts ---');
  for (const col of collections) {
    const snap = await db.collection(col).get();
    console.log(`${col}: ${snap.size} documents`);
    if (col === 'whatsapp_logs' && snap.size > 0) {
      console.log('Sample whatsapp_logs doc IDs:', snap.docs.slice(0, 5).map(d => d.id));
      console.log('Sample whatsapp_logs content:', snap.docs[0]?.data());
    }
  }
}

inspect().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
