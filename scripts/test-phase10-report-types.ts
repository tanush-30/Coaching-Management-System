import { REPORT_DEFINITIONS, ReportType } from '../src/lib/report-types';

function runPhase10Step1ContractTests() {
  console.log('================================================================');
  console.log('  Running Phase 10 Step 1: Report Types & Schemas Contract Test');
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

  // 1. Check all 4 reports exist in definition registry
  const expectedReports: ReportType[] = [
    'attendance_summary',
    'student_progress',
    'homework_completion',
    'timetable_schedule',
  ];

  assert(
    expectedReports.every((r) => !!REPORT_DEFINITIONS[r]),
    'All 4 specified report types are present in definition registry'
  );

  // 2. Check Attendance Summary Report Schema
  const attendDef = REPORT_DEFINITIONS.attendance_summary;
  assert(
    attendDef.availableGranularities.includes('batch_summary') &&
      attendDef.availableGranularities.includes('student_detail'),
    'Attendance Summary supports both batch_summary and student_detail granularities'
  );
  assert(
    attendDef.columns.batch_summary.some((c) => c.key === 'averageAttendancePercentage') &&
      attendDef.columns.student_detail.some((c) => c.key === 'standingStatus'),
    'Attendance Summary has expected key metric columns'
  );

  // 3. Check Student Progress Report Schema
  const progressDef = REPORT_DEFINITIONS.student_progress;
  assert(
    progressDef.columns.batch_summary.some((c) => c.key === 'passingRatePercentage') &&
      progressDef.columns.student_detail.some((c) => c.key === 'grade'),
    'Student Progress report has grade and passing rate columns'
  );

  // 4. Check Homework Completion Report Schema
  const hwDef = REPORT_DEFINITIONS.homework_completion;
  assert(
    hwDef.columns.batch_summary.some((c) => c.key === 'batchSubmissionRatePercentage') &&
      hwDef.columns.student_detail.some((c) => c.key === 'pendingCount'),
    'Homework Completion report tracks batch submission rate and student missing count'
  );

  // 5. Check Timetable Schedule Report Schema
  const ttDef = REPORT_DEFINITIONS.timetable_schedule;
  assert(
    ttDef.columns.batch_summary.some((c) => c.key === 'facultyName') &&
      ttDef.columns.student_detail.some((c) => c.key === 'batchName'),
    'Timetable report tracks room/faculty allocation for both batch and teacher views'
  );

  // 6. Check Supported Export Formats
  assert(
    expectedReports.every(
      (r) =>
        REPORT_DEFINITIONS[r].supportedFormats.includes('csv') &&
        REPORT_DEFINITIONS[r].supportedFormats.includes('pdf')
    ),
    'All reports specify support for both CSV and PDF export formats'
  );

  console.log('\n================================================================');
  console.log(`  Contract Test Summary: ${passed}/${passed + failed} Passed (${failed} Failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10Step1ContractTests();
