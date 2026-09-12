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

async function testPostAttendance() {
  const batchId = 'batch-1789062033720';
  const date = '2026-09-11';
  const id = `att-${batchId}-${date}`;

  const entry = {
    id,
    batchId,
    batchName: 'JEE Super-30',
    date,
    markedBy: 'Rajesh Sharma',
    markedAt: '06:50 PM',
    presentCount: 1,
    absentCount: 1,
    whatsappDispatched: true,
    records: [
      {
        studentId: 'student-1789062165770',
        rollNo: 'STU-2026-001',
        studentName: 'Vikram Rathore',
        status: 'present',
        remarks: 'On-time presence',
      },
      {
        studentId: 'student-1789099403130',
        rollNo: 'STU-2026-002',
        studentName: 'Kritan Varma',
        status: 'absent',
        remarks: 'Medical leave',
      },
    ],
  };

  await db.collection('attendance').doc(id).set(entry);
  console.log('Successfully written attendance to Firestore:', id);
}

testPostAttendance().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
