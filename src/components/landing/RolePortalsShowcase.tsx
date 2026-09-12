'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  UserCheck,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  Calendar,
  CreditCard,
  BookOpen,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface RolePortalsShowcaseProps {
  onOpenLoginWithRole: (role: UserRole) => void;
}

export function RolePortalsShowcase({ onOpenLoginWithRole }: RolePortalsShowcaseProps) {
  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>('admin');

  const roleDetails = {
    admin: {
      title: 'Administrator & Institute Owner',
      subtitle: 'Complete 360° visibility over revenue, batch schedules, faculty, and student growth.',
      badge: 'Super Admin Access',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: ShieldCheck,
      gradient: 'from-indigo-600 to-blue-600',
      highlights: [
        'Real-time financial receivables vs collection analytics',
        'Batch creation, timetable scheduling & capacity monitoring',
        'Bulk student enrollment & automated roll generation',
        'Official WhatsApp Business broadcast dispatch & audit logs',
      ],
      mockCard: {
        header: 'Director Command Center',
        stat1: { label: 'Monthly Revenue', value: '₹14.85 L', change: '+18.4% vs last month' },
        stat2: { label: 'Batch Capacity', value: '91.8%', change: '248 / 270 seats filled' },
        stat3: { label: 'WhatsApp Delivery', value: '99.9%', change: '1,842 delivered today' },
        ctaLabel: 'Test Super Admin ERP',
      },
    },
    teacher: {
      title: 'Faculty & Subject Teachers',
      subtitle: 'Streamlined teaching tools to record attendance, grade exams, and assign homework in seconds.',
      badge: 'Academic Hub',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Users,
      gradient: 'from-emerald-600 to-teal-600',
      highlights: [
        '15-Second batch attendance with 1-click "Mark All Present"',
        'Direct marks & grades entry with instant rank calculations',
        'Publish homework, assignment deadlines & syllabus notes',
        'View student-wise academic performance history',
      ],
      mockCard: {
        header: 'Faculty Teaching Station',
        stat1: { label: 'Assigned Batches', value: '4 Classes', change: 'JEE Physics • 120 students' },
        stat2: { label: 'Today Attendance', value: '96.2%', change: '2 absentees alerted' },
        stat3: { label: 'Homework Active', value: '3 Tasks', change: '88% submission rate' },
        ctaLabel: 'Test Teacher Portal',
      },
    },
    parent: {
      title: 'Parent & Guardian Portal',
      subtitle: 'Total peace of mind with real-time class attendance, fee receipts, and exam scorecards.',
      badge: 'Parent Trust Engine',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: UserCheck,
      gradient: 'from-amber-500 to-orange-600',
      highlights: [
        'Instant absent alerts sent via WhatsApp & portal notification',
        '1-Click fee installment payments via UPI, Cards, and NetBanking',
        'Downloadable official fee receipts with institute GST details',
        'Interactive performance charts and batch ranking over time',
      ],
      mockCard: {
        header: 'Parent Guardian Dashboard',
        stat1: { label: 'Student Profile', value: 'Aarav Patel', change: 'Class 12 Advanced' },
        stat2: { label: 'Monthly Attendance', value: '95.4%', change: '22/23 lectures attended' },
        stat3: { label: 'Next Installment', value: '₹15,000', change: 'Due in 5 days • Pay UPI' },
        ctaLabel: 'Test Parent Portal',
      },
    },
    student: {
      title: 'Student Learning App',
      subtitle: 'Personalized study center for viewing daily assignments, study materials, and test ranks.',
      badge: 'Student Success',
      badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
      icon: GraduationCap,
      gradient: 'from-violet-600 to-purple-600',
      highlights: [
        'Access study materials, formula sheets & PDF notes 24/7',
        'Track pending homework with deadline countdown timers',
        'Review unit test scores, answer keys & batch percentiles',
        'Personal progress tracker across Physics, Chem & Math',
      ],
      mockCard: {
        header: 'Student Academic App',
        stat1: { label: 'Current Batch Rank', value: 'Rank #4', change: 'Top 5% in Institute' },
        stat2: { label: 'Homework Due', value: '2 Pending', change: 'Calculus Worksheet 4' },
        stat3: { label: 'Latest Test Score', value: '94/100', change: 'Thermodynamics Exam' },
        ctaLabel: 'Test Student App',
      },
    },
  };

  const currentRole = roleDetails[activeRoleTab];

  return (
    <section id="portals" className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-xs font-bold text-indigo-700">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>4-in-1 Role Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Tailored Experiences for Every Stakeholder
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            No more confusing monolithic interfaces. Every user gets a role-specific, intuitive interface designed exactly for their daily needs.
          </p>
        </div>

        {/* 4-Tab Switcher with sliding indicator */}
        <div className="relative flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-2xl mx-auto mb-10 border border-slate-200">
          {[
            { role: 'admin' as UserRole, label: 'Super Admin / Owner', icon: ShieldCheck },
            { role: 'teacher' as UserRole, label: 'Faculty / Teacher', icon: Users },
            { role: 'parent' as UserRole, label: 'Parent / Guardian', icon: UserCheck },
            { role: 'student' as UserRole, label: 'Student Portal', icon: GraduationCap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeRoleTab === tab.role;
            return (
              <button
                key={tab.role}
                onClick={() => setActiveRoleTab(tab.role)}
                className={`relative z-10 flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isSelected
                    ? 'bg-white text-indigo-600 shadow-md border border-slate-200/80 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isSelected ? 'scale-110 text-indigo-600' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Role Showcase Panel */}
        <div
          key={activeRoleTab}
          className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm max-w-5xl mx-auto animate-fade-in-up"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Role Overview & Feature Bullets (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${currentRole.badgeColor} transition-transform duration-200 hover:scale-105`}>
                    {currentRole.badge}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {currentRole.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {currentRole.subtitle}
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-3 pt-2">
                {currentRole.highlights.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 transition-transform duration-200 hover:translate-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{h}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onOpenLoginWithRole(activeRoleTab)}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center gap-2 group"
                >
                  <span>Access {currentRole.title.split(' ')[0]} Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>

                <Link
                  href={`/app?role=${activeRoleTab}`}
                  className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition-all duration-300 hover:scale-[1.01] flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  <span>Open Direct View</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Realistic Mock Portal Snapshot (5 cols) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${currentRole.gradient} flex items-center justify-center text-white shadow-xs`}>
                      <currentRole.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{currentRole.mockCard.header}</div>
                      <div className="text-[10px] text-slate-500">Live Active Session</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Connected
                  </span>
                </div>

                {/* 3 Metrics */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors duration-200 hover:bg-slate-100/70">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
                        {currentRole.mockCard.stat1.label}
                      </div>
                      <div className="text-base font-extrabold text-slate-900">
                        {currentRole.mockCard.stat1.value}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      {currentRole.mockCard.stat1.change}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors duration-200 hover:bg-slate-100/70">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
                        {currentRole.mockCard.stat2.label}
                      </div>
                      <div className="text-base font-extrabold text-slate-900">
                        {currentRole.mockCard.stat2.value}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                      {currentRole.mockCard.stat2.change}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between transition-colors duration-200 hover:bg-slate-100/70">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">
                        {currentRole.mockCard.stat3.label}
                      </div>
                      <div className="text-base font-extrabold text-slate-900">
                        {currentRole.mockCard.stat3.value}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                      {currentRole.mockCard.stat3.change}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenLoginWithRole(activeRoleTab)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold text-center transition-all duration-200 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>{currentRole.mockCard.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
