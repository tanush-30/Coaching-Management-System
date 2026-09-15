// Phase 12 Master Verification & Hardening Test Suite: Faculty Compensation & Payroll Module
// Run with: npx tsx --tsconfig tsconfig.scripts.json scripts/test-phase12-payroll-master-suite.ts

import assert from 'assert';
import {
  calculatePayroll,
  calculateProRatedAmount,
  formatPaiseToINR,
  paiseToRupees,
  rupeesToPaise,
  getDaysInMonth,
} from '../src/lib/payroll-engine';
import { buildPayslipDoc } from '../src/lib/pdf-service';
import type { SalaryStructure, PayrollRecord, LineItem, Teacher } from '../src/lib/types';

console.log('===============================================================');
console.log('🚀 PHASE 12: FACULTY PAYROLL & SALARY MODULE — MASTER TEST SUITE');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// SUITE 1: Currency & Precision Math Helpers
// -------------------------------------------------------------
console.log('📦 SUITE 1: Currency & Precision Math Helpers');

runTest('1.1 Should convert paise to rupees and back with zero drift', () => {
  assert.strictEqual(paiseToRupees(5000000), 50000);
  assert.strictEqual(rupeesToPaise(50000), 5000000);
  assert.strictEqual(paiseToRupees(80050), 800.5);
  assert.strictEqual(rupeesToPaise(800.5), 80050);
});

runTest('1.2 Should format paise into INR currency strings correctly', () => {
  assert.strictEqual(formatPaiseToINR(5000000), '₹50,000');
  assert.strictEqual(formatPaiseToINR(0), '₹0');
  assert.strictEqual(formatPaiseToINR(1250000), '₹12,500');
});

runTest('1.3 Should compute days in month accurately across leap and non-leap years', () => {
  assert.strictEqual(getDaysInMonth('2026-09'), 30);
  assert.strictEqual(getDaysInMonth('2026-08'), 31);
  assert.strictEqual(getDaysInMonth('2024-02'), 29); // leap year
  assert.strictEqual(getDaysInMonth('2026-02'), 28); // non-leap year
});

// -------------------------------------------------------------
// SUITE 2: Core Calculation Engine & Compensation Models
// -------------------------------------------------------------
console.log('\n📦 SUITE 2: Core Calculation Engine & Compensation Models');

runTest('2.1 Fixed Model: Calculates full monthly base pay', () => {
  const fixedStruct: SalaryStructure = {
    id: 'struct_1',
    teacherId: 'teach_1',
    type: 'fixed',
    baseAmount: 6000000, // ₹60,000
    perLectureRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdBy: 'admin',
    createdAt: '2026-01-01',
  };

  const result = calculatePayroll({
    structure: fixedStruct,
    period: '2026-09',
  });

  assert.strictEqual(result.gross, 6000000);
  assert.strictEqual(result.totalDeductions, 0);
  assert.strictEqual(result.net, 6000000);
  assert.strictEqual(result.lineItems.length, 1);
  assert.strictEqual(result.lineItems[0].type, 'earning');
  assert.strictEqual(result.lineItems[0].amount, 6000000);
});

runTest('2.2 Per-Lecture Model: Calculates earnings from lecture count', () => {
  const lectureStruct: SalaryStructure = {
    id: 'struct_2',
    teacherId: 'teach_2',
    type: 'per_lecture',
    baseAmount: 0,
    perLectureRate: 120000, // ₹1,200 per lecture
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdBy: 'admin',
    createdAt: '2026-01-01',
  };

  const result = calculatePayroll({
    structure: lectureStruct,
    period: '2026-09',
    lectureCount: 35,
  });

  // 35 * 1200 = ₹42,000 = 4,200,000 paise
  assert.strictEqual(result.gross, 4200000);
  assert.strictEqual(result.net, 4200000);
  assert.strictEqual(result.lectureCount, 35);
  assert.strictEqual(result.lineItems[0].meta?.lectureCount, 35);
});

runTest('2.3 Per-Lecture Model: Zero lectures returns ₹0 without error', () => {
  const lectureStruct: SalaryStructure = {
    id: 'struct_2',
    teacherId: 'teach_2',
    type: 'per_lecture',
    baseAmount: 0,
    perLectureRate: 120000,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdBy: 'admin',
    createdAt: '2026-01-01',
  };

  const result = calculatePayroll({
    structure: lectureStruct,
    period: '2026-09',
    lectureCount: 0,
  });

  assert.strictEqual(result.gross, 0);
  assert.strictEqual(result.net, 0);
});

runTest('2.4 Hybrid Model: Combines base salary and lecture earnings itemized separately', () => {
  const hybridStruct: SalaryStructure = {
    id: 'struct_3',
    teacherId: 'teach_3',
    type: 'hybrid',
    baseAmount: 4000000, // ₹40,000 base
    perLectureRate: 80000, // ₹800 per lecture
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdBy: 'admin',
    createdAt: '2026-01-01',
  };

  const result = calculatePayroll({
    structure: hybridStruct,
    period: '2026-09',
    lectureCount: 20, // 20 * 800 = 16,000
    adjustments: [
      { id: 'bonus_1', label: 'Diwali Bonus', type: 'earning', amount: 500000 }, // ₹5,000
      { id: 'tds_1', label: 'TDS Deduction (10%)', type: 'deduction', amount: 610000 }, // ₹6,100
    ],
  });

  // Gross = 40,000 + 16,000 + 5,000 = ₹61,000 = 6,100,000 paise
  assert.strictEqual(result.gross, 6100000);
  assert.strictEqual(result.totalDeductions, 610000);
  // Net = 61,000 - 6,100 = ₹54,900 = 5,490,000 paise
  assert.strictEqual(result.net, 5490000);
  assert.strictEqual(result.lineItems.length, 4);
});

