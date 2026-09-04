'use client';

import React, { useState } from 'react';
import { X, Check, CreditCard, DollarSign, QrCode, FileText } from 'lucide-react';
import { FeeInstallment, Student } from '@/lib/types';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: FeeInstallment | null;
  student: Student | null;
  onRecord: (installmentId: string, paymentMode: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'Razorpay', transactionId?: string) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  installment,
  student,
  onRecord,
}) => {
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer' | 'Razorpay'>('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [generatePdfAfterSave, setGeneratePdfAfterSave] = useState(true);

  if (!isOpen || !installment || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecord(installment.id, paymentMode, transactionRef || undefined);

    if (generatePdfAfterSave) {
      // Create temporary paid object for instant PDF generation
      const paidInst: FeeInstallment = {
        ...installment,
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMode,
        transactionId: transactionRef || `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        receiptNumber: `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      };
      generateFeeReceiptPDF(student, paidInst);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record Fee Collection</h3>
              <p className="text-xs text-slate-500">Collect payment & auto-generate digital receipt</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student & Installment Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Student Name:</span>
            <span className="font-bold text-slate-900">{student.name} ({student.rollNo})</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Particulars:</span>
            <span className="font-semibold text-slate-800">{installment.title} (Installment #{installment.installmentNo})</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Due Date:</span>
            <span className="font-medium text-slate-700">{installment.dueDate}</span>
          </div>
          <div className="pt-2 border-t flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 uppercase">Amount Due:</span>
            <span className="text-xl font-extrabold text-emerald-600">₹{installment.amount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1.5 text-[11px]">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(['UPI', 'Cash', 'Card', 'Bank Transfer', 'Razorpay'] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    paymentMode === mode
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {paymentMode === mode && <Check className="w-3.5 h-3.5" />}
                  <span>{mode}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1 text-[11px]">
              Transaction Ref / UTR / Cash Voucher No (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UPI/260904/998811 or CASH-VCH-401"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="pdfDownload"
              checked={generatePdfAfterSave}
              onChange={(e) => setGeneratePdfAfterSave(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="pdfDownload" className="text-xs text-slate-700 font-medium cursor-pointer">
              Automatically download verified PDF receipt immediately
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Record ₹{installment.amount.toLocaleString('en-IN')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
