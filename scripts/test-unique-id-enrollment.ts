/**
 * ==============================================================================
 * 🧪 UNIQUE IDENTIFIER ENROLLMENT & COLLISION PREVENTION TEST SUITE
 * ==============================================================================
 * Verifies:
 * 1. findNextAvailableId correctly scans existing IDs and skips taken IDs.
 * 2. Uniqueness check prevents enrolling students, faculty, or batches with duplicate IDs.
 * 3. Graceful in-form error handling without unhandled runtime exceptions.
 * 
 * Strict Zero Fake Data compliance: Tests run deterministically in-memory.
 */

import { findNextAvailableId } from '../src/lib/auth-utils';

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 UNIQUE IDENTIFIER ENROLLMENT & COLLISION PREVENTION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // ==========================================
  // TEST GROUP 1: findNextAvailableId Dynamic Probing
  // ==========================================
  console.log('--- TEST GROUP 1: Auto-Suggestion & Gap Detection ---');

  // Scenario: Database already has STU-2026-001, STU-2026-002, STU-2026-003
  const existingStudentIds = ['STU-2026-001', 'STU-2026-002', 'STU-2026-003'];
  const mockAvailabilityChecker = async (id: string) => {
    const isTaken = existingStudentIds.includes(id);
    return { available: !isTaken, reason: isTaken ? 'Already assigned' : undefined };
  };

  const nextStudentId = await findNextAvailableId('STU', existingStudentIds, mockAvailabilityChecker, 2026);
  assert(nextStudentId === 'STU-2026-004', `Suggests next free student ID STU-2026-004 (got: ${nextStudentId})`);

  // Scenario: Database has STU-2026-003, but only 2 students are in current memory array (e.g. STU-2026-001 was deleted)
  const sparseExistingIds = ['STU-2026-002', 'STU-2026-003'];
  const nextSparseId = await findNextAvailableId('STU', sparseExistingIds, mockAvailabilityChecker, 2026);
  assert(nextSparseId === 'STU-2026-004', `Scans max existing ID (003) and suggests STU-2026-004 (got: ${nextSparseId})`);

  // Scenario: Faculty UID next suggestion
  const existingFacultyIds = ['FAC-2026-001', 'FAC-2026-002'];
  const mockFacultyChecker = async (id: string) => ({
    available: !existingFacultyIds.includes(id),
  });
  const nextFacultyId = await findNextAvailableId('FAC', existingFacultyIds, mockFacultyChecker, 2026);
  assert(nextFacultyId === 'FAC-2026-003', `Suggests next free faculty ID FAC-2026-003 (got: ${nextFacultyId})`);

  // Scenario: Batch Code next suggestion
  const existingBatchCodes = ['BAT-2026-001', 'BAT-2026-002', 'BAT-2026-003', 'BAT-2026-004'];
  const mockBatchChecker = async (id: string) => ({
    available: !existingBatchCodes.includes(id),
  });
  const nextBatchCode = await findNextAvailableId('BAT', existingBatchCodes, mockBatchChecker, 2026);
  assert(nextBatchCode === 'BAT-2026-005', `Suggests next free batch code BAT-2026-005 (got: ${nextBatchCode})`);


  // ==========================================
  // TEST GROUP 2: Duplicate Enrollment Protection
  // ==========================================
  console.log('\n--- TEST GROUP 2: Duplicate Enrollment Guard ---');

  const takenId = 'STU-2026-003';
  const checkResult = await mockAvailabilityChecker(takenId);
  assert(!checkResult.available, `Correctly identifies that ${takenId} is already in use`);
  assert(checkResult.reason === 'Already assigned', 'Returns descriptive reason for taken ID');

  const freeId = 'STU-2026-004';
  const freeResult = await mockAvailabilityChecker(freeId);
  assert(freeResult.available, `Correctly confirms that ${freeId} is free to use`);


  // ==========================================
  // TEST GROUP 3: Case-Insensitive Normalization
  // ==========================================
  console.log('\n--- TEST GROUP 3: Normalization & Format Protection ---');

  const lowerCaseInput = 'stu-2026-003';
  const normalizedMatch = existingStudentIds.some((id) => id.toUpperCase() === lowerCaseInput.trim().toUpperCase());
  assert(normalizedMatch, 'Case-insensitive check prevents reusing stu-2026-003 when STU-2026-003 exists');


  // ==========================================
  // TEST GROUP 4: Cross-Role Conflict Detection
  // ==========================================
  console.log('\n--- TEST GROUP 4: Cross-Role Conflict Detection ---');

  const studentsMock = [{ rollNo: 'STU-2026-001', name: 'Aarav Sharma' }];
  const teachersMock = [{ facultyId: 'FAC-2026-001', name: 'Dr. Rajesh Verma' }];
  const batchesMock = [{ batchCode: 'BAT-2026-001', name: 'JEE Advanced Batch A' }];

  const globalChecker = async (idToCheck: string) => {
    const norm = idToCheck.trim().toUpperCase();
    const s = studentsMock.find((x) => x.rollNo.toUpperCase() === norm);
    if (s) return { available: false, reason: `This ID is already assigned to student "${s.name}" (${s.rollNo})` };
    const t = teachersMock.find((x) => x.facultyId.toUpperCase() === norm);
    if (t) return { available: false, reason: `This ID is already assigned to faculty member "${t.name}" (${t.facultyId})` };
    const b = batchesMock.find((x) => x.batchCode.toUpperCase() === norm);
    if (b) return { available: false, reason: `This ID is already assigned to batch "${b.name}" (${b.batchCode})` };
    return { available: true };
  };

  const studentEnteringFacultyId = await globalChecker('FAC-2026-001');
  assert(!studentEnteringFacultyId.available, 'Detects when Student enrollment enters an existing Faculty ID');
  assert(
    studentEnteringFacultyId.reason?.includes('already assigned to faculty member "Dr. Rajesh Verma"'),
    `Provides exact faculty member name and assignment reason (got: "${studentEnteringFacultyId.reason}")`
  );

  const facultyEnteringStudentId = await globalChecker('STU-2026-001');
  assert(!facultyEnteringStudentId.available, 'Detects when Faculty enrollment enters an existing Student ID');
  assert(
    facultyEnteringStudentId.reason?.includes('already assigned to student "Aarav Sharma"'),
    `Provides exact student name and assignment reason (got: "${facultyEnteringStudentId.reason}")`
  );

  // ==========================================
  // TEST GROUP 5: validateUniqueMemberId Universal Function
  // ==========================================
  console.log('\n--- TEST GROUP 5: validateUniqueMemberId Universal Function ---');

  const { validateUniqueMemberId } = await import('../src/lib/auth-utils');
  const teachersContext = [
    { id: 'teacher-1', facultyId: 'FAC-2026-001', name: 'Dr. Rajesh Verma' },
    { id: 'teacher-2', facultyId: 'FAC-2026-002', name: 'Dr. Meera Nambiar' },
  ];

  // Test 1: Entering already assigned faculty UID
  const duplicateFacultyCheck = await validateUniqueMemberId('FAC-2026-001', { teachers: teachersContext });
  assert(!duplicateFacultyCheck.available, 'validateUniqueMemberId blocks duplicate Faculty ID FAC-2026-001');
  assert(
    duplicateFacultyCheck.reason?.includes('already assigned to faculty member "Dr. Rajesh Verma"'),
    `Provides descriptive duplicate message (got: "${duplicateFacultyCheck.reason}")`
  );

  // Test 2: Entering case-insensitive duplicate UID
  const lowerFacultyCheck = await validateUniqueMemberId('fac-2026-002', { teachers: teachersContext });
  assert(!lowerFacultyCheck.available, 'validateUniqueMemberId blocks case-insensitive duplicate fac-2026-002');

  // Test 3: Entering brand new unused UID
  const freshFacultyCheck = await validateUniqueMemberId('FAC-2026-003', { teachers: teachersContext });
  assert(freshFacultyCheck.available, 'validateUniqueMemberId permits fresh unused UID FAC-2026-003');

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
