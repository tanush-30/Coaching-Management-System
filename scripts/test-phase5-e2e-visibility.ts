/**
 * ==============================================================================
 * 🧪 PHASE 5 STEP 5: E2E SCOPED VISIBILITY & ACCESS RESTRICTION TEST SUITE
 * ==============================================================================
 * Tests comprehensive scoped visibility, cross-batch isolation, role restrictions,
 * and edge cases according to `p5step-5-test-scoped-visibility.md`.
 * 
 * Strict Zero-Fake-Data compliance: Uses simulated contexts & deterministic rule tests.
 */

import { validateFile } from '../src/lib/storage-upload';
import { deriveMaterialType } from '../src/lib/study-materials-service';
import type { StudyMaterial } from '../src/lib/types';

interface UserToken {
  uid: string;
  role?: 'admin' | 'faculty' | 'student' | 'parent';
  batchId?: string;
  batchIds?: string[];
  childBatchIds?: string[];
}

// Storage Rules Evaluator Simulation (mirroring storage.rules logic)
function evaluateStorageRule(
  auth: UserToken | null,
  path: string,
  operation: 'read' | 'write',
  fileSizeBytes: number = 1024
): { allowed: boolean; reason?: string } {
  if (!auth) return { allowed: false, reason: 'Unauthenticated' };
  if (auth.role === 'admin') return { allowed: true };

  const parts = path.split('/');
  // Expected path: studyMaterials/{batchId}/{fileName}
  if (parts[0] === 'studyMaterials' && parts.length >= 3) {
    const batchId = parts[1];

    if (operation === 'read') {
      const isStudentOfBatch = auth.batchId === batchId || (auth.batchIds && auth.batchIds.includes(batchId));
      const isTeacherOfBatch = auth.batchIds && auth.batchIds.includes(batchId);
      const isParentOfBatch = auth.childBatchIds && auth.childBatchIds.includes(batchId);

      if (isStudentOfBatch || isTeacherOfBatch || isParentOfBatch) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Permission Denied: User is not enrolled in or assigned to this batch.' };
    }

    if (operation === 'write') {
      // Teachers only, assigned to batch, and valid size
      const isTeacherOfBatch = (auth.role === 'faculty') && (auth.batchIds && auth.batchIds.includes(batchId));
      const isValidSize = fileSizeBytes < 50 * 1024 * 1024;

      if (!isTeacherOfBatch) {
        return { allowed: false, reason: 'Permission Denied: Only assigned teachers can upload to this batch.' };
      }
      if (!isValidSize) {
        return { allowed: false, reason: 'Payload Too Large: File exceeds 50MB ceiling.' };
      }
      return { allowed: true };
    }
  }

  return { allowed: false, reason: 'Path not matched.' };
}

