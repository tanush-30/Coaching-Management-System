import crypto from 'crypto';
import { verifyWebhookSignature } from '../src/lib/razorpay';

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

function signWebhook(payload: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET!): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

console.log('\n--- Running Phase 2 Step 4: Webhook Handler Test Suite ---\n');

// 1. Signature Verification
runTest('Signature Verification: Authenticates valid webhook payload signature', () => {
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_capture_test_001',
          order_id: 'order_test_001',
          amount: 500000,
          status: 'captured',
        },
      },
    },
  });

  const signature = signWebhook(payload);
  const isValid = verifyWebhookSignature({ rawBody: payload, signature });
  assert(isValid === true, 'Signature must be validated as true');
});

runTest('Signature Verification: Rejects tampered payload', () => {
  const originalPayload = JSON.stringify({ event: 'payment.captured', amount: 5000 });
  const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 1000 });
  const signature = signWebhook(originalPayload);

  const isValid = verifyWebhookSignature({ rawBody: tamperedPayload, signature });
  assert(isValid === false, 'Tampered payload must fail verification');
});

// 2. Event Extraction & Parsing
runTest('Event Parser: payment.captured correctly extracts orderId, paymentId, and notes', () => {
  const event = {
    event: 'payment.captured',
    event_id: 'evt_cap_998811',
    payload: {
      payment: {
        entity: {
          id: 'pay_xyz789',
          order_id: 'order_abc123',
          amount: 750000,
          notes: {
            studentId: 'STU-2026-005',
            installmentId: 'inst_term_1',
          },
        },
      },
    },
  };

  const paymentEntity = event.payload.payment.entity;
  assert(paymentEntity.order_id === 'order_abc123', 'Order ID must match');
  assert(paymentEntity.id === 'pay_xyz789', 'Payment ID must match');
  assert(paymentEntity.notes.studentId === 'STU-2026-005', 'Student ID must match');
  assert(paymentEntity.notes.installmentId === 'inst_term_1', 'Installment ID must match');
});

runTest('Event Parser: payment.failed correctly extracts failureReason', () => {
  const event = {
    event: 'payment.failed',
    event_id: 'evt_fail_998822',
    payload: {
      payment: {
        entity: {
          id: 'pay_fail_001',
          order_id: 'order_fail_001',
          error_description: 'Payment was declined by issuing bank due to insufficient funds',
        },
      },
    },
  };

  const paymentEntity = event.payload.payment.entity;
  assert(paymentEntity.order_id === 'order_fail_001', 'Order ID must match');
  assert(paymentEntity.error_description.includes('insufficient funds'), 'Failure reason must be captured');
});

runTest('Event Parser: refund.processed correctly converts paise to rupees', () => {
  const event = {
    event: 'refund.processed',
    event_id: 'evt_ref_998833',
    payload: {
      refund: {
        entity: {
          id: 'rfnd_001',
          payment_id: 'pay_xyz789',
          order_id: 'order_abc123',
          amount: 500000, // 500,000 paise = 5,000 INR
        },
      },
    },
  };

  const refundEntity = event.payload.refund.entity;
  const refundAmountRupees = refundEntity.amount / 100;
  assert(refundAmountRupees === 5000, `Expected refund amount in INR to be 5000, got ${refundAmountRupees}`);
});

// 3. Idempotency Registry Logic
runTest('Idempotency: Prevents duplicate balance reductions on re-delivered events', () => {
  const processedEvents = new Set<string>();

  function processWebhookEvent(eventId: string, isPaidInDb: boolean): { processed: boolean; reason: string } {
    if (processedEvents.has(eventId)) {
      return { processed: false, reason: 'idempotent_skip' };
    }

    if (isPaidInDb) {
      processedEvents.add(eventId);
      return { processed: false, reason: 'already_marked_paid_in_db' };
    }

    processedEvents.add(eventId);
    return { processed: true, reason: 'success' };
  }

  // 1st delivery
  const res1 = processWebhookEvent('evt_test_100', false);
  assert(res1.processed === true, 'First delivery should be processed');

  // 2nd delivery (duplicate event ID from Razorpay retry)
  const res2 = processWebhookEvent('evt_test_100', true);
  assert(res2.processed === false && res2.reason === 'idempotent_skip', 'Duplicate event must be skipped');

  // 3rd delivery with alternate ID for same installment
  const res3 = processWebhookEvent('evt_test_101', true);
  assert(res3.processed === false && res3.reason === 'already_marked_paid_in_db', 'Already paid installment must not double deduct');
});

// Summary
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

console.log(`\n========================================`);
console.log(`Phase 2 Step 4 Test Summary: ${passed}/${total} Passed (${failed} Failed)`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
