import { validateAnnouncement } from '../src/lib/announcement-validator';
import { Announcement } from '../src/lib/types';

/**
 * Phase 9 Step 1 Automated Verification:
 * Announcement Schema & Validation Constraints
 */

async function runStep1Tests() {
  console.log('====================================================');
  console.log('    📢 PHASE 9 STEP 1: ANNOUNCEMENT SCHEMA TESTS    ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // TEST 1: Valid 'all' audience announcement
  console.log('[Test Group 1: Valid "all" Audience Announcement]');
  const validAll = validateAnnouncement({
    title: 'Institute Annual Day 2026',
    message: 'We are pleased to invite all students, parents, and faculty to our Annual Day celebration.',
    audienceType: 'all',
    channels: ['in-app', 'whatsapp'],
    senderId: 'admin-001',
    senderName: 'Apex Administration',
    status: 'sent',
    priority: 'urgent',
  });
  assert(validAll.valid === true, '"all" audience announcement passes validation');
  assert(validAll.sanitized?.audienceIds.length === 0, '"all" audience normalizes audienceIds to empty array');
  assert(validAll.sanitized?.channels.includes('in-app') && validAll.sanitized?.channels.includes('whatsapp'), 'Channels correctly preserved');
  assert(validAll.sanitized?.sentAt !== null, 'sentAt populated for status="sent"');

  // TEST 2: Valid 'batch' audience announcement
  console.log('\n[Test Group 2: Valid "batch" Audience Announcement]');
  const validBatch = validateAnnouncement({
    title: 'Physics Extra Problem Solving Class',
    message: 'Special numerical problem solving session scheduled for JEE Advanced batch this Saturday at 10 AM.',
    audienceType: 'batch',
    audienceIds: ['batch-jee-2026', 'batch-neet-2026'],
    channels: ['in-app', 'whatsapp', 'email'],
    senderId: 'tea-phy-01',
    senderName: 'Dr. H.C. Verma (Physics Lead)',
    status: 'draft',
    templateId: 'tpl-batch-notice',
  });
  assert(validBatch.valid === true, '"batch" audience announcement passes validation');
  assert(validBatch.sanitized?.audienceIds.length === 2, 'Batch IDs correctly preserved');
  assert(validBatch.sanitized?.templateId === 'tpl-batch-notice', 'templateId preserved');
  assert(validBatch.sanitized?.status === 'draft', 'status="draft" preserved');
  assert(validBatch.sanitized?.sentAt === null, 'sentAt is null for draft status');

  // TEST 3: Valid 'individual' audience announcement
  console.log('\n[Test Group 3: Valid "individual" Audience Announcement]');
  const validIndividual = validateAnnouncement({
    title: 'Fee Installment Reminder Notice',
    message: 'Dear Parent, this is a reminder regarding the upcoming term fee installment due on 20th September.',
    audienceType: 'individual',
    audienceIds: ['stu-2026-001'],
    channels: ['whatsapp', 'in-app'],
    senderId: 'admin-001',
    status: 'sent',
  });
  assert(validIndividual.valid === true, '"individual" audience announcement passes validation');
  assert(validIndividual.sanitized?.audienceIds[0] === 'stu-2026-001', 'Individual member ID preserved');

  // TEST 4: Invalid 'batch' announcement without audienceIds
  console.log('\n[Test Group 4: Validation Rule - Missing audienceIds on "batch"]');
  const invalidBatch = validateAnnouncement({
    title: 'Test Title',
    message: 'Test Message Body Long Enough',
    audienceType: 'batch',
    audienceIds: [], // Empty!
    channels: ['in-app'],
    senderId: 'admin-001',
  });
  assert(invalidBatch.valid === false, 'Batch without audienceIds is rejected');
  assert(invalidBatch.errors.some((e) => e.includes('Batch ID must be selected')), 'Appropriate error message returned');

  // TEST 5: Invalid 'individual' announcement without audienceIds
  console.log('\n[Test Group 5: Validation Rule - Missing audienceIds on "individual"]');
  const invalidIndividual = validateAnnouncement({
    title: 'Individual Notice',
    message: 'Test Message Body Long Enough',
    audienceType: 'individual',
    audienceIds: [],
    channels: ['in-app'],
    senderId: 'admin-001',
  });
  assert(invalidIndividual.valid === false, 'Individual without audienceIds is rejected');

  // TEST 6: Invalid missing title or short message
  console.log('\n[Test Group 6: Validation Rule - Missing / Short Title and Message]');
  const invalidContent = validateAnnouncement({
    title: 'Hi', // Too short
    message: 'No', // Too short
    audienceType: 'all',
    channels: ['in-app'],
    senderId: 'admin-001',
  });
  assert(invalidContent.valid === false, 'Short title & message rejected');
  assert(invalidContent.errors.length >= 2, 'Multiple validation errors reported');

  // TEST 7: Invalid empty channels
  console.log('\n[Test Group 7: Validation Rule - Missing Delivery Channels]');
  const invalidChannels = validateAnnouncement({
    title: 'Valid Announcement Title',
    message: 'Valid announcement message body long enough.',
    audienceType: 'all',
    channels: [], // Empty!
    senderId: 'admin-001',
  });
  assert(invalidChannels.valid === false, 'Empty channels array is rejected');
  assert(invalidChannels.errors.some((e) => e.includes('delivery channel')), 'Delivery channel error reported');

  // TEST 8: Snake_case aliases compatibility
  console.log('\n[Test Group 8: Snake_case Aliases Compatibility]');
  const validSnake = validateAnnouncement({
    title: 'Snake Case Compatible Notice',
    message: 'Testing snake_case compatibility across backend systems.',
    audience_type: 'batch',
    audience_ids: ['batch-01'],
    sender_id: 'admin-99',
    channels: ['in-app'],
  } as any);
  assert(validSnake.valid === true, 'Snake_case attributes successfully recognized');
  assert(validSnake.sanitized?.audienceType === 'batch', 'audience_type normalized to audienceType');
  assert(validSnake.sanitized?.audience_ids?.[0] === 'batch-01', 'audience_ids alias preserved');

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED (100%)`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep1Tests();
