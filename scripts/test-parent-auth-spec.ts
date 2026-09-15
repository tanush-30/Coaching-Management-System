/**
 * Test Suite: Parent Auth & Login Specification Verification
 * Tests the email + password parent auth model, default phone-based password derivation,
 * sibling account linking, and admin phone/password sync endpoints.
 */

async function runParentAuthTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('🧪 Starting Parent Login & Authentication Specification Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // TEST 1: Rejection of Student Enrollment when Parent Email is missing
  try {
    const res = await fetch(`${baseUrl}/api/admin/enroll-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-admin': 'true' },
      body: JSON.stringify({
        memberType: 'student',
        customId: `TEST-STU-${Date.now()}`,
        firstName: 'Aarav',
        lastName: 'Sharma',
        dob: '2008-05-12',
        phone: '9876500001',
        parentName: 'Rajesh Sharma',
        parentPhone: '9876500002',
        // parentEmail intentionally omitted
      }),
    });

    const data = await res.json();
    assert(
      res.status === 400 && (data.error === 'MISSING_PARENT_EMAIL' || data.error === 'MISSING_FIELDS'),
      'Test 1: Enrollment fails when parentEmail is omitted'
    );
  } catch (err: any) {
    assert(false, 'Test 1: Enrollment fails when parentEmail is omitted', err.message);
  }

  // TEST 2: Successful Student Enrollment with Parent Account Provisioning
  const siblingEmail = `sharma.family.${Date.now()}@example.com`;
  const parentPhone1 = '9876543210';
  const student1CustomId = `STU-SIB1-${Date.now()}`;
  let student1RefId = '';

  try {
    const res = await fetch(`${baseUrl}/api/admin/enroll-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-admin': 'true' },
      body: JSON.stringify({
        memberType: 'student',
        customId: student1CustomId,
        firstName: 'Aarav',
        lastName: 'Sharma',
        dob: '2008-05-12',
        phone: '9876500001',
        parentName: 'Rajesh Sharma',
        parentPhone: parentPhone1,
        parentEmail: siblingEmail,
      }),
    });

    const data = await res.json();
    student1RefId = data.memberRefId;
    assert(
      res.status === 200 && data.success === true,
      'Test 2: Student 1 enrollment succeeds with parent email & phone'
    );
    assert(
      data.parentCredentials?.email === siblingEmail.toLowerCase(),
      'Test 2b: Parent credentials email matches registered parent email'
    );
    assert(
      data.parentCredentials?.temporaryPassword === parentPhone1,
      'Test 2c: Parent default password is set to parent phone number'
    );
  } catch (err: any) {
    assert(false, 'Test 2: Student 1 enrollment succeeds', err.message);
  }

  // TEST 3: Sibling Enrollment under Existing Parent Email (Sibling Account Linking)
  const student2CustomId = `STU-SIB2-${Date.now()}`;
  try {
    const res = await fetch(`${baseUrl}/api/admin/enroll-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-admin': 'true' },
      body: JSON.stringify({
        memberType: 'student',
        customId: student2CustomId,
        firstName: 'Ananya',
        lastName: 'Sharma',
        dob: '2010-08-20',
        phone: '9876500003',
        parentName: 'Rajesh Sharma',
        parentPhone: parentPhone1,
        parentEmail: siblingEmail, // same parent email
      }),
    });

    const data = await res.json();
    assert(
      res.status === 200 && data.success === true,
      'Test 3: Enrolling Sibling under existing parentEmail succeeds without duplicate collision'
    );
    assert(
      data.parentCredentials?.email === siblingEmail.toLowerCase(),
      'Test 3b: Sibling inherits the same parent email identity'
    );
  } catch (err: any) {
    assert(false, 'Test 3: Sibling enrollment', err.message);
  }

  // TEST 4: Admin Phone Update & Auto Password Sync Endpoint
  const newParentPhone = '9123456780';
  try {
    const res = await fetch(`${baseUrl}/api/admin/update-parent-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-admin': 'true' },
      body: JSON.stringify({
        studentId: student1RefId,
        parentEmail: siblingEmail,
        parentPhone: newParentPhone,
        action: 'update_phone',
      }),
    });

    const data = await res.json();
    assert(
      res.status === 200 && data.success === true,
      'Test 4: Admin update-parent-phone succeeds and updates password'
    );
    assert(
      data.newPassword === newParentPhone,
      'Test 4b: Synchronized password matches the new phone number'
    );
  } catch (err: any) {
    assert(false, 'Test 4: Admin update-parent-phone endpoint', err.message);
  }

  // TEST 5: Admin 1-Click "Reset Parent Password to Phone" Action
  try {
    const res = await fetch(`${baseUrl}/api/admin/update-parent-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dev-admin': 'true' },
      body: JSON.stringify({
        studentId: student1RefId,
        parentEmail: siblingEmail,
        parentPhone: newParentPhone,
        action: 'reset_password',
      }),
    });

    const data = await res.json();
    assert(
      res.status === 200 && data.success === true,
      'Test 5: Admin 1-click Reset Password to Phone succeeds'
    );
  } catch (err: any) {
    assert(false, 'Test 5: Admin 1-click reset password action', err.message);
  }

  console.log('\n=============================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runParentAuthTests().catch((e) => {
  console.error('Fatal error running parent auth tests:', e);
  process.exit(1);
});
