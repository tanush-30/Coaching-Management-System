'use client';

import React, { useState } from 'react';
import { X, QrCode, CheckCircle2, ShieldCheck, Sparkles, Download, ArrowRight } from 'lucide-react';
import { FeeInstallment, Student } from '@/lib/types';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';

interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FeeInstallment | null;
  student: Student | null;
  onPaymentSuccess: (installmentId: string, paymentMode: any, transactionId?: string) => void;
}

export const UpiCheckoutModal: React.FC<UpiCheckoutModalProps> = ({
  isOpen,
  onClose,
  installment,
  student,
  onPaymentSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');

  if (!isOpen || !installment || !student) return null;

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      const txnId = `UPI/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`;
      onPaymentSuccess(installment.id, 'UPI', txnId);

      // Auto download PDF receipt
      const paidInst: FeeInstallment = {
        ...installment,
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMode: 'UPI',
        transactionId: txnId,
        receiptNumber: `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      };
      generateFeeReceiptPDF(student, paidInst);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 font-sans">
        {/* Razorpay Brand Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs">
              R
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">Apex Academy — Razorpay UPI</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> 256-Bit Encrypted Payment
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-500 mt-1">
                ₹{installment.amount.toLocaleString('en-IN')} paid for {student.name} ({installment.title}).
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 font-medium">
              ✅ Verified PDF receipt downloaded automatically & dispatched to your WhatsApp.
            </div>

            <button
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Done & Return to Portal
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Amount Banner */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Amount Payable</span>
              <div className="text-3xl font-extrabold text-slate-900">₹{installment.amount.toLocaleString('en-IN')}</div>
              <p className="text-[10px] text-slate-500">Student: {student.name} • {installment.title}</p>
            </div>

            {/* UPI App Selection */}
            <div className="space-y-2">
              <span className="font-bold text-slate-700 uppercase text-[10px] block">Select UPI Payment App</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gpay', name: 'Google Pay', icon: '🔵' },
                  { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
                  { id: 'paytm', name: 'Paytm UPI', icon: '🔷' },
                  { id: 'bhim', name: 'BHIM UPI QR', icon: '🟠' },
                ].map((app) => (
                  <button
                    type="button"
                    key={app.id}
                    onClick={() => setSelectedUpiApp(app.id as any)}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
                      selectedUpiApp === app.id
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 text-indigo-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{app.icon} {app.name}</span>
                    <span className="text-[10px] text-slate-400">Fast</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code Simulation */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="w-16 h-16 bg-white border border-slate-300 rounded-xl flex items-center justify-center font-mono text-[9px] text-slate-400 shadow-xs">
                <QrCode className="w-10 h-10 text-slate-800" />
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <span className="font-bold text-slate-800 block">Scan Dynamic UPI QR</span>
                <span>Open any UPI app to scan & complete payment instantly.</span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
            >
              {isProcessing ? (
                <span>Authorizing UPI Gateway...</span>
              ) : (
                <>
                  <span>Pay ₹{installment.amount.toLocaleString('en-IN')} via UPI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
