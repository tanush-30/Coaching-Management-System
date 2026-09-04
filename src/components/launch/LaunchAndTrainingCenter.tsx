'use client';

import React, { useState } from 'react';
import { 
  Rocket, 
  CheckCircle2, 
  BookOpen, 
  ShieldCheck, 
  Users, 
  HelpCircle, 
  FileText, 
  Download, 
  Play, 
  Sparkles, 
  MessageSquare, 
  Clock, 
  CreditCard,
  Award,
  ChevronRight,
  Check,
  CheckCheck
} from 'lucide-react';

export const LaunchAndTrainingCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'uat' | 'training' | 'rollout' | 'support'>('uat');

  // UAT Checklist State
  const [uatItems, setUatItems] = useState([
    { id: 'uat-1', name: 'Student Enrollment & Automatic Installment Splitting', role: 'Admin', status: 'passed', note: 'Tested with 1, 2, 3, and 4 installment schedules.' },
    { id: 'uat-2', name: 'Faculty 1-Tap Attendance & WhatsApp Absence Notification', role: 'Teacher', status: 'passed', note: 'Delivered to parent WhatsApp within 1.2s.' },
    { id: 'uat-3', name: 'Online UPI Payment & Verified PDF Receipt Generation', role: 'Parent', status: 'passed', note: 'Instant reconciliation with digital stamp.' },
    { id: 'uat-4', name: 'Exam Marks Matrix Grading & PDF Report Card Dispatch', role: 'Teacher', status: 'passed', note: 'Automatic rank calculation and WhatsApp alert.' },
    { id: 'uat-5', name: 'Parent Portal Self-Serve Attendance & Dues Viewer', role: 'Parent', status: 'passed', note: 'Tested across mobile and tablet form factors.' },
    { id: 'uat-6', name: 'Teacher Schedule & Substitute Class Reassignment', role: 'Teacher', status: 'passed', note: '1-Click substitute assignment verified.' },
    { id: 'uat-7', name: 'Meta Cloud API WhatsApp Business Verification', role: 'System', status: 'passed', note: 'Official green tick business channel integration.' },
  ]);

  const toggleUat = (id: string) => {
    setUatItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, status: item.status === 'passed' ? 'pending' : 'passed' }
          : item
      )
    );
  };

  const passedCount = uatItems.filter(i => i.status === 'passed').length;
  const readinessPercentage = Math.round((passedCount / uatItems.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-900 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Rocket className="w-4 h-4" /> Phase 6: Launch, Training & Handover
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Academy Go-Live Readiness & Staff Onboarding
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              User Acceptance Testing (UAT), staff quick-reference training cheatsheets, phased pilot rollout strategy, and 30-day post-launch support window.
            </p>
          </div>

          <div className="bg-emerald-950/80 border border-emerald-500/40 p-4 rounded-2xl text-center shrink-0">
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Launch Readiness</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-0.5">{readinessPercentage}%</div>
            <span className="text-[10px] text-slate-300">{passedCount} of {uatItems.length} Tests Passed</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-1.5 text-xs font-bold">
        {[
          { id: 'uat', label: `1. UAT Checklist (${passedCount}/${uatItems.length})`, icon: ShieldCheck },
          { id: 'training', label: '2. Staff Training & Cheatsheets', icon: BookOpen },
          { id: 'rollout', label: '3. Phased Rollout Plan', icon: Rocket },
          { id: 'support', label: '4. 30-Day Support & SLA', icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all ${
                isSelected ? 'bg-white text-indigo-600 shadow-xs scale-[1.01]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* 1. UAT CHECKLIST */}
        {activeTab === 'uat' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">User Acceptance Testing (UAT) Verification Matrix</h3>
                <p className="text-xs text-slate-500">Click any verification item to toggle tested status.</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                100% Core Flows Verified
              </span>
            </div>

            <div className="space-y-3">
              {uatItems.map((item) => {
                const isPassed = item.status === 'passed';
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleUat(item.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isPassed
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold mt-0.5 shrink-0 ${
                          isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5" /> : null}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.note}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        Role: {item.role}
                      </span>
                      <span
                        className={`font-bold px-2.5 py-1 rounded-lg text-[10px] ${
                          isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isPassed ? 'PASSED ✓' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. STAFF TRAINING & CHEATSHEETS */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Admin Staff Cheatsheet */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Front-Desk & Accounts Team</h4>
                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">1. Registering Students</span>
                    <span>Click "+ Enroll Student", fill student + parent WhatsApp mobile number, select batch and installment split.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">2. Collecting Fees & Invoices</span>
                    <span>Navigate to Fees tab, tap "Collect", select mode (Cash/UPI), and hand over the automatically printed PDF receipt.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">3. Overdue WhatsApp Follow-ups</span>
                    <span>Click "Send WhatsApp Link" to dispatch automated UPI payment links to parents in 1 click.</span>
                  </div>
                </div>
              </div>

              {/* Faculty Cheatsheet */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Faculty & Teaching Staff</h4>
                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">1. Daily 20-Sec Attendance</span>
                    <span>Select batch, tap "Mark All Present", toggle any absent students, and click "Submit Attendance".</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">2. Posting Homework & DPPs</span>
                    <span>Upload worksheet PDF with due date. Students see it immediately in their portal checklist.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">3. Exam Marks & Report Cards</span>
                    <span>Type student scores in the Marks Entry Matrix. Ranks and PDF report cards are generated automatically.</span>
                  </div>
                </div>
              </div>

              {/* Parents & Students Guide */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Parents & Students Guide</h4>
                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">1. WhatsApp Instant Alerts</span>
                    <span>Parents automatically receive absence notices and report cards without needing to install anything.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">2. 1-Click UPI Payment</span>
                    <span>Tap the link in WhatsApp to pay via GPay/PhonePe and receive an instant digital receipt.</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border">
                    <span className="font-bold text-slate-900 block">3. Self-Serve Portal</span>
                    <span>Check monthly attendance calendars and homework assignments at any time.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. PHASED ROLLOUT PLAN */}
        {activeTab === 'rollout' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 text-xs">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Phased Pilot Rollout Schedule</h3>
                <p className="text-slate-500">De-risked gradual deployment across academy batches.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                <span className="text-[10px] font-bold text-indigo-700 uppercase">Week 1: Pilot Launch</span>
                <h4 className="font-bold text-slate-900 text-sm">JEE Adv Titans (12th)</h4>
                <p className="text-slate-600 text-[11px]">Onboard 1 lead batch. Verify daily WhatsApp absence triggers and UPI payment link adoption with 28 parents.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Week 2: Medical Expansion</span>
                <h4 className="font-bold text-slate-900 text-sm">NEET Super-30 (12th)</h4>
                <p className="text-slate-600 text-[11px]">Expand to medical batch. Conduct first digital exam with automated PDF report card dispatch.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Week 3: Foundation Rollout</span>
                <h4 className="font-bold text-slate-900 text-sm">Class 10 & 9 Batches</h4>
                <p className="text-slate-600 text-[11px]">Onboard all junior batches. Full transition away from paper registers and Excel sheets.</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Week 4+: Full Academy Live</span>
                <h4 className="font-bold text-slate-900 text-sm">100% Automated ERP</h4>
                <p className="text-slate-600 text-[11px]">All 106+ students and parents operating on live portal and WhatsApp automation engine.</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. 30-DAY SUPPORT & SLA */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 text-xs">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">30-Day Post-Launch Support Window & SLA</h3>
                <p className="text-slate-500">Dedicated warranty and technical maintenance guarantee.</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                Active Hypercare Window
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm block">1. Bug Fixes & Hotfixes</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Rapid resolution for any UI adjustments, edge-case attendance corrections, or PDF invoice layout customizations within 4 hours.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm block">2. Meta WhatsApp API Health</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Continuous webhook monitoring ensuring 99.9% message delivery rates and template approval maintenance.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-slate-900 text-sm block">3. Weekly Backup & Security</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Automated encrypted database snapshots with zero downtime and GDPR/India DPDP privacy compliance.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
