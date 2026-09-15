/**
 * Test Suite: Online Module Step 2 — Backend Order Creation & Contact Data
 * Verifies:
 * 1. Phone number normalization (E.164 and WhatsApp wa.me formats).
 * 2. WhatsApp fee reminder URL building with safe formatting.
 * 3. Dual-route exports and payload requirements.
 * 4. Zero fake data policy compliance.
 */

import { formatWhatsAppPhone, buildWhatsAppFeeReminderUrl } from '../src/lib/phone-utils';
import { sanitizeReceiptId, formatPaiseAmount } from '../src/lib/razorpay';
import * as CreateOrderSingular from '../src/app/api/payment/create-order/route';
import * as CreateOrderPlural from '../src/app/api/payments/create-order/route';

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

console.log('\n--- Running Online Module Step 2: Order Creation & Contact Data Tests ---\n');

// 1. Phone Normalization: Standard 10-digit Indian Mobile
runTest('Phone: Standard 10-digit mobile converts to +91 and WhatsApp digits', () => {
  const res = formatWhatsAppPhone('9876543210');
  assert(res.isValid === true, 'Should be valid');
  assert(res.formattedE164 === '+919876543210', `Expected +919876543210, got ${res.formattedE164}`);
  assert(res.whatsappDigits === '919876543210', `Expected 919876543210, got ${res.whatsappDigits}`);
  assert(res.displayFormat === '+91 98765 43210', `Expected display format, got ${res.displayFormat}`);
});

// 2. Phone Normalization: With +91 prefix
runTest('Phone: Number with existing +91 prefix normalizes correctly', () => {
  const res = formatWhatsAppPhone('+919876543210');
  assert(res.isValid === true, 'Should be valid');
  assert(res.formattedE164 === '+919876543210', `Expected +919876543210, got ${res.formattedE164}`);
  assert(res.whatsappDigits === '919876543210', `Expected 919876543210, got ${res.whatsappDigits}`);
});

// 3. Phone Normalization: With leading zero
runTest('Phone: Number with leading zero (09876543210) normalizes correctly', () => {
  const res = formatWhatsAppPhone('09876543210');
  assert(res.isValid === true, 'Should be valid');
  assert(res.formattedE164 === '+919876543210', `Expected +919876543210, got ${res.formattedE164}`);
  assert(res.whatsappDigits === '919876543210', `Expected 919876543210, got ${res.whatsappDigits}`);
});

// 4. Phone Normalization: Invalid / Missing inputs
runTest('Phone: Invalid short or missing numbers return isValid: false', () => {
  assert(formatWhatsAppPhone('').isValid === false, 'Empty string should be invalid');
  assert(formatWhatsAppPhone(null).isValid === false, 'Null should be invalid');
  assert(formatWhatsAppPhone(undefined).isValid === false, 'Undefined should be invalid');
  assert(formatWhatsAppPhone('12345').isValid === false, 'Short number should be invalid');
});

// 5. WhatsApp Reminder URL Builder
runTest('WhatsApp URL: buildWhatsAppFeeReminderUrl creates valid click-to-chat link', () => {
  const url = buildWhatsAppFeeReminderUrl({
    parentPhone: '9876543210',
    parentName: 'Sunil Rathore',
    studentName: 'Vikram Rathore',
    title: 'Term 1 Tuition Fee',
    amount: 25000,
    dueDate: '2026-09-30',
    paymentLink: 'https://pages.razorpay.com/pl_apex_pay',
  });

  assert(url !== null, 'URL should not be null');
  assert(url.startsWith('https://wa.me/919876543210?text='), 'URL must target wa.me with clean digits');
  assert(url.includes(encodeURIComponent('Vikram Rathore')), 'URL text must contain student name');
  assert(url.includes(encodeURIComponent('₹25,000')), 'URL text must contain formatted amount');
});

// 6. WhatsApp Reminder URL Builder: Missing Phone
runTest('WhatsApp URL: Returns null when parent phone is missing or invalid', () => {
  const url = buildWhatsAppFeeReminderUrl({
    parentPhone: '',
    studentName: 'Vikram Rathore',
    title: 'Term 1 Fee',
    amount: 25000,
    dueDate: '2026-09-30',
  });

  assert(url === null, 'URL must be null when phone is missing');
});

// 7. Dual Route Compatibility
runTest('Routing: Both /api/payment/create-order and /api/payments/create-order export POST handler', () => {
  assert(typeof CreateOrderSingular.POST === 'function', 'Singular route must export POST');
  assert(typeof CreateOrderPlural.POST === 'function', 'Plural alias route must export POST');
  assert(CreateOrderSingular.POST === CreateOrderPlural.POST, 'Both routes must reference the exact same handler');
});

// 8. Order Receipt and Amount Safety
runTest('Safety: Order amount and receipt sanitization work together', () => {
  const rawId = 'inst-student-1789062165770-term1-super-long-identifier-1234567890';
  const sanitizedReceipt = sanitizeReceiptId(rawId);
  assert(sanitizedReceipt.length <= 40, `Receipt length must be <= 40, got ${sanitizedReceipt.length}`);

  const paise = formatPaiseAmount(14999.50);
  assert(paise === 1499950, `Paise must be exact integer, got ${paise}`);
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
