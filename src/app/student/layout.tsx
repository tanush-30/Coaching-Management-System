'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Home as HomeIcon, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, role, signOutUser } = useAuth();

  const handleSignOut = async () => {
    await signOutUser('/login/student');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-sky-600/20 hover:scale-105 transition-transform"
              title="Return to Landing Page"
            >
              <BookOpen className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link href="/student" className="font-extrabold text-base tracking-tight text-slate-900 hover:text-sky-600 transition-colors">
                  ApexERP
                </Link>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                  Student Portal
                </span>
                {role === 'admin' && (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" /> Admin Override
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Attendance, Homework & Test Rankings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
              title="Return to Admin Dashboard"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Admin</span>
            </Link>

            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/';
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-sky-50 hover:text-sky-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              title="Return to Public Landing Page"
            >
              <HomeIcon className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Home Landing Page</span>
              <span className="sm:hidden">Home</span>
            </a>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