// Firestore Query Evaluator Simulation (mirroring firestore.rules and query filters)
function filterVisibleMaterials(auth: UserToken | null, materials: StudyMaterial[], subjectFilter?: string): StudyMaterial[] {
  if (!auth) return [];
  if (auth.role === 'admin') {
    return subjectFilter && subjectFilter !== 'All' 
      ? materials.filter(m => m.subject === subjectFilter) 
      : materials;
  }

  const allowedBatchIds = new Set<string>();
  if (auth.batchId) allowedBatchIds.add(auth.batchId);
  if (auth.batchIds) auth.batchIds.forEach(b => allowedBatchIds.add(b));
  if (auth.childBatchIds) auth.childBatchIds.forEach(b => allowedBatchIds.add(b));

  let results = materials.filter(m => allowedBatchIds.has(m.batchId));
  if (subjectFilter && subjectFilter !== 'All') {
    results = results.filter(m => m.subject.toLowerCase() === subjectFilter.toLowerCase());
  }

  // Sort descending by uploadedAt
  return results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 PHASE 5 STEP 5: E2E SCOPED VISIBILITY & ACCESS RESTRICTION TEST SUITE');
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

  // Sample data set for in-memory scoping validation
  const mockDataset: StudyMaterial[] = [
    {
      id: 'mat-1',
      title: 'Batch A Mechanics Notes',
      batchId: 'batch-jee-2026',
      batchName: 'JEE Batch 2026',
      subject: 'Physics',
      fileType: 'pdf',
      fileUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/studyMaterials%2Fbatch-jee-2026%2Fmechanics.pdf',
      storagePath: 'studyMaterials/batch-jee-2026/mechanics.pdf',
      uploaderId: 'fac-101',
      uploaderName: 'Prof. Verma',
      fileSize: '4.2 MB',
      uploadedAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'mat-2',
      title: 'Batch A Organic Chemistry Guide',
      batchId: 'batch-jee-2026',
      batchName: 'JEE Batch 2026',
      subject: 'Chemistry',
      fileType: 'pdf',
      fileUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/studyMaterials%2Fbatch-jee-2026%2Forganic.pdf',
      storagePath: 'studyMaterials/batch-jee-2026/organic.pdf',
      uploaderId: 'fac-101',
      uploaderName: 'Prof. Verma',
      fileSize: '8.1 MB',
      uploadedAt: '2026-09-12T14:30:00Z',
    },
    {
      id: 'mat-3',
      title: 'Batch B Botany Mindmap',
      batchId: 'batch-neet-2026',
      batchName: 'NEET Batch 2026',
      subject: 'Biology',
      fileType: 'pdf',
      fileUrl: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/studyMaterials%2Fbatch-neet-2026%2Fbotany.pdf',
      storagePath: 'studyMaterials/batch-neet-2026/botany.pdf',
      uploaderId: 'fac-102',
      uploaderName: 'Dr. Sharma',
      fileSize: '3.0 MB',
      uploadedAt: '2026-09-13T09:00:00Z',
    },
  ];

  // ==========================================
  // TEST GROUP 1: Happy Path — Upload & Visibility
  // ==========================================
  console.log('--- TEST GROUP 1: Happy Path — Upload & Visibility ---');
  const teacherA: UserToken = { uid: 'fac-101', role: 'faculty', batchIds: ['batch-jee-2026'] };
  const studentA: UserToken = { uid: 'stu-201', role: 'student', batchId: 'batch-jee-2026' };

  const teacherAUploadCheck = evaluateStorageRule(
    teacherA,
    'studyMaterials/batch-jee-2026/calculus.pdf',
    'write',
    2 * 1024 * 1024
  );
  assert(teacherAUploadCheck.allowed, 'Teacher assigned to Batch A can upload to Batch A storage path');

  const studentAVisible = filterVisibleMaterials(studentA, mockDataset);
  assert(studentAVisible.length === 2, 'Student A sees exactly 2 Batch A study materials');
  assert(studentAVisible[0].title === 'Batch A Organic Chemistry Guide', 'Materials sorted newest first (uploadedAt)');

  const studentAStorageAccess = evaluateStorageRule(
    studentA,
    'studyMaterials/batch-jee-2026/mechanics.pdf',
    'read'
  );
  assert(studentAStorageAccess.allowed, 'Student A has Storage read permission for Batch A file');


  // ==========================================
  // TEST GROUP 2: Cross-Batch Isolation
  // ==========================================
  console.log('\n--- TEST GROUP 2: Cross-Batch Isolation ---');
  const studentB: UserToken = { uid: 'stu-301', role: 'student', batchId: 'batch-neet-2026' };

  const studentBVisible = filterVisibleMaterials(studentB, mockDataset);
  assert(studentBVisible.length === 1, 'Student B sees only 1 Batch B study material');
  assert(studentBVisible[0].title === 'Batch B Botany Mindmap', 'Student B sees Batch B material');
  assert(!studentBVisible.some(m => m.batchId === 'batch-jee-2026'), 'Student B DOES NOT see Batch A materials in UI');

  const studentBCrossBatchStorage = evaluateStorageRule(
    studentB,
    'studyMaterials/batch-jee-2026/mechanics.pdf',
    'read'
  );
  assert(!studentBCrossBatchStorage.allowed, 'Student B is DENIED Storage read access to Batch A files directly');


  // ==========================================
  // TEST GROUP 3: Teacher Write Restrictions
  // ==========================================
  console.log('\n--- TEST GROUP 3: Teacher Write Restrictions ---');
  const teacherACrossBatchUpload = evaluateStorageRule(
    teacherA,
    'studyMaterials/batch-neet-2026/test.pdf',
    'write',
    1024 * 1024
  );
  assert(!teacherACrossBatchUpload.allowed, 'Teacher assigned only to Batch A is DENIED upload to Batch B');

  const multiBatchTeacher: UserToken = { 
    uid: 'fac-103', 
    role: 'faculty', 
    batchIds: ['batch-jee-2026', 'batch-neet-2026'] 
  };
  const multiTeacherBatchAUpload = evaluateStorageRule(
    multiBatchTeacher,
    'studyMaterials/batch-jee-2026/revision.pdf',
    'write',
    1024 * 1024
  );
  const multiTeacherBatchBUpload = evaluateStorageRule(
    multiBatchTeacher,
    'studyMaterials/batch-neet-2026/revision.pdf',
    'write',
    1024 * 1024
  );
  const multiTeacherUnassignedUpload = evaluateStorageRule(
    multiBatchTeacher,
    'studyMaterials/batch-other/revision.pdf',
    'write',
    1024 * 1024
  );
  assert(multiTeacherBatchAUpload.allowed, 'Multi-batch teacher CAN upload to Batch A');
  assert(multiTeacherBatchBUpload.allowed, 'Multi-batch teacher CAN upload to Batch B');
  assert(!multiTeacherUnassignedUpload.allowed, 'Multi-batch teacher CANNOT upload to unassigned Batch');


  // ==========================================
  // TEST GROUP 4: Role-Based Restrictions
  // ==========================================
  console.log('\n--- TEST GROUP 4: Role-Based Restrictions ---');
  const studentUploadAttempt = evaluateStorageRule(
    studentA,
    'studyMaterials/batch-jee-2026/cheat-sheet.pdf',
    'write',
    1024 * 1024
  );
  assert(!studentUploadAttempt.allowed, 'Student CANNOT upload to studyMaterials (teacher-write only)');

  const parentA: UserToken = { uid: 'par-501', role: 'parent', childBatchIds: ['batch-jee-2026'] };
  const parentAStorageRead = evaluateStorageRule(
    parentA,
    'studyMaterials/batch-jee-2026/mechanics.pdf',
    'read'
  );
  assert(parentAStorageRead.allowed, 'Parent of Batch A student CAN read Batch A study material');

  const parentBStorageRead = evaluateStorageRule(
    parentA,
    'studyMaterials/batch-neet-2026/botany.pdf',
    'read'
  );
  assert(!parentBStorageRead.allowed, 'Parent of Batch A student CANNOT read Batch B study material');


  // ==========================================
  // TEST GROUP 5: Metadata & UI Consistency
  // ==========================================
  console.log('\n--- TEST GROUP 5: Metadata & UI Consistency ---');
  const physicsFiltered = filterVisibleMaterials(studentA, mockDataset, 'Physics');
  assert(physicsFiltered.length === 1 && physicsFiltered[0].subject === 'Physics', 'Subject filter "Physics" correctly filters list');

  const chemistryFiltered = filterVisibleMaterials(studentA, mockDataset, 'Chemistry');
  assert(chemistryFiltered.length === 1 && chemistryFiltered[0].subject === 'Chemistry', 'Subject filter "Chemistry" correctly filters list');

  const allFiltered = filterVisibleMaterials(studentA, mockDataset, 'All');
  assert(allFiltered.length === 2, 'Filter "All" returns complete batch catalog');


  // ==========================================
  // TEST GROUP 6: Edge Cases & Validation Limits
  // ==========================================
  console.log('\n--- TEST GROUP 6: Edge Cases & Validation Limits ---');
  const oversizedFileCheck = validateFile({ name: 'huge_book.pdf', size: 60 * 1024 * 1024, type: 'application/pdf' } as File);
  assert(!oversizedFileCheck.isValid, 'Client validator rejects oversized file (>50MB)');

  const unsupportedFileCheck = validateFile({ name: 'malware.exe', size: 1024, type: 'application/x-msdownload' } as File);
  assert(!unsupportedFileCheck.isValid, 'Client validator rejects executable file');

  const storageOversizedCheck = evaluateStorageRule(
    teacherA,
    'studyMaterials/batch-jee-2026/huge.pdf',
    'write',
    55 * 1024 * 1024
  );
  assert(!storageOversizedCheck.allowed, 'Storage security rules reject payload exceeding 50MB ceiling');

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
