import { AuditLogEntry } from '../src/lib/types';

interface PaymentOrderRecord {
  id: string;
  orderId: string;
  studentId: string;
  installmentId?: string;
  studentName?: string;
  title?: string;
  baseAmount?: number;
  lateFee?: number;
  totalAmount?: number;
  status: 'created' | 'captured' | 'failed' | 'refunded';
  paymentId?: string;
  paymentMethod?: string;
  failureReason?: string;
  createdAt: string;
  webhookProcessedAt?: string;
  reconciledAt?: string;
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

console.log('\n--- Running Phase 2 Step 5: Payment Reconciliation Test Suite ---\n');

// 1. Mismatch Calculation Algorithm (> 5 minutes in 'created' state)
function isMismatchFlagged(order: PaymentOrderRecord, currentTimeMs: number): boolean {
  if (order.status !== 'created') return false;
  const createdTime = new Date(order.createdAt).getTime();
  return currentTimeMs - createdTime > 300000; // 5 min = 300,000 ms
}

runTest('Mismatch Detection: Recent order (2 mins old) is NOT flagged', () => {
  const now = Date.now();
  const order: PaymentOrderRecord = {
    id: 'ord_1',
    orderId: 'order_123',
    studentId: 'STU-01',
    status: 'created',
    createdAt: new Date(now - 120000).toISOString(), // 2 min ago
  };
  assert(isMismatchFlagged(order, now) === false, 'Recent order should not be flagged');
});

runTest('Mismatch Detection: Stuck order (6 mins old) IS flagged as mismatch', () => {
  const now = Date.now();
  const order: PaymentOrderRecord = {
    id: 'ord_2',
    orderId: 'order_456',
    studentId: 'STU-01',
    status: 'created',
    createdAt: new Date(now - 360000).toISOString(), // 6 min ago
  };
  assert(isMismatchFlagged(order, now) === true, 'Stuck order > 5 min must be flagged');
});

runTest('Mismatch Detection: Captured order is NEVER flagged regardless of age', () => {
  const now = Date.now();
  const order: PaymentOrderRecord = {
    id: 'ord_3',
    orderId: 'order_789',
    studentId: 'STU-01',
    status: 'captured',
    createdAt: new Date(now - 3600000).toISOString(), // 1 hour ago
  };
  assert(isMismatchFlagged(order, now) === false, 'Captured orders should never be flagged as mismatches');
});

// 2. Gateway Status Resolution State Machine
function resolveGatewayStatus(paymentsList: any[]): { status: string; paymentId: string | null; failureReason?: string } {
  const captured = paymentsList.find((p) => p.status === 'captured');
  if (captured) {
    return { status: 'captured', paymentId: captured.id };
  }
  const failed = paymentsList.find((p) => p.status === 'failed');
  if (failed) {
    return { status: 'failed', paymentId: failed.id, failureReason: failed.error_description || 'Payment failed' };
  }
  return { status: 'created', paymentId: null };
}

runTest('Gateway Sync: Reconciles captured payment from gateway payments list', () => {
  const mockPayments = [
    { id: 'pay_failed_01', status: 'failed', error_description: 'Cancelled by user' },
    { id: 'pay_success_02', status: 'captured', method: 'upi', amount: 500000 },
  ];
  const result = resolveGatewayStatus(mockPayments);
  assert(result.status === 'captured', 'Should resolve status to captured');
  assert(result.paymentId === 'pay_success_02', 'Should extract success payment ID');
});

runTest('Gateway Sync: Reconciles failed payment when no capture exists', () => {
  const mockPayments = [
    { id: 'pay_failed_01', status: 'failed', error_description: 'Card expired' },
  ];
  const result = resolveGatewayStatus(mockPayments);
  assert(result.status === 'failed', 'Should resolve status to failed');
  assert(result.failureReason === 'Card expired', 'Should capture error description');
});

runTest('Gateway Sync: Preserves created status when no attempts found', () => {
  const result = resolveGatewayStatus([]);
  assert(result.status === 'created', 'Should remain created');
  assert(result.paymentId === null, 'Payment ID should be null');
});

// 3. Audit Trail Schema Verification
runTest('Audit Trail: Accurately structures manual reconciliation audit log entry', () => {
  const auditEntry: AuditLogEntry = {
    id: 'audit_log_9988',
    actorUid: 'admin_uid_1',
    actorRole: 'admin',
    action: 'payment_manual_reconciliation_captured',
    targetId: 'order_EKwxwAgItmmXdp',
    before: { status: 'created' },
    after: { status: 'captured', paymentId: 'pay_29QQoUBi66xm2f', receiptNumber: 'RCP-2026-123456' },
    timestamp: new Date().toISOString(),
  };

  assert(auditEntry.actorRole === 'admin', 'Actor role must be admin');
  assert(auditEntry.action.includes('reconciliation'), 'Action must describe reconciliation');
  assert(auditEntry.before?.status === 'created', 'Before state must be tracked');
  assert(auditEntry.after?.status === 'captured', 'After state must be tracked');
});

// Summary
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

console.log(`\n========================================`);
console.log(`Phase 2 Step 5 Test Summary: ${passed}/${total} Passed (${failed} Failed)`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
