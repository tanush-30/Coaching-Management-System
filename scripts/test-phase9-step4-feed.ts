/**
 * Automated Test Suite: Phase 9 Step 4 - Recipient Feed & Isolation
 * 
 * Verifies:
 * 1. Student Feed Isolation (Batch A student never sees Batch B notices).
 * 2. Student Individual Notice Isolation (Direct notices strictly private).
 * 3. Parent Feed Isolation (Parent only sees notices matching their linked wards).
 * 4. Faculty Feed Isolation (Faculty only sees assigned batches and faculty direct notices).
 * 5. Draft Exclusion (Drafts strictly invisible across student, parent, and faculty feeds).
 * 6. Priority & Chronological Sorting (Pinned items ranked at top, then newest sent date).
 */

import {
  filterAnnouncementsForStudent,
  filterAnnouncementsForParent,
  filterAnnouncementsForTeacher,
  sortAnnouncementsByPriorityAndDate,
} from '../src/lib/announcement-feed-service';
import { Announcement, Student, Teacher } from '../src/lib/types';

function runStep4TestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 9 Step 4: Recipient Feed Tests');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     Reason: ${detail}`);
    }
  }

  // Mock Students
  const studentAarav: Student = {
    id: 'stu-aarav',
    name: 'Aarav Patel',
    rollNo: 'AP-101',
    batchId: 'batch-jee',
    batchIds: ['batch-jee'],
    parentName: 'Suresh Patel',
    parentPhone: '9876543211',
    parentEmail: 'suresh@example.com',
    phone: '9876543210',
    email: 'aarav@example.com',
    avatar: '',
    gender: 'Male',
    dob: '2006-01-01',
    address: 'Mumbai',
    schoolName: 'Apex High',
    parentRelation: 'Father',
    enrollmentDate: '2024-01-01',
    status: 'active',
    totalFee: 50000,
    paidFee: 25000,
    pendingFee: 25000,
  };

  const studentDiya: Student = {
    id: 'stu-diya',
    name: 'Diya Sharma',
    rollNo: 'DS-102',
    batchId: 'batch-neet',
    batchIds: ['batch-neet'],
    parentName: 'Ramesh Sharma',
    parentPhone: '9876543221',
    parentEmail: 'ramesh@example.com',
    phone: '9876543220',
    email: 'diya@example.com',
    avatar: '',
    gender: 'Female',
    dob: '2006-02-02',
    address: 'Pune',
    schoolName: 'Apex High',
    parentRelation: 'Father',
    enrollmentDate: '2024-01-01',
    status: 'active',
    totalFee: 60000,
    paidFee: 30000,
    pendingFee: 30000,
  };

  // Mock Teachers
  const teacherVikram: Teacher = {
    id: 'tch-vikram',
    facultyId: 'FAC-PHY-01',
    name: 'Dr. Vikram Seth',
    email: 'vikram@example.com',
    phone: '9876500001',
    avatar: '',
    subjects: ['Physics'],
    qualifications: 'Ph.D. Physics',
    joiningDate: '2023-01-01',
    status: 'active',
    assignedBatches: ['batch-jee'],
  };

  const teacherAnanya: Teacher = {
    id: 'tch-ananya',
    facultyId: 'FAC-CHEM-02',
    name: 'Prof. Ananya Roy',
    email: 'ananya@example.com',
    phone: '9876500002',
    avatar: '',
    subjects: ['Chemistry'],
    qualifications: 'M.Sc. Chemistry',
    joiningDate: '2023-01-01',
    status: 'active',
    assignedBatches: ['batch-neet'],
  };

  // Mock Comprehensive Announcements Dataset
  const announcementsList: Announcement[] = [
    {
      id: 'ann-all-1',
      title: 'Academy Annual Sports Day Notice',
      message: 'Sports Day will be held next Saturday.',
      audienceType: 'all',
      audienceIds: [],
      channels: ['in-app'],
      senderId: 'admin-001',
      senderName: 'Apex Administration',
      status: 'sent',
      priority: 'normal',
      createdAt: '2026-09-01T10:00:00.000Z',
      sentAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'ann-all-pinned',
      title: 'CRITICAL: Institute Code of Conduct & Safety Policy',
      message: 'Please review the updated institute handbook.',
      audienceType: 'all',
      audienceIds: [],
      channels: ['in-app'],
      senderId: 'admin-001',
      senderName: 'Apex Administration',
      status: 'sent',
      priority: 'pinned',
      createdAt: '2026-08-15T10:00:00.000Z',
      sentAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'ann-batch-jee',
      title: 'JEE Advanced Extra Problem Solving Session',
      message: 'Special session for Batch JEE on Sunday at 9:00 AM.',
      audienceType: 'batch',
      audienceIds: ['batch-jee'],
      channels: ['in-app', 'whatsapp'],
      senderId: 'admin-001',
      senderName: 'Director',
      status: 'sent',
      priority: 'urgent',
      batchNames: ['JEE Advanced Elite'],
      createdAt: '2026-09-10T12:00:00.000Z',
      sentAt: '2026-09-10T12:00:00.000Z',
    },
    {
      id: 'ann-batch-neet',
      title: 'NEET Organic Chemistry Lab Schedule',
      message: 'Bring practical manuals for the Friday lab session.',
      audienceType: 'batch',
      audienceIds: ['batch-neet'],
      channels: ['in-app'],
      senderId: 'admin-001',
      senderName: 'Director',
      status: 'sent',
      priority: 'normal',
      batchNames: ['NEET Medical Achievers'],
      createdAt: '2026-09-11T14:00:00.000Z',
      sentAt: '2026-09-11T14:00:00.000Z',
    },
    {
      id: 'ann-individual-aarav',
      title: 'Fee Installment 2 Receipt & Scholar Certificate',
      message: 'Aarav, your scholarship certificate is ready at the front desk.',
      audienceType: 'individual',
      audienceIds: ['stu-aarav'],
      channels: ['in-app'],
      senderId: 'admin-001',
      senderName: 'Accounts Office',
      status: 'sent',
      priority: 'normal',
      createdAt: '2026-09-12T09:00:00.000Z',
      sentAt: '2026-09-12T09:00:00.000Z',
    },
    {
      id: 'ann-individual-vikram',
      title: 'Faculty Curriculum Meeting Request',
      message: 'Dr. Vikram, please join the physics syllabus review at 4 PM.',
      audienceType: 'individual',
      audienceIds: ['tch-vikram'],
      channels: ['in-app'],
      senderId: 'admin-001',
      senderName: 'Principal',
      status: 'sent',
      priority: 'urgent',
      createdAt: '2026-09-13T11:00:00.000Z',
      sentAt: '2026-09-13T11:00:00.000Z',
    },
    {
      id: 'ann-draft-jee',
      title: 'Unpublished Draft Notice for JEE',
      message: 'Draft content that should NEVER appear in feeds.',
      audienceType: 'batch',
      audienceIds: ['batch-jee'],
      channels: ['in-app'],
      senderId: 'admin-001',
      senderName: 'Admin',
      status: 'draft',
      priority: 'urgent',
      createdAt: '2026-09-14T08:00:00.000Z',
      sentAt: null,
    },
  ];

  // =========================================================================
  // TEST GROUP 1: Student Feed Filtering & Isolation
  // =========================================================================
  console.log('--- Test Group 1: Student Feed Filtering & Isolation ---');
  const aaravFeed = filterAnnouncementsForStudent(announcementsList, studentAarav);
  const diyaFeed = filterAnnouncementsForStudent(announcementsList, studentDiya);

  // Aarav: should see ann-all-pinned, ann-all-1, ann-batch-jee, ann-individual-aarav
  assert(aaravFeed.length === 4, 'Aarav feed receives exactly 4 targeted announcements (Total: 4)');
  assert(aaravFeed.some((a) => a.id === 'ann-batch-jee'), 'Aarav sees his batch announcement (JEE)');
  assert(aaravFeed.some((a) => a.id === 'ann-individual-aarav'), 'Aarav sees his individual certificate notice');
  assert(!aaravFeed.some((a) => a.id === 'ann-batch-neet'), 'CROSS-LEAKAGE BLOCKED: Aarav strictly does NOT see NEET batch announcement');
  assert(!aaravFeed.some((a) => a.id === 'ann-draft-jee'), 'DRAFT BLOCKED: Aarav strictly does NOT see unpublished draft');
  assert(!aaravFeed.some((a) => a.id === 'ann-individual-vikram'), 'PRIVATE LEAKAGE BLOCKED: Aarav does not see faculty personal notice');

  // Diya: should see ann-all-pinned, ann-all-1, ann-batch-neet
  assert(diyaFeed.length === 3, 'Diya feed receives exactly 3 targeted announcements');
  assert(diyaFeed.some((a) => a.id === 'ann-batch-neet'), 'Diya sees her NEET batch notice');
  assert(!diyaFeed.some((a) => a.id === 'ann-batch-jee'), 'CROSS-LEAKAGE BLOCKED: Diya does NOT see JEE batch announcement');
  assert(!diyaFeed.some((a) => a.id === 'ann-individual-aarav'), 'PRIVATE LEAKAGE BLOCKED: Diya does NOT see Aarav individual notice');

  // =========================================================================
  // TEST GROUP 2: Parent Feed Filtering
  // =========================================================================
  console.log('\n--- Test Group 2: Parent Feed Filtering ---');
  const sureshParentFeed = filterAnnouncementsForParent(announcementsList, [studentAarav]);
  const rameshParentFeed = filterAnnouncementsForParent(announcementsList, [studentDiya]);

  assert(sureshParentFeed.length === 4, 'Suresh (Aarav parent) receives 4 announcements relevant to Aarav');
  assert(sureshParentFeed.some((a) => a.id === 'ann-batch-jee'), 'Suresh sees JEE batch notice for Aarav');
  assert(sureshParentFeed.some((a) => a.id === 'ann-individual-aarav'), 'Suresh sees Aarav individual scholar notice');
  assert(!sureshParentFeed.some((a) => a.id === 'ann-batch-neet'), 'Suresh strictly does NOT see NEET notices');
  assert(!sureshParentFeed.some((a) => a.id === 'ann-draft-jee'), 'Suresh strictly does NOT see draft announcements');

  assert(rameshParentFeed.length === 3, 'Ramesh (Diya parent) receives 3 announcements relevant to Diya');
  assert(rameshParentFeed.some((a) => a.id === 'ann-batch-neet'), 'Ramesh sees NEET notice');
  assert(!rameshParentFeed.some((a) => a.id === 'ann-batch-jee'), 'Ramesh strictly does NOT see JEE notices');

  // =========================================================================
  // TEST GROUP 3: Faculty Feed Filtering
  // =========================================================================
  console.log('\n--- Test Group 3: Faculty Feed Filtering ---');
  const vikramFeed = filterAnnouncementsForTeacher(announcementsList, teacherVikram);
  const ananyaFeed = filterAnnouncementsForTeacher(announcementsList, teacherAnanya);

  assert(vikramFeed.length === 4, 'Dr. Vikram receives 4 announcements (All, All-Pinned, JEE, and Direct Faculty Notice)');
  assert(vikramFeed.some((a) => a.id === 'ann-individual-vikram'), 'Dr. Vikram sees his direct faculty notice');
  assert(vikramFeed.some((a) => a.id === 'ann-batch-jee'), 'Dr. Vikram sees notice for his assigned batch (JEE)');
  assert(!vikramFeed.some((a) => a.id === 'ann-batch-neet'), 'Dr. Vikram strictly does NOT see unassigned batch (NEET) notice');
  assert(!vikramFeed.some((a) => a.id === 'ann-individual-aarav'), 'Dr. Vikram does NOT see Aarav individual student notice');

  assert(ananyaFeed.length === 3, 'Prof. Ananya receives 3 announcements (All, All-Pinned, and NEET batch)');
  assert(ananyaFeed.some((a) => a.id === 'ann-batch-neet'), 'Prof. Ananya sees NEET batch notice');
  assert(!ananyaFeed.some((a) => a.id === 'ann-batch-jee'), 'Prof. Ananya does NOT see JEE batch notice');

  // =========================================================================
  // TEST GROUP 4: Sorting & Priority Ranking
  // =========================================================================
  console.log('\n--- Test Group 4: Priority & Chronological Sorting ---');
  // Pinned items must come first even if sent earlier
  assert(aaravFeed[0].id === 'ann-all-pinned', 'Top ranked announcement is Pinned (Code of Conduct)');
  assert(aaravFeed[0].priority === 'pinned', 'First announcement priority is verified as "pinned"');
  // Second item should be newest sent date among non-pinned (ann-individual-aarav sent Sept 12 > ann-batch-jee Sept 10 > ann-all-1 Sept 1)
  assert(aaravFeed[1].id === 'ann-individual-aarav', 'Second item is the newest sent date (Sept 12 certificate notice)');
  assert(aaravFeed[2].id === 'ann-batch-jee', 'Third item is Sept 10 JEE notice');
  assert(aaravFeed[3].id === 'ann-all-1', 'Fourth item is Sept 1 general notice');

  // SUMMARY
  console.log('\n====================================================');
  console.log(`📊 Result: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 Phase 9 Step 4 Recipient Feed & Isolation test suite PASSED completely!\n');
    process.exit(0);
  } else {
    console.error('💥 Test suite failed some assertions!\n');
    process.exit(1);
  }
}

runStep4TestSuite();
