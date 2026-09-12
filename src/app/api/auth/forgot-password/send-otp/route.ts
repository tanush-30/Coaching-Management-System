export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { maskPhoneNumber } from '@/lib/auth-utils';
import { isFirebaseAdminConfigured } from '@/lib/firebase-admin';

// In-memory rate limiter per IP / UID (max 3 requests per 15 min)
const OTP_RATE_LIMIT_MS = 15 * 60 * 1000;
const MAX_OTP_REQUESTS = 3;
const otpRequestMap = new Map<string, { count: number; firstAttemptAt: number }>();

function checkOtpRateLimit(key: string): boolean {
  const now = Date.now();
  const record = otpRequestMap.get(key);
  if (!record || now - record.firstAttemptAt > OTP_RATE_LIMIT_MS) {
    otpRequestMap.set(key, { count: 1, firstAttemptAt: now });
    return true;
  }
  if (record.count >= MAX_OTP_REQUESTS) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

  try {
    const body = await request.json();
    const { customId } = body;

    if (!customId || typeof customId !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'User ID is required.' },
        { status: 400 }
      );
    }

    const normalizedId = customId.trim().toUpperCase();

    // Check rate limit per IP and UID
    if (!checkOtpRateLimit(`ip:${clientIp}`) || !checkOtpRateLimit(`uid:${normalizedId}`)) {
      return NextResponse.json(
        {
          error: 'TOO_MANY_REQUESTS',
          message: 'Too many OTP requests. Please wait 15 minutes before requesting again.',
        },
        { status: 429 }
      );
    }

    // Default enumeration-safe response
    const genericSuccessResponse = {
      success: true,
      message: 'If this User ID is registered in the system, a verification OTP has been sent to the linked mobile number.',
      customId: normalizedId,
    };

    if (!isFirebaseAdminConfigured) {
      // Development mock OTP
      const mockOtp = '123456';
      return NextResponse.json({
        ...genericSuccessResponse,
        maskedPhone: '+91 ******43210',
        devOtp: mockOtp,
      });
    }

    // Lookup user in students or teachers collection by custom identifier
    let memberPhone: string | null = null;
    let memberName = 'Member';

    const studentSnap = await adminDb.collection('students').where('rollNo', '==', normalizedId).limit(1).get();
    if (!studentSnap.empty) {
      const s = studentSnap.docs[0].data();
      memberPhone = s.phone || s.parentPhone;
      memberName = s.name;
    } else {
      const teacherSnap = await adminDb.collection('teachers').where('facultyId', '==', normalizedId).limit(1).get();
      if (!teacherSnap.empty) {
        const t = teacherSnap.docs[0].data();
        memberPhone = t.phone;
        memberName = t.name;
      }
    }

    if (!memberPhone) {
      // Enumeration-safe: return generic message even if UID not found
      return NextResponse.json(genericSuccessResponse);
    }

    // Generate single-use 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in otp_requests/{customId}
    await adminDb.collection('otp_requests').doc(normalizedId).set({
      customId: normalizedId,
      otp: generatedOtp,
      phone: memberPhone,
      name: memberName,
      attempts: 0,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    // Mask phone for user confirmation display
    const masked = maskPhoneNumber(memberPhone);

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification OTP has been sent to ${masked}.`,
      maskedPhone: masked,
      customId: normalizedId,
      // For immediate dev ease when SMS gateway isn't connected
      devOtp: process.env.NODE_ENV !== 'production' ? generatedOtp : undefined,
    });
  } catch (error: any) {
    console.error('[SendOTP API] Error:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Failed to process password recovery request.' },
      { status: 500 }
    );
  }
}
