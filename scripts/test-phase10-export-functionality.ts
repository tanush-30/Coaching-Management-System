import {
  generateReportCSV,
  generateReportPDF,
  buildReportFileName,
} from '../src/lib/report-export-service';
import { generateReportData, ReportDataStore } from '../src/lib/report-aggregation-service';
import { Student, Batch, Teacher, BatchAttendance, ExamTest, StudentExamMark, Homework, HomeworkSubmission, TimetableSlot } from '../src/lib/types';
import { ReportFilterCriteria } from '../src/lib/report-types';

function runPhase10Step3ExportTests() {
  console.log('================================================================');
  console.log('  Running Phase 10 Step 3: Export Functionality (CSV & PDF) Test');
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
      name: 'Aarav, Sharma "Jr."',
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
      presentCount: 1,
      records: [{ studentId: 'stu-1', status: 'present' }],
    },
  ];

  const testStore: ReportDataStore = {
    students: mockStudents,
    batches: mockBatches,
    teachers: [],
    attendance: mockAttendance,
    exams: [],
    marks: [],
    homework: [],
    homeworkSubmissions: [],
    timetableSlots: [],
  };

  // 1. File Naming Utility
  const testFileName = buildReportFileName('attendance_summary', 'student_detail', 'batch-101', '2026-09-01', '2026-09-30', 'csv');
  assert(
    testFileName === 'attendance_summary_student_detail_batch-101_2026-09-01_to_2026-09-30.csv',
    'buildReportFileName generates sanitized, structured file names'
  );

  // 2. CSV Generation with Quotes & Special Characters
  const attendFilter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'batch-101',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'student_detail',
  };

  const reportResult = generateReportData(attendFilter, testStore);
  const csvContent = generateReportCSV(reportResult);

  assert(
    csvContent.startsWith('\uFEFF'),
    'generateReportCSV prepends UTF-8 BOM (\\uFEFF) for Excel compatibility'
  );

  assert(
    csvContent.includes('"Aarav, Sharma ""Jr."""'),
    'generateReportCSV correctly escapes commas and inner double-quotes per RFC-4180'
  );

  // 3. PDF Document Generation
  const pdfDoc = generateReportPDF(reportResult);
  assert(
    typeof pdfDoc.output === 'function' && pdfDoc.internal.getNumberOfPages() >= 1,
    'generateReportPDF returns a valid jsPDF document instance with pages rendered'
  );

  // 4. Empty Report Dataset Handling (CSV & PDF)
  const emptyFilter: ReportFilterCriteria = {
    reportType: 'attendance_summary',
    batchId: 'empty-batch',
    dateRangePreset: 'custom',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    granularity: 'batch_summary',
  };
  const emptyResult = generateReportData(emptyFilter, testStore);
  const emptyCsv = generateReportCSV(emptyResult);
  const emptyPdf = generateReportPDF(emptyResult);

  assert(
    emptyCsv.includes('No data found for selected filters'),
    'Empty CSV contains informative "No data found" placeholder without throwing'
  );

  assert(
    emptyPdf.internal.getNumberOfPages() >= 1,
    'Empty PDF builds valid document with empty message notice without throwing'
  );

  console.log('\n================================================================');
  console.log(`  Export Test Summary: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Step3ExportTests();
