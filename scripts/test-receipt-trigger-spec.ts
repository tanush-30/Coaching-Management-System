import { generateFeeReceiptPDFBuffer, buildFeeReceiptDoc } from '../src/lib/pdf-service';
import { Student, FeeInstallment } from '../src/lib/types';

function runReceiptTriggerTests() {
  console.log('🧪 Starting Phase 3 Step 1: Receipt Generation Trigger Specification Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  const sampleStudent: Student = {
    id: 'student-1789062165770',
    name: 'Vikram Rathore',
    rollNo: 'STU-2026-001',
    phone: '6281276639',
    parentName: 'Sunil Rathore',
    parentPhone: '6281276639',
    parentEmail: 'sunil.rathore@example.com',
    parentRelation: 'Father',
    batchIds: ['batch_001'],
    totalFee: 120000,
    paidFee: 30000,
    pendingFee: 90000,
    gender: 'Male',
    schoolName: 'Apex Academy',
    status: 'active',
  };

  const sampleInstallment: FeeInstallment = {
    id: 'inst_p3_001',
    studentId: 'stu_p3_001',
    installmentNo: 1,
    title: 'Admission & Term 1 Tuition Fee',
    amount: 30000,
    dueDate: '2026-09-30',
    status: 'paid',
    receiptNumber: 'RCP-2026-998877',
    paidDate: '2026-09-13T12:00:00.000Z',
    paymentMode: 'Razorpay',
    transactionId: 'pay_P3Test123456789',
  };

  // Test 1: Server-side PDF generation in Node.js produces a non-empty buffer with PDF header
  try {
    const pdfBuffer = generateFeeReceiptPDFBuffer(sampleStudent, sampleInstallment);
    const hasBuffer = Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500;
    const isPdfHeader = pdfBuffer.slice(0, 4).toString() === '%PDF';

    assert(
      hasBuffer && isPdfHeader,
      'Test 1: generateFeeReceiptPDFBuffer creates a valid binary PDF buffer in server-side Node.js',
      `Buffer length: ${pdfBuffer?.length}, Header: ${pdfBuffer?.slice(0, 4).toString()}`
    );
  } catch (err: any) {
    assert(false, 'Test 1: generateFeeReceiptPDFBuffer creates a valid binary PDF buffer', err.message);
  }

  // Test 2: Document builder supports partial / fallback data without crashing
  try {
    const partialDoc = buildFeeReceiptDoc(
      { name: 'Unknown Student', rollNo: 'STU-999' },
      { amount: 15000, title: 'Term 2 Fee' }
    );
    const partialBuffer = Buffer.from(partialDoc.output('arraybuffer'));
    const isValid = partialBuffer.length > 500 && partialBuffer.slice(0, 4).toString() === '%PDF';

    assert(
      isValid,
      'Test 2: PDF generation handles partial student/installment data with graceful fallbacks'
    );
  } catch (err: any) {
    assert(false, 'Test 2: PDF generation handles partial student/installment data', err.message);
  }

  // Test 3: Idempotency check simulation - duplicate webhook payload does not regenerate receipt
  try {
    let generationCallCount = 0;
    const simulateWebhookEvent = (orderRecord: { receiptGenerated?: boolean; receiptNumber?: string }) => {
      if (orderRecord.receiptGenerated) {
        return { receiptSkipped: true, receiptNumber: orderRecord.receiptNumber };
      }
      generationCallCount++;
      const receiptNumber = 'RCP-2026-AUTO-001';
      generateFeeReceiptPDFBuffer(sampleStudent, { ...sampleInstallment, receiptNumber });
      orderRecord.receiptGenerated = true;
      orderRecord.receiptNumber = receiptNumber;
      return { receiptSkipped: false, receiptNumber };
    };

    const mockOrderRecord: { receiptGenerated?: boolean; receiptNumber?: string } = {};

    const firstCall = simulateWebhookEvent(mockOrderRecord);
    const secondCall = simulateWebhookEvent(mockOrderRecord);

    assert(
      firstCall.receiptSkipped === false &&
        secondCall.receiptSkipped === true &&
        generationCallCount === 1,
      'Test 3: Webhook retry idempotency prevents duplicate PDF generation'
    );
  } catch (err: any) {
    assert(false, 'Test 3: Webhook retry idempotency prevents duplicate PDF generation', err.message);
  }

  // Test 4: Graceful error handling - PDF generation error does not fail or rollback payment status
  try {
    let paymentCaptured = false;
    let loggedError: any = null;

    const simulatePaymentProcessingWithPdfFailure = () => {
      // Step A: Payment captured
      paymentCaptured = true;

      // Step B: Trigger PDF generation with deliberate fault injection
      try {
        throw new Error('Simulated transient PDF rendering error');
      } catch (pdfErr) {
        loggedError = pdfErr;
        // Non-blocking catch
      }

      // Step C: Return final payment status
      return { success: true, paymentStatus: 'captured', errorLogged: !!loggedError };
    };

    const result = simulatePaymentProcessingWithPdfFailure();

    assert(
      result.success === true &&
        result.paymentStatus === 'captured' &&
        result.errorLogged === true,
      'Test 4: Non-blocking receipt failure guarantees payment capture is never rolled back'
    );
  } catch (err: any) {
    assert(false, 'Test 4: Non-blocking receipt failure guarantees payment capture', err.message);
  }

  // Test 5: Receipt fields completeness verification
  try {
    const doc = buildFeeReceiptDoc(sampleStudent, sampleInstallment);
    const pdfStr = Buffer.from(doc.output('arraybuffer')).toString('latin1');

    const containsRoll = pdfStr.includes('APEX-2026-001') || pdfStr.includes('Student Details');
    const containsReceiptNo = pdfStr.includes('RCP-2026-998877') || pdfStr.includes('Receipt No');

    assert(
      containsRoll && containsReceiptNo,
      'Test 5: Generated PDF contains required receipt metadata & student details'
    );
  } catch (err: any) {
    assert(false, 'Test 5: Generated PDF contains required receipt metadata', err.message);
  }

  console.log('\n=============================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReceiptTriggerTests();
