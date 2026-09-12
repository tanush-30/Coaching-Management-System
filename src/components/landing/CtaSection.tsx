'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Lock,
  CheckCircle2 
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface CtaSectionProps {
  onOpenLogin: (role?: UserRole) => void;
}

export function CtaSection({ onOpenLogin }: CtaSectionProps) {
  return (
    <section className="py-20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Dynamic glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[400px] bg-indigo-500/20 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-7">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-bold text-indigo-200">
          <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          <span>Launch Today • No Installation Required</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Ready to Modernize Your Coaching Operations?
        </h2>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Join hundreds of top coaching centers saving 120+ hours a month while recovering lakhs in delayed student fees through automated WhatsApp workflows.
        </p>

        {/* Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/app"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            <div className="absolute inset-0 animate-shimmer-sweep pointer-events-none opacity-30" />
            <Zap className="w-5 h-5 text-indigo-200 group-hover:rotate-12 transition-transform duration-300 relative z-10" />
            <span className="relative z-10">Launch Live ERP Workspace</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300 relative z-10" />
          </Link>

          <button
            onClick={() => onOpenLogin('admin')}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-indigo-300" />
            <span>Sign In / Open Portal</span>
          </button>
        </div>

        {/* Trust Badges under CTA */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Instant Multi-Role Onboarding
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Credit Card Needed
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 30-Day Hypercare Support
          </span>
        </div>
      </div>
    </section>
  );
}
