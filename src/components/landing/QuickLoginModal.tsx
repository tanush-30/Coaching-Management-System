'use client';

import React from 'react';
import {
  X,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Users,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export function QuickLoginModal({ isOpen, onClose }: QuickLoginModalProps) {
  const router = useRouter();

  // Close modal on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Role Fast Access -> Route directly to dedicated role-gated login
  const handleRoleFastAccess = (role: UserRole) => {
    onClose();
    router.push(`/login/${role}`);
  };

  const roleConfigs = [
    {
      role: 'admin' as UserRole,
      title: 'Administrator',
      subtitle: 'Complete ERP control, batches, fees & WhatsApp automation',
      icon: ShieldCheck,
      badge: 'Full Access',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      gradient: 'from-indigo-600 to-blue-600',
    },
    {
      role: 'teacher' as UserRole,
      title: 'Faculty / Teacher',
      subtitle: 'Attendance register, homework posting & marks entry',
      icon: Users,
      badge: 'Academic Hub',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      gradient: 'from-emerald-600 to-teal-600',
    },
    {
      role: 'parent' as UserRole,
      title: 'Parent / Guardian',
      subtitle: 'Track child attendance, fee receipts & exam scorecards',
      icon: UserCheck,
      badge: 'WhatsApp Linked',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      role: 'student' as UserRole,
      title: 'Student Portal',
      subtitle: 'View homework, notes, test rank lists & study materials',
      icon: GraduationCap,
      badge: 'Study Center',
      badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
      gradient: 'from-violet-600 to-purple-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in transition-opacity duration-300">
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all duration-200 hover:rotate-90"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xl tracking-tight text-white">Sign In to ApexERP</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-300">Choose your role portal to enter your dedicated workspace</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 max-h-[75vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Select your authorized institute role:</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Single-Sign-On Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roleConfigs.map((cfg) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={cfg.role}
                    onClick={() => handleRoleFastAccess(cfg.role)}
                    className="group relative text-left p-4 rounded-2xl border-2 border-slate-200/90 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 transition-all duration-200 hover:shadow-md hover:scale-[1.01] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${cfg.gradient} flex items-center justify-center text-white shadow-sm`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                          {cfg.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {cfg.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                        {cfg.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                      <span>Enter as {cfg.title.split(' ')[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>Looking for full dedicated authentication?</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  router.push('/login');
                }}
                className="font-bold text-indigo-600 hover:underline"
              >
                Go to /login →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
