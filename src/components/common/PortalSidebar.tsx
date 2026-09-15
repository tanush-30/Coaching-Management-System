'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home as HomeIcon,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { PORTAL_NAV_SECTIONS, PortalRole } from '@/lib/config/navConfig';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/common/UserAvatar';
import { SignOutConfirmModal } from '@/components/common/SignOutConfirmModal';

interface PortalSidebarProps {
  role: PortalRole;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  userProfile?: {
    name: string;
    subtext: string;
    avatar?: string;
    customId?: string;
  };
  onChangePassword?: () => void;
  badgeCounts?: Record<string, number | string>;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  role,
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  userProfile,
  onChangePassword,
  badgeCounts = {},
}) => {
  const { signOutUser } = useAuth();
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const navSections = PORTAL_NAV_SECTIONS[role] || [];

  const roleAccent = role === 'faculty' ? 'emerald' : 'violet';
  const roleTitle = role === 'faculty' ? 'Faculty Portal' : 'Student App';
  const RoleIcon = role === 'faculty' ? Users : GraduationCap;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col
          bg-slate-900 text-slate-100 border-r border-slate-800
          transition-all duration-300 ease-in-out shadow-2xl
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header / Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                role === 'faculty'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-violet-500/20'
              }`}
            >
              <RoleIcon className="w-5 h-5" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="font-extrabold text-sm tracking-tight text-white truncate">
                  Apex Academy
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    role === 'faculty' ? 'text-emerald-400' : 'text-violet-400'
                  }`}
                >
                  {roleTitle}
                </span>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button (Desktop) */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center transition-colors shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Close Button (Mobile) */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sectioned Navigation Item List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3 custom-scrollbar">
          {navSections.map((section, secIdx) => (
            <div key={section.sectionTitle} className="space-y-1">
              {/* Section Header (Expanded view) or Divider (Collapsed view) */}
              {(!isCollapsed || isMobileOpen) ? (
                <div className="px-3 pt-1.5 pb-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {section.sectionTitle}
                  </span>
                </div>
              ) : (
                secIdx > 0 && <div className="h-px bg-slate-800 my-1.5 mx-1" />
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const count = badgeCounts[item.id];

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      title={isCollapsed && !isMobileOpen ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                        transition-all duration-150 group relative
                        ${
                          isActive
                            ? role === 'faculty'
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                              : 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                        }
                        ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                      `}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />

                      {(!isCollapsed || isMobileOpen) && (
                        <span className="truncate text-left flex-1">{item.label}</span>
                      )}

                      {(!isCollapsed || isMobileOpen) && count !== undefined && (
                        <span
                          className={`
                            text-[10px] px-1.5 py-0.5 rounded-full font-bold
                            ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }
                          `}
                        >
                          {count}
                        </span>
                      )}

                      {/* Floating tooltip when collapsed */}
                      {isCollapsed && !isMobileOpen && (
                        <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Account / Preferences Section */}
          {onChangePassword && (
            <div className="space-y-1 pt-1">
              {(!isCollapsed || isMobileOpen) ? (
                <div className="px-3 pt-2 pb-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    ACCOUNT & SECURITY
                  </span>
                </div>
              ) : (
                <div className="h-px bg-slate-800 my-1.5 mx-1" />
              )}

              <button
                onClick={() => {
                  onChangePassword();
                  onCloseMobile();
                }}
                title={isCollapsed && !isMobileOpen ? 'Change Password' : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                  transition-all duration-150 group relative
                  text-slate-400 hover:text-slate-100 hover:bg-slate-800/80
                  ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                `}
              >
                <Lock
                  className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-200 transition-transform group-hover:scale-110"
                />

                {(!isCollapsed || isMobileOpen) && (
                  <span className="truncate text-left flex-1">Change Password</span>
                )}

                {/* Floating tooltip when collapsed */}
                {isCollapsed && !isMobileOpen && (
                  <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    Change Password
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* User Profile & Footer Actions */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-2">
          {/* User Info Card */}
          {userProfile && (
            <div
              className={`
                flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/50
                ${isCollapsed && !isMobileOpen ? 'justify-center p-1.5' : ''}
              `}
            >
              <UserAvatar
                name={userProfile.name}
                src={userProfile.avatar}
                type={role === 'faculty' ? 'faculty' : 'student'}
                size="sm"
                className="shrink-0"
              />
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {userProfile.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {userProfile.customId || userProfile.subtext}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Quick Action: Sign Out */}
          <button
            type="button"
            onClick={() => setIsSignOutModalOpen(true)}
            title={isCollapsed && !isMobileOpen ? 'Sign Out' : undefined}
            className={`
              w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold
              text-rose-400 hover:text-white hover:bg-rose-600/20 transition-colors cursor-pointer group relative
              ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
            `}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
            {isCollapsed && !isMobileOpen && (
              <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Crosschecking Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={() => signOutUser(role === 'faculty' ? '/login/teacher' : '/login/student')}
        title={role === 'faculty' ? 'Faculty Sign Out' : 'Student Sign Out'}
        message="Are you sure you want to sign out of your account?"
      />
    </>
  );
};
