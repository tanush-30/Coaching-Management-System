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

async function fixStudents() {
  console.log('Fixing student batchIds in Firestore...');
  const stuSnap = await db.collection('students').get();

  for (const doc of stuSnap.docs) {
    const data = doc.data();
    let flatBatchIds: string[] = [];

    if (Array.isArray(data.batchIds)) {
      flatBatchIds = data.batchIds.flat(Infinity).filter((b: any) => typeof b === 'string' && b.trim() !== '');
    } else if (typeof data.batchId === 'string' && data.batchId.trim() !== '') {
      flatBatchIds = [data.batchId.trim()];
    }

    // Default to existing JEE Super-30 batch if empty
    if (flatBatchIds.length === 0) {
      flatBatchIds = ['batch-1789062033720'];
    }

    console.log(`Updating ${doc.id} (${data.name}) -> batchIds:`, flatBatchIds);
    await doc.ref.update({
      batchIds: flatBatchIds,
      batchId: flatBatchIds[0],
    });
  }

  console.log('Done fixing students!');
}

fixStudents().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
