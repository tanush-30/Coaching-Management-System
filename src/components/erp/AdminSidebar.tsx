'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  CreditCard,
  Clock,
  BookOpen,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  LogOut,
  Home as HomeIcon,
  Shield,
  Sparkles,
  ExternalLink,
  Lock,
  Settings,
  Calendar,
  FileSpreadsheet,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { SignOutConfirmModal } from '@/components/common/SignOutConfirmModal';

export type AdminTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'batches'
  | 'fees'
  | 'payroll'
  | 'attendance'
  | 'academics'
  | 'timetable'
  | 'analytics'
  | 'reports'
  | 'audit'
  | 'whatsapp'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  studentCount: number;
  teacherCount: number;
  batchCount: number;
  examCount: number;
  slotCount?: number;
  whatsappCount: number;
  onOpenEnrollStudent: () => void;
  onOpenEnrollTeacher: () => void;
  onOpenCreateBatch: () => void;
  onChangePassword?: () => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  studentCount,
  teacherCount,
  batchCount,
  examCount,
  slotCount,
  whatsappCount,
  onOpenEnrollStudent,
  onOpenEnrollTeacher,
  onOpenCreateBatch,
  onChangePassword,
}) => {
  const { user, signOutUser } = useAuth();
  const [isQuickActionOpen, setIsQuickActionOpen] = React.useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = React.useState(false);

  const navGroups: NavGroup[] = [
    {
      title: 'CORE ERP',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', label: 'Students', icon: Users, count: studentCount },
        { id: 'teachers', label: 'Faculty & Staff', icon: GraduationCap, count: teacherCount },
        { id: 'batches', label: 'Batches', icon: Layers, count: batchCount },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'fees', label: 'Fees & Invoicing', icon: CreditCard },
        { id: 'payroll', label: 'Faculty Payroll', icon: Wallet },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'academics', label: 'Academics & Tests', icon: BookOpen, count: examCount },
        { id: 'timetable', label: 'Timetable & Rooms', icon: Calendar, count: slotCount },
      ],
    },
    {
      title: 'INSIGHTS & ALERTS',
      items: [
        { id: 'whatsapp', label: 'WhatsApp Hub', icon: MessageSquare, badge: 'Live', count: whatsappCount },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'settings', label: 'Settings & Config', icon: Settings },
        { id: 'audit', label: 'Security & Audit Logs', icon: Shield },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header / Brand */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onCloseMobile();
              window.location.href = '/';
            }}
            className="flex items-center gap-3 group overflow-hidden cursor-pointer"
            title="Return to Public Landing Page"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/30 shrink-0 group-hover:scale-105 transition-transform">
              <span className="text-lg">🎓</span>
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5 font-extrabold text-sm text-white tracking-tight">
                  <span>ApexERP</span>
                  <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-md">
                    ADMIN
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">Institute Command OS</p>
              </div>
            )}
          </a>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3 border-b border-slate-800/60 relative">
          {!isCollapsed ? (
            <div>
              <button
                type="button"
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-between shadow-md shadow-indigo-600/25 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>Quick Create</span>
                </div>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">▾</span>
              </button>

              {/* Quick Action Dropdown Menu */}
              {isQuickActionOpen && (
                <div className="absolute left-3 right-3 top-14 bg-slate-800 border border-slate-700 rounded-2xl p-1.5 shadow-xl z-50 space-y-1 animate-fadeIn">
                  <button
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      onOpenEnrollStudent();
                      onCloseMobile();
                    }}
                    className="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Enroll Student</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      onOpenEnrollTeacher();
                      onCloseMobile();
                    }}
                    className="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl text-slate-200 hover:bg-purple-600 hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Enroll Faculty</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsQuickActionOpen(false);
                      onOpenCreateBatch();
                      onCloseMobile();
                    }}
                    className="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Create Batch</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-transform active:scale-95"
                title="Quick Create"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Modules List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {!isCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          {item.badge && (
                            <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                              {item.badge}
                            </span>
                          )}
                          {item.count !== undefined && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tooltip for Collapsed Mode */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                        {item.count !== undefined ? ` (${item.count})` : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Upwards Change Password Option in Sidebar Navigation List */}
          {onChangePassword && (
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  ACCOUNT
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  onChangePassword();
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative group text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? 'Change Password' : undefined}
              >
                <Lock className="w-4 h-4 shrink-0 text-indigo-400 transition-transform group-hover:scale-110" />
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">Change Password</span>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    Change Password
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer & User Profile */}
        <div className="p-3 border-t border-slate-800/80 shrink-0 space-y-2">
          {/* Portal Switcher in Sidebar */}
          {!isCollapsed ? (
            <div className="bg-slate-800/40 p-2 rounded-2xl border border-slate-700/40 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                Other Portals
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                <Link
                  href="/teacher"
                  onClick={onCloseMobile}
                  className="py-1 px-1.5 rounded-lg text-center bg-slate-800/80 hover:bg-emerald-600/30 text-emerald-400 border border-slate-700/80 hover:border-emerald-500/40 transition-colors truncate"
                  title="Teacher Portal"
                >
                  Teacher
                </Link>
                <Link
                  href="/parent"
                  onClick={onCloseMobile}
                  className="py-1 px-1.5 rounded-lg text-center bg-slate-800/80 hover:bg-amber-600/30 text-amber-400 border border-slate-700/80 hover:border-amber-500/40 transition-colors truncate"
                  title="Parent Portal"
                >
                  Parent
                </Link>
                <Link
                  href="/student"
                  onClick={onCloseMobile}
                  className="py-1 px-1.5 rounded-lg text-center bg-slate-800/80 hover:bg-violet-600/30 text-violet-400 border border-slate-700/80 hover:border-violet-500/40 transition-colors truncate"
                  title="Student Portal"
                >
                  Student
                </Link>
              </div>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onCloseMobile();
                  window.location.href = '/';
                }}
                className="w-full mt-1.5 py-2 px-3 rounded-xl text-center bg-indigo-500/15 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
                title="Return to Public Landing Page"
              >
                <HomeIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Home Landing Page</span>
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/';
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Return to Public Landing Page"
              >
                <HomeIcon className="w-4 h-4" />
              </a>
            </div>
          )}

          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{user?.displayName || 'Administrator'}</div>
                    <div className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@apexerp.com'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(true)}
                className="w-9 h-9 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer group relative"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Sign Out
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Crosschecking Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={() => signOutUser('/login/admin')}
        title="Admin Sign Out"
        message="Are you sure you want to sign out of the Admin ERP Command Center?"
      />
    </>
  );
};
