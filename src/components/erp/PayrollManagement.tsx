'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Calendar,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  Download,
  ChevronRight,
  UserCheck,
  Building2,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Receipt,
  X,
  CreditCard,
  History,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchSalaryStructures,
  getActiveSalaryStructure,
  saveSalaryStructure,
  generatePayroll,
  approvePayroll,
  markPayrollAsPaid,
  cancelPayroll,
  updateDraftLineItems,
  fetchAllPayrollRecords,
} from '@/lib/payroll-service';
import {
  formatPaiseToINR,
  paiseToRupees,
  rupeesToPaise,
} from '@/lib/payroll-engine';
import type {
  SalaryStructure,
  SalaryStructureType,
  PayrollRecord,
  PayrollStatus,
  LineItem,
  Teacher,
} from '@/lib/types';

interface PayrollManagementProps {
  teachers: Teacher[];
}

export const PayrollManagement: React.FC<PayrollManagementProps> = ({ teachers }) => {
  const { user } = useAuth();

  // Current selected month: YYYY-MM
  const currentMonthPeriod = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  }, []);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthPeriod);
  const [activeSubTab, setActiveSubTab] = useState<'runs' | 'structures'>('runs');
  const [statusFilter, setStatusFilter] = useState<'all' | PayrollStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Modals state
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [targetTeacher, setTargetTeacher] = useState<Teacher | null>(null);
  const [editingStructure, setEditingStructure] = useState<Partial<SalaryStructure> | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [targetPayrollRecord, setTargetPayrollRecord] = useState<PayrollRecord | null>(null);
  const [adjustItems, setAdjustItems] = useState<LineItem[]>([]);
  const [newAdjType, setNewAdjType] = useState<'earning' | 'deduction'>('earning');
  const [newAdjLabel, setNewAdjLabel] = useState('Performance Bonus / Incentive');
  const [newAdjAmount, setNewAdjAmount] = useState('');
  const [adjFormError, setAdjFormError] = useState<string | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingRecord, setCancellingRecord] = useState<PayrollRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [isMarkPaidModalOpen, setIsMarkPaidModalOpen] = useState(false);
  const [payingRecord, setPayingRecord] = useState<PayrollRecord | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer' | 'UPI' | 'Cheque' | 'Cash'>('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [recordsToApprove, setRecordsToApprove] = useState<PayrollRecord[]>([]);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTeacher, setHistoryTeacher] = useState<Teacher | null>(null);

  // Load data for selected period & structures
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [records, structures] = await Promise.all([
        fetchAllPayrollRecords(selectedPeriod),
        fetchSalaryStructures(),
      ]);
      setPayrollRecords(records);
      setSalaryStructures(structures);
    } catch (err) {
      console.error('[PayrollManagement] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedRecordIds([]);
  }, [selectedPeriod]);

  // Map active structures per teacher
  const activeStructureMap = useMemo(() => {
    const map: Record<string, SalaryStructure> = {};
    const now = new Date().toISOString();
    for (const t of teachers) {
      const teacherStructs = salaryStructures
        .filter((s) => s.teacherId === t.id)
        .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
      const active = teacherStructs.find((s) => !s.effectiveTo || s.effectiveTo > now) || teacherStructs[0];
      if (active) {
        map[t.id] = active;
      }
    }
    return map;
  }, [teachers, salaryStructures]);

  // Teachers without salary structure
  const unconfiguredTeachers = useMemo(() => {
    return teachers.filter((t) => !activeStructureMap[t.id]);
  }, [teachers, activeStructureMap]);

  // Metrics for selected period
  const metrics = useMemo(() => {
    let gross = 0;
    let deductions = 0;
    let net = 0;
    let draftCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    for (const r of payrollRecords) {
      if (r.status === 'cancelled') continue;
      gross += r.gross;
      deductions += r.totalDeductions;
      net += r.net;

      if (r.status === 'draft') draftCount++;
      if (r.status === 'approved') approvedCount++;
      if (r.status === 'paid') paidCount++;
    }

    return { gross, deductions, net, draftCount, approvedCount, paidCount };
  }, [payrollRecords]);

  // Filtered Payroll records
  const filteredRecords = useMemo(() => {
    return payrollRecords.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        (r.teacherName && r.teacherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.facultyId && r.facultyId.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [payrollRecords, statusFilter, searchQuery]);

  // Handler: Generate Payroll
  const handleGeneratePayroll = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      await generatePayroll(selectedPeriod, teachers, {
        uid: user.uid,
        name: user.displayName || 'Administrator',
        email: user.email || '',
        role: 'admin',
      });
      await loadData();
    } catch (err: any) {
      alert(`Error generating payroll: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Open Single / Bulk Approve Confirmation
  const handleOpenApprove = (records: PayrollRecord[]) => {
    const draftRecords = records.filter((r) => r.status === 'draft');
    if (draftRecords.length === 0) return;
    setRecordsToApprove(draftRecords);
    setIsApproveConfirmOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!user || recordsToApprove.length === 0) return;
    try {
      const ids = recordsToApprove.map((r) => r.id);
      await approvePayroll(ids, {
        uid: user.uid,
        name: user.displayName || 'Administrator',
        email: user.email || '',
        role: 'admin',
      });
      setIsApproveConfirmOpen(false);
      setSelectedRecordIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Error approving payroll: ${err.message}`);
    }
  };

  // Handler: Open Mark As Paid
  const handleOpenMarkPaid = (record: PayrollRecord) => {
    setPayingRecord(record);
    setPaymentRef(`PAY-${Date.now().toString().slice(-6)}`);
    setPaymentMode('Bank Transfer');
    setPaymentNotes('');
    setIsMarkPaidModalOpen(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (!user || !payingRecord) return;
    if (!paymentRef.trim()) {
      alert('Please enter a payment reference (UTR / Cheque No.)');
      return;
    }
    try {
      await markPayrollAsPaid(
        payingRecord.id,
        {
          paymentRef: paymentRef.trim(),
          paymentMode,
          notes: paymentNotes.trim(),
        },
        {
          uid: user.uid,
          name: user.displayName || 'Administrator',
          email: user.email || '',
          role: 'admin',
        }
      );
      setIsMarkPaidModalOpen(false);
      setPayingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(`Error marking payroll as paid: ${err.message}`);
    }
  };

  // Handler: Open Cancel Payroll Modal
  const handleOpenCancelModal = (record: PayrollRecord) => {
    setCancellingRecord(record);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!user || !cancellingRecord) return;
    try {
      await cancelPayroll(cancellingRecord.id, cancelReason, {
        uid: user.uid,
        name: user.displayName || 'Administrator',
        email: user.email || '',
        role: 'admin',
      });
      setIsCancelModalOpen(false);
      setCancellingRecord(null);
      await loadData();
    } catch (err: any) {
      console.error('Error cancelling record:', err);
    }
  };

  // Handler: Adjust Line Items
  const handleOpenAdjust = (record: PayrollRecord) => {
    setTargetPayrollRecord(record);
    setAdjustItems([...record.lineItems]);
    setNewAdjType('earning');
    setNewAdjLabel('Performance Bonus / Incentive');
    setNewAdjAmount('');
    setAdjFormError(null);
    setIsAdjustModalOpen(true);
  };

  const handleAddInlineAdjustment = () => {
    const num = Number(newAdjAmount);
    if (!newAdjAmount || isNaN(num) || num <= 0) {
      setAdjFormError('Please enter a valid amount in ₹ (greater than 0)');
      return;
    }
    if (!newAdjLabel.trim()) {
      setAdjFormError('Please enter a description for this adjustment');
      return;
    }

    setAdjFormError(null);
    setAdjustItems((prev) => [
      ...prev,
      {
        id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: newAdjLabel.trim(),
        type: newAdjType,
        amount: rupeesToPaise(num),
      },
    ]);

    setNewAdjAmount('');
  };

  const handleSaveAdjustments = async () => {
    if (!user || !targetPayrollRecord) return;
    try {
      await updateDraftLineItems(targetPayrollRecord.id, adjustItems, {
        uid: user.uid,
        name: user.displayName || 'Administrator',
        email: user.email || '',
        role: 'admin',
      });
      setIsAdjustModalOpen(false);
      setTargetPayrollRecord(null);
      await loadData();
    } catch (err: any) {
      alert(`Error updating adjustments: ${err.message}`);
    }
  };

  // Handler: Structure Modal
  const handleOpenStructureModal = (teacher: Teacher) => {
    setTargetTeacher(teacher);
    const existing = activeStructureMap[teacher.id];
    if (existing) {
      setEditingStructure({
        type: existing.type,
        baseAmount: existing.baseAmount,
        perLectureRate: existing.perLectureRate,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
    } else {
      setEditingStructure({
        type: 'fixed',
        baseAmount: rupeesToPaise(30000),
        perLectureRate: rupeesToPaise(800),
        effectiveFrom: `${selectedPeriod}-01`,
      });
    }
    setIsStructureModalOpen(true);
  };

  const handleSaveStructure = async () => {
    if (!user || !targetTeacher || !editingStructure) return;
    try {
      await saveSalaryStructure(
        {
          teacherId: targetTeacher.id,
          teacherName: targetTeacher.name,
          facultyId: targetTeacher.facultyId,
          type: (editingStructure.type as SalaryStructureType) || 'fixed',
          baseAmount: editingStructure.baseAmount || 0,
          perLectureRate: editingStructure.perLectureRate || 0,
          effectiveFrom: editingStructure.effectiveFrom || new Date().toISOString(),
        },
        {
          uid: user.uid,
          name: user.displayName || 'Administrator',
          email: user.email || '',
          role: 'admin',
        }
      );
      setIsStructureModalOpen(false);
      setTargetTeacher(null);
      setEditingStructure(null);
      await loadData();
    } catch (err: any) {
      alert(`Error saving structure: ${err.message}`);
    }
  };

  // Selection toggle
  const toggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const draftIds = filteredRecords.filter((r) => r.status === 'draft').map((r) => r.id);
    if (selectedRecordIds.length === draftIds.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(draftIds);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-900/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Faculty Compensation & Payroll Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Faculty Salary & Payout Command Center
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl">
              Automated multi-model compensation (Fixed, Per-Lecture, Hybrid), pro-rated onboarding, verified attendance linking, and single-click bank disbursements.
            </p>
          </div>

          {/* Period Selector & Primary Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleGeneratePayroll}
              disabled={isGenerating}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Calculating...' : 'Generate Payroll'}</span>
            </button>
          </div>
        </div>

        {/* Warning if any teacher has no salary structure */}
        {unconfiguredTeachers.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{unconfiguredTeachers.length} faculty member(s)</strong> have no assigned salary structure and will be skipped during generation.
              </span>
            </div>
            <button
              onClick={() => setActiveSubTab('structures')}
              className="underline font-bold hover:text-amber-200 cursor-pointer ml-2"
            >
              Configure Structures &rarr;
            </button>
          </div>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Gross Pay</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatPaiseToINR(metrics.gross)}</div>
          <div className="text-[11px] text-slate-500 font-medium">{payrollRecords.length} records in {selectedPeriod}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Disbursement</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{formatPaiseToINR(metrics.net)}</div>
          <div className="text-[11px] text-slate-500 font-medium">After ₹{(metrics.deductions / 100).toLocaleString('en-IN')} deductions</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Approval</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{metrics.draftCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Draft records awaiting sign-off</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Paid / Completed</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-teal-600">{metrics.paidCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">Disbursed with bank references</div>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('runs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'runs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Monthly Payroll Runs ({payrollRecords.length})
          </button>
          <button
            onClick={() => setActiveSubTab('structures')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'structures'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Salary Structures & Rates ({teachers.length})
          </button>
        </div>

        {/* Search & Status Filters (for Runs tab) */}
        {activeSubTab === 'runs' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48"
              />
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-xs font-medium text-slate-600">
              {(['all', 'draft', 'approved', 'paid', 'cancelled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                    statusFilter === s ? 'bg-indigo-100 text-indigo-700 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: MONTHLY RUNS */}
      {activeSubTab === 'runs' && (
        <div className="space-y-4">
          {/* Bulk Action Toolbar */}
          {selectedRecordIds.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>
                  {selectedRecordIds.length} draft record(s) selected
                </span>
              </div>
              <button
                onClick={() => {
                  const records = payrollRecords.filter((r) => selectedRecordIds.includes(r.id));
                  handleOpenApprove(records);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bulk Approve Selected</span>
              </button>
            </div>
          )}

          {/* Payroll Runs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading payroll records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <Wallet className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700">No Payroll Records for {selectedPeriod}</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click &ldquo;Generate Payroll&rdquo; above to compute monthly compensation from active salary structures and verified lecture logs.
                </p>
                <button
                  onClick={handleGeneratePayroll}
                  disabled={isGenerating}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Generate Drafts for {selectedPeriod}</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedRecordIds.length > 0 &&
                            selectedRecordIds.length ===
                              filteredRecords.filter((r) => r.status === 'draft').length
                          }
                          onChange={toggleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3.5">Faculty</th>
                      <th className="p-3.5">Pay Model</th>
                      <th className="p-3.5">Gross Pay</th>
                      <th className="p-3.5">Deductions</th>
                      <th className="p-3.5">Net Payable</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((record) => {
                      const isDraft = record.status === 'draft';
                      const isApproved = record.status === 'approved';
                      const isPaid = record.status === 'paid';

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 text-center">
                            {isDraft && (
                              <input
                                type="checkbox"
                                checked={selectedRecordIds.includes(record.id)}
                                onChange={() => toggleSelectRecord(record.id)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{record.teacherName || 'Faculty'}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {record.facultyId || record.teacherId.slice(0, 8)}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {record.structureSnapshot?.type || 'fixed'}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            {formatPaiseToINR(record.gross)}
                          </td>
                          <td className="p-3.5 text-rose-600 font-semibold">
                            {record.totalDeductions > 0 ? `-${formatPaiseToINR(record.totalDeductions)}` : '₹0'}
                          </td>
                          <td className="p-3.5 font-extrabold text-slate-900 text-sm">
                            {formatPaiseToINR(record.net)}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                                isDraft
                                  ? 'bg-amber-100 text-amber-700'
                                  : isApproved
                                  ? 'bg-blue-100 text-blue-700'
                                  : isPaid
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {isDraft && <Clock className="w-3 h-3" />}
                              {isApproved && <CheckCircle2 className="w-3 h-3" />}
                              {isPaid && <Receipt className="w-3 h-3" />}
                              {record.status}
                            </span>
                            {isPaid && record.paymentRef && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Ref: {record.paymentRef}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isDraft && (
                                <>
                                  <button
                                    onClick={() => handleOpenAdjust(record)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Adjust Earnings & Deductions"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenApprove([record])}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                </>
                              )}

                              {isApproved && (
                                <button
                                  onClick={() => handleOpenMarkPaid(record)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Mark Paid</span>
                                </button>
                              )}

                              {!isPaid && record.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleOpenCancelModal(record)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SALARY STRUCTURES & RATES */}
      {activeSubTab === 'structures' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Faculty Salary Structures & Revision History</h3>
                <p className="text-xs text-slate-500">
                  Assign compensation plans to faculty members. Rate revisions automatically archive past versions for historical accuracy.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Faculty Member</th>
                    <th className="p-3.5">Subjects & Batches</th>
                    <th className="p-3.5">Active Model</th>
                    <th className="p-3.5">Base Monthly Pay</th>
                    <th className="p-3.5">Per-Lecture Rate</th>
                    <th className="p-3.5">Effective Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((teacher) => {
                    const activeStruct = activeStructureMap[teacher.id];

                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{teacher.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {teacher.facultyId || teacher.email}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{teacher.subjects?.join(', ') || teacher.subject || 'General'}</div>
                          <div className="text-[11px] text-slate-400">
                            {teacher.assignedBatches?.length || 0} Batches Assigned
                          </div>
                        </td>
                        <td className="p-3.5">
                          {activeStruct ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {activeStruct.type}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {activeStruct ? formatPaiseToINR(activeStruct.baseAmount) : '—'}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {activeStruct ? formatPaiseToINR(activeStruct.perLectureRate) : '—'}
                        </td>
                        <td className="p-3.5 text-slate-500 font-mono">
                          {activeStruct ? activeStruct.effectiveFrom.slice(0, 10) : '—'}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setHistoryTeacher(teacher);
                                setIsHistoryModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="View Revision History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenStructureModal(teacher)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {activeStruct ? 'Revise Rates' : 'Assign Structure'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: STRUCTURE CONFIGURATION / REVISION */}
      {isStructureModalOpen && targetTeacher && editingStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Salary Structure: {targetTeacher.name}
                </h3>
              </div>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Compensation Model</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['fixed', 'per_lecture', 'hybrid'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditingStructure({ ...editingStructure, type })}
                      className={`py-2 px-3 rounded-xl font-bold capitalize text-center border transition-all cursor-pointer ${
                        editingStructure.type === type
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {(editingStructure.type === 'fixed' || editingStructure.type === 'hybrid') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Monthly Base Salary (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={paiseToRupees(editingStructure.baseAmount || 0)}
                    onChange={(e) =>
                      setEditingStructure({
                        ...editingStructure,
                        baseAmount: rupeesToPaise(Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 45000"
                  />
                </div>
              )}

              {(editingStructure.type === 'per_lecture' || editingStructure.type === 'hybrid') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rate per Conducted Lecture (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={paiseToRupees(editingStructure.perLectureRate || 0)}
                    onChange={(e) =>
                      setEditingStructure({
                        ...editingStructure,
                        perLectureRate: rupeesToPaise(Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 800"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={(editingStructure.effectiveFrom || '').slice(0, 10)}
                  onChange={(e) =>
                    setEditingStructure({
                      ...editingStructure,
                      effectiveFrom: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-[11px] leading-relaxed">
                💡 <strong>Revision Policy:</strong> Saving a revision closes previous rates with an end-date without mutating past months&apos; payslips.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStructure}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
              >
                Save Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST LINE ITEMS (BONUS / DEDUCTION) */}
      {isAdjustModalOpen && targetPayrollRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Adjust Line Items — {targetPayrollRecord.teacherName}
                </h3>
                <p className="text-slate-500 text-xs">Period: {targetPayrollRecord.period}</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {adjustItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{item.label}</div>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        item.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <div className="font-extrabold text-slate-900">
                    {item.type === 'earning' ? '+' : '-'}
                    {formatPaiseToINR(item.amount)}
                  </div>
                  <button
                    onClick={() => setAdjustItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* In-Dashboard Interactive Add Adjustment Form */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  + Add Custom Bonus or Deduction
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAdjType('earning');
                      setNewAdjLabel('Performance Bonus / Incentive');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      newAdjType === 'earning'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    + Bonus (Earning)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAdjType('deduction');
                      setNewAdjLabel('TDS (Tax Deducted at Source)');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      newAdjType === 'deduction'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    - Deduction (TDS/Penalty)
                  </button>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewAdjType('earning');
                    setNewAdjLabel('Performance Bonus / Incentive');
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600 hover:border-indigo-400"
                >
                  ⚡ Performance Bonus
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewAdjType('deduction');
                    setNewAdjLabel('TDS (Tax Deducted at Source)');
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600 hover:border-indigo-400"
                >
                  🏛️ TDS (10%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewAdjType('deduction');
                    setNewAdjLabel('Late Arrival / Absence Penalty');
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600 hover:border-indigo-400"
                >
                  ⏱️ Late Penalty
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewAdjType('earning');
                    setNewAdjLabel('Special Travel / Subject Allowance');
                  }}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600 hover:border-indigo-400"
                >
                  🚗 Special Allowance
                </button>
              </div>

              {/* Form Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Description / Label
                  </label>
                  <input
                    type="text"
                    value={newAdjLabel}
                    onChange={(e) => setNewAdjLabel(e.target.value)}
                    placeholder="e.g. Performance Bonus or TDS"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Amount (₹)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newAdjAmount}
                      onChange={(e) => setNewAdjAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineAdjustment}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              {adjFormError && (
                <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{adjFormError}</span>
                </div>
              )}
            </div>

            {/* Total Preview */}
            <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[11px]">Updated Net Payout:</span>
                <div className="text-base font-extrabold text-emerald-400">
                  {formatPaiseToINR(
                    Math.max(
                      0,
                      adjustItems.reduce((acc, item) => (item.type === 'earning' ? acc + item.amount : acc), 0) -
                        adjustItems.reduce((acc, item) => (item.type === 'deduction' ? acc + item.amount : acc), 0)
                    )
                  )}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>
                  Gross:{' '}
                  <strong className="text-slate-200">
                    {formatPaiseToINR(
                      adjustItems.reduce((acc, item) => (item.type === 'earning' ? acc + item.amount : acc), 0)
                    )}
                  </strong>
                </div>
                <div>
                  Deductions:{' '}
                  <strong className="text-rose-400">
                    -{formatPaiseToINR(
                      adjustItems.reduce((acc, item) => (item.type === 'deduction' ? acc + item.amount : acc), 0)
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustments}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
              >
                Save Adjustments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.5: CANCEL PAYROLL RECORD */}
      {isCancelModalOpen && cancellingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Cancel Payroll Record
                </h3>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel the payroll record for{' '}
              <strong>{cancellingRecord.teacherName}</strong> ({cancellingRecord.period})?
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Reason for Cancellation (Audit Log)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="e.g. Incorrect rate structure applied, regenerating with revised terms..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Keep Record
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/30"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MARK AS PAID */}
      {isMarkPaidModalOpen && payingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Receipt className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Record Salary Payout
                </h3>
              </div>
              <button
                onClick={() => setIsMarkPaidModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1 text-xs">
              <div className="text-emerald-800 font-bold">Faculty: {payingRecord.teacherName}</div>
              <div className="text-emerald-950 font-extrabold text-lg">
                Net Payout: {formatPaiseToINR(payingRecord.net)}
              </div>
              <div className="text-[11px] text-emerald-700">Period: {payingRecord.period}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transaction / Cheque Reference (UTR) *
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="e.g. UTR12938472910 or CHQ-9921"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Disbursed via HDFC Corporate Account"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMarkPaidModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMarkPaid}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/30"
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: APPROVAL CONFIRMATION SUMMARY */}
      {isApproveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Confirm Payroll Approval
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              You are about to approve <strong>{recordsToApprove.length} faculty record(s)</strong> for the period <strong>{selectedPeriod}</strong>.
            </p>

            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2 text-xs">
              <div className="flex justify-between text-indigo-900">
                <span>Total Disbursement Amount:</span>
                <span className="font-extrabold text-base">
                  {formatPaiseToINR(recordsToApprove.reduce((acc, r) => acc + r.net, 0))}
                </span>
              </div>
              <div className="text-[11px] text-indigo-700">
                Approved records become visible to faculty in their Teacher Portal and are locked from further draft generation.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: REVISION HISTORY */}
      {isHistoryModalOpen && historyTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Salary History: {historyTeacher.name}
                </h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {salaryStructures
                .filter((s) => s.teacherId === historyTeacher.id)
                .map((struct, idx) => (
                  <div
                    key={struct.id || idx}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-indigo-700">{struct.type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {struct.effectiveFrom.slice(0, 10)} &rarr;{' '}
                        {struct.effectiveTo ? struct.effectiveTo.slice(0, 10) : 'Current'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-700">
                      {struct.baseAmount > 0 && (
                        <div>Base: <strong>{formatPaiseToINR(struct.baseAmount)}</strong></div>
                      )}
                      {struct.perLectureRate > 0 && (
                        <div>Rate: <strong>{formatPaiseToINR(struct.perLectureRate)}/lec</strong></div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
