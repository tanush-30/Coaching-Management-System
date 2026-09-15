import {
  resolveDateRange,
  isDateInRange,
  aggregateAttendanceReport,
  aggregateProgressReport,
  aggregateHomeworkReport,
  aggregateTimetableReport,
  generateReportData,
  ReportDataStore,
} from '../src/lib/report-aggregation-service';
import { Student, Batch, Teacher, BatchAttendance, ExamTest, StudentExamMark, Homework, HomeworkSubmission, TimetableSlot } from '../src/lib/types';
import { ReportFilterCriteria } from '../src/lib/report-types';

function runPhase10Step2AggregationTests() {
  console.log('================================================================');
  console.log('  Running Phase 10 Step 2: Aggregation Queries Engine Test');
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

  // Mock isolated test data (in-memory only, strictly 0 writes to Firestore)
  const mockBatches: Batch[] = [
    {
      id: 'batch-101',
      batchCode: 'BAT-101',
      name: 'Class 12 - Physics Elite',
      courseName: 'Physics Masterclass',
      grade: '12th',
      subject: 'Physics',
      teacherId: 'teacher-1',
      teacherName: 'Dr. HC Verma',
      scheduleDays: ['Monday', 'Wednesday'],
      startTime: '04:00 PM',
      endTime: '05:30 PM',
      room: 'Lab A',
      capacity: 30,
      enrolledCount: 2,
      annualFee: 50000,
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
      batchIds: ['batch-101'],
      enrollmentDate: '2026-04-01',
      status: 'active',
      totalFee: 50000,
      paidFee: 50000,
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
      batchIds: ['batch-101'],
      enrollmentDate: '2026-04-01',
      status: 'active',
      totalFee: 50000,
      paidFee: 25000,
      pendingFee: 25000,
    },
  ];

  const mockTeachers: Teacher[] = [
    {
      id: 'teacher-1',
      facultyId: 'FAC-001',
      name: 'Dr. HC Verma',
      email: 'verma@example.com',
      phone: '+919876543200',
      avatar: '',
      subjects: ['Physics'],
      qualifications: 'Ph.D. Physics',
      joiningDate: '2025-01-01',
      status: 'active',
      assignedBatches: ['batch-101'],
    },
  ];

  const mockAttendance: BatchAttendance[] = [
    {
      id: 'att-1',
      batchId: 'batch-101',
      batchName: 'Class 12 - Physics Elite',
      date: '2026-09-01',
      markedBy: 'teacher-1',
      markedAt: '2026-09-01T10:00:00Z',
      whatsappDispatched: false,
      absentCount: 0,
      presentCount: 2,
      records: [
        { studentId: 'stu-1', status: 'present' },
        { studentId: 'stu-2', status: 'present' },
      ],
    },
    {
      id: 'att-2',
      batchId: 'batch-101',
      batchName: 'Class 12 - Physics Elite',
      date: '2026-09-03',
      markedBy: 'teacher-1',
      markedAt: '2026-09-03T10:00:00Z',
      whatsappDispatched: false,
      absentCount: 1,
      presentCount: 1,
      records: [
        { studentId: 'stu-1', status: 'present' },
        { studentId: 'stu-2', status: 'absent' },
      ],
    },
  ];

  const mockExams: ExamTest[] = [
    {
      id: 'exam-1',
      title: 'Thermodynamics Unit Test',
      batchId: 'batch-101',
      batchName: 'Class 12 - Physics Elite',
      subject: 'Physics',
      examDate: '2026-09-05',
      totalMarks: 50,
      passingMarks: 20,
      status: 'evaluated',
    },
  ];

  const mockMarks: StudentExamMark[] = [
    {
      id: 'mark-1',
      examId: 'exam-1',
      studentId: 'stu-1',
      studentName: 'Aarav Sharma',
      rollNo: 'STU-001',
      marksObtained: 45,
      totalMarks: 50,
      percentage: 90,
      rank: 1,
      grade: 'A+',
    },
    {
      id: 'mark-2',
      examId: 'exam-1',
      studentId: 'stu-2',
      studentName: 'Diya Patel',
      rollNo: 'STU-002',
      marksObtained: 35,
      totalMarks: 50,
      percentage: 70,
      rank: 2,
      grade: 'B+',
    },
  ];

  const mockHomework: Homework[] = [
    {
      id: 'hw-1',
      title: 'Heat Engines Practice DPP',
      batchId: 'batch-101',
      batchName: 'Class 12 - Physics Elite',
      subject: 'Physics',
      teacherName: 'Dr. HC Verma',
      assignedDate: '2026-09-02',
      dueDate: '2026-09-04',
      description: 'Solve questions 1 to 15',
      submissionCount: 1,
      totalStudents: 2,
    },
  ];

  const mockSubmissions: HomeworkSubmission[] = [
    {
      id: 'hw-1_stu-1',
      assignmentId: 'hw-1',
      studentId: 'stu-1',
      studentName: 'Aarav Sharma',
      batchId: 'batch-101',
      fileUrl: 'https://example.com/aarav.pdf',
      fileName: 'aarav.pdf',
      fileSize: '1.2 MB',
      storagePath: 'homework/hw-1_stu-1.pdf',
      submittedAt: '2026-09-03T15:00:00Z',
      status: 'submitted',
    },
  ];

  const mockTimetable: TimetableSlot[] = [
    {
      id: 'slot-1',
      batchId: 'batch-101',
      batchName: 'Class 12 - Physics Elite',
      subjectId: 'sub-phy',
      subjectName: 'Physics',
      teacherId: 'teacher-1',
      teacherName: 'Dr. HC Verma',
      day: 'Monday',
      startTime: '16:00',
      endTime: '17:30',
      roomId: 'room-lab-a',
      roomName: 'Lab A',
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

  // 1. Date Range Utility Tests
  const fixedNow = new Date('2026-09-14T12:00:00Z');
  const thisMonthRange = resolveDateRange('this_month', undefined, undefined, fixedNow);
  assert(
    thisMonthRange.startDate === '2026-09-01' && thisMonthRange.endDate === '2026-09-30',
    'resolveDateRange: this_month generates 2026-09-01 to 2026-09-30'
  );

  assert(
    isDateInRange('2026-09-05', '2026-09-01', '2026-09-30') === true &&
      isDateInRange('2026-10-01', '2026-09-01', '2026-09-30') === false,
    'isDateInRange correctly accepts in-bounds and filters out-of-bounds dates'
  );

  // 2. Attendance Aggregation Tests
  const attendBatchFilter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'batch-101',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'batch_summary',
  };
  const attendBatchRows = aggregateAttendanceReport(mockStudents, mockBatches, mockAttendance, attendBatchFilter) as any[];
  assert(
    attendBatchRows.length === 1 &&
      attendBatchRows[0].sessionsConducted === 2 &&
      attendBatchRows[0].presentCount === 3 &&
      attendBatchRows[0].absentCount === 1,
    'Attendance batch summary correctly aggregates conducted sessions, presents, and absents'
  );

  const attendStudentFilter: ReportFilterCriteria = {
    ...attendBatchFilter,
    granularity: 'student_detail',
  };
  const attendStudentRows = aggregateAttendanceReport(mockStudents, mockBatches, mockAttendance, attendStudentFilter) as any[];
  const aaravAtt = attendStudentRows.find((r) => r.studentId === 'stu-1');
  const diyaAtt = attendStudentRows.find((r) => r.studentId === 'stu-2');
  assert(
    aaravAtt?.attendancePercentage === 100 &&
      aaravAtt?.standingStatus === 'ELIGIBLE' &&
      diyaAtt?.attendancePercentage === 50 &&
      diyaAtt?.standingStatus === 'ATTENDANCE_ALERT',
    'Attendance student detail correctly calculates individual attendance % and flags alerts'
  );

  // 3. Progress Aggregation Tests
  const progressFilter: ReportFilterCriteria = {
    reportType: 'student_progress',
    batchId: 'batch-101',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'batch_summary',
  };
  const progressBatchRows = aggregateProgressReport(mockStudents, mockBatches, mockExams, mockMarks, progressFilter) as any[];
  assert(
    progressBatchRows.length === 1 &&
      progressBatchRows[0].averageScorePercentage === 80 &&
      progressBatchRows[0].highestScorePercentage === 90 &&
      progressBatchRows[0].passingRatePercentage === 100,
    'Student progress batch summary calculates average score (80%) and 100% pass rate'
  );

  // 4. Homework Aggregation Tests
  const hwFilter: ReportFilterCriteria = {
    reportType: 'homework_completion',
    batchId: 'batch-101',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'student_detail',
  };
  const hwStudentRows = aggregateHomeworkReport(mockStudents, mockBatches, mockHomework, mockSubmissions, hwFilter) as any[];
  const aaravHw = hwStudentRows.find((r) => r.studentId === 'stu-1');
  const diyaHw = hwStudentRows.find((r) => r.studentId === 'stu-2');
  assert(
    aaravHw?.submittedCount === 1 &&
      aaravHw?.completionRatePercentage === 100 &&
      diyaHw?.submittedCount === 0 &&
      diyaHw?.pendingCount === 1 &&
      diyaHw?.completionRatePercentage === 0,
    'Homework student detail accurately tracks submitted vs missing counts and completion %'
  );

  // 5. Timetable Aggregation Tests
  const ttFilter: ReportFilterCriteria = {
    reportType: 'timetable_schedule',
    batchId: 'batch-101',
    dateRangePreset: 'this_month',
    granularity: 'batch_summary',
  };
  const ttRows = aggregateTimetableReport(mockBatches, mockTeachers, mockTimetable, ttFilter) as any[];
  assert(
    ttRows.length === 1 && ttRows[0].day === 'Monday' && ttRows[0].facultyName === 'Dr. HC Verma',
    'Timetable aggregation correctly maps batch schedule slot with assigned faculty'
  );

  // 6. Master Dispatcher & Empty Boundary Test
  const emptyFilter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'non-existent-batch',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'batch_summary',
  };
  const emptyResult = generateReportData(emptyFilter, testStore);
  assert(
    emptyResult.rows.length === 0 && emptyResult.totalRowCount === 0,
    'Master report dispatcher safely handles empty filtered dataset without crashing'
  );

  console.log('\n================================================================');
  console.log(`  Aggregation Test Summary: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Step2AggregationTests();
