'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CheckCheck,
  Send,
  BellRing,
  CreditCard,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Clock
} from 'lucide-react';

export function WhatsAppFeatureSection() {
  const [selectedTemplate, setSelectedTemplate] = useState<'attendance' | 'fee_due' | 'exam_report'>('attendance');
  const [customStudent, setCustomStudent] = useState('Ananya Verma');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'single' | 'double'>('double');
  const sendTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const tickTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
  };

  const handleTemplateChange = (tplId: 'attendance' | 'fee_due' | 'exam_report') => {
    clearTimers();
    setSelectedTemplate(tplId);
    setSendSuccess(false);
    setDeliveryStatus('single');
    tickTimerRef.current = setTimeout(() => {
      setDeliveryStatus('double');
    }, 750);
  };

  const handleTestSend = () => {
    clearTimers();
    setIsSending(true);
    setSendSuccess(false);
    setDeliveryStatus('single');

    sendTimerRef.current = setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      tickTimerRef.current = setTimeout(() => {
        setDeliveryStatus('double');
      }, 700);
      setTimeout(() => setSendSuccess(false), 4000);
    }, 500);
  };

  React.useEffect(() => {
    return () => clearTimers();
  }, []);

  const templates = [
    {
      id: 'attendance',
      title: 'Absent Alert',
      icon: BellRing,
      trigger: 'Triggered when marked absent in roll call',
      previewHeading: '🚨 Attendance Alert',
      previewBody: `Dear Parent, your ward ${customStudent} was absent for JEE Advanced Physics batch today (04:30 PM). Please ensure continuity of classes. Reply here if on prior leave.`,
      tag: 'Auto-Triggered in 30s',
    },
    {
      id: 'fee_due',
      title: 'Fee Due & UPI Link',
      icon: CreditCard,
      trigger: 'Triggered 3 days before installment due date',
      previewHeading: '💳 Fee Installment Due Reminder',
      previewBody: `Dear Parent, Installment #2 of ₹15,000 for ${customStudent} (Class 12 JEE) is due on 15th Sep. Pay instantly via UPI/Card link: https://pay.apexerp.co/inv_8492. Instant GST receipt will be generated.`,
      tag: 'Includes Razorpay / UPI Link',
    },
    {
      id: 'exam_report',
      title: 'Exam Scorecard',
      icon: FileCheck2,
      trigger: 'Triggered when exam marks are published',
      previewHeading: '📊 Test Results Published',
      previewBody: `Dear Parent, ${customStudent} scored 182/200 (91.0%, Rank #3) in Mock JEE Test #4 (Physics + Chem). Batch Avg: 74%. Download full subject-wise analysis PDF: https://apexerp.co/report/9021`,
      tag: 'Auto PDF Scorecard',
    },
  ];

  const currentTpl = templates.find((t) => t.id === selectedTemplate) || templates[0];

  return (
    <section id="whatsapp" className="py-20 bg-gradient-to-b from-slate-900 via-[#0b141a] to-slate-900 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-transform duration-300 hover:scale-105">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official WhatsApp Business Integration</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Automated WhatsApp OS That Parents Actually Read
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Emails go unread and SMS gets marked as spam. WhatsApp messages enjoy a 98% open rate within 5 minutes. Keep parents instantly updated without adding manual work for your staff.
          </p>
        </div>

        {/* Interactive WhatsApp Studio Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          {/* Left Column: Template Switcher & Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-extrabold text-white">
                Choose an Automation Workflow:
              </h3>
              <p className="text-xs text-slate-400">
                Click any template to preview its message payload and test live dispatch:
              </p>
            </div>

            {/* Template Buttons */}
            <div className="space-y-3">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplateChange(tpl.id as any)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-start justify-between gap-4 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/80 shadow-lg shadow-emerald-500/10 scale-[1.01]'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isSelected ? 'bg-emerald-500 text-slate-950 font-bold scale-105' : 'bg-slate-700 text-slate-300'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{tpl.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {tpl.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{tpl.trigger}</p>
                      </div>
                    </div>

                    <div className="shrink-0 mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                        isSelected ? 'border-emerald-400 bg-emerald-400 text-slate-950' : 'border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Student Name Input */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Test with Student Name:</span>
                <span className="text-slate-400">Dynamic Variable</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customStudent}
                  onChange={(e) => setCustomStudent(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Enter student name..."
                />
                <button
                  onClick={handleTestSend}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-emerald-600/30 hover:shadow-emerald-600/50 disabled:opacity-50 active:scale-95"
                >
                  <Send className={`w-3.5 h-3.5 transition-transform duration-200 ${isSending ? 'translate-x-1' : ''}`} />
                  <span>{isSending ? 'Sending...' : 'Test Send'}</span>
                </button>
              </div>

              {sendSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-pop-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Dispatched! 1 WhatsApp message delivered with 0 errors.</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Realistic Mock WhatsApp Phone Screen (5 Cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-[340px] rounded-[36px] bg-[#111b21] p-3 border-4 border-slate-700 shadow-2xl shadow-emerald-950/40 hover:shadow-emerald-900/30 transition-all duration-300">
              {/* Phone Speaker & Camera Notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />

              {/* WhatsApp App Header */}
              <div className="bg-[#202c33] rounded-2xl p-3 flex items-center justify-between text-white mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                    🎓
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-white">Apex Coaching Institute</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-emerald-400">Verified Business • Online</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400">10:30 AM</div>
              </div>

              {/* Chat Canvas with Wallpaper */}
              <div className="bg-[#0b141a] rounded-2xl p-3 min-h-[300px] flex flex-col justify-between border border-slate-800/80">
                {/* Date Header */}
                <div className="text-center my-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#182229] text-[9px] font-medium text-slate-400 uppercase">
                    Today
                  </span>
                </div>

                {/* Message Bubble with popIn animation */}
                <div className="space-y-2">
                  <div
                    key={`${selectedTemplate}-${customStudent}-${isSending ? 'sending' : 'settled'}`}
                    className="bg-[#005c4b] text-white p-3 rounded-2xl rounded-tl-sm text-xs shadow-md border border-[#025143] space-y-1.5 animate-pop-in"
                  >
                    <div className="font-bold text-emerald-200 text-[11px] flex items-center justify-between">
                      <span>{currentTpl.previewHeading}</span>
                      <span className="text-[9px] text-emerald-300 font-mono">Official</span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-slate-100">
                      {currentTpl.previewBody}
                    </p>

                    <div className="pt-1.5 border-t border-emerald-600/40 flex items-center justify-between text-[9px] text-emerald-200">
                      <span>ApexERP Automation</span>
                      <span className="flex items-center gap-1 font-mono font-bold transition-all duration-300">
                        10:31 AM{' '}
                        {deliveryStatus === 'double' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-300 animate-pop-in" />
                        ) : (
                          <span className="text-emerald-300 font-mono">✓</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action CTA within WhatsApp */}
                <div className="mt-3 pt-2 text-center text-[10px] text-slate-400 border-t border-slate-800 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Delivered via High-Throughput API Gateway</span>
                </div>
              </div>

              {/* Bottom Phone Bar */}
              <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
