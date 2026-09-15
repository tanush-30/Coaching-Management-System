// API Route: /api/payment/reconcile-order
// Server-side manual order reconciliation with Razorpay API and audit log entry generation.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayInstance, isRazorpayConfigured } from '@/lib/razorpay';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { AuditLogEntry } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Admin
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can trigger manual payment reconciliation.' },
        { status: 403 }
      );
    }

    // 2. Parse request
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId' },
        { status: 400 }
      );
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: 'Razorpay gateway is not configured on the server.' },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();
    let orderDocData: any = null;
    let beforeStatus = 'unknown';

    // 3. Look up order record in Firestore
    if (isFirebaseAdminConfigured) {
      const orderDoc = await adminDb.collection('payment_orders').doc(orderId).get();
      if (orderDoc.exists) {
        orderDocData = orderDoc.data();
        beforeStatus = orderDocData?.status || 'created';
      }
    }

    // 4. Fetch live order and payments status from Razorpay API
    const razorpay = getRazorpayInstance();
    let paymentsResponse: any = { items: [] };

    try {
      paymentsResponse = await razorpay.orders.fetchPayments(orderId);
    } catch (rzpErr: any) {
      console.warn(`[reconcile-order] Razorpay fetch payments warning for Order ${orderId}:`, rzpErr.message);
    }

    const paymentsList = paymentsResponse?.items || [];
    const capturedPayment = paymentsList.find((p: any) => p.status === 'captured');
    const failedPayment = paymentsList.find((p: any) => p.status === 'failed');

    let afterStatus = beforeStatus;
    let reconciled = false;
    let paymentId = capturedPayment?.id || failedPayment?.id || null;

    if (capturedPayment) {
      afterStatus = 'captured';
      paymentId = capturedPayment.id;
      reconciled = true;

      if (isFirebaseAdminConfigured) {
        const batch = adminDb.batch();
        const orderRef = adminDb.collection('payment_orders').doc(orderId);
        const receiptNumber =
          orderDocData?.receiptNumber ||
          `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        // Update payment_orders
        batch.set(
          orderRef,
          {
            status: 'captured',
            paymentId: capturedPayment.id,
            paymentMethod: capturedPayment.method || 'UPI',
            receiptNumber,
            reconciledAt: nowIso,
            reconciledBy: user.uid,
            updatedAt: nowIso,
          },
          { merge: true }
        );

        // Update installment
        const targetInstallmentId =
          orderDocData?.installmentId || capturedPayment.notes?.installmentId;
        const targetStudentId =
          orderDocData?.studentId || capturedPayment.notes?.studentId;

        if (targetInstallmentId) {
          const instRef = adminDb.collection('installments').doc(targetInstallmentId);
          const instDoc = await instRef.get();

          if (instDoc.exists && instDoc.data()?.status !== 'paid') {
            const amount = Number(instDoc.data()?.amount) || 0;
            batch.update(instRef, {
              status: 'paid',
              paidDate: nowIso,
              paymentMode: 'Razorpay',
              transactionId: capturedPayment.id,
              receiptNumber,
            });

            if (targetStudentId && amount > 0) {
              const studentRef = adminDb.collection('students').doc(targetStudentId);
              batch.update(studentRef, {
                paidFee: FieldValue.increment(amount),
                pendingFee: FieldValue.increment(-amount),
              });
            }
          }
        }

        // Write Audit Log Entry
        const auditLogRef = adminDb.collection('audit_logs').doc();
        const auditEntry: AuditLogEntry = {
          id: auditLogRef.id,
          actorUid: user.uid,
          actorRole: 'admin',
          action: 'payment_manual_reconciliation_captured',
          targetId: orderId,
          before: { status: beforeStatus },
          after: { status: 'captured', paymentId: capturedPayment.id, receiptNumber },
          timestamp: nowIso,
        };
        batch.set(auditLogRef, auditEntry);

        await batch.commit();
      }
    } else if (failedPayment) {
      afterStatus = 'failed';
      reconciled = true;

      if (isFirebaseAdminConfigured) {
        const batch = adminDb.batch();
        const orderRef = adminDb.collection('payment_orders').doc(orderId);

        batch.set(
          orderRef,
          {
            status: 'failed',
            failureReason: failedPayment.error_description || 'Payment failed on gateway',
            reconciledAt: nowIso,
            reconciledBy: user.uid,
            updatedAt: nowIso,
          },
          { merge: true }
        );

        const auditLogRef = adminDb.collection('audit_logs').doc();
        const auditEntry: AuditLogEntry = {
          id: auditLogRef.id,
          actorUid: user.uid,
          actorRole: 'admin',
          action: 'payment_manual_reconciliation_failed',
          targetId: orderId,
          before: { status: beforeStatus },
          after: { status: 'failed', failureReason: failedPayment.error_description },
          timestamp: nowIso,
        };
        batch.set(auditLogRef, auditEntry);

        await batch.commit();
      }
    } else {
      // Order exists on gateway but has not received attempts yet or remains open
      if (isFirebaseAdminConfigured) {
        const auditLogRef = adminDb.collection('audit_logs').doc();
        const auditEntry: AuditLogEntry = {
          id: auditLogRef.id,
          actorUid: user.uid,
          actorRole: 'admin',
          action: 'payment_manual_reconciliation_check_no_payment',
          targetId: orderId,
          before: { status: beforeStatus },
          after: { status: beforeStatus, gatewayAttempts: paymentsList.length },
          timestamp: nowIso,
        };
        await auditLogRef.set(auditEntry);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      beforeStatus,
      afterStatus,
      reconciled,
      paymentId,
      paymentsFound: paymentsList.length,
      message: capturedPayment
        ? 'Payment captured on gateway and ledger updated.'
        : failedPayment
        ? 'Payment failed on gateway and status updated.'
        : 'Gateway check complete: No captured payment found for this order ID yet.',
    });
  } catch (error: any) {
    console.error('[API /api/payment/reconcile-order] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reconcile payment order.' },
      { status: 500 }
    );
  }
}
