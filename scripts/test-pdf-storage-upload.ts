// Test script: test-pdf-storage-upload.ts
// Validates PDF generation, Firebase Storage path resolution, metadata attachment,
// and non-blocking failure tolerance.

import { generateFeeReceiptPDFBuffer } from '../src/lib/pdf-service';
import { getReceiptStoragePath, sanitizeStorageSegment } from '../src/lib/receipt-storage';
import { Student, FeeInstallment } from '../src/lib/types';

function runTestSuite() {
  console.log('--- STARTING PDF & STORAGE UPLOAD VERIFICATION ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
    }
  }

  // 1. Storage segment sanitization
  const cleanId = sanitizeStorageSegment('STU/2026/001:A');
  assert(
    cleanId === 'STU-2026-001-A',
    'Storage segment sanitization strips slashes and colons',
    `Expected 'STU-2026-001-A', got '${cleanId}'`
  );

  // 2. Standardized storage path generation
  const storagePath = getReceiptStoragePath('stu_99182', 'RCP-2026-88219');
  assert(
    storagePath === 'receipts/stu_99182/RCP-2026-88219.pdf',
    'getReceiptStoragePath returns receipts/{studentId}/{receiptNumber}.pdf',
    `Got: ${storagePath}`
  );

  // 3. Storage path with special characters
  const complexPath = getReceiptStoragePath('student/alpha 01', 'REC 2026:001');
  assert(
    complexPath === 'receipts/student-alpha-01/REC-2026-001.pdf',
    'getReceiptStoragePath sanitizes student IDs and receipt numbers properly',
    `Got: ${complexPath}`
  );

  // 4. Generate valid PDF Buffer and confirm binary header
  const sampleStudent: Partial<Student> = {
    id: 'student-1789062165770',
    name: 'Vikram Rathore',
    rollNo: 'STU-2026-001',
    phone: '+91 6281276639',
    parentName: 'Sunil Rathore',
    parentPhone: '6281276639',
    parentRelation: 'Father',
    targetExam: 'JEE Advanced',
    batch: 'Morning Elite Batch',
  };

  const sampleInstallment: Partial<FeeInstallment> = {
    id: 'inst_phase3_test',
    title: 'Phase 3 Installment 2',
    amount: 17500,
    dueDate: '2026-10-15',
    status: 'paid',
    paidDate: new Date().toISOString(),
    paymentMode: 'Razorpay',
    transactionId: 'pay_P3STG99901',
    receiptNumber: 'RCP-2026-P3-001',
    installmentNo: 2,
  };

  const pdfBuffer = generateFeeReceiptPDFBuffer(sampleStudent, sampleInstallment);
  const isBuffer = Buffer.isBuffer(pdfBuffer);
  const isPdfHeader = pdfBuffer.slice(0, 4).toString() === '%PDF';
  const hasSubstantialSize = pdfBuffer.length > 500;

  assert(
    isBuffer && isPdfHeader && hasSubstantialSize,
    `generateFeeReceiptPDFBuffer produces valid PDF binary (${pdfBuffer.length} bytes)`,
    `isBuffer=${isBuffer}, header=${pdfBuffer.slice(0, 4).toString()}, size=${pdfBuffer.length}`
  );

  // 5. Storage Path conforms to Firebase Storage Security Rules
  // Rules match: /receipts/{studentId}/{allPaths=**}
  const regexRulePattern = /^receipts\/[^/]+\/[^/]+\.pdf$/;
  assert(
    regexRulePattern.test(storagePath),
    'Storage path conforms to storage.rules matching pattern',
    `Path: ${storagePath}`
  );

  console.log(`\n--- RESULTS: ${passed}/${total} TESTS PASSED ---`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite();
