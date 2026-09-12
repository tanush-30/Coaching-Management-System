// API Route: /api/students/[id]
// Server-Side Data-Level Authorization for Student Profiles

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole, TeacherClaims, StudentClaims, ParentClaims } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    if (!studentId) {
      return NextResponse.json({ error: 'Missing student ID parameter' }, { status: 400 });
    }

    // 1. Verify session cookie server-side
    const cookieStore = cookies();
    const sessionCookie =
      cookieStore.get('session')?.value ||
      cookieStore.get('apex_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({ error: 'Firebase Admin unconfigured' }, { status: 500 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decoded.uid;
    let role = (decoded.role as UserRole) || null;

    // Fallback: Check user_roles collection if claim is pending
    if (!role) {
      try {
        const userDoc = await adminDb.collection('user_roles').doc(uid).get();
        if (userDoc.exists) {
          role = (userDoc.data()?.role as UserRole) || null;
        }
      } catch {}
    }

    // 2. Fetch student record from Firestore
    let studentDoc = await adminDb.collection('students').doc(studentId).get();
    let studentData = studentDoc.exists ? studentDoc.data() : null;

    if (!studentData) {
      // Query by rollNo if ID didn't match doc ID directly
      const querySnap = await adminDb
        .collection('students')
        .where('rollNo', '==', studentId.toUpperCase())
        .limit(1)
        .get();

      if (!querySnap.empty) {
        studentDoc = querySnap.docs[0];
        studentData = studentDoc.data();
      }
    }

    if (!studentData) {
      // Query by authUid
      const querySnap = await adminDb
        .collection('students')
        .where('authUid', '==', studentId)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        studentDoc = querySnap.docs[0];
        studentData = studentDoc.data();
      }
    }

    if (!studentData && decoded.email) {
      // Query by email
      const querySnap = await adminDb
        .collection('students')
        .where('email', '==', decoded.email.toLowerCase())
        .limit(1)
        .get();

      if (!querySnap.empty) {
        studentDoc = querySnap.docs[0];
        studentData = studentDoc.data();
      }
    }

    if (!studentData && decoded.email) {
      // Query by email prefix (e.g. STU-2026-001)
      const prefix = decoded.email.split('@')[0].toUpperCase();
      const querySnap = await adminDb
        .collection('students')
        .where('rollNo', '==', prefix)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        studentDoc = querySnap.docs[0];
        studentData = studentDoc.data();
      }
    }

    if (!studentData) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // 3. Authorization Check:
    // - Admin: Allowed
    if (role === 'admin') {
      return NextResponse.json(studentData);
    }

    // - Student: Must be their own record
    if (role === 'student') {
      const emailPrefix = (decoded.email || '').split('@')[0].toUpperCase();
      const cleanEmailPrefix = emailPrefix.replace(/[^A-Z0-9]/g, '');
      const cleanRoll = (studentData.rollNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

      const isOwner =
        uid === studentId ||
        studentData.authUid === uid ||
        studentData.id === uid ||
        (decoded as any).studentId === studentData.id ||
        (decoded as any).customId?.toUpperCase() === studentData.rollNo?.toUpperCase() ||
        (decoded.email && studentData.email && studentData.email.toLowerCase() === decoded.email.toLowerCase()) ||
        (emailPrefix && studentData.rollNo && studentData.rollNo.toUpperCase() === emailPrefix) ||
        (cleanEmailPrefix && cleanRoll && cleanEmailPrefix === cleanRoll);

      if (!isOwner) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to view another student\'s profile.' },
          { status: 403 }
        );
      }
      return NextResponse.json(studentData);
    }

    // - Teacher: Must be assigned to at least one of this student's batches
    if (role === 'teacher') {
      const teacherBatchIds: string[] = (decoded as any).batchIds || [];
      const studentBatches: string[] = studentData.batchIds || (studentData.batchId ? [studentData.batchId] : []);

      const hasCommonBatch = studentBatches.some((bId) => teacherBatchIds.includes(bId));
      if (!hasCommonBatch) {
        // Also check if teacher owns the batch directly in Firestore
        let isBatchOwner = false;
        for (const bId of studentBatches) {
          const bDoc = await adminDb.collection('batches').doc(bId).get();
          if (bDoc.exists && bDoc.data()?.teacherId === uid) {
            isBatchOwner = true;
            break;
          }
        }

        if (!isBatchOwner) {
          return NextResponse.json(
            { error: 'Forbidden: You do not teach any batches this student is enrolled in.' },
            { status: 403 }
          );
        }
      }
      return NextResponse.json(studentData);
    }

    // - Parent: Must be linked to this student
    if (role === 'parent') {
      const parentChildIds: string[] = (decoded as any).childIds || [];
      const isChild =
        parentChildIds.includes(studentData.id) ||
        parentChildIds.includes(studentId) ||
        (decoded.email && studentData.parentEmail && studentData.parentEmail.toLowerCase() === decoded.email.toLowerCase());

      if (!isChild) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to view this student.' },
          { status: 403 }
        );
      }
      return NextResponse.json(studentData);
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    console.error('[API /api/students/[id]] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
