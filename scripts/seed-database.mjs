/**
 * Firebase Production Data Seeder & Role Provisioning Script
 * 
 * Usage:
 *   node scripts/seed-database.mjs
 * 
 * Requirements:
 *   - .env.local with FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
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

async function createOrUpdateUser(email, password, displayName, claims, roleDoc) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`ℹ️  User exists: ${email} (${user.uid}) - Updating...`);
    await auth.updateUser(user.uid, {
      displayName,
      password,
    });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`➕ Creating user: ${email}...`);
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

  // 1. Set Custom Claims (Enforces RBAC in Firestore & session verification)
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`   ✅ Claims assigned: ${JSON.stringify(claims)}`);

  // 2. Write to user_roles collection
  await db.collection('user_roles').doc(user.uid).set({
    ...claims,
    email,
    displayName,
    updatedAt: new Date().toISOString(),
    ...roleDoc,
  }, { merge: true });

  return user.uid;
}

async function seedDatabase() {
  console.log('🚀 Starting Firebase Production Seeding & Role Provisioning...\n');

  // --- 1. Seed Batches ---
  console.log('📦 Seeding Batches...');
  const batches = [
    {
      id: 'batch-jee-adv-2026',
      batchCode: 'BAT-JEE-ADV-2026',
      name: 'JEE Advanced Physics Super 30',
      courseName: 'IIT-JEE Target 2026',
      grade: 'Class 12',
      subject: 'Physics',
      teacherId: 'teacher-verma',
      teacherName: 'Prof. Arvind Verma',
      scheduleDays: ['Mon', 'Wed', 'Fri'],
      startTime: '04:30 PM',
      endTime: '06:00 PM',
      room: 'Hall A (Smart Lab)',
      capacity: 30,
      enrolledCount: 29,
      annualFee: 65000,
      accentColor: 'indigo',
      academicYear: '2026-2027',
    },
    {
      id: 'batch-neet-bio-2026',
      batchCode: 'BAT-NEET-BIO-2026',
      name: 'NEET Champions Biology',
      courseName: 'NEET Medical Prep',
      grade: 'Class 11',
      subject: 'Biology',
      teacherId: 'teacher-awasthi',
      teacherName: 'Dr. Meera Awasthi',
      scheduleDays: ['Tue', 'Thu', 'Sat'],
      startTime: '05:00 PM',
      endTime: '06:30 PM',
      room: 'Lab 2 (Biology Wing)',
      capacity: 40,
      enrolledCount: 38,
      annualFee: 55000,
      accentColor: 'emerald',
      academicYear: '2026-2027',
    },
    {
      id: 'batch-maths-foundations',
      batchCode: 'BAT-MATHS-2026',
      name: 'Class 10 Board & Olympiad Maths',
      courseName: 'CBSE + NTSE Olympiad',
      grade: 'Class 10',
      subject: 'Mathematics',
      teacherId: 'teacher-sharma',
      teacherName: 'Prof. Rajesh Sharma',
      scheduleDays: ['Mon', 'Thu', 'Sat'],
      startTime: '06:30 PM',
      endTime: '08:00 PM',
      room: 'Hall C',
      capacity: 35,
      enrolledCount: 32,
      annualFee: 45000,
      accentColor: 'violet',
      academicYear: '2026-2027',
    },
  ];

  for (const b of batches) {
    await db.collection('batches').doc(b.id).set(b, { merge: true });
    await db.collection('member_ids').doc(b.batchCode).set({
      id: b.batchCode,
      memberType: 'batch',
      name: b.name,
      memberRefId: b.id,
      assignedAt: new Date().toISOString(),
    }, { merge: true });
  }
  console.log(`   ✅ ${batches.length} Batches created & registered in member_ids.`);

  // --- 2. Create Role User Accounts ---
  console.log('\n👤 Provisioning Role-Gated User Accounts...');

  // A. Super Admin
  const adminUid = await createOrUpdateUser(
    'admin@apexerp.com',
    'ApexAdmin@2026',
    'Director Sharma',
    { role: 'admin' },
    {}
  );

  // B. Teacher / Faculty (Assigned to JEE Advanced Batch)
  const teacherUid = await createOrUpdateUser(
    'teacher@apexerp.com',
    'ApexTeacher@2026',
    'Prof. Arvind Verma',
    {
      role: 'teacher',
      batchIds: ['batch-jee-adv-2026'],
    },
    {
      subjects: ['Physics'],
      qualifications: 'M.Sc. Physics (IIT Bombay), 12+ Yrs Exp',
    }
  );

  // Also write to teachers collection & central member_ids
  const facultyId = 'FAC-2026-001';
  await db.collection('teachers').doc(teacherUid).set({
    id: teacherUid,
    facultyId,
    name: 'Prof. Arvind Verma',
    email: 'teacher@apexerp.com',
    phone: '+91 98765 11223',
    avatar: '',
    subjects: ['Physics'],
    qualifications: 'M.Sc. Physics (IIT Bombay), 12+ Yrs Exp',
    joiningDate: '2024-06-01',
    status: 'active',
    assignedBatches: ['batch-jee-adv-2026'],
  }, { merge: true });

  await db.collection('member_ids').doc(facultyId).set({
    id: facultyId,
    memberType: 'faculty',
    name: 'Prof. Arvind Verma',
    memberRefId: teacherUid,
    assignedAt: new Date().toISOString(),
  }, { merge: true });

  // C. Student (Enrolled in JEE Batch)
  const studentUid = await createOrUpdateUser(
    'student@apexerp.com',
    'ApexStudent@2026',
    'Vikram Singhania',
    {
      role: 'student',
      studentId: 'student-vikram-001',
      batchId: 'batch-jee-adv-2026',
    },
    {
      studentId: 'student-vikram-001',
      batchId: 'batch-jee-adv-2026',
    }
  );

  // D. Parent / Guardian (Linked to Vikram Singhania)
  const parentUid = await createOrUpdateUser(
    'parent@apexerp.com',
    'ApexParent@2026',
    'Sunil Singhania',
    {
      role: 'parent',
      childIds: ['student-vikram-001'],
    },
    {
      childIds: ['student-vikram-001'],
    }
  );

  // --- 3. Seed Students & Fee Installments ---
  console.log('\n🎓 Seeding Student Records & Fee Ledgers...');

  const sampleStudent = {
    id: 'student-vikram-001',
    rollNo: 'APX-2026-001',
    name: 'Vikram Singhania',
    email: 'student@apexerp.com',
    phone: '+91 98765 43210',
    avatar: '',
    gender: 'Male',
    dob: '2008-04-15',
    address: 'B-402, Green Glen Heights, Noida Sector 62',
    schoolName: 'Delhi Public School',
    parentName: 'Sunil Singhania',
    parentPhone: '+91 98765 43210',
    parentEmail: 'parent@apexerp.com',
    parentRelation: 'Father',
    batchIds: ['batch-jee-adv-2026'],
    enrollmentDate: '2026-04-01',
    status: 'active',
    totalFee: 65000,
    paidFee: 40000,
    pendingFee: 25000,
  };

  await db.collection('students').doc(sampleStudent.id).set(sampleStudent, { merge: true });

  await db.collection('member_ids').doc(sampleStudent.rollNo).set({
    id: sampleStudent.rollNo,
    memberType: 'student',
    name: sampleStudent.name,
    memberRefId: sampleStudent.id,
    assignedAt: new Date().toISOString(),
  }, { merge: true });

  const installments = [
    {
      id: 'inst-vikram-01',
      studentId: 'student-vikram-001',
      installmentNo: 1,
      title: 'Admission & Term 1 Installment',
      dueDate: '2026-04-10',
      amount: 40000,
      status: 'paid',
      paidDate: '2026-04-08',
      paymentMode: 'UPI',
      transactionId: 'UPI-984218749812',
      receiptNumber: 'REC-2026-0041',
    },
    {
      id: 'inst-vikram-02',
      studentId: 'student-vikram-001',
      installmentNo: 2,
      title: 'Term 2 Installment',
      dueDate: '2026-10-15',
      amount: 25000,
      status: 'pending',
      paymentMode: 'UPI',
    },
  ];

  for (const inst of installments) {
    await db.collection('installments').doc(inst.id).set(inst, { merge: true });
  }

  // --- 4. Seed Exams & Report Marks ---
  console.log('\n📝 Seeding Exam & Performance Report...');

  const exam = {
    id: 'exam-jee-adv-test3',
    title: 'Unit Test 3 — Mechanics & Calculus',
    batchId: 'batch-jee-adv-2026',
    batchName: 'JEE Advanced Physics Super 30',
    subject: 'Physics',
    examDate: '2026-09-05',
    totalMarks: 200,
    passingMarks: 80,
    status: 'evaluated',
    averageScore: 148,
    highestScore: 197,
  };

  await db.collection('exams').doc(exam.id).set(exam, { merge: true });

  const mark = {
    id: 'mark-vikram-test3',
    examId: 'exam-jee-adv-test3',
    studentId: 'student-vikram-001',
    studentName: 'Vikram Singhania',
    rollNo: 'APX-2026-001',
    marksObtained: 197,
    totalMarks: 200,
    percentage: 98.5,
    rank: 1,
    grade: 'A+',
    teacherRemarks: 'Outstanding analytical clarity and numerical precision. Ready for Advanced Mock Series.',
    whatsappSent: true,
  };

  await db.collection('marks').doc(mark.id).set(mark, { merge: true });

  console.log('\n✨ Database Seeding & Role Configuration Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Provisioned Login Accounts:');
  console.log('1. Super Admin   👉  admin@apexerp.com    /  ApexAdmin@2026');
  console.log('2. Teacher       👉  teacher@apexerp.com  /  ApexTeacher@2026');
  console.log('3. Student       👉  student@apexerp.com  /  ApexStudent@2026');
  console.log('4. Parent        👉  parent@apexerp.com   /  ApexParent@2026');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
