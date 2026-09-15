// API Route: /api/payment/create-order
// Server-side Razorpay order creation with server-derived fee amounts

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  getRazorpayInstance,
  isRazorpayConfigured,
  getRazorpayKeyMode,
  sanitizeReceiptId,
  formatPaiseAmount,
} from '@/lib/razorpay';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getAuthenticatedUser, canAccessStudent } from '@/lib/server-auth';
import { DEFAULT_FEE_STRUCTURE } from '@/lib/settings-defaults';
import type { FeeStructureSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing or expired' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    const { installmentId, studentId } = body;

    if (!installmentId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: installmentId and studentId are required.' },
        { status: 400 }
      );
    }

    // 3. Authorization check
    if (!canAccessStudent(user, studentId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to pay for this student.' },
        { status: 403 }
      );
    }

    // 4. Verify Razorpay Configuration
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          error:
            'Razorpay payment gateway credentials are not configured on the server. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local.',
        },
        { status: 503 }
      );
    }

    // 5. Re-derive fee amount server-side from Firestore & Settings
    let baseAmount = 0;
    let installmentTitle = 'Fee Installment';
    let dueDate = '';
    let studentName = '';

    if (isFirebaseAdminConfigured) {
      // Fetch installment
      let installmentDoc = await adminDb.collection('installments').doc(installmentId).get();
      if (!installmentDoc.exists) {
        installmentDoc = await adminDb.collection('fee_ledgers').doc(installmentId).get();
      }

      if (installmentDoc.exists) {
        const instData = installmentDoc.data()!;
        if (instData.status === 'paid') {
          return NextResponse.json(
            { error: 'This fee installment has already been marked as paid.' },
            { status: 400 }
          );
        }
        baseAmount = Number(instData.amount) || 0;
        installmentTitle = instData.title || installmentTitle;
        dueDate = instData.dueDate || '';
      }

      // Fetch student info
      const studentDoc = await adminDb.collection('students').doc(studentId).get();
      if (studentDoc.exists) {
        studentName = studentDoc.data()?.name || '';
      }
    }

    // Fallback baseAmount if not found in db or in dev mock mode
    if (baseAmount <= 0) {
      if (body.fallbackAmount && (process.env.NODE_ENV === 'development' || !isFirebaseAdminConfigured)) {
        baseAmount = Number(body.fallbackAmount);
      } else {
        return NextResponse.json(
          { error: 'Fee installment record not found or has an invalid amount.' },
          { status: 404 }
        );
      }
    }

    // Fetch Fee Structure Settings for Late Fee calculation
    let feeSettings: FeeStructureSettings = DEFAULT_FEE_STRUCTURE;
    if (isFirebaseAdminConfigured) {
      try {
        const settingsDoc = await adminDb.collection('settings').doc('feeStructure').get();
        if (settingsDoc.exists) {
          feeSettings = { ...DEFAULT_FEE_STRUCTURE, ...(settingsDoc.data() as FeeStructureSettings) };
        }
      } catch (err) {
        console.warn('[create-order] Error loading fee settings, using defaults:', err);
      }
    }

    // Calculate Late Fee if overdue
    let lateFee = 0;
    if (feeSettings.lateFeeEnabled && dueDate) {
      const dueDateTime = new Date(dueDate).getTime();
      const now = Date.now();
      const gracePeriodMs = (feeSettings.lateFeeGraceDays || 0) * 86400000;
      if (now > dueDateTime + gracePeriodMs) {
        const daysOverdue = Math.max(1, Math.floor((now - (dueDateTime + gracePeriodMs)) / 86400000));
        const calculated = daysOverdue * (feeSettings.lateFeeDailyAmount || 0);
        lateFee = feeSettings.lateFeeMaxCap > 0 ? Math.min(calculated, feeSettings.lateFeeMaxCap) : calculated;
      }
    }

    const totalAmount = baseAmount + lateFee;
    const amountInPaise = formatPaiseAmount(totalAmount);

    if (amountInPaise <= 0) {
      return NextResponse.json(
        { error: 'Computed fee amount must be greater than zero.' },
        { status: 400 }
      );
    }

    // 6. Create Order with Razorpay SDK
    const razorpay = getRazorpayInstance();
    const rawReceipt = `rcpt_${installmentId}_${Date.now()}`;
    const receiptId = sanitizeReceiptId(rawReceipt);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        studentId,
        studentName,
        installmentId,
        installmentTitle,
      },
    });

    // 7. Persist Pending Payment Order record in Firestore
    if (isFirebaseAdminConfigured) {
      try {
        await adminDb.collection('payment_orders').doc(order.id).set({
          orderId: order.id,
          studentId,
          installmentId,
          studentName,
          title: installmentTitle,
          baseAmount,
          lateFee,
          totalAmount,
          amountInPaise,
          currency: order.currency || 'INR',
          receipt: order.receipt,
          status: 'created',
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
        });
      } catch (err) {
        console.warn('[create-order] Error saving payment_orders record in Firestore:', err);
      }
    }

    // 8. Return client checkout details
    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      studentId,
      installmentId,
      receipt: order.receipt,
      totalAmount,
    });
  } catch (error: any) {
    console.error('[API /api/payment/create-order] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment order.' },
      { status: 500 }
    );
  }
}
