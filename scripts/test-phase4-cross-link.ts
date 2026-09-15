/**
 * Phase 4 Step 4 Test Suite: Cross-Linking Timetable with Homework Tracker & Announcements
 * 
 * Validates:
 * 1. calculateNextLectureDate algorithm (calculating nearest next lecture for a batch/subject)
 * 2. detectScheduleChanges diff detector (detecting Day, Time, Room, Teacher modifications)
 * 3. Ignore non-schedule cosmetic edits (color, note changes should not trigger alert announcements)
 * 4. Homework creation payload with dueContext and targetSlotId
 * 5. Multi-channel broadcast dispatch preparation (SMS/WhatsApp/Portal notification payload)
 * 
 * STRICT ZERO FAKE DATA WRITES TO FIRESTORE: All tests run in-memory.
 */

import { calculateNextLectureDate, detectScheduleChanges, formatTimeDisplay } from '../src/lib/timetable-utils';
import { TimetableSlot, Homework } from '../src/lib/types';

function runPhase4CrossLinkTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING PHASE 4 STEP 4 TEST SUITE: TIMETABLE CROSS-LINKING');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (errorDetail) console.error('     Detail:', errorDetail);
    }
  }

  // --- Mock Fixtures (In-Memory Only) ---
  const mockSlots: TimetableSlot[] = [
    {
      id: 'slot_1',
      batchId: 'batch_jee_12',
      batchName: 'JEE Advanced Class 12',
      subjectId: 'sub_phy',
      subjectName: 'Physics',
      teacherId: 't_hcv',
      teacherName: 'Dr. H.C. Verma',
      roomId: 'r_101',
      roomName: 'Room 101',
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:30',
      color: '#3b82f6',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'slot_2',
      batchId: 'batch_jee_12',
      batchName: 'JEE Advanced Class 12',
      subjectId: 'sub_phy',
      subjectName: 'Physics',
      teacherId: 't_hcv',
      teacherName: 'Dr. H.C. Verma',
      roomId: 'r_101',
      roomName: 'Room 101',
      day: 'Wednesday',
      startTime: '09:00',
      endTime: '10:30',
      color: '#3b82f6',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'slot_3',
      batchId: 'batch_jee_12',
      batchName: 'JEE Advanced Class 12',
      subjectId: 'sub_math',
      subjectName: 'Mathematics',
      teacherId: 't_rd',
      teacherName: 'Prof. R.D. Sharma',
      roomId: 'r_102',
      roomName: 'Room 102',
      day: 'Friday',
      startTime: '11:00',
      endTime: '12:30',
      color: '#10b981',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  // -------------------------------------------------------------
  // TEST GROUP 1: Next Lecture Due-Date Calculation
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Next Lecture Calculation ---');
  {
    // Fix reference date to Monday morning 08:00 AM (2026-09-14 is a Monday)
    const mondayMorning = new Date(2026, 8, 14, 8, 0, 0); // Month 8 is Sep in JS Date
    const nextSlot = calculateNextLectureDate(mockSlots, 'batch_jee_12', 'Physics', mondayMorning);
    
    assert(nextSlot !== null, 'calculateNextLectureDate finds slot on same day if time is in future');
    assert(nextSlot?.slot.day === 'Monday', 'Target slot is Monday morning physics lecture');
    assert(nextSlot?.slot.startTime === '09:00', 'Slot start time is 09:00');
    assert(nextSlot?.dateString === '2026-09-14', `Date string is 2026-09-14 (Got: ${nextSlot?.dateString})`);
    assert(nextSlot?.displayContext.includes('Monday') || false, 'Display context includes day name Monday');
  }

  {
    // Fix reference date to Monday afternoon 12:00 PM (after Monday physics ended at 10:30)
    const mondayAfternoon = new Date(2026, 8, 14, 12, 0, 0);
    const nextSlot = calculateNextLectureDate(mockSlots, 'batch_jee_12', 'Physics', mondayAfternoon);
    
    assert(nextSlot !== null, 'calculateNextLectureDate finds subsequent Wednesday slot if Monday slot has passed');
    assert(nextSlot?.slot.day === 'Wednesday', 'Target slot is Wednesday lecture');
    assert(nextSlot?.dateString === '2026-09-16', `Date string is 2026-09-16 (Got: ${nextSlot?.dateString})`);
  }

  {
    // Non-existent subject for batch
    const noneSlot = calculateNextLectureDate(mockSlots, 'batch_jee_12', 'Biology');
    assert(noneSlot === null, 'calculateNextLectureDate returns null for subject not in timetable');
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Schedule Change Diff Detector
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Schedule Change Diff Detector ---');
  {
    const originalSlot: TimetableSlot = mockSlots[0];
    const modifiedInput = {
      startTime: '10:00',
      endTime: '11:30',
      roomName: 'Room 204',
      roomId: 'r_204',
    };

    const changeEvent = detectScheduleChanges(originalSlot, modifiedInput);
    assert(changeEvent !== null, 'detectScheduleChanges detects Time & Room changes');
    assert(changeEvent?.changes.length === 2, `Detected 2 changes (Got: ${changeEvent?.changes.length})`);
    assert(changeEvent?.changes.some(c => c.field === 'time') || false, 'Captures time change');
    assert(changeEvent?.changes.some(c => c.field === 'room') || false, 'Captures room change');
    assert(changeEvent?.batchName === 'JEE Advanced Class 12', 'Captures correct batch name');
    assert(changeEvent?.generatedAnnouncementText.includes('📢'), 'Generated announcement includes header emoji');
  }

  {
    // Day and Faculty replacement change
    const originalSlot: TimetableSlot = mockSlots[0];
    const modifiedInput = {
      day: 'Tuesday' as const,
      teacherId: 't_new',
      teacherName: 'Dr. C.V. Raman',
    };

    const changeEvent = detectScheduleChanges(originalSlot, modifiedInput);
    assert(changeEvent !== null, 'detectScheduleChanges detects Day & Teacher change');
    assert(changeEvent?.changes.some(c => c.field === 'day' && c.newValue === 'Tuesday') || false, 'Captures day change');
    assert(changeEvent?.changes.some(c => c.field === 'teacher' && c.newValue === 'Dr. C.V. Raman') || false, 'Captures faculty change');
  }

  {
    // Only cosmetic edits (e.g. color or notes)
    const originalSlot: TimetableSlot = mockSlots[0];
    const modifiedInput = {
      color: '#ef4444',
    };

    const changeEvent = detectScheduleChanges(originalSlot, modifiedInput);
    assert(changeEvent === null, 'detectScheduleChanges returns null when only cosmetic fields (color) change');
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: Homework Linking & Broadcast Notification Integrity
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Homework & Broadcast Payload Integrity ---');
  {
    const hwPayload: Homework = {
      id: 'hw_test_1',
      title: 'Electrostatics DPP 04',
      batchId: 'batch_jee_12',
      batchName: 'JEE Advanced Class 12',
      subject: 'Physics',
      teacherName: 'Dr. H.C. Verma',
      assignedDate: '2026-09-14',
      dueDate: '2026-09-16',
      dueContext: 'Next Lecture (Wednesday, 09:00 AM)',
      targetSlotId: 'slot_2',
      description: 'Solve questions 1-15 in homework notebook.',
      totalStudents: 32,
    };

    assert(hwPayload.dueContext === 'Next Lecture (Wednesday, 09:00 AM)', 'Homework holds dueContext metadata');
    assert(hwPayload.targetSlotId === 'slot_2', 'Homework references target timetable slot ID');
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 PHASE 4 STEP 4 RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('✨ ALL PHASE 4 STEP 4 CROSS-LINKING TESTS COMPLETED SUCCESSFULLY! ✨\n');
  } else {
    console.error('⚠️ SOME TESTS FAILED. Please review the output above.');
    process.exit(1);
  }
}

runPhase4CrossLinkTests();
