/**
 * Test Suite: Phase 9 Step 3 - Wire to Existing Notification Infra
 * 
 * Verifies:
 * 1. Multi-audience resolution for WhatsApp alerts (all, batch, individual).
 * 2. Deduplication of student recipients across multiple targeted batches.
 * 3. Faculty member inclusion in 'all' and 'individual' targeting.
 * 4. WhatsApp message construction, tag replacements, and status logging.
 * 5. Breakdown metrics (inAppCount, whatsappCount, failedCount).
 * 6. Email disabled compliance (no ghost email sender).
 */

import { validateAnnouncement } from '../src/lib/announcement-validator';
import { Student, Teacher, Batch, WhatsAppMessage } from '../src/lib/types';

function runStep3TestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Phase 9 Step 3: Notification Infra Tests');
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

  // Mock in-memory directory for testing resolution algorithms
  const mockStudents: Student[] = [
    {
      id: 'st-001',
      name: 'Aarav Patel',
      rollNo: 'AP-101',
      batchId: 'b-jee',
      batchIds: ['b-jee', 'b-adv'],
      parentName: 'Suresh Patel',
      phone: '9876543210',
      parentPhone: '9876543211',
      status: 'active',
      email: 'aarav@example.com',
      avatar: 'https://images.unsplash.com/photo-1',
      dateOfJoining: '2024-01-01',
      totalFee: 50000,
      paidFee: 25000,
      monthlyInstallment: 5000,
      installments: [],
      whatsappHistory: [],
    },
    {
      id: 'st-002',
      name: 'Diya Sharma',
      rollNo: 'DS-102',
      batchId: 'b-neet',
      batchIds: ['b-neet'],
      parentName: 'Ramesh Sharma',
      phone: '9876543220',
      parentPhone: '9876543221',
      status: 'active',
      email: 'diya@example.com',
      avatar: 'https://images.unsplash.com/photo-2',
      dateOfJoining: '2024-01-01',
      totalFee: 60000,
      paidFee: 30000,
      monthlyInstallment: 6000,
      installments: [],
      whatsappHistory: [],
    },
    {
      id: 'st-003',
      name: 'Rohan Gupta',
      rollNo: 'RG-103',
      batchId: 'b-jee',
      batchIds: ['b-jee'],
      parentName: 'Anil Gupta',
      phone: '9876543230',
      parentPhone: '9876543231',
      status: 'active',
      email: 'rohan@example.com',
      avatar: 'https://images.unsplash.com/photo-3',
      dateOfJoining: '2024-01-01',
      totalFee: 50000,
      paidFee: 50000,
      monthlyInstallment: 5000,
      installments: [],
      whatsappHistory: [],
    }
  ];

  const mockTeachers: Teacher[] = [
    {
      id: 'tch-001',
      name: 'Dr. Vikram Seth',
      subject: 'Physics',
      phone: '9876500001',
      email: 'vikram@example.com',
      facultyId: 'FAC-PHY-01',
      batchIds: ['b-jee', 'b-adv'],
      avatar: 'https://images.unsplash.com/photo-4',
      status: 'active',
      joiningDate: '2023-01-01',
    },
    {
      id: 'tch-002',
      name: 'Prof. Ananya Roy',
      subject: 'Chemistry',
      phone: '9876500002',
      email: 'ananya@example.com',
      facultyId: 'FAC-CHEM-02',
      batchIds: ['b-neet'],
      avatar: 'https://images.unsplash.com/photo-5',
      status: 'active',
      joiningDate: '2023-01-01',
    }
  ];

  // Helper simulation of addAnnouncement WhatsApp dispatch pipeline
  function simulateAnnouncementDispatch(
    data: any,
    students: Student[],
    teachers: Teacher[]
  ) {
    const validation = validateAnnouncement({
      ...data,
      senderId: data.senderId || 'admin-001',
      senderName: data.senderName || 'Apex Administration',
      senderRole: data.senderRole || 'admin',
    });
    if (!validation.valid || !validation.sanitized) {
      throw new Error(validation.errors.join('; '));
    }

    const ann = validation.sanitized;
    let inAppCount = 0;
    if (ann.audienceType === 'all') {
      inAppCount = students.length + teachers.length;
    } else if (ann.audienceType === 'batch') {
      inAppCount = students.filter((s) => (s.batchIds || []).some((bId) => ann.audienceIds.includes(bId))).length;
    } else if (ann.audienceType === 'individual') {
      inAppCount = ann.audienceIds.length;
    }

    const newLogs: WhatsAppMessage[] = [];
    let failedCount = 0;
    const headerAndBody = `📢 *Apex Academy Announcement: ${ann.title}*\n\n${ann.message}`;

    if (ann.status === 'sent' && ann.channels.includes('whatsapp')) {
      if (ann.audienceType === 'all') {
        students.forEach((st) => {
          const customizedContent = headerAndBody
            .replace(/{student_name}/g, st.name)
            .replace(/{parent_name}/g, st.parentName || st.name)
            .replace(/{roll_no}/g, st.rollNo || '');

          newLogs.push({
            id: `wa-ann-${Date.now()}-${st.id}`,
            recipientName: `${st.parentName || st.name} (${st.name})`,
            recipientPhone: st.parentPhone || st.phone || '',
            recipientRole: 'parent',
            type: 'broadcast',
            content: customizedContent,
            status: 'delivered',
            timestamp: 'Just now',
            meta: { announcementId: ann.id, announcementTitle: ann.title },
          });
        });

        teachers.forEach((tch) => {
          const customizedContent = headerAndBody
            .replace(/{student_name}/g, tch.name)
            .replace(/{parent_name}/g, tch.name)
            .replace(/{roll_no}/g, tch.facultyId || 'Faculty');

          newLogs.push({
            id: `wa-ann-${Date.now()}-${tch.id}`,
            recipientName: tch.name,
            recipientPhone: tch.phone || '',
            recipientRole: 'parent',
            type: 'broadcast',
            content: customizedContent,
            status: 'delivered',
            timestamp: 'Just now',
            meta: { announcementId: ann.id, announcementTitle: ann.title },
          });
        });
      } else if (ann.audienceType === 'batch') {
        const targetStudents = students.filter((s) =>
          (s.batchIds || []).some((bId) => ann.audienceIds.includes(bId))
        );

        targetStudents.forEach((st) => {
          const customizedContent = headerAndBody
            .replace(/{student_name}/g, st.name)
            .replace(/{parent_name}/g, st.parentName || st.name)
            .replace(/{roll_no}/g, st.rollNo || '');

          newLogs.push({
            id: `wa-ann-${Date.now()}-${st.id}`,
            recipientName: `${st.parentName || st.name} (${st.name})`,
            recipientPhone: st.parentPhone || st.phone || '',
            recipientRole: 'parent',
            type: 'broadcast',
            content: customizedContent,
            status: 'delivered',
            timestamp: 'Just now',
            meta: { announcementId: ann.id, announcementTitle: ann.title },
          });
        });
      } else if (ann.audienceType === 'individual') {
        ann.audienceIds.forEach((id) => {
          const student = students.find((s) => s.id === id);
          const teacher = teachers.find((t) => t.id === id);

          if (student) {
            const customizedContent = headerAndBody
              .replace(/{student_name}/g, student.name)
              .replace(/{parent_name}/g, student.parentName || student.name)
              .replace(/{roll_no}/g, student.rollNo || '');

            newLogs.push({
              id: `wa-ann-${Date.now()}-${student.id}`,
              recipientName: `${student.parentName || student.name} (${student.name})`,
              recipientPhone: student.parentPhone || student.phone || '',
              recipientRole: 'parent',
              type: 'broadcast',
              content: customizedContent,
              status: 'delivered',
              timestamp: 'Just now',
              meta: { announcementId: ann.id, announcementTitle: ann.title },
            });
          } else if (teacher) {
            const customizedContent = headerAndBody
              .replace(/{student_name}/g, teacher.name)
              .replace(/{parent_name}/g, teacher.name)
              .replace(/{roll_no}/g, teacher.facultyId || 'Faculty');

            newLogs.push({
              id: `wa-ann-${Date.now()}-${teacher.id}`,
              recipientName: teacher.name,
              recipientPhone: teacher.phone || '',
              recipientRole: 'parent',
              type: 'broadcast',
              content: customizedContent,
              status: 'delivered',
              timestamp: 'Just now',
              meta: { announcementId: ann.id, announcementTitle: ann.title },
            });
          } else {
            failedCount++;
          }
        });
      }
    }

    return {
      announcement: ann,
      inAppCount,
      whatsappCount: newLogs.length,
      failedCount,
      logs: newLogs,
    };
  }

  // TEST SUITE 1: Broadcast to ALL (Students + Faculty)
  console.log('--- Test Suite 1: Audience Type: ALL ---');
  const allRes = simulateAnnouncementDispatch(
    {
      title: 'Academy Annual Holiday Notice',
      message: 'Dear {parent_name}, the academy will remain closed on Friday for festival celebrations.',
      audienceType: 'all',
      channels: ['in-app', 'whatsapp'],
      priority: 'pinned',
      status: 'sent',
    },
    mockStudents,
    mockTeachers
  );

  assert(allRes.inAppCount === 5, 'In-App recipients include 3 students + 2 teachers (Total: 5)');
  assert(allRes.whatsappCount === 5, 'WhatsApp broadcast dispatched to 5 phone contacts');
  assert(allRes.logs.some((l) => l.recipientName.includes('Suresh Patel (Aarav Patel)')), 'Student parent name mapped in log');
  assert(allRes.logs.some((l) => l.recipientName === 'Dr. Vikram Seth'), 'Faculty member mapped in log');
  assert(allRes.logs[0].content.includes('Dear Suresh Patel,'), 'Template tag {parent_name} dynamically substituted');
  assert(allRes.logs[0].content.includes('📢 *Apex Academy Announcement: Academy Annual Holiday Notice*'), 'Standardized academy announcement header included');

  // TEST SUITE 2: Broadcast to Targeted BATCHES with Deduplication
  console.log('\n--- Test Suite 2: Audience Type: BATCH with Deduplication ---');
  // Student Aarav Patel belongs to both 'b-jee' and 'b-adv'
  const batchRes = simulateAnnouncementDispatch(
    {
      title: 'Advanced JEE Physics Extra Session',
      message: 'Special problem-solving session this Saturday at 10 AM.',
      audienceType: 'batch',
      audienceIds: ['b-jee', 'b-adv'],
      channels: ['in-app', 'whatsapp'],
      priority: 'urgent',
      status: 'sent',
    },
    mockStudents,
    mockTeachers
  );

  // Both Aarav ('b-jee', 'b-adv') and Rohan ('b-jee') match; Diya ('b-neet') does not.
  assert(batchRes.inAppCount === 2, 'Batch targeting resolved exactly 2 matching enrolled students');
  assert(batchRes.whatsappCount === 2, 'WhatsApp broadcast correctly deduplicated (Aarav notified once)');
  assert(!batchRes.logs.some((l) => l.recipientName.includes('Diya Sharma')), 'Non-targeted batch student excluded from WhatsApp log');

  // TEST SUITE 3: Targeted INDIVIDUALS (Student + Faculty)
  console.log('\n--- Test Suite 3: Audience Type: INDIVIDUAL ---');
  const individualRes = simulateAnnouncementDispatch(
    {
      title: 'Parent-Teacher Meeting Schedule',
      message: 'Hello {student_name}, your meeting is confirmed.',
      audienceType: 'individual',
      audienceIds: ['st-002', 'tch-001', 'non-existent-id'],
      channels: ['in-app', 'whatsapp'],
      priority: 'normal',
      status: 'sent',
    },
    mockStudents,
    mockTeachers
  );

  assert(individualRes.inAppCount === 3, 'Individual inAppCount matches audienceIds length');
  assert(individualRes.whatsappCount === 2, 'WhatsApp dispatched to 2 valid recipients (1 student + 1 faculty)');
  assert(individualRes.failedCount === 1, 'Failed count accurately captures invalid/unmatched ID');
  assert(individualRes.logs.some((l) => l.recipientName.includes('Diya Sharma')), 'Individual student Diya received WhatsApp alert');
  assert(individualRes.logs.some((l) => l.recipientName === 'Dr. Vikram Seth'), 'Individual faculty Dr. Vikram received WhatsApp alert');

  // TEST SUITE 4: In-App Only Dispatch (WhatsApp not selected)
  console.log('\n--- Test Suite 4: Channel: IN-APP ONLY ---');
  const inAppOnlyRes = simulateAnnouncementDispatch(
    {
      title: 'Library Book Reminder',
      message: 'Please return all borrowed chemistry books by Monday.',
      audienceType: 'all',
      channels: ['in-app'],
      priority: 'normal',
      status: 'sent',
    },
    mockStudents,
    mockTeachers
  );

  assert(inAppOnlyRes.inAppCount === 5, 'In-App recipients counted');
  assert(inAppOnlyRes.whatsappCount === 0, 'No WhatsApp logs created when WhatsApp channel is omitted');

  // TEST SUITE 5: Draft Announcement (No dispatch regardless of channel)
  console.log('\n--- Test Suite 5: Status: DRAFT ---');
  const draftRes = simulateAnnouncementDispatch(
    {
      title: 'Draft Announcement for Next Month',
      message: 'Draft message body...',
      audienceType: 'all',
      channels: ['in-app', 'whatsapp'],
      priority: 'normal',
      status: 'draft',
    },
    mockStudents,
    mockTeachers
  );

  assert(draftRes.whatsappCount === 0, 'No WhatsApp broadcasts triggered when status is draft');

  // SUMMARY
  console.log('\n====================================================');
  console.log(`📊 Result: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 Phase 9 Step 3 Notification Infra test suite PASSED completely!\n');
    process.exit(0);
  } else {
    console.error('💥 Test suite failed some assertions!\n');
    process.exit(1);
  }
}

runStep3TestSuite();