runTest('2.5 Deduction Clamping: Net pay is clamped to ₹0 if deductions exceed gross', () => {
  const fixedStruct: SalaryStructure = {
    id: 'struct_1',
    teacherId: 'teach_1',
    type: 'fixed',
    baseAmount: 2000000, // ₹20,000
    perLectureRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdBy: 'admin',
    createdAt: '2026-01-01',
  };

  const result = calculatePayroll({
    structure: fixedStruct,
    period: '2026-09',
    adjustments: [
      { id: 'penalty_1', label: 'Heavy Damage Recovery', type: 'deduction', amount: 3500000 }, // ₹35,000
    ],
  });

  assert.strictEqual(result.gross, 2000000);
  assert.strictEqual(result.totalDeductions, 3500000);
  assert.strictEqual(result.net, 0); // Strictly clamped to 0, never -15,000
});

// -------------------------------------------------------------
// SUITE 3: Pro-Rating & Mid-Month Onboarding
// -------------------------------------------------------------
console.log('\n📦 SUITE 3: Pro-Rating & Mid-Month Onboarding');

runTest('3.1 Pro-Rating: Exactly calculates active days for mid-month joining', () => {
  // Sept 2026 has 30 days. Joined on Sept 16 -> 30 - 16 + 1 = 15 active days (half month)
  const pro = calculateProRatedAmount(6000000, '2026-09', '2026-09-16');
  assert.strictEqual(pro.totalDays, 30);
  assert.strictEqual(pro.activeDays, 15);
  assert.strictEqual(pro.isProRated, true);
  assert.strictEqual(pro.amount, 3000000); // exactly ₹30,000
});

runTest('3.2 Pro-Rating: Joining before period begins results in full base pay', () => {
  const pro = calculateProRatedAmount(6000000, '2026-09', '2026-08-01');
  assert.strictEqual(pro.isProRated, false);
  assert.strictEqual(pro.amount, 6000000);
});

// -------------------------------------------------------------
// SUITE 4: Validation & Error Handling
// -------------------------------------------------------------
console.log('\n📦 SUITE 4: Validation & Error Handling');

runTest('4.1 Throws error if SalaryStructure is missing', () => {
  assert.throws(
    () => calculatePayroll({ structure: null as any, period: '2026-09' }),
    /SalaryStructure is required/
  );
});

runTest('4.2 Throws error if period format is invalid', () => {
  const struct: SalaryStructure = {
    id: 's',
    teacherId: 't',
    type: 'fixed',
    baseAmount: 1000,
    perLectureRate: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdBy: 'admin',
    createdAt: '2026-01-01',
  };
  assert.throws(
    () => calculatePayroll({ structure: struct, period: 'invalid-date' }),
    /Invalid payroll period format/
  );
});

// -------------------------------------------------------------
// SUITE 5: PDF Payslip Generator Verification
// -------------------------------------------------------------
console.log('\n📦 SUITE 5: PDF Payslip Generator Verification');

runTest('5.1 buildPayslipDoc: Generates valid jsPDF document with metadata', () => {
  const sampleTeacher: Teacher = {
    id: 'teach_99',
    facultyId: 'FAC-2026-099',
    name: 'Dr. Vikram Sharma',
    email: 'vikram@apexacademy.edu',
    phone: '9876543210',
    avatar: '',
    subjects: ['Physics', 'Advanced Mechanics'],
    qualifications: 'Ph.D. Physics, IIT Delhi',
    joiningDate: '2025-06-01',
    status: 'active',
    assignedBatches: ['batch_1', 'batch_2'],
  };

  const sampleRecord: PayrollRecord = {
    id: 'teach_99_2026-09',
    teacherId: 'teach_99',
    teacherName: 'Dr. Vikram Sharma',
    facultyId: 'FAC-2026-099',
    period: '2026-09',
    status: 'paid',
    lineItems: [
      { id: '1', label: 'Base Monthly Salary', type: 'earning', amount: 5000000 },
      { id: '2', label: 'Conducted Lectures (24 @ ₹1,000)', type: 'earning', amount: 2400000 },
      { id: '3', label: 'TDS Deduction', type: 'deduction', amount: 740000 },
    ],
    gross: 7400000,
    totalDeductions: 740000,
    net: 6660000,
    structureSnapshot: {
      id: 'struct_99',
      teacherId: 'teach_99',
      type: 'hybrid',
      baseAmount: 5000000,
      perLectureRate: 100000,
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      createdBy: 'admin',
      createdAt: '2026-01-01',
    },
    paymentMode: 'Bank Transfer',
    paymentRef: 'UTR98472910482',
    paidAt: '2026-10-02T10:00:00.000Z',
    createdAt: '2026-09-30T18:00:00.000Z',
  };

  const doc = buildPayslipDoc(sampleRecord, sampleTeacher);
  assert.ok(doc, 'PDF Document instance should be created');
  const output = doc.output();
  assert.ok(output.length > 500, 'PDF output should have generated binary content');
});

console.log('\n===============================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('===============================================================\n');
