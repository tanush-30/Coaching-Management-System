/**
 * Automated Verification Test Suite for Phase 5 Step 3: Study Materials Metadata Records
 */

import {
  deriveMaterialType,
  createStudyMaterialRecord,
  type CreateStudyMaterialInput,
} from '../src/lib/study-materials-service';
import type { StudyMaterial } from '../src/lib/types';

async function runMetadataRecordsTests() {
  console.log('======================================================================');
  console.log('🧪 PHASE 5 STEP 3: STUDY MATERIALS METADATA RECORDS TEST SUITE');
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

  console.log('--- TEST GROUP 1: Material Type Derivation ---');
  assert('Derives "pdf" for .pdf files', deriveMaterialType('Electromagnetism_Handout.pdf') === 'pdf');
  assert('Derives "video" for .mp4 files', deriveMaterialType('Mechanics_Lecture_01.mp4') === 'video');
  assert('Derives "document" for .docx files', deriveMaterialType('Calculus_Assignment.docx') === 'document');
  assert('Derives "notes" for .txt and .md files', deriveMaterialType('Summary_Sheet.txt') === 'notes');
  assert('Derives "other" for archives and unknowns', deriveMaterialType('Sample_Tests.zip') === 'other');

  console.log('\n--- TEST GROUP 2: Record Creation & Schema Validation ---');
  const validPayload: CreateStudyMaterialInput = {
    title: 'Rotational Dynamics Formula Sheet & Summary',
    batchId: 'batch-jee-super30',
    batchName: 'JEE Super 30',
    subject: 'Physics',
    fileName: 'Rotational_Dynamics_Formula_Sheet.pdf',
    fileSize: '3.2 MB',
    downloadUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/studyMaterials%2Fbatch-jee-super30%2Fnotes.pdf',
    storagePath: 'studyMaterials/batch-jee-super30/Rotational_Dynamics_Formula_Sheet.pdf',
    uploaderId: 'FAC-2026-001',
    uploaderName: 'Rajesh Sharma',
    description: 'Comprehensive formula sheet for JEE Advanced physics mechanics.',
  };

  const record: StudyMaterial = await createStudyMaterialRecord(validPayload);

  assert('Record generates unique ID prefixed with "mat-"', record.id.startsWith('mat-'));
  assert('Record retains accurate title', record.title === validPayload.title);
  assert('Record retains correct batchId and batchName', record.batchId === validPayload.batchId && record.batchName === validPayload.batchName);
  assert('Record retains subject tag', record.subject === 'Physics');
  assert('Record automatically classifies type as "pdf"', record.type === 'pdf');
  assert('Record includes ISO timestamp', !isNaN(Date.parse(record.uploadedAt)));
  assert('Record retains teacher uploader metadata', record.uploaderId === 'FAC-2026-001' && record.uploaderName === 'Rajesh Sharma');
  assert('Record retains storagePath and downloadUrl', record.storagePath === validPayload.storagePath && record.downloadUrl === validPayload.downloadUrl);

  console.log('\n--- TEST GROUP 3: Guard Rails & Input Validation ---');
  let missingTitleFailed = false;
  try {
    await createStudyMaterialRecord({ ...validPayload, title: '' });
  } catch {
    missingTitleFailed = true;
  }
  assert('Rejects record creation when title is empty', missingTitleFailed);

  let missingBatchFailed = false;
  try {
    await createStudyMaterialRecord({ ...validPayload, batchId: '' });
  } catch {
    missingBatchFailed = true;
  }
  assert('Rejects record creation when batchId is empty', missingBatchFailed);

  let missingUrlFailed = false;
  try {
    await createStudyMaterialRecord({ ...validPayload, downloadUrl: '' });
  } catch {
    missingUrlFailed = true;
  }
  assert('Rejects record creation when downloadUrl is empty', missingUrlFailed);

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMetadataRecordsTests();
