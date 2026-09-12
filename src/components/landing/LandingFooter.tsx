'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, Heart } from 'lucide-react';
import { UserRole } from '@/lib/types';

interface LandingFooterProps {
  onOpenLoginWithRole: (role: UserRole) => void;
}

export function LandingFooter({ onOpenLoginWithRole }: LandingFooterProps) {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1: Brand & Tagline (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-sky-500 flex items-center justify-center text-white font-extrabold shadow-md">
                🎓
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white">
                  Apex<span className="text-indigo-400">ERP</span>
                </span>
                <p className="text-[11px] text-slate-400">Coaching Management & WhatsApp OS</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              All-in-one ERP suite engineered specifically for coaching institutes, tuition centers, and test prep academies across India.
            </p>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational • WhatsApp API Connected</span>
            </div>
          </div>

          {/* Col 2: Modules */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Core Modules
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Student & Batch Directory
                </a>
              </li>
              <li>
                <a href="#whatsapp" className="hover:text-white transition-colors">
                  WhatsApp Automation Hub
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Fee Installments & Receipts
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Exams & Rank Cards
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-white transition-colors">
                  ROI Savings Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Role Portals */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              4-Role Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onOpenLoginWithRole('admin')}
                  className="hover:text-white transition-colors text-left"
                >
                  Super Admin / Director
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLoginWithRole('teacher')}
                  className="hover:text-white transition-colors text-left"
                >
                  Faculty & Teacher Portal
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLoginWithRole('parent')}
                  className="hover:text-white transition-colors text-left"
                >
                  Parent / Guardian View
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLoginWithRole('student')}
                  className="hover:text-white transition-colors text-left"
                >
                  Student Learning App
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Quick Launch */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Quick Access
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/app" className="hover:text-white transition-colors text-indigo-400 font-bold">
                  🚀 Launch Live ERP
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Dedicated Sign In Page
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Help & FAQs
                </a>
              </li>
              <li>
                <span className="text-emerald-400/90 font-medium">ISO/IEC 27001 Certified</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} ApexERP Platform. Designed for Next-Gen Coaching Centers.
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> 256-Bit SSL Encrypted
            </span>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
