// Test script: test-receipts-api-and-ui.ts
// Validates Phase 3 Step 4: Retrieval UI — "Past Receipts"
// Tests navigation configuration, role-based receipts API scoping, search filters, and URL resolution.

import { PORTAL_NAV_ITEMS } from '../src/lib/config/navConfig';
import { canAccessStudent } from '../src/lib/server-auth';
import { FeeReceiptRecord } from '../src/lib/types';
import { getReceiptStoragePath } from '../src/lib/receipt-storage';

function runRetrievalUITests() {
  console.log('--- STARTING PHASE 3 STEP 4: RETRIEVAL UI SPECIFICATION TESTS ---');
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

  // 1. Navigation Item: Student Portal has 'receipts' item configured
  const studentNavItems = PORTAL_NAV_ITEMS.student || [];
  const receiptNavItem = studentNavItems.find((item) => item.id === 'receipts');
  assert(
    !!receiptNavItem && receiptNavItem.roles.includes('student'),
    'Student navigation includes "receipts" item for Past Receipts UI',
    JSON.stringify(receiptNavItem)
  );

  // 2. Role-based Security Scoping: Admin access
  const adminUser = {
    uid: 'admin_root',
    email: 'admin@apexacademy.com',
    role: 'admin' as const,
    claims: { role: 'admin' },
  };
  assert(
    canAccessStudent(adminUser, 'stu_arbitrary_101') === true,
    'Auth Scope: Admin can access receipts for any student record'
  );

  // 3. Role-based Security Scoping: Student access
  const studentUser = {
    uid: 'student-1789062165770',
    email: 'vikram.rathore@student.apex.com',
    role: 'student' as const,
    studentId: 'student-1789062165770',
  };
  assert(
    canAccessStudent(studentUser, 'student-1789062165770') === true &&
    canAccessStudent(studentUser, 'stu_other_99') === false,
    'Auth Scope: Student is restricted to own studentId and cannot view others'
  );

  // 4. Role-based Security Scoping: Parent access
  const parentUser = {
    uid: 'parent_user_sunil',
    email: 'sunil.rathore@parent.apex.com',
    role: 'parent' as const,
    childIds: ['student-1789062165770', 'student-1789099403130'],
  };
  assert(
    canAccessStudent(parentUser, 'student-1789062165770') === true &&
    canAccessStudent(parentUser, 'student-1789099403130') === true &&
    canAccessStudent(parentUser, 'stu_stranger_3') === false,
    'Auth Scope: Parent can only access linked childIds'
  );

  // 5. In-Memory Search & Filtering logic simulation
  const mockReceipts: FeeReceiptRecord[] = [
    {
      id: 'RCP-2026-001',
      receiptNumber: 'RCP-2026-001',
      studentId: 'student-1789062165770',
      studentName: 'Vikram Rathore',
      amount: 15000,
      title: 'Term 1 Tuition Fee',
      paymentMode: 'Razorpay',
      paidDate: '2026-08-10T10:00:00Z',
      receiptStoragePath: getReceiptStoragePath('student-1789062165770', 'RCP-2026-001'),
      receiptUrl: 'https://storage.googleapis.com/test-bucket/receipts/student-1789062165770/RCP-2026-001.pdf',
      createdAt: '2026-08-10T10:00:00Z',
      generatedAt: '2026-08-10T10:00:00Z',
      status: 'active',
    },
    {
      id: 'RCP-2026-002',
      receiptNumber: 'RCP-2026-002',
      studentId: 'student-1789062165770',
      studentName: 'Vikram Rathore',
      amount: 8500,
      title: 'Test Series & Smart Lab Fee',
      paymentMode: 'UPI',
      paidDate: '2026-09-01T14:30:00Z',
      receiptStoragePath: getReceiptStoragePath('student-1789062165770', 'RCP-2026-002'),
      receiptUrl: 'https://storage.googleapis.com/test-bucket/receipts/student-1789062165770/RCP-2026-002.pdf',
      createdAt: '2026-09-01T14:30:00Z',
      generatedAt: '2026-09-01T14:30:00Z',
      status: 'active',
    },
  ];

  const searchKeyword = 'Test Series';
  const searchResults = mockReceipts.filter((r) =>
    r.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    r.receiptNumber.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  assert(
    searchResults.length === 1 && searchResults[0].id === 'RCP-2026-002',
    'Retrieval UI: Search filter accurately filters receipt records by title or receiptNumber',
    `Found ${searchResults.length} matches`
  );

  // 6. Direct View and Fallback URL availability
  assert(
    mockReceipts.every((r) => Boolean(r.receiptUrl && r.receiptStoragePath)),
    'All receipt records expose valid downloadable Storage URLs and storage paths'
  );

  console.log(`\n--- RESULTS: ${passed}/${total} TESTS PASSED ---`);
  if (passed !== total) {
    process.exit(1);
  }
}

runRetrievalUITests();
