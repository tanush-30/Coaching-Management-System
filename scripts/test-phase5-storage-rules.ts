/**
 * Automated Verification Test Suite for Phase 5 Step 1: Firebase Storage Security Rules
 */

interface StorageAuthContext {
  uid?: string;
  token?: {
    role?: 'admin' | 'teacher' | 'student' | 'parent';
    email?: string;
    batchId?: string;
    batchIds?: string[];
    childIds?: string[];
    studentId?: string;
  };
}

interface StorageRequestContext {
  auth?: StorageAuthContext | null;
  resource?: {
    size: number;
    contentType?: string;
  };
}

// Rule evaluator simulating Firebase Storage rules engine logic
class StorageRuleEvaluator {
  static evaluate(
    path: string,
    operation: 'read' | 'write',
    request: StorageRequestContext
  ): boolean {
    const auth = request.auth;
    const isAuthenticated = !!auth && !!auth.uid;

    const isAdmin =
      isAuthenticated &&
      (auth?.token?.role === 'admin' ||
        auth?.token?.email === 'admin@apexerp.com' ||
        auth?.token?.email === 'tanushdemo@gmail.com');

    const isTeacher = isAuthenticated && auth?.token?.role === 'teacher';
    const isStudent = isAuthenticated && auth?.token?.role === 'student';
    const isParent = isAuthenticated && auth?.token?.role === 'parent';

    const isTeacherOf = (batchId: string) =>
      isTeacher &&
      Array.isArray(auth?.token?.batchIds) &&
      auth.token.batchIds.includes(batchId);

    const isStudentOf = (batchId: string) =>
      isStudent &&
      (auth?.token?.batchId === batchId ||
        (Array.isArray(auth?.token?.batchIds) && auth.token.batchIds.includes(batchId)));

    const isOwnStudent = (studentId: string) =>
      isStudent &&
      (auth?.token?.studentId === studentId || auth?.uid === studentId);

    const isParentOf = (studentId: string) =>
      isParent &&
      Array.isArray(auth?.token?.childIds) &&
      auth.token.childIds.includes(studentId);

    const isValidFileSize =
      !request.resource || request.resource.size < 50 * 1024 * 1024;

    // Route matching
    const studyMaterialsMatch = path.match(/^\/studyMaterials\/([^/]+)\/(.*)$/);
    if (studyMaterialsMatch) {
      const batchId = studyMaterialsMatch[1];
      if (operation === 'read') {
        return isAuthenticated && (isAdmin || isTeacherOf(batchId) || isStudentOf(batchId) || isParent);
      }
      if (operation === 'write') {
        return (isAdmin || isTeacherOf(batchId)) && isValidFileSize;
      }
    }

    const legacyMaterialsMatch = path.match(/^\/materials\/([^/]+)\/(.*)$/);
    if (legacyMaterialsMatch) {
      const batchId = legacyMaterialsMatch[1];
      if (operation === 'read') {
        return isAuthenticated && (isAdmin || isTeacherOf(batchId) || isStudentOf(batchId) || isParent);
      }
      if (operation === 'write') {
        return (isAdmin || isTeacherOf(batchId)) && isValidFileSize;
      }
    }

    const homeworkMatch = path.match(/^\/homework\/([^/]+)\/(.*)$/);
    if (homeworkMatch) {
      const batchId = homeworkMatch[1];
      if (operation === 'read') {
        return isAuthenticated && (isAdmin || isTeacherOf(batchId) || isStudentOf(batchId) || isParent);
      }
      if (operation === 'write') {
        return (isAdmin || isTeacherOf(batchId)) && isValidFileSize;
      }
    }

    const receiptsMatch = path.match(/^\/receipts\/([^/]+)\/(.*)$/);
    if (receiptsMatch) {
      const studentId = receiptsMatch[1];
      if (operation === 'read') {
        return isAuthenticated && (isAdmin || isOwnStudent(studentId) || isParentOf(studentId));
      }
      if (operation === 'write') {
        return isAdmin && isValidFileSize;
      }
    }

    const publicMatch = path.match(/^\/public\/(.*)$/);
    if (publicMatch) {
      if (operation === 'read') return true;
      if (operation === 'write') return isAdmin && isValidFileSize;
    }

    return false;
  }
}

