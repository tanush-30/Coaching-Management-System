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

async function clearWhatsappLogs() {
  console.log('--- Clearing whatsapp_logs collection in Firestore ---');
  const collectionRef = db.collection('whatsapp_logs');
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log('Collection "whatsapp_logs" is already empty.');
    return;
  }

  const batch = db.batch();
  let count = 0;
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();
  console.log(`Successfully deleted ${count} documents from "whatsapp_logs".`);
}

clearWhatsappLogs()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error clearing whatsapp_logs:', e);
    process.exit(1);
  });
