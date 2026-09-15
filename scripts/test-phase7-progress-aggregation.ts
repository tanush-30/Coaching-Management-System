// Phase 7 Step 5: Test & Verification Script for Student Progress Aggregation Engine
// Tests mathematical accuracy, edge-case normalization, boundary conditions, and at-risk triggers.
// STRICT: Pure calculation verification in memory. NO fake data is written to Firestore.

import {
  computeStudentProgress,
  computeAllStudentsProgress,
  computeBatchProgressSummary,
} from '../src/lib/student-progress-service';
import {
  Student,
  Batch,
  StudentExamMark,
  ExamTest,
  BatchAttendance,
  Homework,
  HomeworkSubmission,
} from '../src/lib/types';

function runTests() {
  console.log('🧪 Starting Phase 7 Progress Aggregation Engine Verification...\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (failureDetails) console.error(`     Details: ${failureDetails}`);
    }
  }

  // Common Batches
  const mockBatches: Batch[] = [
    {
      id: 'batch-12',
      batchCode: 'BAT-12',
      name: 'Class 12 Elite',
      courseName: 'JEE Advanced',
      grade: '12',
      subject: 'Physics',
      teacherId: 'fac-01',
      teacherName: 'Dr. Sharma',
      scheduleDays: ['Mon', 'Wed', 'Fri'],
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      room: 'Room 101',
      capacity: 30,
      enrolledCount: 3,
      annualFee: 65000,
      accentColor: 'indigo',
      academicYear: '2026-2027',
    },
  ];

  // 1. TEST CASE 1: Standard Student with Full History
  // Student: Alex (Roll 101)
  // Exams: 80% (Physics: 80/100) and 90% (Math: 90/100) -> Average = 85%
  // Attendance: 8 present, 1 late, 1 absent out of 10 -> (8 + 0.5) / 10 = 85%
  // Homework: 2 assignments, 2 submitted -> 100%
  // Overall Composite: (0.40 * 85) + (0.30 * 85) + (0.30 * 100) = 34 + 25.5 + 30 = 89.5 -> 90%
  const student1: Student = {
    id: 'stu-01',
    rollNo: 'STU-101',
    name: 'Alex Kumar',
    email: 'alex@example.com',
    phone: '9876543210',
    avatar: '',
    gender: 'Male',
    dob: '2008-05-12',
    address: 'Bengaluru',
    schoolName: 'National Academy',
    parentName: 'Ramesh Kumar',
    parentPhone: '9876543211',
    parentEmail: 'ramesh@example.com',
    parentRelation: 'Father',
    batchIds: ['batch-12'],
    enrollmentDate: '2026-01-10',
    status: 'active',
    totalFee: 65000,
    paidFee: 65000,
    pendingFee: 0,
  };

  const examsList: ExamTest[] = [
    {
      id: 'ex-01',
      title: 'Physics Midterm',
      batchId: 'batch-12',
      batchName: 'Class 12 Elite',
      subject: 'Physics',
      examDate: '2026-02-15',
      totalMarks: 100,
      passingMarks: 40,
      status: 'evaluated',
    },
    {
      id: 'ex-02',
      title: 'Math Unit Test',
      batchId: 'batch-12',
      batchName: 'Class 12 Elite',
      subject: 'Math',
      examDate: '2026-03-01',
      totalMarks: 100,
      passingMarks: 40,
      status: 'evaluated',
    },
  ];

  const marksList: StudentExamMark[] = [
    {
      id: 'mk-01',
      examId: 'ex-01',
      studentId: 'stu-01',
      studentName: 'Alex Kumar',
      rollNo: 'STU-101',
      marksObtained: 80,
      totalMarks: 100,
      percentage: 80,
      rank: 1,
      grade: 'A',
    },
    {
      id: 'mk-02',
      examId: 'ex-02',
      studentId: 'stu-01',
      studentName: 'Alex Kumar',
      rollNo: 'STU-101',
      marksObtained: 90,
      totalMarks: 100,
      percentage: 90,
      rank: 1,
      grade: 'A+',
    },
  ];

  // 10 attendance sessions
  const attendanceList: BatchAttendance[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `att-${i + 1}`,
    batchId: 'batch-12',
    batchName: 'Class 12 Elite',
    date: `2026-03-0${i + 1}`,
    markedBy: 'Dr. Sharma',
    markedAt: new Date().toISOString(),
    records: [
      {
        studentId: 'stu-01',
        status: i < 8 ? 'present' : i === 8 ? 'late' : 'absent',
      },
    ],
    whatsappDispatched: false,
    absentCount: i === 9 ? 1 : 0,
    presentCount: i < 8 ? 1 : 0,
  }));

  const homeworkList: Homework[] = [
    {
      id: 'hw-01',
      title: 'Physics Worksheet 1',
      batchId: 'batch-12',
      batchName: 'Class 12 Elite',
      subject: 'Physics',
      teacherName: 'Dr. Sharma',
      assignedDate: '2026-03-01',
      dueDate: '2026-03-05',
      description: 'Electrostatics problems',
      submissionCount: 1,
      totalStudents: 1,
    },
    {
      id: 'hw-02',
      title: 'Math DPP 1',
      batchId: 'batch-12',
      batchName: 'Class 12 Elite',
      subject: 'Math',
      teacherName: 'Dr. Sharma',
      assignedDate: '2026-03-06',
      dueDate: '2026-03-10',
      description: 'Calculus derivatives',
      submissionCount: 1,
      totalStudents: 1,
    },
  ];

  const submissionsList: HomeworkSubmission[] = [
    {
      id: 'hw-01_stu-01',
      assignmentId: 'hw-01',
      studentId: 'stu-01',
      studentName: 'Alex Kumar',
      rollNo: 'STU-101',
      batchId: 'batch-12',
      fileUrl: 'https://example.com/sub1.pdf',
      fileName: 'sub1.pdf',
      fileSize: '1.2 MB',
      storagePath: 'hw/sub1.pdf',
      submittedAt: '2026-03-04T10:00:00Z',
      status: 'graded',
      grade: 'A',
    },
    {
      id: 'hw-02_stu-01',
      assignmentId: 'hw-02',
      studentId: 'stu-01',
      studentName: 'Alex Kumar',
      rollNo: 'STU-101',
      batchId: 'batch-12',
      fileUrl: 'https://example.com/sub2.pdf',
      fileName: 'sub2.pdf',
      fileSize: '800 KB',
      storagePath: 'hw/sub2.pdf',
      submittedAt: '2026-03-09T10:00:00Z',
      status: 'submitted',
    },
  ];

  const prog1 = computeStudentProgress(
    student1,
    mockBatches,
    marksList,
    examsList,
    attendanceList,
    homeworkList,
    submissionsList
  );

  console.log('--- Test Group 1: Standard Student Math Verification ---');
  assert(prog1.examAverage === 85, 'Exam Average calculation (80 + 90) / 2 = 85%', `Got ${prog1.examAverage}%`);
  assert(prog1.attendancePercentage === 85, 'Attendance calculation (8 + 0.5) / 10 = 85%', `Got ${prog1.attendancePercentage}%`);
  assert(prog1.homeworkCompletionRate === 100, 'Homework completion (2/2) = 100%', `Got ${prog1.homeworkCompletionRate}%`);
  assert(prog1.overallScore === 90, 'Composite calculation (0.40*85 + 0.30*85 + 0.30*100) = 90%', `Got ${prog1.overallScore}%`);
  assert(prog1.performanceTier === 'Outstanding', 'Performance tier is Outstanding (>= 85%)', `Got ${prog1.performanceTier}`);
  assert(!prog1.isAtRisk, 'Student is in good standing (not at risk)', `isAtRisk=${prog1.isAtRisk}`);

  // 2. TEST CASE 2: Perfect 100% Student Boundary Check
  const student2: Student = { ...student1, id: 'stu-02', rollNo: 'STU-102', name: 'Priya Sharma' };
  const perfectMarks: StudentExamMark[] = [
    { ...marksList[0], id: 'mk-p1', studentId: 'stu-02', percentage: 100, marksObtained: 100 },
  ];
  const perfectAttendance: BatchAttendance[] = [
    { ...attendanceList[0], id: 'att-p1', records: [{ studentId: 'stu-02', status: 'present' }] },
  ];
  const perfectSubmissions: HomeworkSubmission[] = [
    { ...submissionsList[0], id: 'sub-p1', studentId: 'stu-02' },
    { ...submissionsList[1], id: 'sub-p2', studentId: 'stu-02' },
  ];

  const prog2 = computeStudentProgress(
    student2,
    mockBatches,
    perfectMarks,
    examsList,
    perfectAttendance,
    homeworkList,
    perfectSubmissions
  );

  console.log('\n--- Test Group 2: Perfect 100% Boundary Check ---');
  assert(prog2.overallScore === 100, '100% Across all domains yields overallScore = 100%', `Got ${prog2.overallScore}%`);
  assert(prog2.performanceTier === 'Outstanding', 'Tier is Outstanding', `Got ${prog2.performanceTier}`);

  // 3. TEST CASE 3: Zero Data / Freshly Enrolled Student (Graceful Neutrality)
  const student3: Student = { ...student1, id: 'stu-03', rollNo: 'STU-103', name: 'New Student' };
  const prog3 = computeStudentProgress(
    student3,
    mockBatches,
    [], // 0 marks
    [], // 0 exams
    [], // 0 attendance
    [], // 0 homework
    []  // 0 submissions
  );

  console.log('\n--- Test Group 3: Fresh Enrollment (Zero Data Graceful Neutrality) ---');
  assert(prog3.overallScore === 100, 'Zero data defaults to neutral 100% rather than 0% crash', `Got ${prog3.overallScore}%`);
  assert(!prog3.isAtRisk, 'Fresh student is not unfairly flagged at risk on day 1', `isAtRisk=${prog3.isAtRisk}`);

  // 4. TEST CASE 4: At-Risk Threshold Boundary Precision
  // Low Attendance (60% < 75% threshold) & Low Exam Score (35% < 40% threshold)
  const student4: Student = { ...student1, id: 'stu-04', rollNo: 'STU-104', name: 'At Risk Student' };
  const lowMarks: StudentExamMark[] = [
    { ...marksList[0], id: 'mk-low', studentId: 'stu-04', percentage: 35, marksObtained: 35 },
  ];
  // 6 present, 4 absent = 60%
  const lowAttendance: BatchAttendance[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `att-low-${i}`,
    batchId: 'batch-12',
    batchName: 'Class 12 Elite',
    date: `2026-03-0${i + 1}`,
    markedBy: 'Dr. Sharma',
    markedAt: new Date().toISOString(),
    records: [{ studentId: 'stu-04', status: i < 6 ? 'present' : 'absent' }],
    whatsappDispatched: false,
    absentCount: i >= 6 ? 1 : 0,
    presentCount: i < 6 ? 1 : 0,
  }));
  // 0 of 2 homework submitted = 0%
  const prog4 = computeStudentProgress(
    student4,
    mockBatches,
    lowMarks,
    examsList,
    lowAttendance,
    homeworkList,
    [] // 0 submissions
  );

  console.log('\n--- Test Group 4: At-Risk Boundary & Diagnostics ---');
  assert(prog4.isAtRisk === true, 'Low metrics correctly triggers isAtRisk = true', `isAtRisk=${prog4.isAtRisk}`);
  assert(prog4.atRiskReasons.length >= 3, `Identified multiple diagnostic triggers (Got ${prog4.atRiskReasons.length})`);
  assert(
    prog4.atRiskReasons.some((r) => r.includes('Attendance is below 75%')),
    'Includes attendance reason in atRiskReasons'
  );
  assert(
    prog4.atRiskReasons.some((r) => r.includes('Exam average is below 40%')),
    'Includes exam average reason in atRiskReasons'
  );
  assert(
    prog4.atRiskReasons.some((r) => r.includes('Homework completion is below 50%')),
    'Includes homework reason in atRiskReasons'
  );

  // 5. TEST CASE 5: Batch-Wide Analytics Summary
  const allProgs = [prog1, prog2, prog4];
  const batchSumm = computeBatchProgressSummary('batch-12', allProgs, 'Class 12 Elite');

  console.log('\n--- Test Group 5: Batch Progress Summary Analytics ---');
  assert(batchSumm.totalStudents === 3, 'Batch total students = 3', `Got ${batchSumm.totalStudents}`);
  assert(batchSumm.atRiskCount === 1, 'Batch at-risk count = 1 (Student 4)', `Got ${batchSumm.atRiskCount}`);
  assert(batchSumm.topPerformers.length === 3, 'Top performers list sorted correctly', `Got ${batchSumm.topPerformers.length}`);
  assert(batchSumm.topPerformers[0].studentId === 'stu-02', 'Rank 1 top performer is Priya (100%)');

  console.log(`\n========================================`);
  console.log(`Phase 7 Verification: ${passedCount} / ${totalCount} tests passed!`);
  console.log(`========================================\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
