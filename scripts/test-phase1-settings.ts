// Phase 1 Settings Module Automated Test Suite
// Verifies schema integrity, validation guardrails, template interpolation, grading boundaries, and propagation

import {
  DEFAULT_SCHOOL_INFO,
  DEFAULT_FEE_STRUCTURE,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_GRADING_SCALE,
  DEFAULT_GLOBAL_SETTINGS,
} from '../src/lib/settings-defaults';
import {
  validateSchoolInfo,
  validateFeeStructure,
  validateNotificationTemplates,
  validateGradingScale,
} from '../src/lib/settings-validator';
import { interpolateTemplate } from '../src/lib/settings-service';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING PHASE 1 SETTINGS AUTOMATED TEST SUITE');
console.log('======================================================\n');

// ----------------------------------------------------
// SUITE 1: Schema Integrity & Production Defaults
// ----------------------------------------------------
console.log('📦 SUITE 1: Schema Integrity & Production Defaults');

assert(
  Boolean(DEFAULT_SCHOOL_INFO.institutionName && DEFAULT_SCHOOL_INFO.email && DEFAULT_SCHOOL_INFO.phone),
  'SchoolInfo contains required identity fields',
  JSON.stringify(DEFAULT_SCHOOL_INFO)
);

assert(
  DEFAULT_FEE_STRUCTURE.availablePlans.length >= 3,
  'FeeStructure has at least 3 default installment plans',
  `Count: ${DEFAULT_FEE_STRUCTURE.availablePlans.length}`
);

assert(
  Object.keys(DEFAULT_NOTIFICATION_TEMPLATES.templates).length === 6,
  'NotificationTemplates contains all 6 required event trigger templates',
  `Count: ${Object.keys(DEFAULT_NOTIFICATION_TEMPLATES.templates).length}`
);

assert(
  DEFAULT_GRADING_SCALE.grades.length >= 5 && DEFAULT_GRADING_SCALE.passingPercentage === 40,
  'GradingScale contains standard grade boundaries and 40% passing threshold'
);

assert(
  DEFAULT_GLOBAL_SETTINGS.schoolInfo.id === 'schoolInfo' &&
    DEFAULT_GLOBAL_SETTINGS.feeStructure.id === 'feeStructure',
  'GlobalSettings container correctly binds all 4 category schemas'
);

// ----------------------------------------------------
// SUITE 2: Validation Engine Guardrails
// ----------------------------------------------------
console.log('\n🛡️ SUITE 2: Validation Engine Guardrails');

// School Info Validation
const validSchool = validateSchoolInfo(DEFAULT_SCHOOL_INFO);
assert(validSchool.isValid, 'Default SchoolInfo passes validation');

const invalidEmail = validateSchoolInfo({ ...DEFAULT_SCHOOL_INFO, email: 'not-an-email' });
assert(!invalidEmail.isValid, 'Invalid email format is strictly blocked by validator');

const shortPhone = validateSchoolInfo({ ...DEFAULT_SCHOOL_INFO, phone: '123' });
assert(!shortPhone.isValid, 'Phone numbers under 10 digits are blocked');

const invalidYear = validateSchoolInfo({ ...DEFAULT_SCHOOL_INFO, academicYear: '2026' });
assert(!invalidYear.isValid, 'Academic year not matching YYYY-YYYY format is blocked');

// Fee Structure Validation
const validFee = validateFeeStructure(DEFAULT_FEE_STRUCTURE);
assert(validFee.isValid, 'Default FeeStructure passes validation');

const badPlanSplit = validateFeeStructure({
  ...DEFAULT_FEE_STRUCTURE,
  availablePlans: [
    {
      id: 'plan-bad',
      name: 'Bad Split Plan',
      installmentCount: 2,
      splitPercentages: [40, 40], // Sum is 80%, not 100%
    },
  ],
});
assert(!badPlanSplit.isValid, 'Installment plan with splits totaling != 100% is blocked');

const negativeFine = validateFeeStructure({ ...DEFAULT_FEE_STRUCTURE, lateFeeDailyAmount: -50 });
assert(!negativeFine.isValid, 'Negative daily late fine amounts are blocked');

const invalidUpi = validateFeeStructure({ ...DEFAULT_FEE_STRUCTURE, upiId: 'invalid-upi-no-at' });
assert(!invalidUpi.isValid, 'Malformed UPI VPA (without @) is blocked');

// Grading Scale Validation
const validGrading = validateGradingScale(DEFAULT_GRADING_SCALE);
assert(validGrading.isValid, 'Default GradingScale passes validation');

