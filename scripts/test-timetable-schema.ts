// scripts/test-timetable-schema.ts
// In-Memory Test Suite for Phase 4 Step 1: Timetable Schema & Conflict Detection Utilities
// Zero Fake Data: Pure in-memory assertions, no Firestore pollution.

import {
  timeToMinutes,
  minutesToTime,
  formatTimeDisplay,
  doIntervalsOverlap,
  detectTimetableConflicts,
  validateTimetableSlotInput,
  getNextSlotForSubject,
  DAYS_OF_WEEK,
} from '../src/lib/timetable-utils';
import { TimetableSlot, TimetableSlotInput } from '../src/lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TIMETABLE SCHEMA & UTILITIES TEST SUITE');
  console.log('   (Strictly In-Memory / Zero Fake DB Data)');
  console.log('====================================================\n');

  // Test 1: Time conversion & formatting
  console.log('Test 1: Time Conversion and 12/24hr Formatting');
  assert(timeToMinutes('00:00') === 0, '00:00 is 0 minutes');
  assert(timeToMinutes('10:00') === 600, '10:00 is 600 minutes');
  assert(timeToMinutes('10:45') === 645, '10:45 is 645 minutes');
  assert(timeToMinutes('23:59') === 1439, '23:59 is 1439 minutes');

  assert(minutesToTime(0) === '00:00', '0 minutes is 00:00');
  assert(minutesToTime(600) === '10:00', '600 minutes is 10:00');
  assert(minutesToTime(645) === '10:45', '645 minutes is 10:45');

  assert(formatTimeDisplay('10:00') === '10:00 AM', '10:00 formats to 10:00 AM');
  assert(formatTimeDisplay('12:30') === '12:30 PM', '12:30 formats to 12:30 PM');
  assert(formatTimeDisplay('15:45') === '3:45 PM' || formatTimeDisplay('15:45') === '03:45 PM', '15:45 formats to 3:45 PM');
  console.log('');

  // Test 2: Overlap mathematics
  console.log('Test 2: Overlap Interval Mathematics (max(start) < min(end))');
  assert(doIntervalsOverlap('10:00', '10:45', '10:00', '10:45'), 'Identical intervals overlap');
  assert(doIntervalsOverlap('10:00', '10:45', '10:30', '11:15'), 'Partial overlap (10:30 start) overlaps');
  assert(doIntervalsOverlap('10:30', '11:15', '10:00', '10:45'), 'Partial overlap reversed overlaps');
  assert(doIntervalsOverlap('09:00', '12:00', '10:00', '11:00'), 'Enclosing interval overlaps');
  assert(!doIntervalsOverlap('10:00', '10:45', '10:45', '11:30'), 'Back-to-back boundary does NOT overlap (10:45 end == 10:45 start)');
  assert(!doIntervalsOverlap('09:00', '09:45', '10:00', '10:45'), 'Completely distinct intervals do NOT overlap');
  console.log('');

  // Test 3: Input validation
  console.log('Test 3: Slot Input Validation');
  const validResult = validateTimetableSlotInput({
    batchId: 'BAT-001',
    subjectId: 'SUB-MATH',
    teacherId: 'FAC-001',
    day: 'Monday',
    startTime: '10:00',
    endTime: '10:45',
    roomId: 'ROOM-101',
  });
  assert(validResult.valid && validResult.errors.length === 0, 'Valid input passes validation');

  const invalidTimes = validateTimetableSlotInput({
    batchId: 'BAT-001',
    subjectId: 'SUB-MATH',
    teacherId: 'FAC-001',
    day: 'Monday',
    startTime: '11:00',
    endTime: '10:00',
    roomId: 'ROOM-101',
  });
  assert(!invalidTimes.valid && invalidTimes.errors.some(e => e.includes('earlier than end time')), 'Inverted times rejected');
  console.log('');

  // Test 4: Conflict detection
  console.log('Test 4: Conflict Detection (Teacher, Room, Batch Double-Booking)');
  const sampleSlots: TimetableSlot[] = [
    {
      id: 'slot-1',
      batchId: 'BAT-8A',
      batchName: 'Grade 8 - Section A',
      subjectId: 'MATH',
      subjectName: 'Mathematics',
      teacherId: 'TEACHER-VERMA',
      teacherName: 'Dr. Sunil Verma',
      day: 'Monday',
      startTime: '10:00',
      endTime: '10:45',
      roomId: 'ROOM-101',
      roomName: 'Room 101',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'slot-2',
      batchId: 'BAT-9A',
      batchName: 'Grade 9 - Section A',
      subjectId: 'PHYSICS',
      subjectName: 'Physics',
      teacherId: 'TEACHER-SHARMA',
      teacherName: 'Prof. Amit Sharma',
      day: 'Monday',
      startTime: '11:00',
      endTime: '11:45',
      roomId: 'ROOM-102',
      roomName: 'Physics Lab',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // 4a. Same teacher, overlapping time -> Teacher Conflict
  const teacherConflictCandidate: TimetableSlotInput = {
    batchId: 'BAT-8B',
    subjectId: 'MATH',
    teacherId: 'TEACHER-VERMA',
    day: 'Monday',
    startTime: '10:30',
    endTime: '11:15',
    roomId: 'ROOM-103',
  };
  const teacherConflicts = detectTimetableConflicts(sampleSlots, teacherConflictCandidate);
  assert(teacherConflicts.length === 1 && teacherConflicts[0].type === 'teacher', 'Teacher double-booking correctly detected');

  // 4b. Same room, overlapping time -> Room Conflict
  const roomConflictCandidate: TimetableSlotInput = {
    batchId: 'BAT-8C',
    subjectId: 'CHEMISTRY',
    teacherId: 'TEACHER-GUPTA',
    day: 'Monday',
    startTime: '10:15',
    endTime: '11:00',
    roomId: 'ROOM-101',
  };
  const roomConflicts = detectTimetableConflicts(sampleSlots, roomConflictCandidate);
  assert(roomConflicts.length === 1 && roomConflicts[0].type === 'room', 'Room double-booking correctly detected');

  // 4c. Same batch, overlapping time -> Batch Conflict
  const batchConflictCandidate: TimetableSlotInput = {
    batchId: 'BAT-8A',
    subjectId: 'ENGLISH',
    teacherId: 'TEACHER-GUPTA',
    day: 'Monday',
    startTime: '10:15',
    endTime: '11:00',
    roomId: 'ROOM-104',
  };
  const batchConflicts = detectTimetableConflicts(sampleSlots, batchConflictCandidate);
  assert(batchConflicts.length === 1 && batchConflicts[0].type === 'batch', 'Batch double-booking correctly detected');

  // 4d. Same teacher on DIFFERENT day -> Allowed
  const diffDayCandidate: TimetableSlotInput = {
    batchId: 'BAT-8B',
    subjectId: 'MATH',
    teacherId: 'TEACHER-VERMA',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '10:45',
    roomId: 'ROOM-101',
  };
  assert(detectTimetableConflicts(sampleSlots, diffDayCandidate).length === 0, 'Same teacher/room on different day is allowed');

  // 4e. Back-to-back same teacher on same day -> Allowed
  const backToBackCandidate: TimetableSlotInput = {
    batchId: 'BAT-8B',
    subjectId: 'MATH',
    teacherId: 'TEACHER-VERMA',
    day: 'Monday',
    startTime: '10:45',
    endTime: '11:30',
    roomId: 'ROOM-103',
  };
  assert(detectTimetableConflicts(sampleSlots, backToBackCandidate).length === 0, 'Back-to-back same teacher on same day is allowed');

  // 4f. Editing slot (self-exclusion) -> Allowed
  const editSelfCandidate: TimetableSlotInput & { id: string } = {
    id: 'slot-1',
    batchId: 'BAT-8A',
    subjectId: 'MATH',
    teacherId: 'TEACHER-VERMA',
    day: 'Monday',
    startTime: '10:00',
    endTime: '10:45',
    roomId: 'ROOM-101',
  };
  assert(detectTimetableConflicts(sampleSlots, editSelfCandidate, 'slot-1').length === 0, 'Editing slot does not self-conflict');
  console.log('');

  // Test 5: Next Slot Lookup (Homework Tracker Hook)
  console.log('Test 5: Next Slot Lookup for Homework Tracker');
  const weeklySchedule: TimetableSlot[] = [
    {
      id: 'slot-mon-math',
      batchId: 'BAT-10',
      batchName: 'Class 10',
      subjectId: 'MATH',
      subjectName: 'Mathematics',
      teacherId: 'T-1',
      teacherName: 'T1',
      day: 'Monday',
      startTime: '10:00',
      endTime: '10:45',
      roomId: 'R1',
      roomName: 'R1',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'slot-wed-math',
      batchId: 'BAT-10',
      batchName: 'Class 10',
      subjectId: 'MATH',
      subjectName: 'Mathematics',
      teacherId: 'T-1',
      teacherName: 'T1',
      day: 'Wednesday',
      startTime: '10:00',
      endTime: '10:45',
      roomId: 'R1',
      roomName: 'R1',
      createdAt: '',
      updatedAt: '',
    },
  ];

  // If currently Monday at 09:00, next slot is Monday
  const nextFromMonMorning = getNextSlotForSubject(weeklySchedule, 'BAT-10', 'MATH', 'Monday', '09:00');
  assert(nextFromMonMorning?.id === 'slot-mon-math', 'Monday 09:00 finds upcoming Monday slot');

  // If currently Monday at 11:00 (after class), next slot is Wednesday
  const nextFromMonNoon = getNextSlotForSubject(weeklySchedule, 'BAT-10', 'MATH', 'Monday', '11:00');
  assert(nextFromMonNoon?.id === 'slot-wed-math', 'Monday 11:00 finds next Wednesday slot');

  // If currently Friday, next slot cycles around to Monday
  const nextFromFriday = getNextSlotForSubject(weeklySchedule, 'BAT-10', 'MATH', 'Friday', '12:00');
  assert(nextFromFriday?.id === 'slot-mon-math', 'Friday 12:00 cycles around to next Monday slot');
  console.log('');

  console.log('====================================================');
  console.log('✅ ALL PHASE 4 STEP 1 UNIT TESTS PASSED (100%)');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
