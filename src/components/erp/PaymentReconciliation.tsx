'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { FeeInstallment, Student } from '@/lib/types';
import { useSettings } from '@/lib/useSettings';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';

export interface PaymentOrderRecord {
  id: string;
  orderId: string;
  studentId: string;
  installmentId?: string;
  studentName?: string;
  title?: string;
  baseAmount?: number;
  lateFee?: number;
  totalAmount?: number;
  amountInPaise?: number;
  currency?: string;
  receipt?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  receiptStoragePath?: string;
  status: 'created' | 'captured' | 'failed' | 'refunded';
  paymentId?: string;
  paymentMethod?: string;
  failureReason?: string;
  createdAt: string;
  webhookProcessedAt?: string;
  reconciledAt?: string;
}

interface PaymentReconciliationProps {
  installments: FeeInstallment[];
  students: Student[];
  onRecordPayment?: (installmentId: string, paymentMode: any, transactionId?: string) => void;
}

export const PaymentReconciliation: React.FC<PaymentReconciliationProps> = ({
  installments,
  students,
  onRecordPayment,
}) => {
  const { schoolInfo } = useSettings();
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'mismatch' | 'captured' | 'pending' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payment/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn('[PaymentReconciliation] Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Merge orders from API with any Razorpay installments in local state to ensure full coverage
  const combinedOrders = useMemo(() => {
    const list = [...orders];
    const existingOrderIds = new Set(list.map((o) => o.orderId));

    // Synthesize entries for any installments paid via Razorpay not yet in payment_orders
    installments.forEach((inst) => {
      if (inst.paymentMode === 'Razorpay' && inst.transactionId) {
        const matching = list.find((o) => o.installmentId === inst.id || o.paymentId === inst.transactionId);
        if (!matching) {
          const student = students.find((s) => s.id === inst.studentId);
          list.push({
            id: `synth_${inst.id}`,
            orderId: inst.transactionId.startsWith('order_') ? inst.transactionId : `ord_${inst.id}`,
            studentId: inst.studentId,
            installmentId: inst.id,
            studentName: student?.name || 'Student',
            title: inst.title,
            totalAmount: inst.amount,
            status: 'captured',
            paymentId: inst.transactionId,
            paymentMethod: 'UPI/Online',
            receiptNumber: inst.receiptNumber,
            createdAt: inst.paidDate || new Date().toISOString(),
            webhookProcessedAt: inst.paidDate || new Date().toISOString(),
          });
        }
      }
    });

    return list;
  }, [orders, installments, students]);

  // Check if an order is flagged as a mismatch (> 5 minutes in 'created' status without capture)
  const isMismatchFlagged = (order: PaymentOrderRecord) => {
    if (order.status !== 'created') return false;
    const createdTime = new Date(order.createdAt).getTime();
    const now = Date.now();
    // 5 minutes threshold (300,000 ms)
    return now - createdTime > 300000;
  };

  const filteredOrders = useMemo(() => {
    return combinedOrders.filter((order) => {
      const student = students.find((s) => s.id === order.studentId);
      const studentName = order.studentName || student?.name || '';
      const orderId = order.orderId || '';
      const paymentId = order.paymentId || '';
      const receiptNo = order.receiptNumber || '';

      const matchesSearch =
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paymentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receiptNo.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'mismatch') return isMismatchFlagged(order);
      if (activeFilter === 'captured') return order.status === 'captured';
      if (activeFilter === 'pending') return order.status === 'created' && !isMismatchFlagged(order);
      if (activeFilter === 'failed') return order.status === 'failed' || order.status === 'refunded';

      return true;
    });
  }, [combinedOrders, searchQuery, activeFilter, students]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSyncGateway = async (orderId: string) => {
    try {
      setSyncingOrderId(orderId);
      setFeedbackMessage(null);

      const res = await fetch('/api/payment/reconcile-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reconciliation failed.');
      }

      setFeedbackMessage({
        type: data.reconciled ? 'success' : 'info',
        text: data.message || `Order ${orderId} synced. Status: ${data.afterStatus}`,
      });

      // Refresh list
      await fetchOrders();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to sync with payment gateway.',
      });
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleDownloadReceipt = (order: PaymentOrderRecord) => {
    if (order.receiptUrl) {
      window.open(order.receiptUrl, '_blank');
      return;
    }

    const student = students.find((s) => s.id === order.studentId);
    if (!student) return;

    const inst = installments.find((i) => i.id === order.installmentId) || {
      id: order.installmentId || 'inst_reconciled',
      studentId: order.studentId,
      installmentNo: 1,
      title: order.title || 'Fee Installment',
      dueDate: order.createdAt.split('T')[0],
      amount: order.totalAmount || 0,
      status: 'paid' as const,
      paidDate: order.createdAt.split('T')[0],
      paymentMode: 'Razorpay' as const,
      transactionId: order.paymentId,
      receiptNumber: order.receiptNumber,
      receiptUrl: order.receiptUrl,
    };

    if (inst.receiptUrl) {
      window.open(inst.receiptUrl, '_blank');
      return;
    }

    generateFeeReceiptPDF(student, { ...inst, status: 'paid', receiptNumber: order.receiptNumber, transactionId: order.paymentId }, schoolInfo);
  };

  const mismatchCount = combinedOrders.filter(isMismatchFlagged).length;
  const capturedCount = combinedOrders.filter((o) => o.status === 'captured').length;
  const pendingCount = combinedOrders.filter((o) => o.status === 'created').length;

  const currencySym = schoolInfo.currencySymbol || '₹';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gateway Verified</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{capturedCount}</div>
            <span className="text-[10px] text-emerald-700 font-medium">Reconciled in Firestore</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Confirmation</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
            <span className="text-[10px] text-amber-700 font-medium">Orders created on gateway</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
          mismatchCount > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flagged Mismatches</span>
            <div className={`text-2xl font-black mt-1 ${mismatchCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {mismatchCount}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Pending &gt; 5 min without webhook</span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            mismatchCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-2xl text-xs font-medium flex items-center justify-between animate-fade-in ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : feedbackMessage.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Student, Order ID, Payment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5 transition-all"
              title="Refresh Transaction Log"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {[
              { id: 'all', label: 'All Transactions' },
              { id: 'mismatch', label: `Mismatches (${mismatchCount})`, highlight: mismatchCount > 0 },
              { id: 'captured', label: 'Captured' },
              { id: 'pending', label: 'Pending' },
              { id: 'failed', label: 'Failed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : tab.highlight
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Order / Transaction</th>
                <th className="py-3 px-4">Student & Fee Item</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Gateway Status</th>
                <th className="py-3 px-4">Sync Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No transactions found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isMismatch = isMismatchFlagged(order);
                  const isSyncing = syncingOrderId === order.orderId;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Order / Transaction ID */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span className="truncate max-w-[140px]" title={order.orderId}>
                            {order.orderId}
                          </span>
                          <button
                            onClick={() => handleCopy(order.orderId, `ord_${order.id}`)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {copiedId === `ord_${order.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {order.paymentId && (
                          <div className="text-[10px] text-indigo-600 flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3" />
                            <span className="truncate max-w-[130px]" title={order.paymentId}>{order.paymentId}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Student & Fee Item */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{order.studentName || 'Student'}</div>
                        <div className="text-[11px] text-slate-500">{order.title || 'Fee Installment'}</div>
                        {order.receiptNumber && (
                          <span className="inline-block mt-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                            {order.receiptNumber}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {currencySym}{(order.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                        {order.lateFee ? (
                          <div className="text-[10px] text-amber-600 font-semibold">
                            Incl. {currencySym}{order.lateFee} Late Fine
                          </div>
                        ) : null}
                      </td>

                      {/* Gateway Status Badge */}
                      <td className="py-3.5 px-4">
                        {order.status === 'captured' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Captured
                          </span>
                        ) : order.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Failed
                          </span>
                        ) : isMismatch ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Mismatch (&gt;5m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Sync Source */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {order.webhookProcessedAt ? (
                          <div className="text-emerald-700 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Webhook Confirmed
                          </div>
                        ) : order.reconciledAt ? (
                          <div className="text-indigo-700 font-semibold flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5" /> Admin Reconciled
                          </div>
                        ) : (
                          <div className="text-slate-400">Direct Gateway</div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === 'captured' ? (
                            <button
                              onClick={() => handleDownloadReceipt(order)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-xs"
                              title="Download PDF Receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSyncGateway(order.orderId)}
                              disabled={isSyncing}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                                isMismatch
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                              <span>{isSyncing ? 'Syncing...' : 'Sync Gateway'}</span>
                            </button>
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
    </div>
  );
};
