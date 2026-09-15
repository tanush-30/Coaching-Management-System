'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Download,
  Receipt,
  Eye,
  X,
  FileText,
  ShieldCheck,
  Building,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { fetchFacultyPayrollRecords } from '@/lib/payroll-service';
import { formatPaiseToINR } from '@/lib/payroll-engine';
import { generatePayslipPdf } from '@/lib/pdf-service';
import type { PayrollRecord, Teacher, LineItem } from '@/lib/types';

interface TeacherSalaryViewProps {
  teacher: Teacher;
}

export const TeacherSalaryView: React.FC<TeacherSalaryViewProps> = ({ teacher }) => {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadPayrollData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFacultyPayrollRecords(teacher.id);
      setRecords(data);
    } catch (err) {
      console.error('[TeacherSalaryView] Failed to load payroll records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teacher?.id) {
      loadPayrollData();
    }
  }, [teacher?.id]);

  // Current month identifier e.g. "2026-09"
  const currentMonthPeriod = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  }, []);

  // Most recent record and current month record
  const currentMonthRecord = useMemo(() => {
    return records.find((r) => r.period === currentMonthPeriod);
  }, [records, currentMonthPeriod]);

  const lastPaidRecord = useMemo(() => {
    return records.find((r) => r.status === 'paid');
  }, [records]);

  // Year-To-Date (YTD) Net Earnings across all 'paid' records
  const ytdNetEarnings = useMemo(() => {
    return records
      .filter((r) => r.status === 'paid')
      .reduce((acc, r) => acc + r.net, 0);
  }, [records]);

  const handleOpenDetails = (record: PayrollRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleDownloadPDF = (record: PayrollRecord) => {
    generatePayslipPdf(record, teacher);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-900/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Faculty Compensation Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              My Salary, Payouts & Payslips
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl">
              Transparent monthly compensation breakdowns, lecture-rate calculations, and one-click official PDF salary slip downloads.
            </p>
          </div>

          <button
            onClick={loadPayrollData}
            disabled={isLoading}
            className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 self-start md:self-auto transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>
      </div>

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Current Month Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Current Month ({currentMonthPeriod})
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {currentMonthRecord ? formatPaiseToINR(currentMonthRecord.net) : 'Pending Cycle'}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {currentMonthRecord ? (
              currentMonthRecord.status === 'paid' ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Settled & Paid
                </span>
              ) : (
                <span className="text-blue-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Approved — Processing Payout
                </span>
              )
            ) : (
              <span className="text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Monthly processing in progress
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Last Payout */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Last Disbursed Payout
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {lastPaidRecord ? formatPaiseToINR(lastPaidRecord.net) : '—'}
          </div>
          <div className="text-[11px] text-slate-500">
            {lastPaidRecord ? (
              <span>
                Period: <strong>{lastPaidRecord.period}</strong> • Paid on{' '}
                {lastPaidRecord.paidAt ? lastPaidRecord.paidAt.slice(0, 10) : 'Recorded'}
              </span>
            ) : (
              'No settled payouts yet'
            )}
          </div>
        </div>

        {/* Card 3: Year-to-Date (YTD) Net Earnings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Year-To-Date (YTD) Net Earnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatPaiseToINR(ytdNetEarnings)}
          </div>
          <div className="text-[11px] text-slate-500">
            Across {records.filter((r) => r.status === 'paid').length} disbursed monthly cycle(s)
          </div>
        </div>
      </div>

      {/* Payout History Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Official Payout History & Payslips</h3>
            <p className="text-xs text-slate-500">
              Complete historical record of settled compensation and approved payroll statements.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading salary records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700">No Approved Payslips Available</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once administration approves and generates your monthly payroll, your detailed salary statement and downloadable PDF payslips will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Payroll Period</th>
                  <th className="p-3.5">Compensation Plan</th>
                  <th className="p-3.5">Gross Earnings</th>
                  <th className="p-3.5">Deductions</th>
                  <th className="p-3.5">Net Disbursed</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Settlement Info</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => {
                  const isPaid = record.status === 'paid';
                  const isApproved = record.status === 'approved';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 font-mono">
                        {record.period}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
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
                            isPaid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isPaid ? 'PAID' : 'APPROVED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {isPaid ? (
                          <div>
                            <div className="font-semibold text-slate-700">{record.paymentMode || 'Bank Transfer'}</div>
                            <div className="font-mono text-[10px]">Ref: {record.paymentRef || 'N/A'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending Bank Transfer</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetails(record)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Breakdown</span>
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(record)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Payslip PDF</span>
                          </button>
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

      {/* DETAIL BREAKDOWN MODAL */}
      {isDetailModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Salary Statement — {selectedRecord.period}
                </h3>
                <p className="text-xs text-slate-500">
                  {teacher.name} ({teacher.facultyId || teacher.id})
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compensation Snapshot Summary */}
            <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Plan: </span>
                <strong className="uppercase text-indigo-900">{selectedRecord.structureSnapshot?.type || 'Fixed'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Status: </span>
                <strong className="uppercase text-emerald-700">{selectedRecord.status}</strong>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Earnings & Allowances
              </div>
              {selectedRecord.lineItems
                .filter((item) => item.type === 'earning')
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{item.label}</div>
                      {item.meta?.lectureCount !== undefined && (
                        <div className="text-[10px] text-slate-500">
                          {Number(item.meta.lectureCount)} verified sessions conducted
                        </div>
                      )}
                    </div>
                    <div className="font-extrabold text-slate-900">
                      +{formatPaiseToINR(item.amount)}
                    </div>
                  </div>
                ))}

              {selectedRecord.lineItems.some((item) => item.type === 'deduction') && (
                <>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-2">
                    Deductions & Taxes
                  </div>
                  {selectedRecord.lineItems
                    .filter((item) => item.type === 'deduction')
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between text-xs"
                      >
                        <div className="font-bold text-rose-900">{item.label}</div>
                        <div className="font-extrabold text-rose-600">
                          -{formatPaiseToINR(item.amount)}
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* Totals Summary */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Gross Earnings:</span>
                <span>{formatPaiseToINR(selectedRecord.gross)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Deductions:</span>
                <span className="text-rose-400">-{formatPaiseToINR(selectedRecord.totalDeductions)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-extrabold">
                <span className="text-emerald-400">Net Disbursed Amount:</span>
                <span className="text-emerald-400 text-base">{formatPaiseToINR(selectedRecord.net)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedRecord)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
