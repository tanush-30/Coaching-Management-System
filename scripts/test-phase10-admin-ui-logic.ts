import { REPORT_DEFINITIONS, ReportType, ReportFilterCriteria } from '../src/lib/report-types';
import { generateReportData, ReportDataStore } from '../src/lib/report-aggregation-service';
import { generateReportCSV, generateReportPDF } from '../src/lib/report-export-service';
import { Student, Batch, Teacher, BatchAttendance, ExamTest, StudentExamMark, Homework, HomeworkSubmission, TimetableSlot } from '../src/lib/types';

function runPhase10Step4AdminUILogicTests() {
  console.log('================================================================');
  console.log('  Running Phase 10 Step 4: Admin UI Logic & Validation Tests');
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
      scheduleDays: ['Monday'],
      startTime: '04:00 PM',
      endTime: '05:30 PM',
      room: 'Lab A',
      capacity: 30,
      enrolledCount: 1,
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
  ];

  const testStore: ReportDataStore = {
    students: mockStudents,
    batches: mockBatches,
    teachers: [],
    attendance: [],
    exams: [],
    marks: [],
    homework: [],
    homeworkSubmissions: [],
    timetableSlots: [],
  };

  // 1. Validate All 4 Report Types have UI Metadata
  const reportKeys: ReportType[] = [
    'attendance_summary',
    'student_progress',
    'homework_completion',
    'timetable_schedule',
  ];

  assert(
    reportKeys.every((key) => {
      const def = REPORT_DEFINITIONS[key];
      return (
        def &&
        def.title.length > 0 &&
        def.description.length > 0 &&
        def.columns.batch_summary.length > 0 &&
        def.columns.student_detail.length > 0
      );
    }),
    'All 4 report types contain complete UI metadata, titles, and column definitions'
  );

  // 2. Test Custom Date Validation Guard
  const validateCustomDateRange = (start: string, end: string): boolean => {
    return start <= end;
  };

  assert(
    validateCustomDateRange('2026-09-01', '2026-09-30') === true,
    'Custom date validation correctly passes valid chronological range'
  );

  assert(
    validateCustomDateRange('2026-09-30', '2026-09-01') === false,
    'Custom date validation correctly detects invalid inverted date range'
  );

  // 3. Test Student Drill-Down Scoping
  const filterStudentsByBatch = (students: Student[], batchId: string) => {
    if (batchId === 'all') return students;
    return students.filter((s) => s.batchIds?.includes(batchId));
  };

  const scopedStudents = filterStudentsByBatch(mockStudents, 'batch-101');
  const emptyScopedStudents = filterStudentsByBatch(mockStudents, 'batch-999');

  assert(
    scopedStudents.length === 1 && scopedStudents[0].id === 'stu-1',
    'Student drill-down properly scopes eligible students when specific batch is selected'
  );

  assert(
    emptyScopedStudents.length === 0,
    'Student drill-down correctly returns empty list for batch without enrolled students'
  );

  // 4. Test Live Preview Row Generator for UI Table
  const filter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'batch-101',
    dateRangePreset: 'this_month',
    granularity: 'batch_summary',
  };

  const result = generateReportData(filter, testStore);
  assert(
    result.rows.length === 1 && result.rows[0].batchName === 'Class 12 - Physics Elite',
    'UI preview table receives live aggregated row matching selected batch filter'
  );

  console.log('\n================================================================');
  console.log(`  Admin UI Test Summary: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Step4AdminUILogicTests();
