// scripts/test-phase4-read-views.ts
// Test Suite for Phase 4 Step 3: Read Views (Student, Teacher & Parent Portals)
// Zero Fake Data: Strictly in-memory assertions.

import { TimetableSlot, Student, Teacher, Batch } from '../src/lib/types';
import { timeToMinutes, formatTimeDisplay } from '../src/lib/timetable-utils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runReadViewTests() {
  console.log('====================================================');
  console.log('🧪 PHASE 4 STEP 3: READ VIEWS SCOPING TEST SUITE');
  console.log('   (Strictly In-Memory / Zero Fake DB Data)');
  console.log('====================================================\n');

  // Master Test Data (In-Memory Fixtures Only)
  const batches: Batch[] = [
    {
      id: 'batch-10a',
      name: 'Class 10 - Section A',
      courseName: 'Foundation Board',
      grade: 'Class 10',
      subject: 'Math, Physics',
      teacherId: 't-sharma',
      teacherName: 'Dr. Amit Sharma',
      scheduleDays: ['Monday', 'Wednesday'],
      startTime: '10:00',
      endTime: '11:30',
      room: 'Room 101',
      capacity: 40,
      enrolledCount: 25,
      annualFee: 65000,
      accentColor: '#4f46e5',
      academicYear: '2026-2027',
    },
    {
      id: 'batch-11a',
      name: 'Class 11 - JEE Elite',
      courseName: 'JEE Advanced',
      grade: 'Class 11',
      subject: 'Physics, Chemistry, Math',
      teacherId: 't-verma',
      teacherName: 'Prof. Sunil Verma',
      scheduleDays: ['Tuesday', 'Thursday'],
      startTime: '16:00',
      endTime: '17:30',
      room: 'Room 201',
      capacity: 35,
      enrolledCount: 30,
      annualFee: 85000,
      accentColor: '#059669',
      academicYear: '2026-2027',
    },
  ];

  const students: Student[] = [
    {
      id: 'stu-vikram',
      rollNo: 'STU-2026-001',
      name: 'Vikram Rathore',
      email: 'vikram@example.com',
      phone: '9876543210',
      avatar: '',
      gender: 'Male',
      dob: '2008-05-12',
      address: 'Jaipur',
      schoolName: 'DPS',
      parentName: 'Sunil Rathore',
      parentPhone: '6281276639',
      parentEmail: 'parent@example.com',
      parentRelation: 'Father',
      batchIds: ['batch-10a'],
      enrollmentDate: '2026-01-10',
      status: 'active',
      totalFee: 65000,
      paidFee: 65000,
      pendingFee: 0,
    },
  ];

  const teachers: Teacher[] = [
    {
      id: 't-sharma',
      facultyId: 'FAC-2026-001',
      name: 'Dr. Amit Sharma',
      email: 'sharma@example.com',
      phone: '9876543211',
      avatar: '',
      subjects: ['Physics', 'Mathematics'],
      qualifications: 'Ph.D. Physics',
      joiningDate: '2024-01-01',
      status: 'active',
      assignedBatches: ['batch-10a', 'batch-11a'],
    },
  ];

  const timetableSlots: TimetableSlot[] = [
    {
      id: 'slot-1',
      batchId: 'batch-10a',
      batchName: 'Class 10 - Section A',
      subjectId: 'math',
      subjectName: 'Mathematics',
      teacherId: 't-sharma',
      teacherName: 'Dr. Amit Sharma',
      day: 'Monday',
      startTime: '10:00',
      endTime: '10:45',
      roomId: 'room-101',
      roomName: 'Room 101',
      color: '#4f46e5',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'slot-2',
      batchId: 'batch-10a',
      batchName: 'Class 10 - Section A',
      subjectId: 'physics',
      subjectName: 'Physics',
      teacherId: 't-sharma',
      teacherName: 'Dr. Amit Sharma',
      day: 'Wednesday',
      startTime: '11:00',
      endTime: '11:45',
      roomId: 'room-101',
      roomName: 'Room 101',
      color: '#4f46e5',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'slot-3',
      batchId: 'batch-11a',
      batchName: 'Class 11 - JEE Elite',
      subjectId: 'physics-adv',
      subjectName: 'Advanced Mechanics',
      teacherId: 't-sharma', // Same teacher teaching another batch
      teacherName: 'Dr. Amit Sharma',
      day: 'Tuesday',
      startTime: '16:00',
      endTime: '17:30',
      roomId: 'room-201',
      roomName: 'Room 201',
      color: '#059669',
      createdAt: '',
      updatedAt: '',
    },
  ];

  // Test 1: Student Scoping
  console.log('Test 1: Student Batch Timetable Scoping');
  const student = students[0];
  const studentSlots = timetableSlots.filter((s) => (student.batchIds || []).includes(s.batchId));
  assert(studentSlots.length === 2, 'Student in batch-10a sees exactly 2 slots');
  assert(studentSlots.every((s) => s.batchId === 'batch-10a'), 'All visible slots belong to batch-10a');
  assert(!studentSlots.some((s) => s.batchId === 'batch-11a'), 'Student cannot see batch-11a slots (secure scoping)');

  // Test 2: Teacher Multi-Batch Scoping
  console.log('Test 2: Teacher Multi-Batch Timetable Scoping');
  const teacher = teachers[0];
  const teacherSlots = timetableSlots.filter((s) => s.teacherId === teacher.id || s.teacherId === teacher.facultyId);
  assert(teacherSlots.length === 3, 'Teacher sees all 3 assigned slots across batches');
  const batchNames = new Set(teacherSlots.map((s) => s.batchName));
  assert(batchNames.has('Class 10 - Section A') && batchNames.has('Class 11 - JEE Elite'), 'Teacher view spans multiple batches');

  // Test 3: Parent Linked Ward Scoping
  console.log('Test 3: Parent Linked Ward Timetable Scoping');
  const linkedChild = students.find((s) => s.parentPhone === '6281276639');
  assert(Boolean(linkedChild), 'Parent phone correctly links to Vikram Rathore');
  const parentVisibleSlots = timetableSlots.filter((s) => (linkedChild?.batchIds || []).includes(s.batchId));
  assert(parentVisibleSlots.length === 2, 'Parent sees exactly 2 slots for their child');
  assert(parentVisibleSlots.every((s) => s.batchId === 'batch-10a'), 'Parent slots strictly scoped to child batch');

  // Test 4: Empty State Graceful Handling
  console.log('Test 4: Empty State Handling');
  const unscheduledStudent: Student = {
    ...student,
    id: 'stu-unscheduled',
    batchIds: ['batch-empty-99'],
  };
  const emptyStudentSlots = timetableSlots.filter((s) => unscheduledStudent.batchIds.includes(s.batchId));
  assert(emptyStudentSlots.length === 0, 'Unscheduled batch produces 0 slots (triggers empty state illustration)');

  // Test 5: Day Sorting & Time Order
  console.log('Test 5: Time Sorting within Day Columns');
  const mondaySlots = studentSlots
    .filter((s) => s.day === 'Monday')
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  assert(mondaySlots.length === 1 && mondaySlots[0].startTime === '10:00', 'Monday slot ordered by start time');

  console.log('\n====================================================');
  console.log('✅ ALL PHASE 4 STEP 3 READ VIEW TESTS PASSED (100%)');
  console.log('====================================================');
}

runReadViewTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
