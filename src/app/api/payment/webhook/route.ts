// API Route: /api/payment/webhook
// Asynchronous Razorpay webhook event processing with HMAC signature verification,
// event deduplication / idempotency registry (webhook_events), and ledger reconciliation.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateFeeReceiptPDFBuffer } from '@/lib/pdf-service';
import { uploadReceiptPDFToStorage, getReceiptStoragePath, getReceiptDownloadUrl } from '@/lib/receipt-storage';
import { Student, FeeInstallment, FeeReceiptRecord } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    // 1. Cryptographic HMAC-SHA256 signature verification
    const isValid = verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValid) {
      console.warn('[webhook] Invalid Razorpay webhook signature received.');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity || {};
    const orderEntity = event.payload?.order?.entity || {};
    const refundEntity = event.payload?.refund?.entity || {};

    const orderId = paymentEntity.order_id || orderEntity.id || refundEntity.order_id || 'unknown_order';
    const paymentId = paymentEntity.id || refundEntity.payment_id || 'unknown_payment';
    const eventId = event.event_id || event.id || `evt_${eventType}_${orderId}_${paymentId}`;
    const nowIso = new Date().toISOString();

    console.log(`[webhook] Verified Razorpay event: ${eventType} (Event ID: ${eventId}, Order ID: ${orderId})`);

    // 2. Idempotency Check in Firestore
    if (isFirebaseAdminConfigured) {
      try {
        const eventDocRef = adminDb.collection('webhook_events').doc(eventId);
        const eventDoc = await eventDocRef.get();

        if (eventDoc.exists && eventDoc.data()?.status === 'processed') {
          console.log(`[webhook] Idempotency notice: Event ${eventId} already processed.`);
          return NextResponse.json({ received: true, idempotentSkip: true });
        }
      } catch (checkErr) {
        console.warn('[webhook] Warning checking idempotency table:', checkErr);
      }
    }

    // 3. Event Processing
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const notes = paymentEntity.notes || orderEntity.notes || {};
      const { studentId, installmentId } = notes;

      if (isFirebaseAdminConfigured && orderId !== 'unknown_order') {
        try {
          const orderRef = adminDb.collection('payment_orders').doc(orderId);
          const orderDoc = await orderRef.get();

          const isAlreadyReceiptGenerated = Boolean(
            orderDoc.exists && orderDoc.data()?.receiptGenerated
          );

          const receiptNumber =
            orderDoc.exists && orderDoc.data()?.receiptNumber
              ? orderDoc.data()?.receiptNumber
              : `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

          const targetInstallmentId = installmentId || (orderDoc.exists ? orderDoc.data()?.installmentId : null);
          const targetStudentId = studentId || (orderDoc.exists ? orderDoc.data()?.studentId : null);

          // Fetch student & installment data for PDF generation & balance updates
          let studentData: Partial<Student> | null = null;
          let installmentData: Partial<FeeInstallment> | null = null;

          if (targetStudentId) {
            try {
              const studentDoc = await adminDb.collection('students').doc(targetStudentId).get();
              if (studentDoc.exists) {
                studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
              }
            } catch (sErr) {
              console.warn('[webhook] Warning fetching student doc for receipt:', sErr);
            }
          }

          if (targetInstallmentId) {
            try {
              const instDoc = await adminDb.collection('installments').doc(targetInstallmentId).get();
              if (instDoc.exists) {
                installmentData = { id: instDoc.id, ...instDoc.data() } as FeeInstallment;
              }
            } catch (iErr) {
              console.warn('[webhook] Warning fetching installment doc for receipt:', iErr);
            }
          }

          // Trigger Server-Side Receipt Generation & Storage Upload if not already generated
          let receiptPdfGenerated = false;
          let receiptPdfSize = 0;
          let receiptStoragePath = orderDoc.exists ? orderDoc.data()?.receiptStoragePath || null : null;
          let receiptUrl = orderDoc.exists ? orderDoc.data()?.receiptUrl || null : null;

          if (!isAlreadyReceiptGenerated) {
            try {
              const studentForReceipt: Partial<Student> = studentData || {
                name: notes.studentName || 'Enrolled Student',
                rollNo: notes.rollNo || targetStudentId || 'STU',
                phone: notes.phone || '',
                parentName: notes.parentName || 'Parent / Guardian',
                parentPhone: notes.parentPhone || '',
                parentRelation: 'Guardian',
              };

              const installmentForReceipt: Partial<FeeInstallment> = {
                ...(installmentData || {}),
                receiptNumber,
                paidDate: nowIso,
                paymentMode: 'Razorpay',
                transactionId: paymentId,
                amount: (installmentData?.amount) || (Number(paymentEntity.amount) ? Number(paymentEntity.amount) / 100 : 0),
                title: installmentData?.title || notes.installmentTitle || 'Tuition Fee Installment',
                installmentNo: installmentData?.installmentNo || 1,
              };

              const pdfBuffer = generateFeeReceiptPDFBuffer(studentForReceipt, installmentForReceipt);
              receiptPdfGenerated = true;
              receiptPdfSize = pdfBuffer.length;
              console.log(
                `[webhook] Generated server-side fee receipt PDF (${receiptPdfSize} bytes) for receipt: ${receiptNumber}`
              );

              // Upload PDF Buffer to Firebase Storage (receipts/{studentId}/{receiptNumber}.pdf)
              try {
                const uploadResult = await uploadReceiptPDFToStorage(
                  pdfBuffer,
                  targetStudentId || 'unknown',
                  receiptNumber,
                  {
                    paymentId,
                    orderId,
                    studentName: studentForReceipt.name,
                  }
                );
                receiptStoragePath = uploadResult.storagePath;
                receiptUrl = uploadResult.downloadUrl || (await getReceiptDownloadUrl(receiptStoragePath));
                console.log(
                  `[webhook] Uploaded receipt PDF to Firebase Storage: ${receiptStoragePath}`
                );
              } catch (storageErr) {
                console.error('[webhook] Error uploading receipt PDF to Firebase Storage (non-blocking):', storageErr);
                // Fallback default path for indexing if upload failed but path is standardized
                receiptStoragePath = getReceiptStoragePath(targetStudentId || 'unknown', receiptNumber);
                try {
                  receiptUrl = await getReceiptDownloadUrl(receiptStoragePath);
                } catch {
                  // Ignore fallback URL generation error
                }
              }
            } catch (pdfErr) {
              // Critical: Never fail or rollback payment capture if receipt generation encounters an error
              console.error('[webhook] Error generating receipt PDF (non-blocking):', pdfErr);
            }
          } else {
            console.log(`[webhook] Idempotency notice: Receipt already generated for order ${orderId}`);
          }

          const batch = adminDb.batch();

          // A. Mark Payment Order document as captured with receipt metadata
          batch.set(
            orderRef,
            {
              status: 'captured',
              paymentId,
              receiptNumber,
              receiptGenerated: true,
              receiptGeneratedAt: nowIso,
              receiptStoragePath: receiptStoragePath || (receiptNumber ? getReceiptStoragePath(targetStudentId || 'unknown', receiptNumber) : null),
              receiptUrl: receiptUrl || (orderDoc.exists ? orderDoc.data()?.receiptUrl : null) || null,
              receiptPdfSize: receiptPdfSize || (orderDoc.exists ? orderDoc.data()?.receiptPdfSize : 0),
              webhookProcessedAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );

          // B. Update Installment and Student Fee balances
          if (targetInstallmentId) {
            const instRef = adminDb.collection('installments').doc(targetInstallmentId);
            const instDoc = await instRef.get();

            if (instDoc.exists && instDoc.data()?.status !== 'paid') {
              const amount = Number(instDoc.data()?.amount) || 0;
              batch.update(instRef, {
                status: 'paid',
                paidDate: nowIso,
                paymentMode: 'Razorpay',
                transactionId: paymentId,
                receiptNumber,
                receiptGenerated: true,
                receiptGeneratedAt: nowIso,
                receiptStoragePath: receiptStoragePath || (receiptNumber ? getReceiptStoragePath(targetStudentId || 'unknown', receiptNumber) : null),
                receiptUrl: receiptUrl || (instDoc.exists ? instDoc.data()?.receiptUrl : null) || null,
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

          // C. Record receipt in top-level 'receipts' collection for global lookup & audit
          if (receiptNumber) {
            const receiptDocRef = adminDb.collection('receipts').doc(receiptNumber);
            const receiptRecord: Partial<FeeReceiptRecord> = {
              id: receiptNumber,
              receiptNumber,
              studentId: targetStudentId || 'unknown',
              studentName: notes.studentName || studentData?.name || 'Enrolled Student',
              rollNo: notes.rollNo || studentData?.rollNo || targetStudentId || 'STU',
              installmentId: targetInstallmentId || undefined,
              orderId,
              paymentId,
              amount: (installmentData?.amount) || (Number(paymentEntity.amount) ? Number(paymentEntity.amount) / 100 : 0),
              title: installmentData?.title || notes.installmentTitle || 'Tuition Fee Installment',
              paymentMode: 'Razorpay',
              paidDate: nowIso,
              receiptStoragePath: receiptStoragePath || getReceiptStoragePath(targetStudentId || 'unknown', receiptNumber),
              receiptUrl: receiptUrl || undefined,
              receiptPdfSize: receiptPdfSize || (orderDoc.exists ? orderDoc.data()?.receiptPdfSize : 0),
              createdAt: nowIso,
              generatedAt: nowIso,
              status: 'active',
            };
            batch.set(receiptDocRef, receiptRecord, { merge: true });
          }

          // D. Record Event in webhook_events registry for audit & idempotency
          const eventRef = adminDb.collection('webhook_events').doc(eventId);
          batch.set(eventRef, {
            eventId,
            eventType,
            orderId,
            paymentId,
            status: 'processed',
            rawPayload: event,
            receiptNumber,
            receiptGenerated: true,
            receiptStoragePath: receiptStoragePath || null,
            receiptUrl: receiptUrl || null,
            processedAt: nowIso,
          });

          await batch.commit();
          console.log(`[webhook] Successfully processed payment capture & receipt trigger for Order: ${orderId}`);
        } catch (dbErr) {
          console.error('[webhook] Error writing capture batch to Firestore:', dbErr);
        }
      }
    } else if (eventType === 'payment.failed') {
      const errorDescription = paymentEntity.error_description || 'Payment was declined or cancelled';

      if (isFirebaseAdminConfigured && orderId !== 'unknown_order') {
        try {
          const batch = adminDb.batch();
          const orderRef = adminDb.collection('payment_orders').doc(orderId);

          batch.set(
            orderRef,
            {
              status: 'failed',
              failureReason: errorDescription,
              failedAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );

          const eventRef = adminDb.collection('webhook_events').doc(eventId);
          batch.set(eventRef, {
            eventId,
            eventType,
            orderId,
            paymentId,
            status: 'processed',
            rawPayload: event,
            processedAt: nowIso,
          });

          await batch.commit();
          console.log(`[webhook] Recorded payment failure for Order: ${orderId}`);
        } catch (dbErr) {
          console.error('[webhook] Error recording failure event in Firestore:', dbErr);
        }
      }
    } else if (eventType === 'refund.processed' || eventType === 'refund.created') {
      const refundAmount = refundEntity.amount ? refundEntity.amount / 100 : 0;
      const refundId = refundEntity.id || 'unknown_refund';

      if (isFirebaseAdminConfigured && orderId !== 'unknown_order') {
        try {
          const batch = adminDb.batch();
          const orderRef = adminDb.collection('payment_orders').doc(orderId);

          batch.set(
            orderRef,
            {
              status: 'refunded',
              refundId,
              refundAmount,
              refundedAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );

          const eventRef = adminDb.collection('webhook_events').doc(eventId);
          batch.set(eventRef, {
            eventId,
            eventType,
            orderId,
            paymentId,
            refundId,
            status: 'processed',
            rawPayload: event,
            processedAt: nowIso,
          });

          await batch.commit();
          console.log(`[webhook] Recorded refund for Order: ${orderId}, Amount: ${refundAmount}`);
        } catch (dbErr) {
          console.error('[webhook] Error recording refund event in Firestore:', dbErr);
        }
      }
    } else {
      // Record unhandled / informational events (e.g. transfer.processed, settlement.created)
      if (isFirebaseAdminConfigured) {
        try {
          await adminDb.collection('webhook_events').doc(eventId).set({
            eventId,
            eventType,
            orderId,
            paymentId,
            status: 'acknowledged',
            rawPayload: event,
            processedAt: nowIso,
          });
        } catch (dbErr) {
          console.warn('[webhook] Error logging acknowledged event:', dbErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[API /api/payment/webhook] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}
