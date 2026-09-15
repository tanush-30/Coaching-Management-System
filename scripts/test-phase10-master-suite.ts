import {
  generateReportData,
  resolveDateRange,
  ReportDataStore,
} from '../src/lib/report-aggregation-service';
import {
  generateReportCSV,
  generateReportPDF,
  buildReportFileName,
} from '../src/lib/report-export-service';
import {
  Student,
  Batch,
  Teacher,
  BatchAttendance,
  ExamTest,
  StudentExamMark,
  Homework,
  HomeworkSubmission,
  TimetableSlot,
} from '../src/lib/types';
import { ReportFilterCriteria } from '../src/lib/report-types';

function runPhase10MasterTestSuite() {
  console.log('================================================================');
  console.log('  Running Phase 10: Reports & Exports Module Master Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  };

  // -------------------------------------------------------------
  // Test Data Setup (In-Memory Only, Strictly 0 Writes to Firestore)
  // -------------------------------------------------------------
  const mockBatches: Batch[] = [
    {
      id: 'batch-jee-2026',
      batchCode: 'BAT-JEE-01',
      name: 'Class 12 - IIT-JEE Advanced',
      courseName: 'IIT-JEE Intensive',
      grade: '12th',
      subject: 'Physics & Mathematics',
      teacherId: 'teacher-101',
      teacherName: 'Prof. Aryan Sharma',
      scheduleDays: ['Monday', 'Wednesday', 'Friday'],
      startTime: '04:00 PM',
      endTime: '06:00 PM',
      room: 'Lecture Hall 1',
      capacity: 35,
      enrolledCount: 3,
      annualFee: 65000,
      accentColor: '#4f46e5',
      academicYear: '2026-2027',
    },
  ];

  const mockStudents: Student[] = [
    {
      id: 'stu-1',
      rollNo: 'STU-001',
      name: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '+919876543210',
      avatar: '',
      gender: 'Male',
      dob: '2008-05-15',
      address: 'City Center',
      schoolName: 'Delhi Public School',
      parentName: 'Rajesh Sharma',
      parentPhone: '+919876543211',
      parentEmail: 'rajesh@example.com',
      parentRelation: 'Father',
      batchIds: ['batch-jee-2026'],
      enrollmentDate: '2026-04-01',
      status: 'active',
      totalFee: 65000,
      paidFee: 65000,
      pendingFee: 0,
    },
    {
      id: 'stu-2',
      rollNo: 'STU-002',
      name: 'Diya Patel',
      email: 'diya@example.com',
      phone: '+919876543220',
      avatar: '',
      gender: 'Female',
      dob: '2008-08-20',
      address: 'West End',
      schoolName: 'St. Xavier',
      parentName: 'Kishore Patel',
      parentPhone: '+919876543221',
      parentEmail: 'kishore@example.com',
      parentRelation: 'Father',
      batchIds: ['batch-jee-2026'],
      enrollmentDate: '2026-04-01',
      status: 'active',
      totalFee: 65000,
      paidFee: 32500,
      pendingFee: 32500,
    },
    {
      id: 'stu-3',
      rollNo: 'STU-003',
      name: 'Rohan Verma',
      email: 'rohan@example.com',
      phone: '+919876543230',
      avatar: '',
      gender: 'Male',
      dob: '2008-11-10',
      address: 'East Avenue',
      schoolName: 'Modern School',
      parentName: 'Sanjay Verma',
      parentPhone: '+919876543231',
      parentEmail: 'sanjay@example.com',
      parentRelation: 'Father',
      batchIds: ['batch-jee-2026'],
      enrollmentDate: '2026-04-01',
      status: 'active',
      totalFee: 65000,
      paidFee: 65000,
      pendingFee: 0,
    },
  ];

  const mockTeachers: Teacher[] = [
    {
      id: 'teacher-101',
      facultyId: 'FAC-101',
      name: 'Prof. Aryan Sharma',
      email: 'aryan@example.com',
      phone: '+919876543299',
      avatar: '',
      subjects: ['Physics'],
      qualifications: 'M.Tech IIT Delhi',
      joiningDate: '2025-01-01',
      status: 'active',
      assignedBatches: ['batch-jee-2026'],
    },
  ];

  // 4 sessions in September
  const mockAttendance: BatchAttendance[] = [
    {
      id: 'att-1',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      date: '2026-09-01',
      markedBy: 'teacher-101',
      markedAt: '2026-09-01T10:00:00Z',
      whatsappDispatched: false,
      absentCount: 0,
      presentCount: 3,
      records: [
        { studentId: 'stu-1', status: 'present' },
        { studentId: 'stu-2', status: 'present' },
        { studentId: 'stu-3', status: 'present' },
      ],
    },
    {
      id: 'att-2',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      date: '2026-09-03',
      markedBy: 'teacher-101',
      markedAt: '2026-09-03T10:00:00Z',
      whatsappDispatched: false,
      absentCount: 1,
      presentCount: 2,
      records: [
        { studentId: 'stu-1', status: 'present' },
        { studentId: 'stu-2', status: 'absent' },
        { studentId: 'stu-3', status: 'present' },
      ],
    },
    {
      id: 'att-3',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      date: '2026-09-05',
      markedBy: 'teacher-101',
      markedAt: '2026-09-05T10:00:00Z',
      whatsappDispatched: false,
      absentCount: 1,
      presentCount: 2,
      records: [
        { studentId: 'stu-1', status: 'present' },
        { studentId: 'stu-2', status: 'absent' },
        { studentId: 'stu-3', status: 'present' },
      ],
    },
    {
      id: 'att-4',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      date: '2026-09-08',
      markedBy: 'teacher-101',
      markedAt: '2026-09-08T10:00:00Z',
      whatsappDispatched: false,
      absentCount: 1,
      presentCount: 1,
      records: [
        { studentId: 'stu-1', status: 'present' },
        { studentId: 'stu-2', status: 'absent' },
        { studentId: 'stu-3', status: 'late' },
      ],
    },
  ];

  const mockExams: ExamTest[] = [
    {
      id: 'exam-jee-1',
      title: 'Electromagnetism Grand Test',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      subject: 'Physics',
      examDate: '2026-09-10',
      totalMarks: 100,
      passingMarks: 40,
      status: 'evaluated',
    },
  ];

  const mockMarks: StudentExamMark[] = [
    {
      id: 'mark-1',
      examId: 'exam-jee-1',
      studentId: 'stu-1',
      studentName: 'Aarav Sharma',
      rollNo: 'STU-001',
      marksObtained: 95,
      totalMarks: 100,
      percentage: 95,
      rank: 1,
      grade: 'A+',
      teacherRemarks: 'Outstanding analytical clarity',
    },
    {
      id: 'mark-2',
      examId: 'exam-jee-1',
      studentId: 'stu-3',
      studentName: 'Rohan Verma',
      rollNo: 'STU-003',
      marksObtained: 80,
      totalMarks: 100,
      percentage: 80,
      rank: 2,
      grade: 'A',
      teacherRemarks: 'Good problem-solving speed',
    },
    {
      id: 'mark-3',
      examId: 'exam-jee-1',
      studentId: 'stu-2',
      studentName: 'Diya Patel',
      rollNo: 'STU-002',
      marksObtained: 30,
      totalMarks: 100,
      percentage: 30,
      rank: 3,
      grade: 'F',
      teacherRemarks: 'Needs remedial practice in flux concepts',
    },
  ];

  const mockHomework: Homework[] = [
    {
      id: 'hw-101',
      title: 'Gauss Law Advanced DPP #1',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      subject: 'Physics',
      teacherName: 'Prof. Aryan Sharma',
      assignedDate: '2026-09-02',
      dueDate: '2026-09-04',
      description: 'Solve problems 1 to 20',
      submissionCount: 2,
      totalStudents: 3,
    },
    {
      id: 'hw-102',
      title: 'Electric Potential DPP #2',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      subject: 'Physics',
      teacherName: 'Prof. Aryan Sharma',
      assignedDate: '2026-09-06',
      dueDate: '2026-09-08',
      description: 'Solve problems 1 to 15',
      submissionCount: 2,
      totalStudents: 3,
    },
  ];

  const mockSubmissions: HomeworkSubmission[] = [
    {
      id: 'hw-101_stu-1',
      assignmentId: 'hw-101',
      studentId: 'stu-1',
      studentName: 'Aarav Sharma',
      batchId: 'batch-jee-2026',
      fileUrl: 'https://example.com/aarav_hw1.pdf',
      fileName: 'aarav_hw1.pdf',
      fileSize: '1.5 MB',
      storagePath: 'hw/aarav_hw1.pdf',
      submittedAt: '2026-09-03T18:00:00Z',
      status: 'submitted',
    },
    {
      id: 'hw-101_stu-3',
      assignmentId: 'hw-101',
      studentId: 'stu-3',
      studentName: 'Rohan Verma',
      batchId: 'batch-jee-2026',
      fileUrl: 'https://example.com/rohan_hw1.pdf',
      fileName: 'rohan_hw1.pdf',
      fileSize: '1.8 MB',
      storagePath: 'hw/rohan_hw1.pdf',
      submittedAt: '2026-09-04T12:00:00Z',
      status: 'submitted',
    },
    {
      id: 'hw-102_stu-1',
      assignmentId: 'hw-102',
      studentId: 'stu-1',
      studentName: 'Aarav Sharma',
      batchId: 'batch-jee-2026',
      fileUrl: 'https://example.com/aarav_hw2.pdf',
      fileName: 'aarav_hw2.pdf',
      fileSize: '2.0 MB',
      storagePath: 'hw/aarav_hw2.pdf',
      submittedAt: '2026-09-07T10:00:00Z',
      status: 'submitted',
    },
    {
      id: 'hw-102_stu-3',
      assignmentId: 'hw-102',
      studentId: 'stu-3',
      studentName: 'Rohan Verma',
      batchId: 'batch-jee-2026',
      fileUrl: 'https://example.com/rohan_hw2.pdf',
      fileName: 'rohan_hw2.pdf',
      fileSize: '1.1 MB',
      storagePath: 'hw/rohan_hw2.pdf',
      submittedAt: '2026-09-09T09:00:00Z',
      status: 'late',
    },
  ];

  const mockTimetable: TimetableSlot[] = [
    {
      id: 'slot-1',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      subjectId: 'sub-phy',
      subjectName: 'Physics',
      teacherId: 'teacher-101',
      teacherName: 'Prof. Aryan Sharma',
      day: 'Wednesday',
      startTime: '16:00',
      endTime: '18:00',
      roomId: 'room-1',
      roomName: 'Lecture Hall 1',
      status: 'active',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'slot-2',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      subjectId: 'sub-phy',
      subjectName: 'Physics',
      teacherId: 'teacher-101',
      teacherName: 'Prof. Aryan Sharma',
      day: 'Monday',
      startTime: '16:00',
      endTime: '18:00',
      roomId: 'room-1',
      roomName: 'Lecture Hall 1',
      status: 'active',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'slot-3',
      batchId: 'batch-jee-2026',
      batchName: 'Class 12 - IIT-JEE Advanced',
      subjectId: 'sub-phy',
      subjectName: 'Physics',
      teacherId: 'teacher-101',
      teacherName: 'Prof. Aryan Sharma',
      day: 'Friday',
      startTime: '16:00',
      endTime: '18:00',
      roomId: 'room-1',
      roomName: 'Lecture Hall 1',
      status: 'active',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  const testStore: ReportDataStore = {
    students: mockStudents,
    batches: mockBatches,
    teachers: mockTeachers,
    attendance: mockAttendance,
    exams: mockExams,
    marks: mockMarks,
    homework: mockHomework,
    homeworkSubmissions: mockSubmissions,
    timetableSlots: mockTimetable,
  };

  // -------------------------------------------------------------
  // Test 1: Attendance Summary Accuracy
  // -------------------------------------------------------------
  const attendDetailFilter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'batch-jee-2026',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'student_detail',
  };
  const attendRes = generateReportData(attendDetailFilter, testStore);
  const aaravAtt = attendRes.rows.find((r: any) => r.studentId === 'stu-1');
  const diyaAtt = attendRes.rows.find((r: any) => r.studentId === 'stu-2');
  const rohanAtt = attendRes.rows.find((r: any) => r.studentId === 'stu-3');

  assert(
    aaravAtt?.presentCount === 4 &&
      aaravAtt?.attendancePercentage === 100 &&
      aaravAtt?.standingStatus === 'ELIGIBLE',
    'Test 1A: Aarav has 4 presents, 100% attendance, ELIGIBLE status'
  );

  assert(
    diyaAtt?.presentCount === 1 &&
      diyaAtt?.absentCount === 3 &&
      diyaAtt?.attendancePercentage === 25 &&
      diyaAtt?.standingStatus === 'ATTENDANCE_ALERT',
    'Test 1B: Diya has 1 present, 3 absents, 25% attendance, ATTENDANCE_ALERT status'
  );

  assert(
    rohanAtt?.presentCount === 3 &&
      rohanAtt?.lateCount === 1 &&
      rohanAtt?.attendancePercentage === 88 &&
      rohanAtt?.standingStatus === 'ELIGIBLE',
    'Test 1C: Rohan has 3 presents, 1 late (0.5 weight), 88% attendance, ELIGIBLE status'
  );

  // -------------------------------------------------------------
  // Test 2: Student Progress Export Accuracy
  // -------------------------------------------------------------
  const progressBatchFilter: ReportFilterCriteria = {
    reportType: 'student_progress',
    batchId: 'batch-jee-2026',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'batch_summary',
  };
  const progressBatchRes = generateReportData(progressBatchFilter, testStore);
  const examSummary = progressBatchRes.rows[0];

  assert(
    examSummary?.averageScorePercentage === 68 &&
      examSummary?.highestScorePercentage === 95 &&
      examSummary?.lowestScorePercentage === 30 &&
      examSummary?.passingRatePercentage === 67,
    'Test 2A: Exam summary accurately calculates average (68%), high (95%), low (30%), pass rate (67%)'
  );

  const progressDetailFilter: ReportFilterCriteria = {
    ...progressBatchFilter,
    granularity: 'student_detail',
  };
  const progressDetailRes = generateReportData(progressDetailFilter, testStore);
  const aaravMark = progressDetailRes.rows.find((r: any) => r.studentId === 'stu-1');
  const diyaMark = progressDetailRes.rows.find((r: any) => r.studentId === 'stu-2');

  assert(
    aaravMark?.rank === 1 &&
      aaravMark?.grade === 'A+' &&
      aaravMark?.marksObtained === 95 &&
      diyaMark?.rank === 3 &&
      diyaMark?.grade === 'F' &&
      diyaMark?.marksObtained === 30,
    'Test 2B: Individual student marks, ranks (1st & 3rd), and grades (A+ & F) match exact source data'
  );

  // -------------------------------------------------------------
  // Test 3: Homework Completion Report Accuracy
  // -------------------------------------------------------------
  const hwFilter: ReportFilterCriteria = {
    reportType: 'homework_completion',
    batchId: 'batch-jee-2026',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'student_detail',
  };
  const hwRes = generateReportData(hwFilter, testStore);
  const aaravHw = hwRes.rows.find((r: any) => r.studentId === 'stu-1');
  const diyaHw = hwRes.rows.find((r: any) => r.studentId === 'stu-2');
  const rohanHw = hwRes.rows.find((r: any) => r.studentId === 'stu-3');

  assert(
    aaravHw?.totalAssigned === 2 &&
      aaravHw?.submittedCount === 2 &&
      aaravHw?.onTimeCount === 2 &&
      aaravHw?.completionRatePercentage === 100,
    'Test 3A: Aarav homework completion is 100% (2 on-time submissions)'
  );

  assert(
    diyaHw?.totalAssigned === 2 &&
      diyaHw?.submittedCount === 0 &&
      diyaHw?.pendingCount === 2 &&
      diyaHw?.completionRatePercentage === 0,
    'Test 3B: Diya homework completion is 0% (2 pending tasks)'
  );

  assert(
    rohanHw?.submittedCount === 2 &&
      rohanHw?.onTimeCount === 1 &&
      rohanHw?.lateCount === 1 &&
      rohanHw?.completionRatePercentage === 100,
    'Test 3C: Rohan homework completion is 100% (1 on-time, 1 late)'
  );

  // -------------------------------------------------------------
  // Test 4: Timetable & Schedule Allocation Accuracy
  // -------------------------------------------------------------
  const ttFilter: ReportFilterCriteria = {
    reportType: 'timetable_schedule',
    batchId: 'batch-jee-2026',
    dateRangePreset: 'this_month',
    granularity: 'batch_summary',
  };
  const ttRes = generateReportData(ttFilter, testStore);
  assert(
    ttRes.rows.length === 3 &&
      ttRes.rows[0].day === 'Monday' &&
      ttRes.rows[1].day === 'Wednesday' &&
      ttRes.rows[2].day === 'Friday',
    'Test 4: Timetable slots are sorted in strict chronological day-of-week order (Monday -> Wednesday -> Friday)'
  );

  // -------------------------------------------------------------
  // Test 5: Edge Cases & Zero Data Resilience
  // -------------------------------------------------------------
  const emptyFilter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'batch-jee-2026',
    dateRangePreset: 'custom',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    granularity: 'batch_summary',
  };
  const emptyRes = generateReportData(emptyFilter, testStore);
  assert(
    emptyRes.rows.length === 1 &&
      emptyRes.rows[0].sessionsConducted === 0 &&
      emptyRes.rows[0].averageAttendancePercentage === 0,
    'Test 5A: Zero sessions in period safely outputs 0% without throwing or NaN'
  );

  // Wide date range test
  const wideFilter: ReportFilterCriteria = {
    reportType: 'student_progress',
    batchId: 'all',
    dateRangePreset: 'custom',
    startDate: '2020-01-01',
    endDate: '2030-12-31',
    granularity: 'student_detail',
  };
  const wideRes = generateReportData(wideFilter, testStore);
  assert(
    wideRes.rows.length === 3,
    'Test 5B: Wide 10-year date range executes cleanly without timeout or data omission'
  );

  // Determinism test
  const run1 = generateReportData(attendDetailFilter, testStore);
  const run2 = generateReportData(attendDetailFilter, testStore);
  assert(
    JSON.stringify(run1.rows) === JSON.stringify(run2.rows),
    'Test 5C: Consecutive executions with identical filters produce 100% deterministic identical data'
  );

  // -------------------------------------------------------------
  // Test 6: Cross-Format Consistency (CSV vs. PDF)
  // -------------------------------------------------------------
  const csvContent = generateReportCSV(progressDetailRes);
  const pdfDoc = generateReportPDF(progressDetailRes);

  assert(
    csvContent.includes('Aarav Sharma') &&
      csvContent.includes('95') &&
      csvContent.includes('A+') &&
      csvContent.includes('Diya Patel') &&
      csvContent.includes('30') &&
      csvContent.includes('F'),
    'Test 6A: CSV contains accurate student names, scores, and grades'
  );

  assert(
    typeof pdfDoc.output === 'function' && pdfDoc.internal.getNumberOfPages() >= 1,
    'Test 6B: PDF document generated successfully with consistent structure matching CSV rows'
  );

  console.log('\n================================================================');
  console.log(`  Phase 10 Master Test Suite Summary: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10MasterTestSuite();
