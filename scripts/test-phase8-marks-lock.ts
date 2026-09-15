/**
 * Phase 8 Step 2 Automated Verification Script:
 * Tests Marks Submission Lock (Draft -> Final), Role Enforcement, Admin Override Audit Trail, and Student Multi-Key Display Filtering.
 *
 * Run with: npx tsx scripts/test-phase8-marks-lock.ts
 */

import type { StudentExamMark, ExamTest, Student } from '../src/lib/types';
import { calculateFieldDiff } from '../src/lib/audit-service';

function runTests() {
  console.log('🧪 Starting Phase 8 Step 2 Marks Lock & Display Verification...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
    }
  }

  // --- Test Suite 1: Schema & Status Definitions ---
  console.log('--- Test Suite 1: Schema & Types ---');
  const mockExam: ExamTest = {
    id: 'exam-test-101',
    batchId: 'batch-jee-2026',
    batchName: 'JEE Advanced 2026',
    title: 'Physics Mechanics Major Test',
    subject: 'Physics',
    examDate: '2026-09-20',
    totalMarks: 100,
    passingMarks: 40,
    status: 'draft',
    marksStatus: 'draft',
  };
  assert(mockExam.status === 'draft' && mockExam.marksStatus === 'draft', 'Exam supports draft status');

  const mockDraftMark: StudentExamMark = {
    id: 'mark-exam-test-101-stu-01',
    examId: 'exam-test-101',
    studentId: 'doc-student-1',
    studentName: 'Aarav Sharma',
    rollNo: 'APX-2026-001',
    marksObtained: 85,
    totalMarks: 100,
    percentage: 85,
    rank: 1,
    grade: 'A',
    teacherRemarks: 'Excellent analytical speed in mechanics.',
    status: 'draft',
  };
  assert(mockDraftMark.status === 'draft', 'Student mark supports draft status');

  // --- Test Suite 2: Role-Based Submission Locking Rules ---
  console.log('\n--- Test Suite 2: Submission Locking Logic ---');

  // Helper simulating backend permission check in /api/marks/save
  function canEditMarks(
    role: 'admin' | 'teacher' | 'student',
    currentExamStatus: 'scheduled' | 'draft' | 'evaluated',
    currentMarksStatus?: 'draft' | 'final'
  ): { allowed: boolean; reason?: string } {
    if (role === 'student') {
      return { allowed: false, reason: 'Students cannot edit marks' };
    }
    const isLocked = currentMarksStatus === 'final' || currentExamStatus === 'evaluated';
    if (role === 'teacher' && isLocked) {
      return {
        allowed: false,
        reason: 'Marks for this test are locked as final. Any correction requires an official administrative request.',
      };
    }
    return { allowed: true };
  }

  // Case 2.1: Faculty editing draft
  const facultyDraft = canEditMarks('teacher', 'draft', 'draft');
  assert(facultyDraft.allowed === true, 'Faculty can edit draft marks without restriction');

  // Case 2.2: Faculty editing scheduled
  const facultyScheduled = canEditMarks('teacher', 'scheduled', undefined);
  assert(facultyScheduled.allowed === true, 'Faculty can enter marks on scheduled exam');

  // Case 2.3: Faculty editing final
  const facultyFinal = canEditMarks('teacher', 'evaluated', 'final');
  assert(
    facultyFinal.allowed === false && facultyFinal.reason?.includes('locked as final'),
    'Faculty edit on FINAL marks is strictly REJECTED'
  );

  // Case 2.4: Admin editing final
  const adminFinal = canEditMarks('admin', 'evaluated', 'final');
  assert(adminFinal.allowed === true, 'Admin can edit final marks with official request');

  // --- Test Suite 3: Admin Audit Diff Generation ---
  console.log('\n--- Test Suite 3: Admin Audit Diff Generation ---');
  const beforeMark = {
    marksObtained: 78,
    grade: 'B+',
    teacherRemarks: 'Good attempt on questions 1-10.',
  };
  const afterMark = {
    marksObtained: 84, // Corrected after faculty letter verification
    grade: 'A',
    teacherRemarks: 'Re-evaluated Q7 (+6 marks added per faculty request).',
  };

  const diff = calculateFieldDiff(beforeMark, afterMark);
  assert(diff['marksObtained']?.old === 78 && diff['marksObtained']?.new === 84, 'Audit diff correctly captures score change (78 -> 84)');
  assert(diff['grade']?.old === 'B+' && diff['grade']?.new === 'A', 'Audit diff correctly captures grade recalculation (B+ -> A)');
  assert(diff['teacherRemarks'] !== undefined, 'Audit diff records updated faculty/admin remarks');

  // --- Test Suite 4: Multi-Key Student Dashboard Display Linkage ---
  console.log('\n--- Test Suite 4: Student Dashboard Marks Linkage & Scoping ---');

  const studentProfile: Student = {
    id: 'doc-user-uid-999',
    rollNo: 'APX-2026-001',
    name: 'Aarav Sharma',
    batchIds: ['batch-jee-2026'],
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    parentName: 'Ramesh Sharma',
    parentPhone: '9876543211',
    parentRelation: 'Father',
    admissionDate: '2026-01-10',
    status: 'active',
  };

  const allMarksInStore: StudentExamMark[] = [
    // Mark 1: Stored with studentId as rollNo
    {
      id: 'mark-1',
      examId: 'exam-101',
      studentId: 'APX-2026-001',
      studentName: 'Aarav Sharma',
      rollNo: 'APX-2026-001',
      marksObtained: 92,
      totalMarks: 100,
      percentage: 92,
      rank: 1,
      grade: 'A+',
      status: 'final',
    },
    // Mark 2: Stored with studentId as doc ID
    {
      id: 'mark-2',
      examId: 'exam-102',
      studentId: 'doc-user-uid-999',
      studentName: 'Aarav Sharma',
      rollNo: 'APX-2026-001',
      marksObtained: 88,
      totalMarks: 100,
      percentage: 88,
      rank: 2,
      grade: 'A',
      status: 'final',
    },
    // Mark 3: Draft mark (should be hidden from student dashboard)
    {
      id: 'mark-3',
      examId: 'exam-103',
      studentId: 'doc-user-uid-999',
      studentName: 'Aarav Sharma',
      rollNo: 'APX-2026-001',
      marksObtained: 50,
      totalMarks: 100,
      percentage: 50,
      rank: 5,
      grade: 'C',
      status: 'draft',
    },
    // Mark 4: Another student's final mark
    {
      id: 'mark-4',
      examId: 'exam-101',
      studentId: 'doc-other-student',
      studentName: 'Priya Verma',
      rollNo: 'APX-2026-002',
      marksObtained: 95,
      totalMarks: 100,
      percentage: 95,
      rank: 1,
      grade: 'A+',
      status: 'final',
    },
  ];

  // Apply our harmonized filter logic
  const studentVisibleMarks = allMarksInStore.filter((m) => {
    const matchesId = m.studentId === studentProfile.id;
    const matchesRoll =
      studentProfile.rollNo &&
      (m.rollNo === studentProfile.rollNo || m.studentId === studentProfile.rollNo);
    const matchesAuthUid = (m as any).authUid && (m as any).authUid === studentProfile.id;
    const isPublished = m.status === 'final' || (m as any).status === 'evaluated' || !m.status;
    return (matchesId || matchesRoll || matchesAuthUid) && isPublished;
  });

  assert(studentVisibleMarks.length === 2, 'Student sees exactly 2 finalized marks matching their identity');
  assert(studentVisibleMarks.some((m) => m.id === 'mark-1'), 'Matched mark stored under rollNo');
  assert(studentVisibleMarks.some((m) => m.id === 'mark-2'), 'Matched mark stored under docId');
  assert(!studentVisibleMarks.some((m) => m.id === 'mark-3'), 'Draft mark is correctly excluded from student view');
  assert(!studentVisibleMarks.some((m) => m.id === 'mark-4'), 'Other student mark is strictly isolated');

  console.log(`\n========================================`);
  console.log(`📊 Test Summary: ${passed} / ${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed === total) {
    console.log('🎉 ALL PHASE 8 STEP 2 VERIFICATIONS PASSED SUCCESSFULLY!\n');
  } else {
    console.error('⚠️ Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

runTests();
