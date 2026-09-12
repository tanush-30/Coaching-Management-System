export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { generateDefaultPassword, getInternalEmail } from '@/lib/auth-utils';
import type { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller is an authenticated administrator
    if (isFirebaseAdminConfigured) {
      const authHeader = request.headers.get('Authorization');
      const sessionCookie =
        request.cookies.get('session')?.value ||
        request.cookies.get('apex_session')?.value;

      let callerUid = '';
      let callerRole = '';

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const decoded = await adminAuth.verifyIdToken(token);
        callerUid = decoded.uid;
        callerRole = (decoded.role as string) || '';
      } else if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        callerUid = decoded.uid;
        callerRole = (decoded.role as string) || '';
      } else {
        return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
      }

      if (callerRole !== 'admin') {
        const callerDoc = await adminDb.collection('user_roles').doc(callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    const {
      memberType, // 'student' | 'faculty'
      customId,
      firstName,
      lastName,
      dob,
      phone,
      photoUrl,
      ...extraData
    } = body;

    if (!memberType || !customId || !firstName || !dob || !phone) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Missing required fields (customId, firstName, dob, phone).' },
        { status: 400 }
      );
    }

    const normalizedCustomId = customId.trim().toUpperCase();
    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();
    const defaultPassword = generateDefaultPassword(firstName, dob);
    const internalEmail = getInternalEmail(normalizedCustomId);
    const id = extraData.id || `${memberType === 'student' ? 'student' : 'teacher'}-${Date.now()}`;

    // If Firebase Admin credentials are not configured in local environment, return simulated response
    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({
        success: true,
        customId: normalizedCustomId,
        temporaryPassword: defaultPassword,
        memberRefId: id,
        internalEmail,
        isSimulated: true,
      });
    }

    // 1. Transactionally lock member_ids/{customId}
    await adminDb.runTransaction(async (tx) => {
      const idRef = adminDb.collection('member_ids').doc(normalizedCustomId);
      const existing = await tx.get(idRef);
      if (existing.exists) {
        const data = existing.data();
        throw new Error(`The ID "${normalizedCustomId}" is already assigned to a ${data?.memberType || 'member'} (${data?.name || 'Unknown'}).`);
      }

      tx.set(idRef, {
        id: normalizedCustomId,
        memberType: memberType === 'student' ? 'student' : 'faculty',
        name: fullName,
        memberRefId: id,
        assignedAt: new Date().toISOString(),
      });
    });

    // 2. Create Firebase Auth user with synthetic internal email
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: internalEmail,
        password: defaultPassword,
        displayName: fullName,
        emailVerified: false,
      });
    } catch (authErr: any) {
      // If user already exists in auth with that email, retrieve and update
      if (authErr.code === 'auth/email-already-exists') {
        userRecord = await adminAuth.getUserByEmail(internalEmail);
        await adminAuth.updateUser(userRecord.uid, {
          password: defaultPassword,
          displayName: fullName,
        });
      } else {
        // Rollback member_id reservation on auth creation failure
        await adminDb.collection('member_ids').doc(normalizedCustomId).delete();
        throw authErr;
      }
    }

    // 3. Set custom claims on user (including forced first-login password reset flag)
    const role: UserRole = memberType === 'student' ? 'student' : 'teacher';
    const claims = memberType === 'student'
      ? {
          role: 'student',
          studentId: id,
          batchId: (extraData.batchIds && extraData.batchIds[0]) || '',
          customId: normalizedCustomId,
          mustChangePassword: true,
        }
      : {
          role: 'teacher',
          batchIds: extraData.assignedBatches || [],
          customId: normalizedCustomId,
          mustChangePassword: true,
        };

    await adminAuth.setCustomUserClaims(userRecord.uid, claims);

    // 4. Save to user_roles collection
    await adminDb.collection('user_roles').doc(userRecord.uid).set({
      ...claims,
      email: internalEmail,
      displayName: fullName,
      phone,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 5. Save document in students or teachers collection
    const collectionName = memberType === 'student' ? 'students' : 'teachers';
    const memberDoc = memberType === 'student'
      ? {
          id,
          rollNo: normalizedCustomId,
          firstName: firstName.trim(),
          lastName: (lastName || '').trim(),
          name: fullName,
          email: extraData.email || internalEmail,
          phone: phone.trim(),
          avatar: photoUrl || '',
          gender: extraData.gender || 'Male',
          dob: dob.trim(),
          address: extraData.address || '',
          schoolName: extraData.schoolName || '',
          parentName: extraData.parentName || '',
          parentPhone: extraData.parentPhone || '',
          parentEmail: extraData.parentEmail || '',
          parentRelation: extraData.parentRelation || 'Father',
          batchIds: extraData.batchIds || [],
          enrollmentDate: extraData.enrollmentDate || new Date().toISOString().split('T')[0],
          status: 'active',
          totalFee: extraData.totalFee || 0,
          paidFee: extraData.paidFee || 0,
          pendingFee: extraData.pendingFee || extraData.totalFee || 0,
          authUid: userRecord.uid,
          createdAt: new Date().toISOString(),
        }
      : {
          id,
          facultyId: normalizedCustomId,
          firstName: firstName.trim(),
          lastName: (lastName || '').trim(),
          dob: dob.trim(),
          name: fullName,
          email: extraData.email || internalEmail,
          phone: phone.trim(),
          avatar: photoUrl || '',
          subjects: extraData.subjects || ['General'],
          qualifications: extraData.qualifications || '',
          joiningDate: extraData.joiningDate || new Date().toISOString().split('T')[0],
          status: extraData.status || 'active',
          assignedBatches: extraData.assignedBatches || [],
          authUid: userRecord.uid,
          createdAt: new Date().toISOString(),
        };

    await adminDb.collection(collectionName).doc(id).set(memberDoc, { merge: true });

    return NextResponse.json({
      success: true,
      customId: normalizedCustomId,
      temporaryPassword: defaultPassword,
      memberRefId: id,
      authUid: userRecord.uid,
      internalEmail,
    });
  } catch (error: any) {
    console.error('[EnrollMember API] Error:', error);
    return NextResponse.json(
      { error: 'ENROLLMENT_FAILED', message: error?.message || 'Failed to enroll member.' },
      { status: 400 }
    );
  }
}
