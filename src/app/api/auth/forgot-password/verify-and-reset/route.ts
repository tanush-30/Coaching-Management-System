export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getInternalEmail } from '@/lib/auth-utils';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customId, otp, newPassword, confirmPassword } = body;

    if (!customId || !otp || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'All fields (UID, OTP, New Password, Confirm Password) are required.' },
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
        { error: 'PASSWORD_TOO_SHORT', message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const normalizedId = customId.trim().toUpperCase();

    if (!isFirebaseAdminConfigured) {
      if (otp !== '123456') {
        return NextResponse.json(
          { error: 'INVALID_OTP', message: 'Invalid verification code. Please check and try again.' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Password reset successfully (simulated mode). You may now log in with your new password.',
      });
    }

    // 1. Fetch active OTP record from otp_requests
    const otpRef = adminDb.collection('otp_requests').doc(normalizedId);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json(
        { error: 'OTP_EXPIRED', message: 'OTP request expired or invalid. Please request a new verification code.' },
        { status: 400 }
      );
    }

    const otpData = otpSnap.data();
    const now = Date.now();

    if (otpData?.expiresAt && now > otpData.expiresAt) {
      await otpRef.delete();
      return NextResponse.json(
        { error: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if ((otpData?.attempts || 0) >= 5) {
      await otpRef.delete();
      return NextResponse.json(
        { error: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // 2. Validate OTP code
    if (otp.trim() !== otpData?.otp) {
      await otpRef.update({
        attempts: (otpData?.attempts || 0) + 1,
      });
      return NextResponse.json(
        { error: 'INVALID_OTP', message: 'Incorrect OTP code. Please check and try again.' },
        { status: 400 }
      );
    }

    // 3. OTP verified -> Update Firebase Auth user's password
    const internalEmail = getInternalEmail(normalizedId);
    const userRecord = await adminAuth.getUserByEmail(internalEmail);

    await adminAuth.updateUser(userRecord.uid, {
      password: newPassword,
    });

    // 4. Clear mustChangePassword flag on custom claims
    const currentClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      ...currentClaims,
      mustChangePassword: false,
    });

    // 5. Invalidate previous sessions across all devices
    await adminAuth.revokeRefreshTokens(userRecord.uid);

    // 6. Delete used OTP document
    await otpRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('[VerifyAndReset API] Error:', error);
    return NextResponse.json(
      { error: 'RESET_FAILED', message: error?.message || 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
