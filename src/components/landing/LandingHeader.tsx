'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Sparkles, 
  ArrowRight, 
  Menu, 
  X, 
  LogIn, 
  ShieldCheck, 
  Layers, 
  Calculator, 
  MessageSquare, 
  HelpCircle,
  CheckCircle,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface LandingHeaderProps {
  onOpenLogin: () => void;
}

export function LandingHeader({ onOpenLogin }: LandingHeaderProps) {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200/80 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
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

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 px-3 py-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/70 text-xs font-semibold text-slate-600">
          <a
            href="#features"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-white transition-all"
          >
            Modules & Features
          </a>
          <a
            href="#whatsapp"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-white transition-all flex items-center gap-1"
          >
            <span>WhatsApp OS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </a>
          <a
            href="#portals"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-white transition-all"
          >
            4-Role Portals
          </a>
          <a
            href="#calculator"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-white transition-all"
          >
            ROI Calculator
          </a>
          <a
            href="#testimonials"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-white transition-all"
          >
            Reviews
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-white transition-all"
          >
            FAQ
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2.5">
          {/* Live Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-[11px] font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Cloud ERP</span>
          </div>

          {/* Login Button (Modal trigger) */}
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 border border-slate-200/90 transition-all active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sign In</span>
          </button>

          {/* Launch ERP CTA */}
          <Link
            href="/app"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white shadow-md shadow-indigo-600/25 transition-all hover:shadow-indigo-600/40 active:scale-95 group"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Launch Live ERP</span>
            <span className="sm:hidden">ERP</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-lg border-b border-slate-200 px-4 pt-3 pb-6 mt-3 space-y-3 shadow-xl animate-fade-in">
          <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-100"
            >
              Modules & Features
            </a>
            <a
              href="#whatsapp"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-100 flex items-center justify-between"
            >
              <span>WhatsApp Automation OS</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Live
              </span>
            </a>
            <a
              href="#portals"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-100"
            >
              4-Role Portals (Admin, Faculty, Parent, Student)
            </a>
            <a
              href="#calculator"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-100"
            >
              ROI & Revenue Calculator
            </a>
            <a
              href="#testimonials"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-100"
            >
              Success Stories & Reviews
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl hover:bg-slate-100"
            >
              Frequently Asked Questions
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-indigo-600" />
              <span>Sign In (Admin / Teacher / Parent / Student)</span>
            </button>
            <Link
              href="/app"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Launch Live ERP Workspace</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
