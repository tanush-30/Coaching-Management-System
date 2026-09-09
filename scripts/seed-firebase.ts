/**
 * Firestore Seed Script — seeds all mock data into Firebase Firestore
 *
 * Usage:
 *   1. Set your Firebase env vars in .env.local
 *   2. Run: npx ts-node --project tsconfig.json scripts/seed-firebase.ts
 *
 * This uses the Firebase Admin SDK to bypass security rules (seed only).
 * All existing documents in affected collections are REPLACED.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Validate required environment variables
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey || projectId.includes('your_project_id')) {
  console.error('\n❌ Missing or invalid Firebase Admin credentials in .env.local!\n');
  console.error('Please create or update your `.env.local` file with real Firebase credentials:');
  console.error('  - FIREBASE_ADMIN_PROJECT_ID');
  console.error('  - FIREBASE_ADMIN_CLIENT_EMAIL');
  console.error('  - FIREBASE_ADMIN_PRIVATE_KEY\n');
  console.error('See `.env.example` for the required format.\n');
  process.exit(1);
}

// Initialize Firebase Admin (v12 modular API)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// ── Inline mock data (so this script has no Next.js/TS path alias deps) ──────

const INITIAL_BATCHES = [
  {
    id: 'batch-1',
    name: 'JEE Adv Titans (12th)',
    courseName: 'JEE Advanced + Mains Integrated',
    grade: 'Class 12',
    subject: 'Physics, Chem, Maths',
    teacherId: 'teacher-1',
    teacherName: 'Dr. Rajesh Verma',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    startTime: '04:00 PM',
    endTime: '06:30 PM',
    room: 'Hall A (Smart Lab)',
    capacity: 35,
    enrolledCount: 28,
    annualFee: 85000,
    accentColor: '#4f46e5',
    academicYear: '2026-2027',
  },
  {
    id: 'batch-2',
    name: 'NEET Super-30 (12th)',
    courseName: 'Medical Entrance Masterclass',
    grade: 'Class 12',
    subject: 'Physics, Chem, Biology',
    teacherId: 'teacher-2',
    teacherName: 'Prof. Ananya Sen',
    scheduleDays: ['Tue', 'Thu', 'Sat'],
    startTime: '04:00 PM',
    endTime: '06:30 PM',
    room: 'Hall B',
    capacity: 30,
    enrolledCount: 24,
    annualFee: 90000,
    accentColor: '#059669',
    academicYear: '2026-2027',
  },
  {
    id: 'batch-3',
    name: 'Class 10 CBSE Achievers',
    courseName: 'Board Exam Centum Batch',
    grade: 'Class 10',
    subject: 'Maths & Science',
    teacherId: 'teacher-3',
    teacherName: 'Er. Vikas Sharma',
    scheduleDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '06:30 PM',
    endTime: '08:00 PM',
    room: 'Room 102',
    capacity: 40,
    enrolledCount: 36,
    annualFee: 45000,
    accentColor: '#d97706',
    academicYear: '2026-2027',
  },
  {
    id: 'batch-4',
    name: 'Class 9 Foundation Olympiad',
    courseName: 'NTSE & Olympiad Prep',
    grade: 'Class 9',
    subject: 'Science & Aptitude',
    teacherId: 'teacher-1',
    teacherName: 'Dr. Rajesh Verma',
    scheduleDays: ['Tue', 'Thu', 'Sat'],
    startTime: '06:30 PM',
    endTime: '08:00 PM',
    room: 'Room 104',
    capacity: 25,
    enrolledCount: 18,
    annualFee: 40000,
    accentColor: '#0284c7',
    academicYear: '2026-2027',
  },
];

const INITIAL_TEACHERS = [
  {
    id: 'teacher-1',
    name: 'Dr. Rajesh Verma',
    email: 'rajesh.verma@apexacademy.edu',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    subjects: ['Physics (Mechanics & Electrodynamics)', 'Olympiad Science'],
    qualifications: 'Ph.D. IIT Delhi, Ex-FIITJEE Faculty (14 yrs exp)',
    joiningDate: '2021-04-01',
    status: 'active',
    assignedBatches: ['batch-1', 'batch-4'],
  },
  {
    id: 'teacher-2',
    name: 'Prof. Ananya Sen',
    email: 'ananya.sen@apexacademy.edu',
    phone: '+91 98111 22334',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    subjects: ['Biology (Genetics & Zoology)', 'Chemistry (Organic)'],
    qualifications: 'M.Sc. AIIMS Fellow, Gold Medalist (9 yrs exp)',
    joiningDate: '2022-06-15',
    status: 'active',
    assignedBatches: ['batch-2'],
  },
  {
    id: 'teacher-3',
    name: 'Er. Vikas Sharma',
    email: 'vikas.sharma@apexacademy.edu',
    phone: '+91 99223 34455',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    subjects: ['Mathematics (Calculus & Coordinate)', 'CBSE Board Prep'],
    qualifications: 'B.Tech NIT Kurukshetra, Ex-Allen Senior Faculty (8 yrs exp)',
    joiningDate: '2023-01-10',
    status: 'active',
    assignedBatches: ['batch-3'],
  },
];

const INITIAL_STUDENTS = [
  { id: 'student-1', rollNo: 'APX-2026-001', name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com', phone: '+91 98201 11223', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', gender: 'Male', dob: '2008-05-14', address: 'B-402, Sunrise Towers, Model Town, Delhi', schoolName: 'Delhi Public School, R.K. Puram', parentName: 'Sunil Sharma', parentPhone: '+91 98201 99887', parentEmail: 'sunil.sharma@business.com', parentRelation: 'Father', batchIds: ['batch-1'], enrollmentDate: '2026-04-10', status: 'active', totalFee: 85000, paidFee: 55000, pendingFee: 30000 },
  { id: 'student-2', rollNo: 'APX-2026-002', name: 'Priya Patel', email: 'priya.patel@gmail.com', phone: '+91 87654 22334', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', gender: 'Female', dob: '2008-11-22', address: '12, Green Avenue, Ahmedabad', schoolName: 'Navrachana School', parentName: 'Meena Patel', parentPhone: '+91 87654 11223', parentEmail: 'meena.patel@gmail.com', parentRelation: 'Mother', batchIds: ['batch-2'], enrollmentDate: '2026-04-15', status: 'active', totalFee: 90000, paidFee: 90000, pendingFee: 0 },
  { id: 'student-3', rollNo: 'APX-2026-003', name: 'Rohan Gupta', email: 'rohan.gupta@gmail.com', phone: '+91 76543 33445', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', gender: 'Male', dob: '2009-03-08', address: '5C, Lake View Apartments, Bhopal', schoolName: 'Kendriya Vidyalaya No. 1, Bhopal', parentName: 'Ramesh Gupta', parentPhone: '+91 76543 00112', parentEmail: 'ramesh.gupta@company.in', parentRelation: 'Father', batchIds: ['batch-1', 'batch-3'], enrollmentDate: '2026-05-01', status: 'active', totalFee: 130000, paidFee: 45000, pendingFee: 85000 },
  { id: 'student-4', rollNo: 'APX-2026-004', name: 'Sneha Iyer', email: 'sneha.iyer@gmail.com', phone: '+91 65432 44556', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', gender: 'Female', dob: '2007-08-30', address: '88, T. Nagar, Chennai', schoolName: 'DAV School, Chennai', parentName: 'Kavitha Iyer', parentPhone: '+91 65432 99000', parentEmail: 'kavitha.iyer@gmail.com', parentRelation: 'Mother', batchIds: ['batch-2'], enrollmentDate: '2026-03-20', status: 'active', totalFee: 90000, paidFee: 60000, pendingFee: 30000 },
  { id: 'student-5', rollNo: 'APX-2026-005', name: 'Arjun Mehta', email: 'arjun.mehta@gmail.com', phone: '+91 54321 55667', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', gender: 'Male', dob: '2008-12-01', address: '34, Shivaji Nagar, Pune', schoolName: 'Bishop School, Pune', parentName: 'Rajiv Mehta', parentPhone: '+91 54321 00990', parentEmail: 'rajiv.mehta@infosys.com', parentRelation: 'Father', batchIds: ['batch-1'], enrollmentDate: '2026-04-05', status: 'active', totalFee: 85000, paidFee: 85000, pendingFee: 0 },
];

// ── Seed function ──────────────────────────────────────────────────────────────

async function seedCollection(collectionName: string, items: Array<{ id: string; [key: string]: unknown }>) {
  const batch = db.batch();
  for (const item of items) {
    const ref = db.collection(collectionName).doc(item.id);
    batch.set(ref, { ...item, createdAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  console.log(`✅ Seeded ${items.length} documents into '${collectionName}'`);
}

async function main() {
  console.log('🌱 Starting Firebase Firestore seed...\n');

  await seedCollection('batches', INITIAL_BATCHES);
  await seedCollection('teachers', INITIAL_TEACHERS);
  await seedCollection('students', INITIAL_STUDENTS);

  console.log('\n🎉 Seed complete! Your Firestore database is ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
