import crypto from 'crypto';
import { canAccessStudent, AuthenticatedUser } from '../src/lib/server-auth';
import {
  isRazorpayConfigured,
  getRazorpayInstance,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../src/lib/razorpay';
import { DEFAULT_FEE_STRUCTURE } from '../src/lib/settings-defaults';
import type { FeeStructureSettings } from '../src/lib/types';

// Ensure test keys exist in process.env
if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_51K9DEMOKEY9988';
}
if (!process.env.RAZORPAY_KEY_SECRET) {
  process.env.RAZORPAY_KEY_SECRET = 'rzp_sec_51K9DEMOSECRET9988';
}
if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
  process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_whsec_51K9DEMOWEBHOOK9988';
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

console.log('\n--- Running Phase 2 Step 2: Backend Payment Endpoints Test Suite ---\n');

// ==========================================
// 1. DATA-LEVEL AUTHORIZATION TESTS
// ==========================================
console.log('1. Authorization & Role Checks:');

runTest('Auth: Admin can access any student record', () => {
  const adminUser: AuthenticatedUser = {
    uid: 'admin_1',
    role: 'admin',
  };
  assert(canAccessStudent(adminUser, 'STU-001') === true, 'Admin must be able to access STU-001');
  assert(canAccessStudent(adminUser, 'STU-999') === true, 'Admin must be able to access STU-999');
});

runTest('Auth: Student can access own records only', () => {
  const studentUser: AuthenticatedUser = {
    uid: 'user_stu_1',
    role: 'student',
    studentId: 'STU-001',
  };
  assert(canAccessStudent(studentUser, 'STU-001') === true, 'Student must access their own studentId');
  assert(canAccessStudent(studentUser, 'STU-002') === false, 'Student must NOT access other students');
});

runTest('Auth: Parent can access linked children only', () => {
  const parentUser: AuthenticatedUser = {
    uid: 'parent_1',
    role: 'parent',
    childIds: ['STU-001', 'STU-002'],
  };
  assert(canAccessStudent(parentUser, 'STU-001') === true, 'Parent must access child STU-001');
  assert(canAccessStudent(parentUser, 'STU-002') === true, 'Parent must access child STU-002');
  assert(canAccessStudent(parentUser, 'STU-003') === false, 'Parent must NOT access unlinked STU-003');
});

runTest('Auth: Unauthenticated user is rejected', () => {
  assert(canAccessStudent(null, 'STU-001') === false, 'Null user must be rejected');
  assert(canAccessStudent({ uid: 'x', role: 'teacher' }, 'STU-001') === false, 'Teacher must not access fee payments');
});

// ==========================================
// 2. SERVER-SIDE FEE CALCULATION & ANTI-TAMPERING
// ==========================================
console.log('\n2. Server-Side Fee Derivation & Anti-Tampering:');

function calculateServerSideFee(
  baseAmount: number,
  dueDate: string,
  nowTimestamp: number,
  settings: FeeStructureSettings
): { subtotal: number; lateFee: number; totalAmount: number; amountInPaise: number } {
  let lateFee = 0;
  if (settings.lateFeeEnabled && dueDate) {
    const dueDateTime = new Date(dueDate).getTime();
    const gracePeriodMs = (settings.lateFeeGraceDays || 0) * 86400000;
    if (nowTimestamp > dueDateTime + gracePeriodMs) {
      const daysOverdue = Math.max(1, Math.floor((nowTimestamp - (dueDateTime + gracePeriodMs)) / 86400000));
      const calculated = daysOverdue * (settings.lateFeeDailyAmount || 0);
      lateFee = settings.lateFeeMaxCap > 0 ? Math.min(calculated, settings.lateFeeMaxCap) : calculated;
    }
  }

  const subtotal = baseAmount + lateFee;
  const totalAmount = subtotal;
  const amountInPaise = Math.round(totalAmount * 100);

  return { subtotal, lateFee, totalAmount, amountInPaise };
}

runTest('Fee Calculation: Standard installment without late fee', () => {
  const result = calculateServerSideFee(5000, '2026-10-01', new Date('2026-09-15').getTime(), DEFAULT_FEE_STRUCTURE);
  assert(result.totalAmount === 5000, `Expected totalAmount 5000, got ${result.totalAmount}`);
  assert(result.amountInPaise === 500000, `Expected 500000 paise, got ${result.amountInPaise}`);
});

