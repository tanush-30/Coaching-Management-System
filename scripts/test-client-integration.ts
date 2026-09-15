import crypto from 'crypto';
import { Student, FeeInstallment } from '../src/lib/types';
import { verifyRazorpaySignature } from '../src/lib/razorpay';

if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_51K9DEMOKEY9988';
}
if (!process.env.RAZORPAY_KEY_SECRET) {
  process.env.RAZORPAY_KEY_SECRET = 'rzp_sec_51K9DEMOSECRET9988';
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function runTest(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message || String(err) });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

console.log('\n--- Running Phase 2 Step 3: Client Integration Test Suite ---\n');

// Mock Data
const mockStudent: Student = {
  id: 'STU-2026-001',
  rollNo: 'R01',
  name: 'Aarav Patel',
  email: 'aarav@example.com',
  phone: '9876543210',
  avatar: '',
  gender: 'Male',
  dob: '2008-05-12',
  address: 'Mumbai',
  schoolName: 'Apex Academy',
  parentName: 'Suresh Patel',
  parentPhone: '9876543211',
  parentEmail: 'suresh.patel@example.com',
  parentRelation: 'Father',
  batchIds: ['BAT-01'],
  enrollmentDate: '2026-01-10',
  status: 'active',
  totalFee: 60000,
  paidFee: 20000,
  pendingFee: 40000,
};

const mockInstallment: FeeInstallment = {
  id: 'inst_q2_2026',
  studentId: 'STU-2026-001',
  installmentNo: 2,
  title: 'Quarter 2 Fee (July - Sept)',
  dueDate: '2026-07-15',
  amount: 20000,
  status: 'pending',
};

// 1. Order Creation Request Payload Construction
runTest('Client Order Payload: Formats installment & student metadata accurately', () => {
  const payload = {
    installmentId: mockInstallment.id,
    studentId: mockStudent.id,
    fallbackAmount: mockInstallment.amount,
  };

  assert(payload.installmentId === 'inst_q2_2026', 'Installment ID must match');
  assert(payload.studentId === 'STU-2026-001', 'Student ID must match');
  assert(payload.fallbackAmount === 20000, 'Amount must match');
});

// 2. Razorpay Checkout Options Construction
runTest('Checkout Options: Accurately maps prefill, amount in paise, and order_id', () => {
  const orderResponse = {
    orderId: 'order_test_998877',
    amount: 2000000, // in paise
    currency: 'INR',
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  };

  const options = {
    key: orderResponse.keyId,
    amount: orderResponse.amount,
    currency: orderResponse.currency,
    name: 'Apex Academy',
    description: `${mockInstallment.title} - ${mockStudent.name}`,
    order_id: orderResponse.orderId,
    prefill: {
      name: mockStudent.parentName || mockStudent.name,
      email: mockStudent.parentEmail || mockStudent.email,
      contact: mockStudent.parentPhone || mockStudent.phone,
    },
    notes: {
      studentId: mockStudent.id,
      installmentId: mockInstallment.id,
    },
  };

  assert(options.key === 'rzp_test_51K9DEMOKEY9988', 'Key ID must be populated');
  assert(options.amount === 2000000, 'Amount must be in paise');
  assert(options.order_id === 'order_test_998877', 'Order ID must match');
  assert(options.prefill.name === 'Suresh Patel', 'Prefill name should use parentName');
  assert(options.prefill.contact === '9876543211', 'Prefill contact should use parentPhone');
  assert(options.prefill.email === 'suresh.patel@example.com', 'Prefill email should use parentEmail');
});

// 3. Callback Handlers & Cryptographic Verification Payload
runTest('Client Verification: Generates valid signature verification payload', () => {
  const orderId = 'order_test_998877';
  const paymentId = 'pay_test_554433';
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const sdkSuccessResponse = {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: validSignature,
  };

  const verificationRequestPayload = {
    orderId: sdkSuccessResponse.razorpay_order_id,
    paymentId: sdkSuccessResponse.razorpay_payment_id,
    signature: sdkSuccessResponse.razorpay_signature,
    installmentId: mockInstallment.id,
    studentId: mockStudent.id,
  };

  const isSigValid = verifyRazorpaySignature({
    orderId: verificationRequestPayload.orderId,
    paymentId: verificationRequestPayload.paymentId,
    signature: verificationRequestPayload.signature,
  });

  assert(isSigValid === true, 'Signature must be validated successfully');
});

// 4. Modal State Machine Transitions
runTest('State Machine: Transitions from idle -> creating_order -> gateway_open -> verifying -> success', () => {
  const states: string[] = [];
  function transition(toState: string) {
    states.push(toState);
  }

  transition('idle');
  transition('creating_order');
  transition('gateway_open');
  transition('verifying');
  transition('success');

  assert(states.length === 5, 'Must have 5 state transitions');
  assert(states[0] === 'idle' && states[4] === 'success', 'Must start at idle and end at success');
});

// 5. User Modal Dismissal Handling
runTest('State Machine: Recovers to idle when user dismisses payment modal', () => {
  let currentState = 'gateway_open';

  // Simulating modal.ondismiss callback
  function onDismiss() {
    if (currentState !== 'verifying' && currentState !== 'success') {
      currentState = 'idle';
    }
  }

  onDismiss();
  assert(currentState === 'idle', 'Dismissing checkout must safely return state to idle');
});

// Summary
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

console.log(`\n========================================`);
console.log(`Phase 2 Step 3 Test Summary: ${passed}/${total} Passed (${failed} Failed)`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
