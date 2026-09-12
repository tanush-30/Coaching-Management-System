'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Play,
  Layers,
  BookOpen,
  Clock,
  Send,
  UserCheck,
  GraduationCap,
  ExternalLink,
  Zap,
  Lock
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface HeroSectionProps {
  onOpenLoginWithRole: (role: UserRole) => void;
}

export function HeroSection({ onOpenLoginWithRole }: HeroSectionProps) {
  const [activeHeroTab, setActiveHeroTab] = useState<'dashboard' | 'whatsapp' | 'fees' | 'grades'>('dashboard');
  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const [testStudentName, setTestStudentName] = useState('Rahul Sharma');
  const [simulatedSent, setSimulatedSent] = useState(false);
  const [tickState, setTickState] = useState<'single' | 'double'>('single');
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const heroTabs = ['dashboard', 'whatsapp', 'fees', 'grades'] as const;

  const handleTabChange = (nextTab: 'dashboard' | 'whatsapp' | 'fees' | 'grades') => {
    const currentIndex = heroTabs.indexOf(activeHeroTab);
    const nextIndex = heroTabs.indexOf(nextTab);
    setDirection(nextIndex >= currentIndex ? 'right' : 'left');
    setActiveHeroTab(nextTab);
  };

  const handleSimulateSend = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSimulatedSent(true);
    setTickState('single');

    const tickTimer = setTimeout(() => {
      setTickState('double');
    }, 700);

    timerRef.current = setTimeout(() => {
      setSimulatedSent(false);
      clearTimeout(tickTimer);
    }, 4500);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Dynamic Background Glows & Grid */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-tr from-indigo-500/15 via-sky-400/15 to-purple-500/10 blur-3xl rounded-full animate-pulse-glow" />
        <div className="absolute top-48 right-10 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute top-72 left-10 w-80 h-80 bg-indigo-600/10 blur-3xl rounded-full" />
        {/* Subtle grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f108_1px,transparent_1px),linear-gradient(to_bottom,#6366f108_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badges & Announcement */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/80 shadow-xs text-xs font-bold text-indigo-900 transition-transform duration-300 hover:scale-105">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Master Blueprint: Phases 0 to 6 Fully Delivered</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 transition-transform duration-300 hover:scale-105">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Instant WhatsApp API & Razorpay Ready</span>
          </div>
        </div>

        {/* Main Hero Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            Transform Your Coaching Center Into An{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600">
              Automated Powerhouse
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Eliminate manual registers, messy Excel sheets, and WhatsApp group chaos. 
            Automate student enrollment, attendance alerts, fee collection, and digital report cards with 
            dedicated portals for <span className="font-bold text-slate-900">Admins, Teachers, Parents, and Students</span>.
          </p>

          {/* Primary Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/app"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 focus-visible:ring-4 focus-visible:ring-indigo-300 focus-visible:outline-none flex items-center justify-center gap-2 group"
            >
              <Zap className="w-5 h-5 text-indigo-200 group-hover:rotate-12 transition-transform duration-300" />
              <span>Launch Live ERP Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>

            <button
              onClick={() => onOpenLoginWithRole('admin')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm sm:text-base border-2 border-slate-200/90 hover:border-indigo-500 shadow-sm transition-all duration-300 hover:scale-[1.01] active:scale-95 focus-visible:ring-4 focus-visible:ring-slate-200 focus-visible:outline-none flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>Sign In / Quick Access</span>
            </button>
          </div>

          {/* Persona Quick Launch Chips */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Select Your Role Portal:</span>
            <button
              onClick={() => onOpenLoginWithRole('admin')}
              className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1 font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
            </button>
            <button
              onClick={() => onOpenLoginWithRole('teacher')}
              className="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1 font-bold"
            >
              <Users className="w-3.5 h-3.5" /> Faculty / Teacher
            </button>
            <button
              onClick={() => onOpenLoginWithRole('parent')}
              className="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1 font-bold"
            >
              <UserCheck className="w-3.5 h-3.5" /> Parent Portal
            </button>
            <button
              onClick={() => onOpenLoginWithRole('student')}
              className="px-3 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1 font-bold"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Student App
            </button>
          </div>
        </div>

        {/* Interactive Hero Showcase / Mock Screen Container */}
        <div className="mt-12 max-w-5xl mx-auto relative">
          {/* Floating Ambient Badge 1: Top Right */}
          <div className="hidden md:flex absolute -top-5 -right-4 z-20 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 text-xs font-bold text-slate-800 animate-float-slow">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>⚡ 1-Click UPI Payment Confirmed</span>
          </div>

          {/* Floating Ambient Badge 2: Bottom Left */}
          <div className="hidden md:flex absolute -bottom-5 -left-4 z-20 items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 text-xs font-bold text-slate-800 animate-float-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            <span>🔔 30s Instant Absent Alert to Parent</span>
          </div>

          <div className="relative rounded-3xl border border-slate-300/80 bg-white/90 backdrop-blur-xl shadow-2xl shadow-indigo-950/10 overflow-hidden">
            {/* Window Top Bar */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="ml-2 text-xs font-mono text-slate-400">
                  app.apexerp.co/live-preview
                </span>
              </div>

              {/* Showcase Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                    activeHeroTab === 'dashboard'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold scale-[1.02]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  ERP Overview
                </button>
                <button
                  onClick={() => handleTabChange('whatsapp')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                    activeHeroTab === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold scale-[1.02]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>WhatsApp Hub</span>
                </button>
                <button
                  onClick={() => handleTabChange('fees')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                    activeHeroTab === 'fees'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold scale-[1.02]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Fee Recovery
                </button>
                <button
                  onClick={() => handleTabChange('grades')}
                  className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                    activeHeroTab === 'grades'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold scale-[1.02]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Report Cards
                </button>
              </div>

              <Link
                href="/app"
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hidden sm:flex transition-colors"
              >
                <span>Full System</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Showcase Tab Content with Directional Animation */}
            <div className="p-5 sm:p-7 bg-slate-50/70 min-h-[380px] overflow-hidden">
              <div
                key={activeHeroTab}
                className={direction === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
              >
                {/* TAB 1: ERP Dashboard */}
                {activeHeroTab === 'dashboard' && (
                  <div className="space-y-5">
                  {/* Top 4 KPI Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Active Students</span>
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 mt-2">248</div>
                      <div className="text-[11px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> +14 this month
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Fee Recovery</span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 mt-2">₹14.85 L</div>
                      <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                        94.2% collected on-time
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Daily Attendance</span>
                        <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 mt-2">96.4%</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Automated parent alerts sent
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">WhatsApp Broadcasts</span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-slate-900 mt-2">1,842</div>
                      <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                        100% delivery rate
                      </div>
                    </div>
                  </div>

                  {/* Active Batches & Quick Action Bar */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/90">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Active Batch Utilization & Schedule
                        </h4>
                        <span className="text-[11px] text-indigo-600 font-bold">4 Batches Today</span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900">JEE Physics Super 30</div>
                            <div className="text-[11px] text-slate-500">04:30 PM – 06:00 PM • Prof. Verma</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              29 / 30 Enrolled
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900">NEET Biology Champions</div>
                            <div className="text-[11px] text-slate-500">06:00 PM – 07:30 PM • Dr. Awasthi</div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                              38 / 40 Enrolled
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                          <Sparkles className="w-3.5 h-3.5" /> Full Management Suite
                        </div>
                        <h4 className="font-extrabold text-base mt-2 text-white">
                          Enterprise Institute Modules
                        </h4>
                        <p className="text-xs text-slate-300 mt-1">
                          Comprehensive student enrollment, batch scheduling, fee installment tracking, and exam mark calculations.
                        </p>
                      </div>

                      <Link
                        href="/app"
                        className="mt-4 w-full py-2.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Open Full ERP Interface</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WhatsApp Hub Simulator */}
              {activeHeroTab === 'whatsapp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Interactive WhatsApp Dispatch Tester</span>
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Simulate sending an automated instant absent alert or fee receipt directly to a parent:
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                        <input
                          type="text"
                          value={testStudentName}
                          onChange={(e) => setTestStudentName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <button
                        onClick={handleSimulateSend}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-md shadow-emerald-600/20"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Simulate WhatsApp Dispatch</span>
                      </button>

                      {simulatedSent && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-pop-in">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>WhatsApp message delivered in 0.4s to Parent (+91 98765 43210)!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mock Smartphone WhatsApp Bubble */}
                  <div className="bg-[#0b141a] text-white p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs">
                      <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                        A
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1">
                          <span>Apex Academy Official</span>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">Verified Business Account</div>
                      </div>
                    </div>

                    <div
                      key={simulatedSent ? 'sent-bubble' : 'initial-bubble'}
                      className={`my-3 bg-[#1f2c34] p-3 rounded-2xl border-l-4 border-emerald-500 text-xs space-y-2 text-slate-200 ${
                        simulatedSent ? 'animate-pop-in' : ''
                      }`}
                    >
                      <div className="font-bold text-emerald-400">📢 Attendance Alert</div>
                      <p className="text-[11px] leading-relaxed">
                        Dear Parent, your ward <span className="font-bold text-white">{testStudentName}</span> was marked <span className="text-rose-400 font-bold">ABSENT</span> for <span className="font-bold text-white">JEE Physics Super 30</span> batch today at 04:35 PM.
                      </p>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700/60 flex items-center justify-between">
                        <span>ApexERP Automated Alert</span>
                        <span className="text-emerald-400 font-bold transition-all duration-300">
                          {tickState === 'double' ? '✓✓ Read' : '✓ Sent'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 text-center">
                      Auto-triggered upon faculty attendance punch
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Fee Recovery */}
              {activeHeroTab === 'fees' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <span className="text-xs font-bold text-emerald-800">Total Collected</span>
                      <div className="text-xl font-extrabold text-emerald-900 mt-1">₹14,85,000</div>
                      <span className="text-[11px] text-emerald-700 font-medium">92% of target</span>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <span className="text-xs font-bold text-amber-800">Upcoming Dues (Next 7d)</span>
                      <div className="text-xl font-extrabold text-amber-900 mt-1">₹1,20,000</div>
                      <span className="text-[11px] text-amber-700 font-medium">Auto-reminders active</span>
                    </div>
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                      <span className="text-xs font-bold text-rose-800">Overdue (Recovered)</span>
                      <div className="text-xl font-extrabold text-rose-900 mt-1">₹45,000</div>
                      <span className="text-[11px] text-rose-700 font-medium">Down 88% from Excel</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-800 mb-2">Recent Payment Stream (Instant UPI & Cash)</div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-900">Aarav Patel (Class 12 - JEE)</span>
                          <span className="text-slate-500">• UPI / GPay</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-emerald-600">₹25,000</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Receipt Sent
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-900">Sneha Kulkarni (Class 11 - NEET)</span>
                          <span className="text-slate-500">• NetBanking</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-emerald-600">₹30,000</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Receipt Sent
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Digital Report Cards */}
              {activeHeroTab === 'grades' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Unit Test 3 — Mechanics & Calculus</h4>
                      <p className="text-xs text-slate-500">Class 12 JEE Advanced Batch • 30 Students</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                      Batch Avg: 84.6%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Rank #1</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">Vikram Singhania</div>
                      <div className="text-xs font-extrabold text-indigo-600 mt-0.5">98.5% (197/200)</div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Rank #2</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">Ananya Deshmukh</div>
                      <div className="text-xs font-extrabold text-indigo-600 mt-0.5">96.0% (192/200)</div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Rank #3</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">Rohan Mehra</div>
                      <div className="text-xs font-extrabold text-indigo-600 mt-0.5">93.5% (187/200)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                    <span className="text-indigo-900 font-medium">
                      ✓ Instant PDF Scorecards generated & delivered to parents on WhatsApp
                    </span>
                    <Link href="/app" className="font-bold text-indigo-600 hover:underline">
                      View Gradebook →
                    </Link>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