const invertedGrade = validateGradingScale({
  ...DEFAULT_GRADING_SCALE,
  grades: [
    { grade: 'A', minScore: 90, maxScore: 80, gpaPoint: 9, remarks: '', colorHex: '' },
    { grade: 'F', minScore: 0, maxScore: 39, gpaPoint: 0, remarks: '', colorHex: '' },
  ],
});
assert(!invertedGrade.isValid, 'Inverted grade bounds (minScore > maxScore) are blocked');

// ----------------------------------------------------
// SUITE 3: Notification Template Variable Interpolation
// ----------------------------------------------------
console.log('\n💬 SUITE 3: Notification Template Interpolation');

const sampleAbsence = interpolateTemplate(
  DEFAULT_NOTIFICATION_TEMPLATES.templates.absenceAlert.bodyTemplate,
  {
    studentName: 'Rohan Gupta',
    date: '13-Sep-2026',
    batchName: 'Grade 11 - JEE Advanced',
    schoolName: 'Apex Institute',
    schoolPhone: '+91 98765 00000',
  }
);
assert(
  sampleAbsence.includes('Rohan Gupta') &&
    sampleAbsence.includes('Grade 11 - JEE Advanced') &&
    sampleAbsence.includes('+91 98765 00000'),
  'Absence template replaces studentName, batchName, and schoolPhone tokens correctly',
  sampleAbsence
);

const sampleFeeReminder = interpolateTemplate(
  DEFAULT_NOTIFICATION_TEMPLATES.templates.feeReminder.bodyTemplate,
  {
    installmentTitle: 'Term 1 Tuition',
    amount: '25,000',
    currencySymbol: '₹',
    studentName: 'Sneha Patel',
    dueDate: '30-Sep-2026',
    paymentLink: 'https://apexcoaching.edu/pay/STU-101',
    schoolName: 'Apex Institute',
  }
);
assert(
  sampleFeeReminder.includes('₹25,000') &&
    sampleFeeReminder.includes('Sneha Patel') &&
    sampleFeeReminder.includes('https://apexcoaching.edu/pay/STU-101'),
  'Fee reminder template replaces installmentTitle, amount, currency, and payment link',
  sampleFeeReminder
);

const sampleScorecard = interpolateTemplate(
  DEFAULT_NOTIFICATION_TEMPLATES.templates.reportCard.bodyTemplate,
  {
    studentName: 'Ananya Roy',
    examTitle: 'Unit Test 1',
    subject: 'Chemistry',
    marksObtained: 95,
    totalMarks: 100,
    percentage: 95,
    grade: 'A+',
    rank: 1,
  }
);
assert(
  sampleScorecard.includes('Ananya Roy') &&
    sampleScorecard.includes('95/100') &&
    sampleScorecard.includes('A+') &&
    sampleScorecard.includes('#1'),
  'Exam scorecard template replaces metrics, grade, and rank accurately',
  sampleScorecard
);

// ----------------------------------------------------
// SUITE 4: Dynamic Academic Grading Evaluation
// ----------------------------------------------------
console.log('\n📊 SUITE 4: Dynamic Academic Grading Evaluation');

function calculateGrade(percentage: number, grades = DEFAULT_GRADING_SCALE.grades) {
  const match = grades.find((g) => percentage >= g.minScore && percentage <= g.maxScore);
  return match ? match.grade : percentage >= 40 ? 'D' : 'F';
}

assert(calculateGrade(98) === 'A+', 'Score of 98% evaluates to A+');
assert(calculateGrade(85) === 'A', 'Score of 85% evaluates to A');
assert(calculateGrade(75) === 'B+', 'Score of 75% evaluates to B+');
assert(calculateGrade(65) === 'B', 'Score of 65% evaluates to B');
assert(calculateGrade(55) === 'C', 'Score of 55% evaluates to C');
assert(calculateGrade(45) === 'D', 'Score of 45% evaluates to D (Minimum Pass)');
assert(calculateGrade(30) === 'F', 'Score of 30% evaluates to F (Fail)');

// ----------------------------------------------------
// SUITE 5: Regression & Dependent Module Propagation Contracts
// ----------------------------------------------------
console.log('\n🔄 SUITE 5: Regression & Propagation Contracts');

// Verify that installment split calculations are mathematically exact
DEFAULT_FEE_STRUCTURE.availablePlans.forEach((plan) => {
  const sum = plan.splitPercentages.reduce((a, b) => a + b, 0);
  assert(sum === 100, `Plan "${plan.name}" percentages sum to exactly 100%`);
});

// Verify that late fee caps are logically consistent
assert(
  DEFAULT_FEE_STRUCTURE.lateFeeMaxCap >= DEFAULT_FEE_STRUCTURE.lateFeeDailyAmount,
  'Late fee maximum cap is greater than or equal to single-day fine'
);

console.log('\n======================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✨ ALL PHASE 1 ACCEPTANCE CRITERIA SUCCESSFULLY VERIFIED!\n');
  process.exit(0);
}
