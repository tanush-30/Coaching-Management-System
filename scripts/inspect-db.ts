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

const adminDb = getFirestore();

async function inspect() {
  console.log('=== 1. STUDENTS ===');
  const stuSnap = await adminDb.collection('students').get();
  stuSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`Doc ID: [${d.id}] | Name: [${data.name}] | Roll: [${data.rollNo}] | BatchIds: [${JSON.stringify(data.batchIds)}] | BatchId: [${data.batchId}] | AuthUid: [${data.authUid}]`);
  });

  console.log('\n=== 2. BATCHES ===');
  const batchSnap = await adminDb.collection('batches').get();
  batchSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`Batch ID: [${d.id}] | Name: [${data.name}] | Teacher: [${data.teacherName}] (${data.teacherId})`);
  });

  console.log('\n=== 3. ATTENDANCE ===');
  const attSnap = await adminDb.collection('attendance').get();
  console.log(`Total attendance docs in Firestore: ${attSnap.size}`);
  attSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`Doc ID: [${d.id}] | BatchId: [${data.batchId}] | Date: [${data.date}] | MarkedBy: [${data.markedBy}]`);
    console.log(`  Records count: ${(data.records || []).length}`);
    console.log(`  Records:`, JSON.stringify(data.records, null, 2));
  });
}

inspect().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
