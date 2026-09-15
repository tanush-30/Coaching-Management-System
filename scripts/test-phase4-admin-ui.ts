// scripts/test-phase4-admin-ui.ts
// Test Suite for Phase 4 Step 2: Admin UI Timetable & Conflict Detection
// Zero Fake Data: Strictly in-memory verification.

import {
  timeToMinutes,
  minutesToTime,
  formatTimeDisplay,
  doIntervalsOverlap,
  detectTimetableConflicts,
  validateTimetableSlotInput,
} from '../src/lib/timetable-utils';
import { TimetableSlot, TimetableSlotInput } from '../src/lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runAdminUITests() {
  console.log('====================================================');
  console.log('🧪 PHASE 4 STEP 2: ADMIN UI & CONFLICT DETECTION TEST');
  console.log('   (Strictly In-Memory / Zero Fake DB Data)');
  console.log('====================================================\n');

  // Scenario 1: Slot Creation with Master Data References
  console.log('Test 1: Slot Creation Input Validation & Master References');
  const validSlotInput: TimetableSlotInput = {
    batchId: 'BAT-2026-001',
    batchName: 'Class 10 - Science Elite',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'FAC-2026-001',
    teacherName: 'Dr. Sunil Verma',
    day: 'Monday',
    startTime: '10:00',
    endTime: '10:45',
    roomId: 'room-101',
    roomName: 'Room 101 (Physics Lab)',
    color: '#4f46e5',
  };

  const valResult = validateTimetableSlotInput(validSlotInput);
  assert(valResult.valid, 'Valid slot input with master data passes validation');

  // Scenario 2: Teacher Double-Booking Detection Across Batches
  console.log('Test 2: Teacher Double-Booking Prevention Across Batches');
  const existingSlots: TimetableSlot[] = [
    {
      id: 'slot-001',
      ...validSlotInput,
      batchName: validSlotInput.batchName || '',
      subjectName: validSlotInput.subjectName || '',
      teacherName: validSlotInput.teacherName || '',
      roomName: validSlotInput.roomName || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Attempt to assign same teacher to a DIFFERENT batch at overlapping time
  const teacherClashCandidate: TimetableSlotInput = {
    batchId: 'BAT-2026-002',
    batchName: 'Class 9 - Foundation',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'FAC-2026-001', // Same Teacher
    teacherName: 'Dr. Sunil Verma',
    day: 'Monday',
    startTime: '10:15', // Overlaps with 10:00 - 10:45
    endTime: '11:00',
    roomId: 'room-102', // Different room
    roomName: 'Room 102',
  };

  const teacherClashes = detectTimetableConflicts(existingSlots, teacherClashCandidate);
  assert(teacherClashes.length === 1, 'Teacher clash detected for overlapping time');
  assert(teacherClashes[0].type === 'teacher', 'Conflict type identified as "teacher"');
  assert(teacherClashes[0].message.includes('Teacher conflict'), 'Clear descriptive message formatted');
  console.log('    Conflict Output:', teacherClashes[0].message);
  console.log('');

  // Scenario 3: Room Double-Booking Detection Across Teachers
  console.log('Test 3: Room Double-Booking Prevention Across Teachers');
  const roomClashCandidate: TimetableSlotInput = {
    batchId: 'BAT-2026-003',
    batchName: 'Class 11 - JEE Advanced',
    subjectId: 'chem-101',
    subjectName: 'Chemistry',
    teacherId: 'FAC-2026-002', // Different Teacher
    teacherName: 'Prof. Amit Sharma',
    day: 'Monday',
    startTime: '10:30', // Overlaps with 10:00 - 10:45
    endTime: '11:15',
    roomId: 'room-101', // Same Room
    roomName: 'Room 101 (Physics Lab)',
  };

  const roomClashes = detectTimetableConflicts(existingSlots, roomClashCandidate);
  assert(roomClashes.length === 1, 'Room clash detected for overlapping time');
  assert(roomClashes[0].type === 'room', 'Conflict type identified as "room"');
  assert(roomClashes[0].message.includes('Room conflict'), 'Clear descriptive message formatted');
  console.log('    Conflict Output:', roomClashes[0].message);
  console.log('');

  // Scenario 4: Back-to-Back Lectures (Boundary Case)
  console.log('Test 4: Back-to-Back Schedule Boundary Case (No False Positives)');
  const backToBackCandidate: TimetableSlotInput = {
    batchId: 'BAT-2026-002',
    batchName: 'Class 9 - Foundation',
    subjectId: 'math-101',
    subjectName: 'Mathematics',
    teacherId: 'FAC-2026-001', // Same Teacher
    teacherName: 'Dr. Sunil Verma',
    day: 'Monday',
    startTime: '10:45', // Starts exactly when previous ends at 10:45
    endTime: '11:30',
    roomId: 'room-101', // Same Room
    roomName: 'Room 101',
  };

  const b2bClashes = detectTimetableConflicts(existingSlots, backToBackCandidate);
  assert(b2bClashes.length === 0, 'Back-to-back lecture correctly allowed (0 clashes)');
  console.log('');

  // Scenario 5: Slot Editing Self-Exclusion
  console.log('Test 5: Slot Edit Self-Exclusion (Editing does not self-conflict)');
  const editCandidate: TimetableSlotInput & { id: string } = {
    id: 'slot-001',
    batchId: 'BAT-2026-001',
    batchName: 'Class 10 - Science Elite',
    subjectId: 'math-101',
    subjectName: 'Mathematics Advanced (Updated)',
    teacherId: 'FAC-2026-001',
    teacherName: 'Dr. Sunil Verma',
    day: 'Monday',
    startTime: '10:00',
    endTime: '10:45',
    roomId: 'room-101',
  };

  const editClashes = detectTimetableConflicts(existingSlots, editCandidate, 'slot-001');
  assert(editClashes.length === 0, 'Editing slot does not clash with itself');
  console.log('');

  // Scenario 6: Multi-Mode Filter Logic
  console.log('Test 6: Multi-Mode Filtering (Batch, Faculty, Room)');
  const multiSlots: TimetableSlot[] = [
    {
      id: 's1',
      batchId: 'B1',
      batchName: 'Batch 1',
      subjectId: 'MATH',
      subjectName: 'Math',
      teacherId: 'T1',
      teacherName: 'Teacher 1',
      day: 'Monday',
      startTime: '09:00',
      endTime: '09:45',
      roomId: 'R1',
      roomName: 'Room 1',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 's2',
      batchId: 'B2',
      batchName: 'Batch 2',
      subjectId: 'PHYS',
      subjectName: 'Physics',
      teacherId: 'T1',
      teacherName: 'Teacher 1',
      day: 'Tuesday',
      startTime: '10:00',
      endTime: '10:45',
      roomId: 'R2',
      roomName: 'Room 2',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 's3',
      batchId: 'B1',
      batchName: 'Batch 1',
      subjectId: 'CHEM',
      subjectName: 'Chemistry',
      teacherId: 'T2',
      teacherName: 'Teacher 2',
      day: 'Monday',
      startTime: '11:00',
      endTime: '11:45',
      roomId: 'R1',
      roomName: 'Room 1',
      createdAt: '',
      updatedAt: '',
    },
  ];

  // Filter by Batch 'B1' -> should return s1 and s3
  const batchB1Slots = multiSlots.filter(s => s.batchId === 'B1');
  assert(batchB1Slots.length === 2 && batchB1Slots.map(s => s.id).includes('s1') && batchB1Slots.map(s => s.id).includes('s3'), 'Batch B1 filter yields 2 slots');

  // Filter by Teacher 'T1' -> should return s1 and s2
  const teacherT1Slots = multiSlots.filter(s => s.teacherId === 'T1');
  assert(teacherT1Slots.length === 2 && teacherT1Slots.map(s => s.id).includes('s1') && teacherT1Slots.map(s => s.id).includes('s2'), 'Teacher T1 filter yields 2 slots across batches');

  // Filter by Room 'R1' -> should return s1 and s3
  const roomR1Slots = multiSlots.filter(s => s.roomId === 'R1');
  assert(roomR1Slots.length === 2 && roomR1Slots.map(s => s.id).includes('s1') && roomR1Slots.map(s => s.id).includes('s3'), 'Room R1 filter yields 2 slots');

  console.log('\n====================================================');
  console.log('✅ ALL PHASE 4 STEP 2 ADMIN UI TESTS PASSED (100%)');
  console.log('====================================================');
}

runAdminUITests().catch(err => {
  console.error(err);
  process.exit(1);
});
