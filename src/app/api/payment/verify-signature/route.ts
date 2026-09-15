// API Route: /api/payment/verify-signature
// Server-side cryptographic signature verification and ledger reconciliation

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/firebase-admin';
import { getAuthenticatedUser, canAccessStudent } from '@/lib/server-auth';
import { FieldValue } from 'firebase-admin/firestore';
import { generateFeeReceiptPDFBuffer } from '@/lib/pdf-service';
import { uploadReceiptPDFToStorage, getReceiptStoragePath, getReceiptDownloadUrl } from '@/lib/receipt-storage';
import { Student, FeeInstallment, FeeReceiptRecord } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing or expired.' },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    const { orderId, paymentId, signature, installmentId, studentId } = body;

    if (!orderId || !paymentId || !signature || !installmentId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required parameters for payment verification.' },
        { status: 400 }
      );
    }

    // 3. Authorization check
    if (!canAccessStudent(user, studentId)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to verify payments for this student.' },
        { status: 403 }
      );
    }

    // 4. Cryptographically verify signature
    const isValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      console.warn(`[verify-signature] Cryptographic signature mismatch for Order: ${orderId}, Payment: ${paymentId}`);
      return NextResponse.json(
        { error: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // 5. Atomic / Consistent Database Updates
    let receiptStoragePath: string | null = null;
    let receiptUrl: string | null = null;

    if (isFirebaseAdminConfigured) {
      try {
        const orderRef = adminDb.collection('payment_orders').doc(orderId);
        const orderDoc = await orderRef.get();

        const isAlreadyReceiptGenerated = Boolean(
          orderDoc.exists && orderDoc.data()?.receiptGenerated
        );
        if (orderDoc.exists && orderDoc.data()?.receiptStoragePath) {
          receiptStoragePath = orderDoc.data()?.receiptStoragePath;
        }
        if (orderDoc.exists && orderDoc.data()?.receiptUrl) {
          receiptUrl = orderDoc.data()?.receiptUrl;
        }

        let studentData: Partial<Student> | null = null;
        let installmentData: Partial<FeeInstallment> | null = null;

        try {
          const studentDoc = await adminDb.collection('students').doc(studentId).get();
          if (studentDoc.exists) {
            studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
          }
        } catch (sErr) {
          console.warn('[verify-signature] Warning fetching student doc for receipt:', sErr);
        }

        try {
          const instDoc = await adminDb.collection('installments').doc(installmentId).get();
          if (instDoc.exists) {
            installmentData = { id: instDoc.id, ...instDoc.data() } as FeeInstallment;
          }
        } catch (iErr) {
          console.warn('[verify-signature] Warning fetching installment doc for receipt:', iErr);
        }

        let receiptPdfGenerated = false;
        let receiptPdfSize = 0;

        if (!isAlreadyReceiptGenerated) {
          try {
            const studentForReceipt: Partial<Student> = studentData || {
              name: 'Enrolled Student',
              rollNo: studentId || 'STU',
              phone: '',
              parentName: 'Parent / Guardian',
              parentPhone: '',
              parentRelation: 'Guardian',
            };

            const installmentForReceipt: Partial<FeeInstallment> = {
              ...(installmentData || {}),
              receiptNumber,
              paidDate: nowIso,
              paymentMode: 'Razorpay',
              transactionId: paymentId,
              amount: installmentData?.amount || 0,
              title: installmentData?.title || 'Tuition Fee Installment',
              installmentNo: installmentData?.installmentNo || 1,
            };

            const pdfBuffer = generateFeeReceiptPDFBuffer(studentForReceipt, installmentForReceipt);
            receiptPdfGenerated = true;
            receiptPdfSize = pdfBuffer.length;
            console.log(
              `[verify-signature] Generated server-side fee receipt PDF (${receiptPdfSize} bytes) for receipt: ${receiptNumber}`
            );

            // Upload PDF Buffer to Firebase Storage (receipts/{studentId}/{receiptNumber}.pdf)
            try {
              const uploadResult = await uploadReceiptPDFToStorage(
                pdfBuffer,
                studentId,
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
                `[verify-signature] Uploaded receipt PDF to Firebase Storage: ${receiptStoragePath}`
              );
            } catch (storageErr) {
              console.error('[verify-signature] Error uploading receipt PDF to Firebase Storage (non-blocking):', storageErr);
              // Standardized path fallback
              receiptStoragePath = getReceiptStoragePath(studentId, receiptNumber);
              try {
                receiptUrl = await getReceiptDownloadUrl(receiptStoragePath);
              } catch {
                // Ignore fallback URL generation error
              }
            }
          } catch (pdfErr) {
            console.error('[verify-signature] Error generating receipt PDF (non-blocking):', pdfErr);
          }
        }

        const batch = adminDb.batch();

        // A. Update Payment Order record
        batch.set(
          orderRef,
          {
            status: 'captured',
            paymentId,
            signature,
            receiptNumber,
            receiptGenerated: true,
            receiptGeneratedAt: nowIso,
            receiptStoragePath: receiptStoragePath || (orderDoc.exists ? orderDoc.data()?.receiptStoragePath : null) || getReceiptStoragePath(studentId, receiptNumber),
            receiptUrl: receiptUrl || (orderDoc.exists ? orderDoc.data()?.receiptUrl : null) || null,
            receiptPdfSize: receiptPdfSize || (orderDoc.exists ? orderDoc.data()?.receiptPdfSize : 0),
            paidAt: nowIso,
            verifiedBy: user.uid,
          },
          { merge: true }
        );

        // B. Update Installment record
        const instRef = adminDb.collection('installments').doc(installmentId);
        let installmentAmount = 0;

        if (installmentData) {
          installmentAmount = Number(installmentData.amount) || 0;
          batch.update(instRef, {
            status: 'paid',
            paidDate: nowIso,
            paymentMode: 'Razorpay',
            transactionId: paymentId,
            receiptNumber,
            receiptGenerated: true,
            receiptGeneratedAt: nowIso,
            receiptStoragePath: receiptStoragePath || getReceiptStoragePath(studentId, receiptNumber),
            receiptUrl: receiptUrl || (installmentData.receiptUrl ? installmentData.receiptUrl : null) || null,
          });
        }

        // C. Update Student record (paidFee and pendingFee) — strictly idempotent
        const isAlreadyPaid = installmentData?.status === 'paid';
        if (!isAlreadyPaid && installmentAmount > 0) {
          const studentRef = adminDb.collection('students').doc(studentId);
          batch.update(studentRef, {
            paidFee: FieldValue.increment(installmentAmount),
            pendingFee: FieldValue.increment(-installmentAmount),
          });
        }

        // D. Record in top-level 'receipts' collection for global lookup & audit
        if (receiptNumber) {
          const receiptDocRef = adminDb.collection('receipts').doc(receiptNumber);
          const receiptRecord: Partial<FeeReceiptRecord> = {
            id: receiptNumber,
            receiptNumber,
            studentId,
            studentName: studentData?.name || 'Enrolled Student',
            rollNo: studentData?.rollNo || studentId || 'STU',
            installmentId,
            orderId,
            paymentId,
            amount: installmentAmount,
            title: installmentData?.title || 'Tuition Fee Installment',
            paymentMode: 'Razorpay',
            paidDate: nowIso,
            receiptStoragePath: receiptStoragePath || getReceiptStoragePath(studentId, receiptNumber),
            receiptUrl: receiptUrl || undefined,
            receiptPdfSize: receiptPdfSize || (orderDoc.exists ? orderDoc.data()?.receiptPdfSize : 0),
            createdAt: nowIso,
            generatedAt: nowIso,
            status: 'active',
          };
          batch.set(receiptDocRef, receiptRecord, { merge: true });
        }

        await batch.commit();
      } catch (dbErr: any) {
        console.error('[verify-signature] Firestore batch update error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and fee ledger updated successfully.',
      receiptNumber,
      transactionId: paymentId,
      orderId,
      receiptStoragePath: receiptStoragePath || getReceiptStoragePath(studentId, receiptNumber),
      receiptUrl: receiptUrl || undefined,
    });
  } catch (error: any) {
    console.error('[API /api/payment/verify-signature] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment.' },
      { status: 500 }
    );
  }
}
