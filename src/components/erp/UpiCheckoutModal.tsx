'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { FeeInstallment, Student } from '@/lib/types';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';
import { useSettings } from '@/lib/useSettings';
import { loadRazorpayCheckout, RazorpaySuccessHandlerArgs } from '@/lib/load-razorpay';

interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FeeInstallment | null;
  student: Student | null;
  onPaymentSuccess: (installmentId: string, paymentMode: any, transactionId?: string) => void;
}

type CheckoutStatus = 'idle' | 'creating_order' | 'gateway_open' | 'verifying' | 'success' | 'failed';

export const UpiCheckoutModal: React.FC<UpiCheckoutModalProps> = ({
  isOpen,
  onClose,
  installment,
  student,
  onPaymentSuccess,
}) => {
  const { schoolInfo, feeStructure } = useSettings();
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptDetails, setReceiptDetails] = useState<{
    receiptNumber: string;
    transactionId: string;
    amountPaid: number;
    orderId: string;
  } | null>(null);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'all'>('all');

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage(null);
      setReceiptDetails(null);
      // Preload Razorpay Checkout script in background
      loadRazorpayCheckout().catch(() => {});
    }
  }, [isOpen, installment?.id]);

  if (!isOpen || !installment || !student) return null;

  const currencySym = schoolInfo.currencySymbol || '₹';
  const instituteTitle = schoolInfo.institutionName || 'Apex Academy';
  const payeeMerchant = feeStructure.upiPayeeName || instituteTitle;
  const upiId = feeStructure.upiId || 'apexcoaching@icici';

  const handleInitiatePayment = async () => {
    try {
      setStatus('creating_order');
      setErrorMessage(null);

      // 1. Ensure Razorpay SDK script is loaded
      const isLoaded = await loadRazorpayCheckout();
      if (!isLoaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Unable to initialize payment gateway. Please check your internet connection and try again.');
      }

      // 2. Call server-side Create Order API
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentId: installment.id,
          studentId: student.id,
          fallbackAmount: installment.amount,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to generate secure payment order.');
      }

      const { orderId, amount, currency, keyId } = orderData;

      // 3. Launch Razorpay Standard Checkout Modal
      const options = {
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_51K9DEMOKEY9988',
        amount: amount,
        currency: currency || 'INR',
        name: instituteTitle,
        description: `${installment.title} - ${student.name}`,
        image: schoolInfo.logoUrl || undefined,
        order_id: orderId,
        prefill: {
          name: student.parentName || student.name,
          email: student.parentEmail || student.email,
          contact: student.parentPhone || student.phone,
        },
        notes: {
          studentId: student.id,
          studentName: student.name,
          installmentId: installment.id,
          installmentTitle: installment.title,
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setStatus((prev) => (prev === 'verifying' || prev === 'success' ? prev : 'idle'));
          },
        },
        handler: async (response: RazorpaySuccessHandlerArgs) => {
          await handleVerifyPayment(response, orderId);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.warn('[Razorpay Checkout] Payment failed event:', resp.error);
        setStatus('failed');
        setErrorMessage(resp.error?.description || 'Payment was declined or cancelled by the provider.');
      });

      setStatus('gateway_open');
      rzp.open();
    } catch (err: any) {
      console.error('[UpiCheckoutModal] Checkout initiation error:', err);
      setStatus('failed');
      setErrorMessage(err.message || 'An error occurred while launching checkout.');
    }
  };

  const handleVerifyPayment = async (
    response: RazorpaySuccessHandlerArgs,
    orderId: string
  ) => {
    try {
      setStatus('verifying');

      const verifyRes = await fetch('/api/payment/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: response.razorpay_order_id || orderId,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          installmentId: installment.id,
          studentId: student.id,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Cryptographic payment verification failed.');
      }

      const receiptNumber = verifyData.receiptNumber || `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const transactionId = response.razorpay_payment_id;

      // Update ERP store state
      onPaymentSuccess(installment.id, 'Razorpay', transactionId);

      const paidRecord: FeeInstallment = {
        ...installment,
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Razorpay',
        transactionId: transactionId,
        receiptNumber: receiptNumber,
      };

      // Set confirmation state
      setReceiptDetails({
        receiptNumber,
        transactionId,
        amountPaid: installment.amount,
        orderId,
      });
      setStatus('success');

      // Auto-generate verified PDF receipt with academy branding
      try {
        generateFeeReceiptPDF(student, paidRecord, schoolInfo);
      } catch (pdfErr) {
        console.warn('[UpiCheckoutModal] Automatic PDF receipt download warning:', pdfErr);
      }
    } catch (err: any) {
      console.error('[UpiCheckoutModal] Verification error:', err);
      setStatus('failed');
      setErrorMessage(err.message || 'Payment received but verification failed. Please contact admin.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 font-sans">
        {/* Gateway Brand Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
              ⚡
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">{payeeMerchant}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Razorpay Secured • 256-Bit SSL
              </div>
            </div>
          </div>
          {status !== 'verifying' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 1. SUCCESS VIEW */}
        {status === 'success' && receiptDetails && (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Payment Verified!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {currencySym}{receiptDetails.amountPaid.toLocaleString('en-IN')} paid successfully for {student.name}.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Receipt No:</span>
                <span className="font-bold text-slate-800">{receiptDetails.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Transaction ID:</span>
                <span className="font-bold text-indigo-600">{receiptDetails.transactionId}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Installment:</span>
                <span className="text-slate-800">{installment.title}</span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 font-medium flex items-center gap-2 text-left">
              <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Official digitally signed PDF receipt generated & dispatched to WhatsApp.</span>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all active:scale-98"
            >
              Done & Return to Portal
            </button>
          </div>
        )}

        {/* 2. VERIFYING / PROCESSING VIEW */}
        {status === 'verifying' && (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Verifying Payment Signature</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Validating cryptographic signature with payment gateway and updating ledger...
              </p>
            </div>
          </div>
        )}

        {/* 3. ORDER CREATION / OPENING VIEW */}
        {(status === 'creating_order' || status === 'gateway_open') && (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {status === 'creating_order' ? 'Generating Secure Order...' : 'Awaiting Payment in Modal...'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {status === 'creating_order'
                  ? 'Connecting to payment provider to lock fee amount'
                  : 'Please complete the transaction in the Razorpay checkout popup.'}
              </p>
            </div>
          </div>
        )}

        {/* 4. ERROR VIEW */}
        {status === 'failed' && (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Payment Incomplete</h3>
              <p className="text-xs text-rose-600 mt-1 max-w-xs mx-auto bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {errorMessage || 'Payment could not be completed.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('idle')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* 5. INITIAL READY VIEW */}
        {status === 'idle' && (
          <div className="space-y-4 text-xs">
            {/* Amount Banner */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Payable</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {currencySym}{installment.amount.toLocaleString('en-IN')}
              </div>
              <p className="text-[10px] text-slate-500">
                Student: <strong className="text-slate-700">{student.name}</strong> • {installment.title}
              </p>
            </div>

            {/* Payment Method Selector Preview */}
            <div className="space-y-2">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">Supported Payment Methods</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', name: 'Instant UPI & Cards', icon: <Smartphone className="w-4 h-4 text-indigo-600" /> },
                  { id: 'gpay', name: 'Google Pay / PhonePe', icon: <span className="text-sm">🔵</span> },
                  { id: 'paytm', name: 'Paytm / NetBanking', icon: <CreditCard className="w-4 h-4 text-emerald-600" /> },
                  { id: 'bhim', name: 'Dynamic UPI QR', icon: <QrCode className="w-4 h-4 text-amber-600" /> },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedUpiApp(item.id as any)}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
                      selectedUpiApp === item.id
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 text-indigo-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payee Details & Security */}
            <div className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 shadow-xs">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <span className="font-bold text-slate-800 block">Verified Merchant Checkout</span>
                <span>Direct payout to <strong>{payeeMerchant}</strong>. Automatic receipt upon payment.</span>
              </div>
            </div>

            {/* Launch Checkout Button */}
            <button
              onClick={handleInitiatePayment}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-98 transition-all cursor-pointer"
            >
              <span>Pay {currencySym}{installment.amount.toLocaleString('en-IN')} Securely</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
