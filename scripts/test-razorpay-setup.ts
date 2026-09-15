import crypto from 'crypto';
import {
  isRazorpayConfigured,
  getRazorpayKeyMode,
  sanitizeReceiptId,
  formatPaiseAmount,
  getRazorpayInstance,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../src/lib/razorpay';

// Ensure test keys are populated if running standalone
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

console.log('\n--- Running Online Module Step 1: Razorpay Setup & Credentials Tests ---\n');

// 1. Environment and Configuration
runTest('Environment: isRazorpayConfigured() is true when keys are set', () => {
  assert(isRazorpayConfigured() === true, 'Expected isRazorpayConfigured() to be true');
});

// 2. Key Mode Detection
runTest('Environment: getRazorpayKeyMode() correctly detects test mode', () => {
  assert(getRazorpayKeyMode() === 'test', 'Expected key mode to be "test"');
});

// 3. Receipt ID Sanitization & Length Limit (Razorpay <= 40 char rule)
runTest('Safety: sanitizeReceiptId enforces max 40 chars and valid chars', () => {
  const shortId = sanitizeReceiptId('rcpt_12345');
  assert(shortId === 'rcpt_12345', 'Short receipt should be unchanged');

  const longReceipt = 'rcpt_student-1789062165770_term_installment_with_super_long_name_1789123456789';
  const sanitized = sanitizeReceiptId(longReceipt);
  assert(sanitized.length <= 40, `Sanitized receipt must be <= 40 chars, got ${sanitized.length}`);
  assert(/^[a-zA-Z0-9_-]+$/.test(sanitized), 'Sanitized receipt must only contain alphanumeric, dash, underscore');
});

// 4. Amount Formatting (Integer Paise)
runTest('Safety: formatPaiseAmount converts rupees to integer paise without fractions', () => {
  assert(formatPaiseAmount(500) === 50000, '500 INR should be 50000 paise');
  assert(formatPaiseAmount(1299.99) === 129999, '1299.99 INR should be 129999 paise');
  assert(formatPaiseAmount(0.50) === 50, '0.50 INR should be 50 paise');
});

// 5. Instance Initialization
runTest('SDK Instance: getRazorpayInstance creates a valid Razorpay instance', () => {
  const instance = getRazorpayInstance();
  assert(instance !== null && instance !== undefined, 'Instance must be defined');
  assert(typeof instance.orders?.create === 'function', 'Instance must have orders.create method');
});

// 3. Payment Signature Verification (Valid Case)
runTest('Payment Verification: Valid signature produces true', () => {
  const orderId = 'order_EKwxwAgItmmXdp';
  const paymentId = 'pay_29QQoUBi66xm2f';
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

  assert(isValid === true, 'Expected valid signature to verify successfully');
});

// 4. Payment Signature Verification (Tampered Case)
runTest('Payment Verification: Tampered signature produces false', () => {
  const orderId = 'order_EKwxwAgItmmXdp';
  const paymentId = 'pay_29QQoUBi66xm2f';
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const tamperedSignature = validSignature.substring(0, validSignature.length - 2) + '00';

  const isValid = verifyRazorpaySignature({
    orderId,
    paymentId,
    signature: tamperedSignature,
  });

  assert(isValid === false, 'Expected tampered signature to fail verification');
});

// 5. Payment Signature Verification (Mismatched Payment ID)
runTest('Payment Verification: Mismatched Payment ID produces false', () => {
  const orderId = 'order_EKwxwAgItmmXdp';
  const paymentId = 'pay_29QQoUBi66xm2f';
  const secret = process.env.RAZORPAY_KEY_SECRET!;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = verifyRazorpaySignature({
    orderId,
    paymentId: 'pay_attacker_altered_id',
    signature: validSignature,
  });

  assert(isValid === false, 'Expected mismatched paymentId to fail verification');
});

// 6. Payment Signature Verification (Malformed Hex)
runTest('Payment Verification: Malformed non-hex signature produces false without throwing', () => {
  const isValid = verifyRazorpaySignature({
    orderId: 'order_123',
    paymentId: 'pay_123',
    signature: 'invalid_non_hex_gibberish',
  });

  assert(isValid === false, 'Expected malformed signature to safely return false');
});

// 7. Webhook Signature Verification (Valid Case)
runTest('Webhook Verification: Valid webhook payload signature produces true', () => {
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_29QQoUBi66xm2f',
          amount: 500000,
          status: 'captured',
        },
      },
    },
  });
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  const isValid = verifyWebhookSignature({
    rawBody: payload,
    signature: validWebhookSig,
  });

  assert(isValid === true, 'Expected valid webhook signature to verify successfully');
});

// 8. Webhook Signature Verification (Tampered Payload)
runTest('Webhook Verification: Tampered body payload produces false', () => {
  const originalPayload = JSON.stringify({ event: 'payment.captured', amount: 500000 });
  const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 100000 });
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(originalPayload)
    .digest('hex');

  const isValid = verifyWebhookSignature({
    rawBody: tamperedPayload,
    signature: validWebhookSig,
  });

  assert(isValid === false, 'Expected tampered webhook payload to fail verification');
});

// 9. Webhook Signature Verification (Custom secret override)
runTest('Webhook Verification: Custom webhookSecret parameter works properly', () => {
  const payload = '{"custom":"event"}';
  const customSecret = 'custom_secret_key_12345';

  const sig = crypto
    .createHmac('sha256', customSecret)
    .update(payload)
    .digest('hex');

  const isValid = verifyWebhookSignature({
    rawBody: payload,
    signature: sig,
    webhookSecret: customSecret,
  });

  assert(isValid === true, 'Expected custom webhookSecret to verify successfully');
});

// 10. Webhook Signature Verification (Malformed Signature)
runTest('Webhook Verification: Malformed signature safely returns false', () => {
  const isValid = verifyWebhookSignature({
    rawBody: '{"test": true}',
    signature: '',
  });

  assert(isValid === false, 'Expected empty signature to safely return false');
});

// Summary
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

console.log(`\n========================================`);
console.log(`Test Summary: ${passed}/${total} Passed (${failed} Failed)`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
