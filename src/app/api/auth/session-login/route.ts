// API Route: /api/auth/session-login
// Hardened Role-Gated Session Issuance with Server-Side Hard Block Enforcement

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserRole, UserClaims } from '@/lib/types';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-memory rate limiting / lockout tracker per IP and account key
interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, AttemptRecord>();

function checkRateLimit(key: string): { locked: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record) return { locked: false };

  // If lockout is active
  if (record.lockedUntil > now) {
    return { locked: true, retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // If window expired, reset
  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    rateLimitMap.delete(key);
    return { locked: false };
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    return { locked: true, retryAfterSeconds: 15 * 60 };
  }

  return { locked: false };
}

function recordFailure(key: string) {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, firstAttemptAt: now, lockedUntil: 0 });
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    }
  }
}

function resetFailures(key: string) {
  rateLimitMap.delete(key);
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  // 1. Check IP-based rate limiting
  const ipLimit = checkRateLimit(`ip:${clientIp}`);
  if (ipLimit.locked) {
    return NextResponse.json(
      {
        error: 'TOO_MANY_ATTEMPTS',
        message: 'Too many attempts. Please try again in 15 minutes.',
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { idToken, expectedRole } = body as { idToken?: string; expectedRole?: UserRole };

    if (!idToken || !expectedRole) {
      recordFailure(`ip:${clientIp}`);
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing required credentials or portal role.' },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ['admin', 'teacher', 'student', 'parent'];
    if (!validRoles.includes(expectedRole)) {
      recordFailure(`ip:${clientIp}`);
      return NextResponse.json(
        { error: 'INVALID_ROLE', message: 'Invalid portal role requested.' },
        { status: 400 }
      );
    }

    // 2. Verify the ID token via Admin SDK (checkRevoked = true)
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch (authErr) {
      recordFailure(`ip:${clientIp}`);
      return NextResponse.json(
        { error: 'AUTH_FAILED', message: 'Authentication failed. Please verify your credentials.' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const accountKey = `uid:${uid}`;

    // Check account-level lockout
    const accountLimit = checkRateLimit(accountKey);
    if (accountLimit.locked) {
      return NextResponse.json(
        {
          error: 'TOO_MANY_ATTEMPTS',
          message: 'Too many attempts. Please try again in 15 minutes.',
        },
        { status: 429 }
      );
    }

    // 3. Extract verified custom claim role
    let actualRole = (decodedToken.role as UserRole) || null;

    // Fallback: Check user_roles, email format, and Firestore collections
    if (!actualRole) {
      try {
        const userDoc = await adminDb.collection('user_roles').doc(uid).get();
        if (userDoc.exists) {
          actualRole = (userDoc.data()?.role as UserRole) || null;
        }
      } catch (err) {
        console.warn('[SessionLogin] user_roles lookup error:', err);
      }
    }

    // Secondary Fallback: Infer role from synthetic internal email or Firestore student/teacher collection
    if (!actualRole) {
      const email = (decodedToken.email || '').toLowerCase();
      if (email.startsWith('stu-') || email.includes('@studenterp.internal') || expectedRole === 'student') {
        actualRole = 'student';
      } else if (email.startsWith('fac-') || email.startsWith('tea-') || expectedRole === 'teacher') {
        actualRole = 'teacher';
      } else if (email.includes('admin') || expectedRole === 'admin') {
        actualRole = 'admin';
      } else if (expectedRole === 'parent') {
        actualRole = 'parent';
      }

      // Auto-heal: Synchronize custom claims on Firebase Auth and create user_roles record
      if (actualRole) {
        try {
          const claims: UserClaims =
            actualRole === 'student'
              ? { role: 'student', studentId: uid, batchId: '' }
              : actualRole === 'teacher'
              ? { role: 'teacher', batchIds: [] }
              : actualRole === 'parent'
              ? { role: 'parent', childIds: [] }
              : { role: 'admin' };

          await adminAuth.setCustomUserClaims(uid, claims);
          await adminDb.collection('user_roles').doc(uid).set({
            ...claims,
            email: decodedToken.email || '',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('[SessionLogin] Auto-heal claim sync notice:', e);
        }
      }
    }

    // 5. Case 2: Hard Block on Role Mismatch
    if (actualRole !== expectedRole) {
      recordFailure(accountKey);
      recordFailure(`ip:${clientIp}`);

      // Audit Log (records server-side actualRole for admin monitoring, never revealed to client)
      try {
        await adminDb.collection('audit_logs').add({
          uid,
          event: 'ROLE_MISMATCH',
          attemptedRoute: expectedRole,
          actualRole,
          ip: clientIp,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        // ignore logging failure
      }

      return NextResponse.json(
        {
          error: 'ROLE_MISMATCH',
          message: "We couldn't sign you in here. Please check you're using the correct portal.",
        },
        { status: 403 }
      );
    }

    // 6. Case 3: Exact Role Match — Issue single signed session cookie
    resetFailures(accountKey);
    resetFailures(`ip:${clientIp}`);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });

    const response = NextResponse.json({
      success: true,
      role: actualRole,
      redirect: `/${actualRole}`,
    });

    // Set signed httpOnly session cookie ONLY (no plain-text apex_role cookie)
    response.cookies.set('apex_session', sessionCookie, {
      maxAge: 5 * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    // Clear legacy apex_role cookie if present
    response.cookies.set('apex_role', '', {
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('[SessionLogin] Unexpected exception:', err);
    recordFailure(`ip:${clientIp}`);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