async function runStorageRulesTests() {
  console.log('======================================================================');
  console.log('🧪 PHASE 5 STEP 1: FIREBASE STORAGE RULES SECURITY TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title: string, actual: boolean, expected: boolean) {
    if (actual === expected) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} — Expected: ${expected}, Got: ${actual}`);
      failed++;
    }
  }

  const batchA = 'batch-jee-super30';
  const batchB = 'batch-neet-elite';

  const teacherCtx: StorageRequestContext = {
    auth: {
      uid: 'teacher-1',
      token: {
        role: 'teacher',
        email: 'teacher@apexerp.com',
        batchIds: [batchA],
      },
    },
    resource: { size: 10 * 1024 * 1024 }, // 10MB
  };

  const studentACtx: StorageRequestContext = {
    auth: {
      uid: 'student-1',
      token: {
        role: 'student',
        email: 'student@studenterp.internal',
        batchId: batchA,
        studentId: 'student-1',
      },
    },
  };

  const studentBCtx: StorageRequestContext = {
    auth: {
      uid: 'student-2',
      token: {
        role: 'student',
        email: 'student2@studenterp.internal',
        batchId: batchB,
        studentId: 'student-2',
      },
    },
  };

  const adminCtx: StorageRequestContext = {
    auth: {
      uid: 'admin-1',
      token: {
        role: 'admin',
        email: 'admin@apexerp.com',
      },
    },
    resource: { size: 5 * 1024 * 1024 },
  };

  const unauthCtx: StorageRequestContext = {
    auth: null,
  };

  const oversizedResourceCtx: StorageRequestContext = {
    auth: teacherCtx.auth,
    resource: { size: 60 * 1024 * 1024 }, // 60MB (exceeds 50MB limit)
  };

  console.log('--- TEST GROUP 1: Teacher Permissions on Study Materials ---');
  assert(
    'Teacher can write study material to assigned Batch A',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/physics-notes.pdf`, 'write', teacherCtx),
    true
  );

  assert(
    'Teacher CANNOT write study material to unassigned Batch B',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchB}/physics-notes.pdf`, 'write', teacherCtx),
    false
  );

  assert(
    'Teacher can read study material from assigned Batch A',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/physics-notes.pdf`, 'read', teacherCtx),
    true
  );

  assert(
    'Teacher CANNOT read study material from unassigned Batch B',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchB}/physics-notes.pdf`, 'read', teacherCtx),
    false
  );

  assert(
    'Teacher upload REJECTED if file exceeds 50MB size limit',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/huge-video.mp4`, 'write', oversizedResourceCtx),
    false
  );

  console.log('\n--- TEST GROUP 2: Student Permissions on Study Materials ---');
  assert(
    'Batch A student can read study material in Batch A',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/physics-notes.pdf`, 'read', studentACtx),
    true
  );

  assert(
    'Batch A student CANNOT read study material in Batch B (Strict Scoping)',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchB}/biology-notes.pdf`, 'read', studentACtx),
    false
  );

  assert(
    'Student CANNOT write or upload study materials',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/malicious.pdf`, 'write', studentACtx),
    false
  );

  console.log('\n--- TEST GROUP 3: Admin Blanket Supervision ---');
  assert(
    'Admin can read study material across any batch',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchB}/notes.pdf`, 'read', adminCtx),
    true
  );

  assert(
    'Admin can write/moderate study material across any batch',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchB}/notes.pdf`, 'write', adminCtx),
    true
  );

  console.log('\n--- TEST GROUP 4: Unauthenticated & Anonymous Protection ---');
  assert(
    'Unauthenticated user CANNOT read study materials',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/notes.pdf`, 'read', unauthCtx),
    false
  );

  assert(
    'Unauthenticated user CANNOT write study materials',
    StorageRuleEvaluator.evaluate(`/studyMaterials/${batchA}/notes.pdf`, 'write', unauthCtx),
    false
  );

  console.log('\n--- TEST GROUP 5: Legacy & Homework Paths Parity ---');
  assert(
    'Teacher can write homework to assigned Batch A',
    StorageRuleEvaluator.evaluate(`/homework/${batchA}/dpp-01.pdf`, 'write', teacherCtx),
    true
  );

  assert(
    'Student A can read homework in Batch A',
    StorageRuleEvaluator.evaluate(`/homework/${batchA}/dpp-01.pdf`, 'read', studentACtx),
    true
  );

  assert(
    'Student B CANNOT read homework in Batch A',
    StorageRuleEvaluator.evaluate(`/homework/${batchA}/dpp-01.pdf`, 'read', studentBCtx),
    false
  );

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStorageRulesTests();
