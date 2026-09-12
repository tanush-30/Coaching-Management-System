export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'New password and confirmation are required.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'PASSWORD_MISMATCH', message: 'New password and confirmation do not match.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'PASSWORD_TOO_SHORT', message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (currentPassword && currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'PASSWORD_SAME', message: 'New password cannot be identical to your current password.' },
        { status: 400 }
      );
    }

    if (!isFirebaseAdminConfigured) {
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully (simulated mode).',
      });
    }

    if (!idToken) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Active user authentication token is required.' },
        { status: 401 }
      );
    }

    // 1. Verify user session token
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    const uid = decodedToken.uid;

    // 2. Update user's password in Firebase Auth
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // 3. Clear mustChangePassword claim if set
    const userRecord = await adminAuth.getUser(uid);
    const currentClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...currentClaims,
      mustChangePassword: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been changed successfully.',
    });
  } catch (error: any) {
    console.error('[ChangePassword API] Error:', error);
    return NextResponse.json(
      { error: 'CHANGE_FAILED', message: error?.message || 'Failed to update password.' },
      { status: 500 }
    );
  }
}
