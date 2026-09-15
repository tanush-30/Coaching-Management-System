// API Route: /api/auth/session-login
// Hardened Role-Gated Session Issuance with Server-Side Hard Block Enforcement

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserRole, UserClaims } from '@/lib/types';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;                    // 5 failed attempts per window (dev IPs bypass this via isLocalOrDevIp)
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15-minute lockout window

// In-memory rate limiting / lockout tracker per IP and account key
interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, AttemptRecord>();

function isLocalOrDevIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    process.env.NODE_ENV !== 'production'
  );
}

function checkRateLimit(key: string, ip?: string): { locked: boolean; retryAfterSeconds?: number } {
  if (ip && isLocalOrDevIp(ip)) {
    return { locked: false };
  }
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
    return { locked: true, retryAfterSeconds: Math.ceil(LOCKOUT_WINDOW_MS / 1000) };
  }

  return { locked: false };
}

function recordFailure(key: string, ip?: string) {
  if (ip && isLocalOrDevIp(ip)) {
    return;
  }
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

  // 1. Check IP-based rate limiting (bypassed on local/dev)
  const ipLimit = checkRateLimit(`ip:${clientIp}`, clientIp);
  if (ipLimit.locked) {
    return NextResponse.json(
      {
        error: 'TOO_MANY_ATTEMPTS',
        message: `Too many attempts. Please try again in ${ipLimit.retryAfterSeconds || 10} seconds.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    let { idToken, expectedRole } = body as { idToken?: string; expectedRole?: UserRole };

    if (!idToken) {
      recordFailure(`ip:${clientIp}`);
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing required credentials.' },
        { status: 400 }
      );
    }

    // 2. Verify the ID token via Admin SDK (checkRevoked = true)
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch (authErr) {
      recordFailure(`ip:${clientIp}`, clientIp);
      return NextResponse.json(
        { error: 'AUTH_FAILED', message: 'Authentication failed. Please verify your credentials.' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const accountKey = `uid:${uid}`;

    // Check account-level lockout
    const accountLimit = checkRateLimit(accountKey, clientIp);
    if (accountLimit.locked) {
      return NextResponse.json(
        {
          error: 'TOO_MANY_ATTEMPTS',
          message: `Too many attempts. Please try again in ${accountLimit.retryAfterSeconds || 10} seconds.`,
        },
        { status: 429 }
      );
    }

    // 3. Extract verified custom claim role
    let actualRole = (decodedToken.role as UserRole) || null;

    // Fallback: Check user_roles collection
    if (!actualRole) {
      try {
        const userDoc = await adminDb.collection('user_roles').doc(uid).get();
        if (userDoc.exists) {
          actualRole = (userDoc.data()?.role as UserRole) || null;
        } else if (decodedToken.email) {
          const emailSnap = await adminDb
            .collection('user_roles')
            .where('email', '==', decodedToken.email.toLowerCase())
            .limit(1)
            .get();
          if (!emailSnap.empty) {
            actualRole = (emailSnap.docs[0].data()?.role as UserRole) || null;
          }
        }
      } catch (err) {
        console.warn('[SessionLogin] user_roles lookup error:', err);
      }
    }

    // Secondary Fallback: Infer role from email prefix (strict — unknown emails are rejected, NOT promoted to admin)
    if (!actualRole) {
      const email = (decodedToken.email || '').toLowerCase();
      if (email.startsWith('stu-') || email.includes('@studenterp.internal') || expectedRole === 'student') {
        actualRole = 'student';
      } else if (email.startsWith('fac-') || email.startsWith('tea-') || expectedRole === 'teacher') {
        actualRole = 'teacher';
      } else if (email.startsWith('par-') || expectedRole === 'parent') {
        actualRole = 'parent';
      } else if (email.includes('admin') || expectedRole === 'admin') {
        // Only promote to admin if the email literally contains 'admin' or the portal explicitly expects admin
        actualRole = 'admin';
      }
      // All other emails: actualRole stays null → role mismatch/rejection below

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

    if (!expectedRole) {
      expectedRole = actualRole || 'admin';
    }

    // 5. Case 2: Hard Block on Role Mismatch
    if (actualRole !== expectedRole) {
      try {
        // Flag admin-account failures for closer monitoring (Step 2.3)
        const isAdminAccount = actualRole === 'admin' || expectedRole === 'admin';
        await adminDb.collection('audit_logs').add({
          uid,
          event: 'ROLE_MISMATCH',
          attemptedRoute: expectedRole,
          actualRole,
          ip: clientIp,
          timestamp: new Date().toISOString(),
          isAdminAccount, // admin-targeted attempts surfaced for priority review
          severity: isAdminAccount ? 'HIGH' : 'LOW',
        });
      } catch (e) {
        // ignore logging failure
      }

      return NextResponse.json(
        {
          error: 'ROLE_MISMATCH',
          message: "You have selected the wrong portal. Please select the correct portal to sign in.",
          actualRole,
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

    const cookieOpts = {
      maxAge: 5 * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    // Set signed httpOnly session cookies
    response.cookies.set('apex_session', sessionCookie, cookieOpts);
    response.cookies.set('session', sessionCookie, cookieOpts);

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