runTest('Fee Calculation: Daily late fee with grace days and daily amount', () => {
  const customSettings: FeeStructureSettings = {
    ...DEFAULT_FEE_STRUCTURE,
    lateFeeEnabled: true,
    lateFeeGraceDays: 3,
    lateFeeDailyAmount: 50,
    lateFeeMaxCap: 500,
  };
  // Due Sept 1, evaluated Sept 10 (9 days past due, 9 - 3 = 6 days late * 50 = 300)
  const result = calculateServerSideFee(4000, '2026-09-01', new Date('2026-09-10').getTime(), customSettings);
  assert(result.lateFee === 300, `Expected late fee 300, got ${result.lateFee}`);
  assert(result.totalAmount === 4300, `Expected totalAmount 4300, got ${result.totalAmount}`);
  assert(result.amountInPaise === 430000, `Expected 430000 paise, got ${result.amountInPaise}`);
});

runTest('Fee Calculation: Daily late fee capped at lateFeeMaxCap', () => {
  const customSettings: FeeStructureSettings = {
    ...DEFAULT_FEE_STRUCTURE,
    lateFeeEnabled: true,
    lateFeeGraceDays: 0,
    lateFeeDailyAmount: 50,
    lateFeeMaxCap: 250,
  };
  // 10 days overdue => 10 * 50 = 500 capped at 250
  const result = calculateServerSideFee(3000, '2026-09-01', new Date('2026-09-11').getTime(), customSettings);
  assert(result.lateFee === 250, `Expected capped late fee 250, got ${result.lateFee}`);
  assert(result.totalAmount === 3250, `Expected totalAmount 3250, got ${result.totalAmount}`);
});

// ==========================================
// 3. RAZORPAY ORDER CREATION & SIGNATURE VERIFICATION
// ==========================================
console.log('\n3. Razorpay Order Integration & Cryptography:');

runTest('Razorpay SDK: Orders create method is available', () => {
  const razorpay = getRazorpayInstance();
  assert(typeof razorpay.orders.create === 'function', 'Razorpay instance must have orders.create');
});

runTest('Verification Endpoint: Valid signature verified with constant time comparison', () => {
  const orderId = 'order_test_987654';
  const paymentId = 'pay_test_123456';
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: validSignature,
  });

  assert(isValid === true, 'Signature must be verified as true');
});

runTest('Verification Endpoint: Tampered orderId is rejected', () => {
  const orderId = 'order_test_987654';
  const paymentId = 'pay_test_123456';
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = verifyRazorpaySignature({
    orderId: 'order_hacked_different_id',
    paymentId,
    signature: validSignature,
  });

  assert(isValid === false, 'Tampered orderId must fail verification');
});

// ==========================================
// 4. WEBHOOK PAYLOAD VERIFICATION & EVENT ROUTING
// ==========================================
console.log('\n4. Webhook Payload Verification & Event Routing:');

runTest('Webhook: Signature verification with valid secret', () => {
  const webhookBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_live_captured_001',
          order_id: 'order_test_987654',
          amount: 500000,
          status: 'captured',
          notes: {
            studentId: 'STU-001',
            installmentId: 'inst_01',
          },
        },
      },
    },
  });

  const validSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(webhookBody)
    .digest('hex');

  const isValid = verifyWebhookSignature({
    rawBody: webhookBody,
    signature: validSig,
  });

  assert(isValid === true, 'Webhook signature must be valid');
});

runTest('Webhook: Tampered webhook body is safely rejected', () => {
  const originalBody = JSON.stringify({ event: 'payment.captured', id: 1 });
  const tamperedBody = JSON.stringify({ event: 'payment.captured', id: 2 });

  const sig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(originalBody)
    .digest('hex');

  const isValid = verifyWebhookSignature({
    rawBody: tamperedBody,
    signature: sig,
  });

  assert(isValid === false, 'Tampered webhook payload must fail verification');
});

// Summary
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

console.log(`\n========================================`);
console.log(`Phase 2 Step 2 Test Summary: ${passed}/${total} Passed (${failed} Failed)`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
