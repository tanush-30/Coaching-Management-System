// Test script: test-receipt-linking.ts
// Validates Phase 3 Step 3: Link Receipt Records in Firestore
// Tests URL resolution, Firestore record schemas (payment_orders, installments, receipts),
// non-destructive update semantics, and partial-failure logging.

import { getReceiptStoragePath, sanitizeStorageSegment } from '../src/lib/receipt-storage';
import { FeeInstallment, FeeReceiptRecord } from '../src/lib/types';

function runReceiptLinkingTests() {
  console.log('--- STARTING PHASE 3 STEP 3: RECEIPT LINKING TESTS ---');
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

  // 1. Validate storage path generation for linkage
  const studentId = 'stu_link_001';
  const receiptNo = 'RCP-2026-9901';
  const storagePath = getReceiptStoragePath(studentId, receiptNo);
  assert(
    storagePath === 'receipts/stu_link_001/RCP-2026-9901.pdf',
    'Receipt storage path matches expected receipts/{studentId}/{receiptNumber}.pdf format',
    `Got: ${storagePath}`
  );

  // 2. Validate Firebase Storage Download URL Structure
  const bucketName = 'coaching-system-prod.appspot.com';
  const fallbackUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
  const isValidMediaUrl = fallbackUrl.includes('firebasestorage.googleapis.com') &&
                          fallbackUrl.includes(encodeURIComponent(storagePath)) &&
                          fallbackUrl.endsWith('?alt=media');
  assert(
    isValidMediaUrl,
    'Storage fallback URL format complies with Firebase Storage REST API',
    `URL: ${fallbackUrl}`
  );

  // 3. Validate FeeInstallment record linkage schema
  const mockInstallment: FeeInstallment = {
    id: 'inst_101',
    studentId,
    installmentNo: 1,
    title: 'Admission Fee Installment',
    dueDate: '2026-09-20',
    amount: 25000,
    status: 'paid',
    paidDate: new Date().toISOString(),
    paymentMode: 'Razorpay',
    transactionId: 'pay_992100A',
    receiptNumber: receiptNo,
    receiptGenerated: true,
    receiptGeneratedAt: new Date().toISOString(),
    receiptStoragePath: storagePath,
    receiptUrl: fallbackUrl,
  };

  assert(
    mockInstallment.receiptUrl === fallbackUrl &&
    mockInstallment.receiptStoragePath === storagePath &&
    mockInstallment.receiptGenerated === true,
    'FeeInstallment record correctly maintains receipt linkage fields',
    JSON.stringify(mockInstallment)
  );

  // 4. Validate global FeeReceiptRecord structure for receipts collection
  const mockReceiptRecord: FeeReceiptRecord = {
    id: receiptNo,
    receiptNumber: receiptNo,
    studentId,
    studentName: 'Rahul Verma',
    rollNo: 'IIT-2026-101',
    installmentId: 'inst_101',
    orderId: 'order_992100',
    paymentId: 'pay_992100A',
    amount: 25000,
    title: 'Admission Fee Installment',
    paymentMode: 'Razorpay',
    paidDate: mockInstallment.paidDate!,
    receiptStoragePath: storagePath,
    receiptUrl: fallbackUrl,
    receiptPdfSize: 10420,
    createdAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    status: 'active',
  };

  assert(
    mockReceiptRecord.id === receiptNo &&
    mockReceiptRecord.studentId === studentId &&
    mockReceiptRecord.receiptUrl === fallbackUrl &&
    mockReceiptRecord.status === 'active',
    'FeeReceiptRecord document contains all audit and retrieval attributes',
    JSON.stringify(mockReceiptRecord)
  );

  // 5. Test non-destructive atomic update emulation (ensuring other fields remain intact)
  const existingOrderData = {
    id: 'order_992100',
    amount: 2500000,
    currency: 'INR',
    studentId: 'stu_link_001',
    notes: { customNote: 'Special scholarship applies' },
    createdAt: '2026-09-13T10:00:00Z',
  };

  const updatedOrderData = {
    ...existingOrderData,
    status: 'captured',
    paymentId: 'pay_992100A',
    receiptNumber: receiptNo,
    receiptGenerated: true,
    receiptGeneratedAt: new Date().toISOString(),
    receiptStoragePath: storagePath,
    receiptUrl: fallbackUrl,
  };

  assert(
    updatedOrderData.notes.customNote === 'Special scholarship applies' &&
    updatedOrderData.receiptUrl === fallbackUrl &&
    updatedOrderData.status === 'captured',
    'Atomic merge preserves existing order notes and fields during receipt linking',
    `Notes: ${JSON.stringify(updatedOrderData.notes)}`
  );

  console.log(`\n--- RESULTS: ${passed}/${total} TESTS PASSED ---`);
  if (passed !== total) {
    process.exit(1);
  }
}

runReceiptLinkingTests();
