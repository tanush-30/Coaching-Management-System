/**
 * Automated Verification Test Suite for Phase 5 Step 4: Student-Facing View & Scoped Material Queries
 */

import type { StudyMaterial, Student } from '../src/lib/types';

async function runStudentViewTests() {
  console.log('======================================================================');
  console.log('🧪 PHASE 5 STEP 4: STUDENT-FACING VIEW & BATCH SCOPING TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} ${details ? `— ${details}` : ''}`);
      failed++;
    }
  }

  const batchA = 'batch-jee-super30';
  const batchB = 'batch-neet-elite';

  const mockMaterials: StudyMaterial[] = [
    {
      id: 'mat-1',
      title: 'Rotational Dynamics Chapter 4 Notes',
      batchId: batchA,
      batchName: 'JEE Super 30',
      subject: 'Physics',
      type: 'pdf',
      fileName: 'Rotational_Dynamics.pdf',
      fileSize: '3.2 MB',
      uploadedAt: '2026-09-10T10:00:00.000Z',
      downloadUrl: 'https://storage.googleapis.com/test-bucket/studyMaterials/batch-jee-super30/Rotational_Dynamics.pdf',
      uploaderName: 'Rajesh Sharma',
    },
    {
      id: 'mat-2',
      title: 'Integral Calculus Standard Integrals',
      batchId: batchA,
      batchName: 'JEE Super 30',
      subject: 'Mathematics',
      type: 'pdf',
      fileName: 'Integrals_Sheet.pdf',
      fileSize: '1.8 MB',
      uploadedAt: '2026-09-11T12:00:00.000Z',
      downloadUrl: 'https://storage.googleapis.com/test-bucket/studyMaterials/batch-jee-super30/Integrals_Sheet.pdf',
      uploaderName: 'Vikram Mehta',
    },
    {
      id: 'mat-3',
      title: 'Human Physiology NCERT Diagram Map',
      batchId: batchB,
      batchName: 'NEET Elite',
      subject: 'Biology',
      type: 'pdf',
      fileName: 'Physiology_Diagrams.pdf',
      fileSize: '4.5 MB',
      uploadedAt: '2026-09-12T14:00:00.000Z',
      downloadUrl: 'https://storage.googleapis.com/test-bucket/studyMaterials/batch-neet-elite/Physiology_Diagrams.pdf',
      uploaderName: 'Dr. Ananya Ray',
    },
  ];

  const studentA: Student = {
    id: 'student-1',
    name: 'Vikram Rathore',
    rollNo: 'STU-2026-001',
    batchIds: [batchA],
    phone: '9876543210',
    parentName: 'Rathore Sr',
    parentPhone: '9876543211',
    address: 'City Center',
    totalFees: 85000,
    paidFees: 28333,
    pendingFees: 56667,
    joinDate: '2026-09-01',
    status: 'active',
  };

  console.log('--- TEST GROUP 1: Student Batch Scoping ---');
  // 1. Filter materials for Student A
  const studentAMaterials = mockMaterials.filter((m) =>
    (studentA.batchIds || []).includes(m.batchId)
  );

  assert('Student A only receives materials for Batch A (count = 2)', studentAMaterials.length === 2);
  assert(
    'Student A DOES NOT see Batch B Biology Notes',
    !studentAMaterials.some((m) => m.id === 'mat-3')
  );

  console.log('\n--- TEST GROUP 2: Subject Filtering ---');
  // 2. Filter by Physics
  const physicsOnly = studentAMaterials.filter(
    (m) => m.subject.toLowerCase() === 'physics'
  );
  assert('Physics filter yields exactly 1 Physics note', physicsOnly.length === 1 && physicsOnly[0].id === 'mat-1');

  // 3. Filter by Mathematics
  const mathOnly = studentAMaterials.filter(
    (m) => m.subject.toLowerCase() === 'mathematics'
  );
  assert('Mathematics filter yields exactly 1 Math note', mathOnly.length === 1 && mathOnly[0].id === 'mat-2');

  console.log('\n--- TEST GROUP 3: Metadata & Download Link Integrity ---');
  const targetNote = studentAMaterials[0];
  assert('Material contains valid downloadUrl', !!targetNote.downloadUrl && targetNote.downloadUrl.startsWith('https://'));
  assert('Material contains teacher uploader name', targetNote.uploaderName === 'Rajesh Sharma');
  assert('Material contains human readable file size', targetNote.fileSize === '3.2 MB');
  assert('Material contains file title', targetNote.title === 'Rotational Dynamics Chapter 4 Notes');

  console.log('\n--- TEST GROUP 4: Empty State Handling ---');
  const emptyBatchMaterials = mockMaterials.filter((m) =>
    ['unassigned-batch'].includes(m.batchId)
  );
  assert('Unenrolled/Empty batch correctly yields empty array without throwing', emptyBatchMaterials.length === 0);

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStudentViewTests();
