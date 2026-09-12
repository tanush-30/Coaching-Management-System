'use client';

import React from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet, 
  Zap 
} from 'lucide-react';
import Link from 'next/link';

export function ComparisonSection() {
  const comparisons = [
    {
      feature: 'Attendance Taking',
      oldWay: '10–15 mins wasted passing physical registers; paper gets lost or damaged.',
      apexWay: '15-second digital roll call with 1-click "Mark All Present" & instant absent sync.',
    },
    {
      feature: 'Parent Absent Alerts',
      oldWay: 'Manual phone calls or awkward group broadcasts at end of day.',
      apexWay: 'Automated 1-to-1 WhatsApp alert dispatched to parent within 30 seconds.',
    },
    {
      feature: 'Fee Dues & Receipts',
      oldWay: 'Manual paper receipt books; Excel formulas break; 10–15% fee leakage.',
      apexWay: 'Automated installment tracking, UPI payment links & instant branded PDF receipts.',
    },
    {
      feature: 'Exam Marks & Rankings',
      oldWay: 'Teachers spend hours calculating averages on paper; scorecards delayed by weeks.',
      apexWay: 'Instant percentile, rank list & performance charts auto-sent to parent WhatsApp.',
    },
    {
      feature: 'Stakeholder Access',
      oldWay: 'Admins overwhelmed by endless WhatsApp queries regarding homework & fees.',
      apexWay: 'Dedicated self-service portals for Admins, Teachers, Parents, and Students.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-bold text-indigo-700">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Side-by-Side Comparison</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Stop Managing Your Coaching on Excel & Chaos
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            See how upgrading to ApexERP saves over 120 hours of manual friction every month while boosting parent satisfaction.
          </p>
        </div>

        {/* Comparison Table / Cards */}
        <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 bg-slate-900 text-white p-4 sm:p-5 font-bold text-xs sm:text-sm">
            <div className="md:col-span-3 text-slate-400 uppercase tracking-wider text-xs">
              Operational Workflow
            </div>
            <div className="md:col-span-4 text-rose-400 flex items-center gap-1.5 mt-2 md:mt-0">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>The Old Way (Excel / Paper)</span>
            </div>
            <div className="md:col-span-5 text-emerald-400 flex items-center gap-1.5 mt-2 md:mt-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>The ApexERP Operating System</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {comparisons.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-3 sm:gap-4 items-center hover:bg-slate-50/70 transition-colors text-xs sm:text-sm"
              >
                <div className="md:col-span-3 font-extrabold text-slate-900">
                  {item.feature}
                </div>

                <div className="md:col-span-4 p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-slate-700 leading-relaxed">
                  <div className="text-[10px] font-bold text-rose-700 uppercase mb-1 md:hidden">
                    The Old Way:
                  </div>
                  {item.oldWay}
                </div>

                <div className="md:col-span-5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-slate-800 font-medium leading-relaxed">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase mb-1 md:hidden">
                    With ApexERP:
                  </div>
                  {item.apexWay}
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer CTA */}
          <div className="p-5 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Ready to say goodbye to paper registers?</span>
            </div>
            <Link
              href="/app"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Switch to Live ERP Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
