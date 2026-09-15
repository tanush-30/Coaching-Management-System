/**
 * Automated Verification Test Suite for Phase 5 Step 2: Reusable File Upload Component & Helpers
 */

import {
  validateFile,
  sanitizeStorageFileName,
  DEFAULT_ACCEPTED_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE_MB,
} from '../src/lib/storage-upload';

// Mock File polyfill for Node.js test runner
class MockFile {
  name: string;
  size: number;
  type: string;

  constructor(name: string, size: number, type: string = 'application/pdf') {
    this.name = name;
    this.size = size;
    this.type = type;
  }
}

async function runUploadComponentTests() {
  console.log('======================================================================');
  console.log('🧪 PHASE 5 STEP 2: REUSABLE UPLOAD COMPONENT VALIDATION TEST SUITE');
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

  console.log('--- TEST GROUP 1: File Validation Rules ---');
  // 1. Valid PDF file (10MB)
  const validPdf = new MockFile('Physics_Chapter_04_Notes.pdf', 10 * 1024 * 1024, 'application/pdf') as unknown as File;
  const res1 = validateFile(validPdf);
  assert('Valid 10MB PDF is accepted', res1.valid === true);

  // 2. Oversized file (60MB > 50MB default limit)
  const oversizedPdf = new MockFile('Huge_Syllabus.pdf', 60 * 1024 * 1024, 'application/pdf') as unknown as File;
  const res2 = validateFile(oversizedPdf);
  assert(
    'Oversized file (60MB) is rejected with limit notice',
    res2.valid === false && (res2.error?.includes('exceeds the maximum limit') ?? false)
  );

  // 3. Custom max size override (5MB limit on 8MB file)
  const customSizeFile = new MockFile('Slide_Deck.pptx', 8 * 1024 * 1024, 'application/vnd.ms-powerpoint') as unknown as File;
  const res3 = validateFile(customSizeFile, { maxFileSizeMB: 5 });
  assert(
    'Custom size override (5MB) correctly rejects 8MB file',
    res3.valid === false && (res3.error?.includes('5 MB') ?? false)
  );

  // 4. Invalid extension (.exe file)
  const invalidExe = new MockFile('installer.exe', 2 * 1024 * 1024, 'application/x-msdownload') as unknown as File;
  const res4 = validateFile(invalidExe);
  assert(
    'Unauthorized executable file (.exe) is rejected',
    res4.valid === false && (res4.error?.includes('Unsupported file type') ?? false)
  );

  // 5. Custom allowed extensions (only .jpg, .png)
  const docFile = new MockFile('Assignment.docx', 1 * 1024 * 1024, 'application/msword') as unknown as File;
  const res5 = validateFile(docFile, { acceptedFileTypes: ['.jpg', '.png'] });
  assert(
    'Custom extension filter correctly rejects .docx when only images are allowed',
    res5.valid === false && (res5.error?.includes('Allowed types: .jpg, .png') ?? false)
  );

  console.log('\n--- TEST GROUP 2: File Name Sanitization & Collision Prevention ---');
  // 6. Name sanitization
  const dirtyName = 'Lecture & Notes (Special #1) [v2.0]!!.PDF';
  const cleanName = sanitizeStorageFileName(dirtyName);
  assert(
    'Sanitizes special characters to clean underscores',
    !cleanName.includes('&') && !cleanName.includes('(') && !cleanName.includes('#') && !cleanName.includes(' ')
  );
  assert('Preserves lowercase extension', cleanName.endsWith('.pdf'));
  assert('Appends unique timestamp to prevent accidental overwrites', /\d{13}\.pdf$/.test(cleanName));

  console.log('\n--- TEST GROUP 3: Decoupled Reusability Verification ---');
  // 7. Generic path generator check for Phase 5 (Study Materials)
  const batchId = 'batch-super-30';
  const studyMaterialsPath = `studyMaterials/${batchId}/`;
  const resolvedStudyPath = `${studyMaterialsPath}${sanitizeStorageFileName(validPdf.name)}`;
  assert(
    'Generates correct studyMaterials storage path without hardcoding',
    resolvedStudyPath.startsWith(`studyMaterials/${batchId}/Physics_Chapter_04_Notes_`)
  );

  // 8. Generic path generator check for Phase 6 (Homework Tracker)
  const assignmentId = 'hw-001';
  const homeworkPath = `homework/${batchId}/${assignmentId}/`;
  const resolvedHomeworkPath = `${homeworkPath}${sanitizeStorageFileName(validPdf.name)}`;
  assert(
    'Generates correct homework storage path for Phase 6 reuse',
    resolvedHomeworkPath.startsWith(`homework/${batchId}/${assignmentId}/Physics_Chapter_04_Notes_`)
  );

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUploadComponentTests();
