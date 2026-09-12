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
  Sparkles,
  BookOpen
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

const roleOptions: RoleOption[] = [
  {
    role: 'admin',
    title: 'Super Admin / Director',
    tagline: 'Institute Management & Leadership',
    description: 'Complete operational command: admissions, batch allocation, fee collection, staff management & WhatsApp broadcasts.',
    icon: ShieldCheck,
    badge: 'Full Access',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    gradient: 'from-indigo-600 via-indigo-700 to-blue-700',
    buttonLabel: 'Enter as Admin',
    href: '/login/admin',
  },
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              🎓
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Apex<span className="text-indigo-400">ERP</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                Coaching OS
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Role Selection Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 relative z-10 w-full">
        <div className="text-center space-y-3 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Role-Gated Portal Entry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Select Your Account Portal
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
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
                className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between hover:scale-[1.01]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${opt.gradient} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                    {opt.title}
                  </h2>
                  <div className="text-xs font-semibold text-slate-400 mt-0.5">
                    {opt.tagline}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80">
                  <Link
                    href={opt.href}
                    className={`w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r ${opt.gradient} hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 group/btn transition-all active:scale-[0.99]`}
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
        <div className="mt-10 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500 max-w-2xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Strict Server-Side RBAC Enforcement: Credentials are authenticated strictly for the selected portal.</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 relative z-10">
        © {new Date().getFullYear()} ApexERP Platform · 256-Bit SSL Encrypted
      </footer>
    </div>
  );
}
