'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Search, 
  Download, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  QrCode,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Building,
  Check
} from 'lucide-react';
import { FeeInstallment, Student } from '@/lib/types';
import { RecordPaymentModal } from './RecordPaymentModal';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';

interface FeeManagementProps {
  installments: FeeInstallment[];
  students: Student[];
  onRecordPayment: (installmentId: string, paymentMode: any, transactionId?: string) => void;
  onSendReminder: (installmentId: string) => void;
}

export const FeeManagement: React.FC<FeeManagementProps> = ({
  installments,
  students,
  onRecordPayment,
  onSendReminder,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstForPayment, setSelectedInstForPayment] = useState<{ installment: FeeInstallment; student: Student } | null>(null);
  const [copiedLinkInstId, setCopiedLinkInstId] = useState<string | null>(null);
  const [remindedInstId, setRemindedInstId] = useState<string | null>(null);

  // Filter logic
  const filteredInstallments = installments.filter((inst) => {
    const student = students.find((s) => s.id === inst.studentId);
    const matchesSearch =
      (student && student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student && student.rollNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inst.receiptNumber && inst.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'pending' && inst.status === 'pending') ||
      (activeFilter === 'overdue' && inst.status === 'overdue') ||
      (activeFilter === 'paid' && inst.status === 'paid');

    return matchesSearch && matchesFilter;
  });

  const totalCollected = installments.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = installments.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = installments.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);

  const handleCopyLink = (inst: FeeInstallment) => {
    navigator.clipboard.writeText(inst.paymentLink || 'https://pages.razorpay.com/pl_apex_pay');
    setCopiedLinkInstId(inst.id);
    setTimeout(() => setCopiedLinkInstId(null), 2500);
  };

  const handleSendReminder = (instId: string) => {
    onSendReminder(instId);
    setRemindedInstId(instId);
    setTimeout(() => setRemindedInstId(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Fee Invoicing & Ledger Control</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Live Billing & Invoicing</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Fee Management & Digital Receipts</h2>
          <p className="text-xs text-slate-500">Track installment schedules, generate UPI payment links, and download verified PDF receipts.</p>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Total Collected</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{totalCollected.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-emerald-700 font-medium">Reconciled via UPI & Cash</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Overdue Balance</span>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">₹{totalOverdue.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-rose-600 font-medium">Auto WhatsApp Escalation</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Total Outstanding Dues</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">₹{totalPending.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-slate-500 font-medium">Across All Active Batches</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Installments' },
            { id: 'pending', label: 'Pending Dues' },
            { id: 'overdue', label: 'Overdue Dues' },
            { id: 'paid', label: 'Paid & Receipts' },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isSelected ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or roll no..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                <th className="p-4">Student & Roll No</th>
                <th className="p-4">Particulars</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status & Mode</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No installments found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredInstallments.map((inst) => {
                  const student = students.find((s) => s.id === inst.studentId);
                  if (!student) return null;

                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/80 transition-all">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-[10px] text-indigo-600 font-mono">{student.rollNo}</div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{inst.title}</div>
                        <div className="text-[10px] text-slate-400">Installment #{inst.installmentNo}</div>
                      </td>

                      <td className="p-4">
                        <span className="font-medium text-slate-700">{inst.dueDate}</span>
                      </td>

                      <td className="p-4 font-bold text-slate-900 text-sm">
                        ₹{inst.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="p-4">
                        {inst.status === 'paid' && (
                          <div className="space-y-0.5">
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> PAID
                            </span>
                            <div className="text-[10px] text-slate-500">{inst.paymentMode} • {inst.paidDate}</div>
                          </div>
                        )}
                        {inst.status === 'pending' && (
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {inst.status === 'overdue' && (
                          <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> OVERDUE
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inst.status === 'paid' ? (
                            <button
                              onClick={() => generateFeeReceiptPDF(student, inst)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1 border border-indigo-200 transition-all shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF Receipt</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSendReminder(inst.id)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold text-[11px] flex items-center gap-1 border border-emerald-200 transition-all"
                                title="Send WhatsApp Payment Link Reminder"
                              >
                                <Send className="w-3 h-3" />
                                <span>{remindedInstId === inst.id ? 'Sent ✓' : 'WhatsApp Link'}</span>
                              </button>

                              <button
                                onClick={() => setSelectedInstForPayment({ installment: inst, student })}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Collect</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!selectedInstForPayment}
        onClose={() => setSelectedInstForPayment(null)}
        installment={selectedInstForPayment?.installment || null}
        student={selectedInstForPayment?.student || null}
        onRecord={onRecordPayment}
      />
    </div>
  );
};
