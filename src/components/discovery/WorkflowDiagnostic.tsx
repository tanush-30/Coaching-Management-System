'use client';

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  BookOpen, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  ArrowRight, 
  Zap, 
  ShieldCheck,
  Smartphone,
  CreditCard
} from 'lucide-react';

export const WorkflowDiagnostic: React.FC = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<'attendance' | 'fees' | 'communication' | 'academics'>('attendance');
  const [studentCount, setStudentCount] = useState<number>(120);
  const [avgFee, setAvgFee] = useState<number>(65000);

  // ROI calculations
  const monthlyCallsSaved = Math.round(studentCount * 3.5);
  const hoursSavedPerWeek = Math.round((studentCount / 30) * 4.5);
  const estimatedRevenueLeakagePrevented = Math.round((studentCount * avgFee * 0.06));

  const workflows = {
    attendance: {
      title: 'Attendance & Parent Notification',
      current: {
        method: 'Paper Register + Manual WhatsApp Messages',
        painPoints: [
          'Teacher spends 10–15 minutes per batch calling out roll numbers',
          'Absentees are either not reported or staff spends 2 hours calling parents',
          'Parents complain they were not notified when their child skipped class',
          'Paper registers are easily damaged, misplaced, or forged'
        ],
        timeSpent: '12 hours / week',
        errorRate: 'High (15-20% missed alerts)',
      },
      automated: {
        method: '1-Tap Mobile Grid + Meta Cloud WhatsApp Engine',
        improvements: [
          'Teacher marks full batch in under 20 seconds with 1-tap presets',
          'Instant WhatsApp alerts triggered within 5 seconds to absent student parents',
          'Real-time attendance percentage tracked automatically on parent portal',
          '100% digital audit trail with timestamp and teacher ID'
        ],
        timeSpent: '30 seconds / batch',
        errorRate: '0% automated delivery',
      }
    },
    fees: {
      title: 'Fee Collection, Installments & Receipts',
      current: {
        method: 'Manual Excel Ledger + Hand-written Paper Receipts',
        painPoints: [
          'Multiple spreadsheets with broken formulas and mismatched totals',
          'Awkward manual phone calls to parents asking for overdue installments',
          'Lost paper receipts causing disputes between parents and accounts desk',
          'Cash collections prone to untracked leakage or accounting delays'
        ],
        timeSpent: '18 hours / month',
        errorRate: 'Significant reconciliation lag',
      },
      automated: {
        method: 'Multi-Tier Installment Engine + 1-Click UPI Payment Links',
        improvements: [
          'Automated WhatsApp payment reminders 3 days prior and on due date',
          'Parents pay directly via UPI / QR code in 10 seconds without visiting office',
          'Instant tamper-proof PDF receipts generated & delivered to WhatsApp',
          'Live revenue dashboard showing collected vs. pending balance in real-time'
        ],
        timeSpent: 'Fully Automated',
        errorRate: 'Zero manual calculation errors',
      }
    },
    communication: {
      title: 'Parent Communication & Front-Desk Queries',
      current: {
        method: 'Crowded WhatsApp Groups + Constant Front-Desk Phone Calls',
        painPoints: [
          'Important announcements get buried in group spam and chit-chat',
          'Parents call 20+ times a day asking for test dates, scores, or fee dues',
          'Privacy issues: parents and students can see other members\' phone numbers',
          'No message read receipts or structured delivery confirmation'
        ],
        timeSpent: '20+ hours / week staff time',
        errorRate: 'Fragmented communication',
      },
      automated: {
        method: 'Official 1-on-1 WhatsApp Business API + Self-Serve Parent Portal',
        improvements: [
          '100% private, verified 1-on-1 WhatsApp communication',
          'Self-serve Parent Portal for checking attendance, dues, and test results',
          'Broadcast announcements to specific batches with 1-click delivery stats',
          'Over 75% reduction in repetitive front-desk phone inquiries'
        ],
        timeSpent: '2 hours / week',
        errorRate: '100% verified private delivery',
      }
    },
    academics: {
      title: 'Exam Scheduling, Marks & Progress Reports',
      current: {
        method: 'Paper Answer Sheets + Handwritten Progress Diaries',
        painPoints: [
          'Manual calculation of totals, percentages, and rank lists',
          'Progress reports sent weeks late or lost in student backpacks',
          'No graphical analysis of student strengths vs. weak topics',
          'Center owner cannot easily compare batch performance across faculty'
        ],
        timeSpent: '15 hours per exam cycle',
        errorRate: 'Calculation & transcription errors',
      },
      automated: {
        method: 'Rapid Marks Entry Grid + Instant PDF Report Cards',
        improvements: [
          'Batch average, highest score, and student ranks computed in real-time',
          'Professional PDF report cards with charts generated in 1 click',
          'Instant WhatsApp dispatch of report cards directly to parent phones',
          'Comparative analytics showing batch-wise trends and topic mastery'
        ],
        timeSpent: 'Instant 1-Click Generation',
        errorRate: '100% computational accuracy',
      }
    }
  };

  const active = workflows[selectedWorkflow];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        {[
          { id: 'attendance', label: 'Attendance & Alerts', icon: Clock },
          { id: 'fees', label: 'Fees & Collections', icon: CreditCard },
          { id: 'communication', label: 'Parent Communication', icon: MessageSquare },
          { id: 'academics', label: 'Exams & Reports', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedWorkflow === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedWorkflow(tab.id as any)}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                isSelected
                  ? 'bg-white text-indigo-600 shadow-md border border-slate-200/80 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* As-Is Current Workflow Card */}
        <div className="bg-gradient-to-b from-rose-50/50 via-white to-rose-50/20 border-2 border-rose-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
            Current State (As-Is)
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">{active.title}</h4>
              <p className="text-xs text-rose-700 font-medium">{active.current.method}</p>
            </div>
          </div>

          <div className="space-y-3 my-5">
            {active.current.painPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700 bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
                <span className="text-rose-500 font-bold mt-0.5">•</span>
                <span>{point}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-rose-100 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Time Burden</span>
              <span className="font-bold text-rose-700 text-sm">{active.current.timeSpent}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Reliability</span>
              <span className="font-bold text-rose-700 text-sm">{active.current.errorRate}</span>
            </div>
          </div>
        </div>

        {/* To-Be Automated Solution Card */}
        <div className="bg-gradient-to-b from-indigo-50/60 via-white to-emerald-50/30 border-2 border-indigo-300 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 fill-amber-300 text-amber-300" /> Target Solution (To-Be)
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">{active.title}</h4>
              <p className="text-xs text-indigo-700 font-medium">{active.automated.method}</p>
            </div>
          </div>

          <div className="space-y-3 my-5">
            {active.automated.improvements.map((item, index) => (
              <div key={index} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-800 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-indigo-100 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Efficiency Gain</span>
              <span className="font-bold text-emerald-700 text-sm">{active.automated.timeSpent}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Accuracy</span>
              <span className="font-bold text-emerald-700 text-sm">{active.automated.errorRate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Coaching ROI & Savings Calculator */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" /> Discovery Phase ROI Estimator
            </div>
            <h3 className="text-xl font-bold text-white">Projected Efficiency & Financial Impact</h3>
            <p className="text-xs text-slate-400 mt-1">Adjust academy scale to calculate estimated administrative time & revenue recovery.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block">Active Students</label>
              <input 
                type="number" 
                value={studentCount} 
                onChange={(e) => setStudentCount(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-20 bg-slate-950 border border-slate-700 text-white font-bold text-sm px-2 py-1 rounded"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-400 font-bold block">Avg Annual Fee (₹)</label>
              <input 
                type="number" 
                value={avgFee} 
                onChange={(e) => setAvgFee(Math.max(1000, parseInt(e.target.value) || 0))}
                className="w-24 bg-slate-950 border border-slate-700 text-white font-bold text-sm px-2 py-1 rounded"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Monthly Manual Calls Saved</span>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">{monthlyCallsSaved.toLocaleString()} calls</div>
            <p className="text-[11px] text-slate-400 mt-1">Absence notifications & fee reminders handled 100% via WhatsApp</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Staff Time Saved Weekly</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{hoursSavedPerWeek} hours / wk</div>
            <p className="text-[11px] text-slate-400 mt-1">Zero manual register updates, ledger reconciliation, or report card printing</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
            <span className="text-xs text-slate-400 font-medium">Overdue Recovery Acceleration</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">₹{estimatedRevenueLeakagePrevented.toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-1">Estimated revenue recovered faster via automated 1-click UPI links</p>
          </div>
        </div>
      </div>
    </div>
  );
};
