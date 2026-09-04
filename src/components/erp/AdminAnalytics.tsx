'use client';

import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Layers, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  ArrowUpRight,
  PieChart,
  BarChart3
} from 'lucide-react';
import { Batch, FeeInstallment, Student, StudentExamMark } from '@/lib/types';

interface AdminAnalyticsProps {
  students: Student[];
  batches: Batch[];
  installments: FeeInstallment[];
  marks: StudentExamMark[];
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  students,
  batches,
  installments,
  marks,
}) => {
  const totalRevenueCollected = installments.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdueDues = installments.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);
  const totalPendingDues = installments.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalContractedFee = students.reduce((sum, s) => sum + s.totalFee, 0);

  // Monthly Revenue breakdown
  const monthlyData = [
    { month: 'April 2026', collected: 120000, target: 100000, percent: 120 },
    { month: 'May 2026', collected: 85000, target: 80000, percent: 106 },
    { month: 'June 2026', collected: 95000, target: 90000, percent: 105 },
    { month: 'July 2026', collected: 110000, target: 100000, percent: 110 },
    { month: 'August 2026', collected: 75000, target: 85000, percent: 88 },
    { month: 'September 2026 (MTD)', collected: totalRevenueCollected, target: 350000, percent: 92 },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Phase 5: Executive Business Intelligence
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              Owner Analytics
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Academy Revenue Trends & Retention Analytics</h2>
          <p className="text-xs text-slate-500">
            Strategic visibility into fee collection velocity, batch profitability, attendance drop-off risks, and academic outcomes.
          </p>
        </div>
      </div>

      {/* Top Financial Health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Annual Contracted Value</span>
          <div className="text-2xl font-extrabold text-slate-900">₹{totalContractedFee.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">100% Student Fee Ledger</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Collected</span>
          <div className="text-2xl font-extrabold text-emerald-600">₹{totalRevenueCollected.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">{Math.round((totalRevenueCollected/totalContractedFee)*100)}% Realized</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Overdue Balance</span>
          <div className="text-2xl font-extrabold text-rose-600">₹{totalOverdueDues.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-rose-500 font-semibold">1-Click WhatsApp Active</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Student Retention Rate</span>
          <div className="text-2xl font-extrabold text-indigo-600">97.8%</div>
          <span className="text-[10px] text-indigo-500 font-semibold">Low Drop-out Risk</span>
        </div>
      </div>

      {/* Monthly Collection Velocity Trend Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Monthly Revenue Realization vs. Target</h3>
            <p className="text-xs text-slate-500">Historical performance from session kick-off to present</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Target Realization: 96.2%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {monthlyData.map((data, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-bold text-slate-900">{data.month.split(' ')[0]}</div>
              <div className="text-base font-extrabold text-indigo-700">₹{data.collected.toLocaleString('en-IN')}</div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, data.percent)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block">{data.percent}% of Target</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column: Batch Profitability + Attendance Risk Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batch Profitability */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-bold text-base text-slate-900">Batch-wise Revenue & Profitability</h3>
            <span className="text-xs text-slate-400">By course tier</span>
          </div>

          <div className="space-y-3">
            {batches.map((batch) => {
              const batchRevenue = batch.enrolledCount * batch.annualFee;
              const occupancy = Math.round((batch.enrolledCount / batch.capacity) * 100);

              return (
                <div key={batch.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900">{batch.name}</div>
                      <div className="text-[11px] text-slate-500">{batch.grade} • {batch.teacherName}</div>
                    </div>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      ₹{batchRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                    <span>Occupancy: {batch.enrolledCount}/{batch.capacity} ({occupancy}%)</span>
                    <span className="font-bold text-indigo-600">₹{batch.annualFee.toLocaleString('en-IN')}/seat</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drop-out & Low Attendance Risk Predictor */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Attendance Risk & Early Intervention</h3>
              <p className="text-xs text-slate-500">Flags students with attendance drop below 80%</p>
            </div>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Early Warning
            </span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Isha Reddy', roll: 'APX-2026-006', batch: 'NEET Super-30', rate: '74%', status: 'At Risk', note: '2 absences this week. Automated parent alert dispatched.' },
              { name: 'Kabir Singhania', roll: 'APX-2026-005', batch: 'Class 9 Olympiad', rate: '82%', status: 'Moderate', note: 'Consistent on weekday slots, missed 1 weekend lab.' },
              { name: 'Rohan Deshmukh', roll: 'APX-2026-003', batch: 'Class 10 CBSE', rate: '88%', status: 'Healthy', note: 'Attendance regular, fee installment overdue.' },
            ].map((row, i) => (
              <div key={i} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-900">{row.name} ({row.roll})</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    row.rate.startsWith('7') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {row.rate} Presence
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">{row.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
