'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Plus,
  Home as HomeIcon,
  Users,
  GraduationCap,
  UserCheck,
  Shield,
  LayoutDashboard,
  CreditCard,
  Layers,
  Sparkles,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AdminTab } from './AdminSidebar';

interface AdminTopBarProps {
  activeTab: AdminTab;
  onSelectTab?: (tab: AdminTab) => void;
  onOpenMobileSidebar: () => void;
  onOpenEnrollStudent: () => void;
  onOpenEnrollTeacher: () => void;
  onOpenCreateBatch: () => void;
}

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Executive Command Center',
    subtitle: 'Live academy health, revenues, and batch occupancies',
  },
  students: {
    title: 'Student Directory & Admissions',
    subtitle: 'Manage student profiles, enrollments, and parent contacts',
  },
  teachers: {
    title: 'Faculty & Instructor Directory',
    subtitle: 'Educator profiles, subject specializations, and batch assignments',
  },
  batches: {
    title: 'Batch & Classroom Management',
    subtitle: 'Academic courses, timetables, capacities, and lead faculty',
  },
  fees: {
    title: 'Fee Ledgers & Invoicing',
    subtitle: 'Track dues, UPI payment reconciliations, and WhatsApp fee reminders',
  },
  attendance: {
    title: 'Batch Attendance Registers',
    subtitle: 'Take instant 15-second batch roll calls and dispatch absence alerts',
  },
  academics: {
    title: 'Academics, Tests & Scorecards',
    subtitle: 'Schedule test series, input scores, and publish automated WhatsApp reports',
  },
  analytics: {
    title: 'Business & Performance Analytics',
    subtitle: 'Financial velocities, academic progression, and cohort distributions',
  },
  whatsapp: {
    title: 'WhatsApp Automation Hub',
    subtitle: 'Automated broadcast triggers, delivery logs, and parent communication',
  },
};

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenMobileSidebar,
  onOpenEnrollStudent,
  onOpenEnrollTeacher,
  onOpenCreateBatch,
}) => {
  const router = useRouter();
  const { signOutUser } = useAuth();
  const currentInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Left: Mobile Toggle & Breadcrumb / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl border border-slate-200 lg:hidden text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 truncate">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
              className="hover:underline hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="Return to Public Landing Page"
            >
              <HomeIcon className="w-3 h-3 text-indigo-500" />
              <span>Apex Academy</span>
            </a>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-semibold truncate">{currentInfo.title}</span>
          </div>
          <h1 className="text-sm sm:text-base lg:text-lg font-extrabold text-slate-900 tracking-tight leading-tight truncate">
            {currentInfo.title}
          </h1>
        </div>
      </div>

      {/* Center: Admin Data Quick Tabs (Instant In-Page Switcher) */}
      {onSelectTab && (
        <div className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/90 text-xs font-bold">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => onSelectTab('students')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Students Data</span>
          </button>
          <button
            onClick={() => onSelectTab('teachers')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'teachers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Faculty Data</span>
          </button>
          <button
            onClick={() => onSelectTab('fees')}
            className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'fees'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Fees & Parents</span>
          </button>
        </div>
      )}

      {/* Right: Live Dedicated Portals & Quick Actions */}
      <div className="flex items-center flex-wrap gap-2 ml-auto">
        {/* Dedicated Live Portal Jump Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/90 rounded-2xl text-xs font-bold shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5 hidden xl:inline">
            Portals:
          </span>

          <Link
            href="/teacher"
            className="px-2 sm:px-2.5 py-1 rounded-xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all flex items-center gap-1"
            title="Open Teacher / Faculty Portal"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">Teacher</span>
          </Link>

          <Link
            href="/parent"
            className="px-2 sm:px-2.5 py-1 rounded-xl text-slate-700 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all flex items-center gap-1"
            title="Open Parent Portal"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold">Parent</span>
          </Link>

          <Link
            href="/student"
            className="px-2 sm:px-2.5 py-1 rounded-xl text-slate-700 hover:text-violet-700 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all flex items-center gap-1"
            title="Open Student Portal"
          >
            <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
            <span className="font-semibold">Student</span>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenEnrollTeacher}
            className="hidden sm:flex bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold px-3 py-1.5 rounded-xl text-xs items-center gap-1 transition-all active:scale-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Faculty</span>
          </button>

          <button
            onClick={onOpenEnrollStudent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>

          {/* Home / Public Landing Page Button */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/';
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all text-xs font-bold shrink-0 shadow-2xs cursor-pointer"
            title="Return to Public Landing Page"
          >
            <HomeIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Home Landing Page</span>
            <span className="sm:hidden">Home</span>
          </a>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => signOutUser('/login/admin')}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
            title="Sign Out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
