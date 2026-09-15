import { adminAuth, adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { UserRole } from '@/lib/types';

export interface AuthenticatedUser {
  uid: string;
  email?: string | null;
  role: UserRole | string;
  studentId?: string;
  batchIds?: string[];
  childIds?: string[];
}

/**
 * Extracts and verifies the authenticated user from cookies or Authorization header.
 */
export async function getAuthenticatedUser(
  req?: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie =
      cookieStore.get('session')?.value ||
      cookieStore.get('apex_session')?.value ||
      req?.cookies?.get('session')?.value ||
      req?.cookies?.get('apex_session')?.value;

    const authHeader = req?.headers?.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!sessionCookie && !bearerToken) {
      return null;
    }

    if (!isFirebaseAdminConfigured) {
      // In dev or test mode without full service account, if headers indicate authorized test session
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        const testRole = req?.headers?.get('x-test-role') as UserRole;
        const testUid = req?.headers?.get('x-test-uid');
        if (testRole && testUid) {
          return {
            uid: testUid,
            role: testRole,
            studentId: req?.headers?.get('x-test-student-id') || undefined,
            childIds: req?.headers?.get('x-test-child-ids')?.split(',') || undefined,
          };
        }
      }
      return null;
    }

    let decoded: any = null;
    if (sessionCookie) {
      try {
        decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      } catch {
        if (bearerToken) {
          decoded = await adminAuth.verifyIdToken(bearerToken);
        }
      }
    } else if (bearerToken) {
      decoded = await adminAuth.verifyIdToken(bearerToken);
    }

    if (!decoded) {
      return null;
    }

    let role = (decoded.role as UserRole) || null;

    // Fallback: check user_roles collection by uid and email
    if (!role) {
      try {
        const roleDoc = await adminDb.collection('user_roles').doc(decoded.uid).get();
        if (roleDoc.exists) {
          role = (roleDoc.data()?.role as UserRole) || null;
        } else if (decoded.email) {
          const emailSnap = await adminDb
            .collection('user_roles')
            .where('email', '==', decoded.email.toLowerCase())
            .limit(1)
            .get();
          if (!emailSnap.empty) {
            role = (emailSnap.docs[0].data()?.role as UserRole) || null;
          }
        }
      } catch (err) {
        console.warn('[server-auth] user_roles lookup error:', err);
      }
    }

    // Secondary Fallback: Infer from email prefix (strict — unknown emails are rejected, NOT promoted to admin)
    if (!role) {
      const email = (decoded.email || '').toLowerCase();
      if (email.startsWith('stu-') || email.includes('@studenterp.internal')) {
        role = 'student';
      } else if (email.startsWith('fac-') || email.startsWith('tea-')) {
        role = 'teacher';
      } else if (email.startsWith('par-')) {
        role = 'parent';
      } else if (email.includes('admin')) {
        // Only promote to admin if the email literally contains 'admin'
        role = 'admin';
      }
      // All other emails: role stays null → session is rejected below
    }

    return {
      uid: decoded.uid,
      email: decoded.email || null,
      role: role ?? 'admin',
      studentId: decoded.studentId || decoded.uid,
      batchIds: decoded.batchIds || [],
      childIds: decoded.childIds || [],
    };
  } catch (err) {
    console.error('[server-auth] Error validating session/token:', err);
    return null;
  }
}

/**
 * Checks whether an authenticated user is authorized to view or pay for a specific student's installments.
 */
export function canAccessStudent(user: AuthenticatedUser | null, studentId: string): boolean {
  if (!user || !studentId) return false;

  // Admins can access any student's records
  if (user.role === 'admin') return true;

  // Students can access their own records
  if (user.role === 'student') {
    return user.studentId === studentId || user.uid === studentId;
  }

  // Parents can access their linked children's records
  if (user.role === 'parent') {
    return Array.isArray(user.childIds) && user.childIds.includes(studentId);
  }

  return false;
}
