'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Layers,
  CreditCard,
  Clock,
  BookOpen,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  QrCode,
  FileText
} from 'lucide-react';

export function FeaturesGrid() {
  const [activeCategory, setActiveCategory] = useState<number>(0);

  const modules = [
    {
      id: 'students_batches',
      title: 'Student & Batch Lifecycle Management',
      badge: 'Phase 1 Core',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Users,
      iconBg: 'bg-indigo-600',
      description:
        'Digitize your entire student database. Set up morning, evening, and weekend batches with seat limits, track enrollments, and filter by subjects effortlessly.',
      features: [
        'Instant multi-field student enrollment modal',
        'Automatic Roll Number & Batch Assignment',
        'Real-time seat capacity & vacancy trackers',
        'Export clean student registries and contact sheets',
      ],
      previewSnippet: {
        title: 'Live Student Directory',
        stat: '248 Active Students across 8 Batches',
        tag: 'Instant Search & Filter Active',
      },
    },
    {
      id: 'whatsapp_automation',
      title: 'WhatsApp Automation OS',
      badge: 'Parent Favorite',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: MessageSquare,
      iconBg: 'bg-emerald-600',
      description:
        'Trigger instant alerts the second an action happens. Parents receive attendance notices, fee payment links, and test scorecards on WhatsApp.',
      features: [
        'Automated absent alert within 30 seconds of attendance mark',
        'Smart fee reminder broadcasts with 1-click payment links',
        'Test scorecards sent directly to parent chat',
        'Complete broadcast logs with delivery & read timestamps',
      ],
      previewSnippet: {
        title: 'WhatsApp Automation Hub',
        stat: '1,842 Alerts Sent • 100% Delivery',
        tag: 'Auto-Trigger Enabled',
      },
    },
    {
      id: 'fees_payments',
      title: 'Smart Fee Collection & Installments',
      badge: 'Revenue Protector',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: CreditCard,
      iconBg: 'bg-amber-600',
      description:
        'Never let fees slip through the cracks. Structure flexible installments, accept UPI / Razorpay payments, and generate branded PDF receipts instantly.',
      features: [
        'Configurable monthly, quarterly, and custom installment plans',
        'One-click digital receipt generation & PDF download',
        'Upcoming vs Overdue fee tracking dashboard',
        'Instant UPI QR code & payment gateway links',
      ],
      previewSnippet: {
        title: 'Invoicing & Receivables',
        stat: '₹14.85 L Collected • ₹45k Overdue Only',
        tag: '99.4% On-Time Recovery',
      },
    },
    {
      id: 'attendance_tracking',
      title: 'Fast Attendance & Absent Escalations',
      badge: 'Zero Latency',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Clock,
      iconBg: 'bg-sky-600',
      description:
        'Faculty can mark an entire batch attendance in under 15 seconds. Absent students are instantly flagged and parents are notified automatically.',
      features: [
        '1-Click "Mark All Present" with quick absent toggles',
        'Historical attendance percentage per student & batch',
        'Automatic absent list compilation for administrative review',
        'Works seamlessly on mobile phones and tablets',
      ],
      previewSnippet: {
        title: 'Batch Attendance Engine',
        stat: '15-second batch roll call',
        tag: 'Instant Parent Sync',
      },
    },
    {
      id: 'academics_exams',
      title: 'Exams, Marks & Digital Report Cards',
      badge: 'Phase 3 Academics',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: BookOpen,
      iconBg: 'bg-violet-600',
      description:
        'Create unit tests, mock JEE/NEET exams, or term exams. Enter scores in minutes, compute percentiles, generate rank lists, and deliver report cards.',
      features: [
        'Batch-wise exam scheduling and subject scoring',
        'Automatic highest mark, average score & rank calculation',
        'Student performance trend graphs over time',
        'Shareable digital scorecards with grading breakdown',
      ],
      previewSnippet: {
        title: 'Academic Analytics Engine',
        stat: 'Auto Ranks & Performance Graphs',
        tag: 'PDF Report Cards Ready',
      },
    },
    {
      id: 'portals_analytics',
      title: '4 Dedicated Portals & Business Insights',
      badge: 'Multi-Role Portal OS',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: TrendingUp,
      iconBg: 'bg-rose-600',
      description:
        'Tailor-made portals for every stakeholder. Admin gets financial metrics, Teachers manage classrooms, Parents track progress, and Students access homework.',
      features: [
        'Admin Executive Analytics: Revenue, batch occupancy, fee collection',
        'Teacher Workspace: Timetables, attendance, homework dispatch',
        'Parent Portal: Child progress, fee history, online payments',
        'Student App: Class notes, upcoming tests, and rank leaderboards',
      ],
      previewSnippet: {
        title: 'Multi-Role Architecture',
        stat: 'Admin • Teacher • Parent • Student',
        tag: 'Role-Based Access Control',
      },
    },
  ];

  return (
    <section id="features" className="py-20 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-bold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Complete Academy Infrastructure</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything Your Coaching Center Needs to Run on Autopilot
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Replace 5 disconnected tools with one cohesive operating system. Built specifically around the daily operations of Indian coaching centers and tuition academies.
          </p>
        </div>

        {/* 6 Modular Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-300 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${m.iconBg} flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${m.badgeColor} transition-transform duration-200 group-hover:scale-105`}>
                      {m.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-200 mb-2">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">
                    {m.description}
                  </p>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100">
                    {m.features.map((feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-start gap-2 text-xs text-slate-700 transition-transform duration-200 hover:translate-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Interactive Preview Micro-Card */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 group-hover:bg-indigo-50/40 group-hover:border-indigo-100 transition-colors duration-300 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-[11px]">{m.previewSnippet.title}</div>
                      <div className="text-[10px] text-slate-500">{m.previewSnippet.stat}</div>
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {m.previewSnippet.tag}
                    </span>
                  </div>

                  <Link
                    href="/app"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 group/link"
                  >
                    <span>Test drive this module in live ERP</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform duration-200" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
