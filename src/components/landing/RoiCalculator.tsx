'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calculator,
  TrendingUp,
  Clock,
  IndianRupee,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';

interface RoiCalculatorProps {
  onOpenLogin: () => void;
}

export function RoiCalculator({ onOpenLogin }: RoiCalculatorProps) {
  const [studentCount, setStudentCount] = useState<number>(250);
  const [avgMonthlyFee, setAvgMonthlyFee] = useState<number>(4500);

  // Math models
  const totalMonthlyBilling = studentCount * avgMonthlyFee;
  const annualBilling = totalMonthlyBilling * 12;

  // Typical manual coaching leakage is ~5% to 8% in delayed / uncollected fees
  const annualRecoveredBadDebt = Math.round(annualBilling * 0.058);

  // Time saved: ~0.5 hour per student per month on registers, receipts, WhatsApp alerts, exam grading
  const monthlyHoursSaved = Math.round(studentCount * 0.45);
  const annualHoursSaved = monthlyHoursSaved * 12;

  // Admin cost saving estimate (assuming ₹250/hr staff cost)
  const annualAdminCostSaved = Math.round(annualHoursSaved * 250);

  const totalAnnualValue = annualRecoveredBadDebt + annualAdminCostSaved;

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <section id="calculator" className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold text-indigo-300">
            <Calculator className="w-3.5 h-3.5 text-indigo-400" />
            <span>Interactive ROI & Profitability Model</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Calculate Your Time & Revenue Savings
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            See how much uncollected fee revenue you can recover and how many administrative staff hours you save each year by digitizing with ApexERP.
          </p>
        </div>

        {/* Calculator Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Left: Interactive Sliders (6 cols) */}
          <div className="lg:col-span-6 bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-700/80 space-y-7">
            {/* Slider 1: Total Students */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Total Enrolled Students</span>
                </label>
                <span className="text-base font-extrabold text-indigo-400 bg-indigo-500/20 px-3 py-1 rounded-xl border border-indigo-500/30">
                  {studentCount} Students
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="1500"
                step="10"
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>30 (Small Batch)</span>
                <span>500</span>
                <span>1,500+ (Multi-Branch)</span>
              </div>
            </div>

            {/* Slider 2: Average Monthly Fee */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-400" />
                  <span>Avg. Monthly Fee / Student</span>
                </label>
                <span className="text-base font-extrabold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30">
                  ₹{avgMonthlyFee.toLocaleString('en-IN')} / mo
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="15000"
                step="500"
                value={avgMonthlyFee}
                onChange={(e) => setAvgMonthlyFee(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹1,000 (Tuition)</span>
                <span>₹7,500</span>
                <span>₹15,000 (JEE / NEET)</span>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <span className="text-slate-400">Monthly Billing:</span>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {formatCurrency(totalMonthlyBilling)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <span className="text-slate-400">Annual Turnover:</span>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {formatCurrency(annualBilling)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Calculated Value Output Card (6 cols) */}
          <div className="lg:col-span-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-950/50 hover:border-indigo-400/60 transition-all duration-300 space-y-6">
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                Estimated Net Value Created
              </div>
              <div
                key={totalAnnualValue}
                className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 animate-scale-in"
              >
                {formatCurrency(totalAnnualValue)}
                <span className="text-sm text-slate-400 font-normal"> / year</span>
              </div>
            </div>

            {/* Breakdown Items */}
            <div className="space-y-3 pt-2 border-t border-indigo-900/60">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Bad Debt Recovered</div>
                    <div className="text-[10px] text-slate-400">Auto WhatsApp fee reminders</div>
                  </div>
                </div>
                <div className="text-sm font-extrabold text-emerald-400">
                  +{formatCurrency(annualRecoveredBadDebt)}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Staff Admin Time Saved</div>
                    <div className="text-[10px] text-slate-400">~{monthlyHoursSaved} hrs/mo saved</div>
                  </div>
                </div>
                <div className="text-sm font-extrabold text-sky-300">
                  +{formatCurrency(annualAdminCostSaved)}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 space-y-2">
              <Link
                href="/app"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold text-xs sm:text-sm text-center shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Unlock These Savings in Live ERP</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={onOpenLogin}
                className="w-full py-2.5 text-xs text-indigo-300 hover:text-white font-semibold transition-colors text-center"
              >
                Already have an account? Sign In →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
