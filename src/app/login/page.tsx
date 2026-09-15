'use client';

import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  ShieldCheck, 
  Users, 
  UserCheck, 
  ArrowRight, 
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface RoleOption {
  role: UserRole;
  title: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  badgeColor: string;
  gradient: string;
  buttonLabel: string;
  href: string;
}

// Admin portal is intentionally NOT listed here — /login/admin is a non-advertised direct URL.
// This hides the admin entry point from public view without disabling it.
const roleOptions: RoleOption[] = [
  {
    role: 'teacher',
    title: 'Faculty / Teacher',
    tagline: 'Academic Command Center',
    description: 'Dedicated batch roster, one-tap biometric attendance register, test mark entries & daily homework assignments.',
    icon: Users,
    badge: 'Faculty Portal',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    buttonLabel: 'Enter as Teacher',
    href: '/login/teacher',
  },
  {
    role: 'student',
    title: 'Student Portal',
    tagline: 'Personal Study Dashboard',
    description: 'Track your attendance records, study notes, pending homework, unit test scores & batch percentile ranks.',
    icon: GraduationCap,
    badge: 'Student App',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    buttonLabel: 'Enter as Student',
    href: '/login/student',
  },
  {
    role: 'parent',
    title: 'Parent / Guardian',
    tagline: 'Ward Progress & Fee Receipts',
    description: 'Monitor daily attendance alerts, download official fee receipts, check test scorecards & communicate with faculty.',
    icon: UserCheck,
    badge: 'Parent View',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    gradient: 'from-amber-600 via-orange-600 to-rose-600',
    buttonLabel: 'Enter as Parent',
    href: '/login/parent',
  },
];

export default function RoleSelectorPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows & Grid */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-tr from-indigo-500/15 via-sky-400/15 to-purple-500/10 blur-3xl rounded-full" />
        <div className="absolute top-48 right-10 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full" />
        <div className="absolute top-72 left-10 w-80 h-80 bg-indigo-600/10 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f108_1px,transparent_1px),linear-gradient(to_bottom,#6366f108_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/25 group-hover:scale-105 transition-transform">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Apex<span className="text-indigo-600">ERP</span>
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  Coaching OS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 -mt-0.5">Academy Management Platform</p>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Role Selection Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 w-full">
        <div className="text-center space-y-3 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Role-Gated Portal Entry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
            Select Your Account Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Choose your designated institutional role to access your dedicated, secure workspace.
          </p>
        </div>

        {/* 4 Role Doorway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {roleOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <div
                key={opt.role}
                className="group relative bg-white hover:bg-slate-50/50 border border-slate-200/90 hover:border-indigo-500/80 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-950/10 transition-all duration-300 flex flex-col justify-between hover:scale-[1.01]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${opt.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-600/20`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      opt.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : opt.role === 'teacher' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : opt.role === 'student' ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {opt.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                    {opt.title}
                  </h2>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    {opt.tagline}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100">
                  <Link
                    href={opt.href}
                    className={`w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r ${opt.gradient} hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 group/btn transition-all active:scale-[0.99]`}
                  >
                    <span>{opt.buttonLabel}</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Notice */}
        <div className="mt-10 p-4 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-600 max-w-2xl mx-auto flex items-center justify-center gap-2 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Strict Server-Side RBAC Enforcement: Credentials are authenticated strictly for the selected portal.</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 bg-white/50 backdrop-blur-xs relative z-10">
        © {new Date().getFullYear()} ApexERP Platform · 256-Bit SSL Encrypted
      </footer>
    </div>
  );
}
