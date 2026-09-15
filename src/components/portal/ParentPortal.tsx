'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, 
  Calendar, 
  CalendarDays,
  CreditCard, 
  Award, 
  BookOpen, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  MessageSquare, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  ShieldCheck, 
  Sparkles, 
  Phone, 
  FileText,
  Key,
  Lock,
  User,
  GraduationCap,
  Users,
  Send,
  HelpCircle,
  Menu,
  X,
  LogOut,
  Building,
  Mail,
  MapPin,
  Check,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileCheck2,
  Heart,
  UserCheck,
  Search,
  ExternalLink,
  Megaphone,
} from 'lucide-react';
import { Announcement, Batch, BatchAttendance, ExamTest, FeeInstallment, Homework, HomeworkSubmission, Student, StudentExamMark, TimetableSlot } from '@/lib/types';
import { isSubmissionLate } from '@/lib/homework-submissions-service';
import { calculateNextLectureDate } from '@/lib/timetable-utils';
import { generateFeeReceiptPDF, generateReportCardPDF } from '@/lib/pdf-service';
import { UpiCheckoutModal } from '@/components/erp/UpiCheckoutModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuth } from '@/lib/auth-context';
import { UserAvatar } from '@/components/common/UserAvatar';
import { TimetableGridView } from './TimetableGridView';
import { StudentProgressView } from './StudentProgressView';
import { StudentAttendanceView } from './StudentAttendanceView';
import { AnnouncementFeed } from './AnnouncementFeed';
import { filterAnnouncementsForParent, getUnreadAnnouncementCount } from '@/lib/announcement-feed-service';
import { SignOutConfirmModal } from '@/components/common/SignOutConfirmModal';

export type ParentDashboardTab =
  | 'parent_profile'
  | 'student_profile'
  | 'announcements'
  | 'progress'
  | 'attendance'
  | 'timetable'
  | 'academics'
  | 'homework'
  | 'fees_due'
  | 'fees_paid'
  | 'support';

export interface ParentNavItem {
  id: ParentDashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  count?: number;
  isNew?: boolean;
}

export interface ParentNavGroup {
  title: string;
  items: ParentNavItem[];
}

interface ParentPortalProps {
  students: Student[];
  batches: Batch[];
  installments: FeeInstallment[];
  attendance: BatchAttendance[];
  exams: ExamTest[];
  marks: StudentExamMark[];
  homework: Homework[];
  submissions?: HomeworkSubmission[];
  timetableSlots?: TimetableSlot[];
  announcements?: Announcement[];
  onRecordPayment: (installmentId: string, paymentMode: any, transactionId?: string) => void;
}

const TAB_TITLES: Record<ParentDashboardTab, string> = {
  parent_profile: 'Parent Profile & Account',
  student_profile: 'Student Overview & Profile',
  announcements: 'Announcements & Official Notices',
  progress: 'Academic Progress & Growth Index',
  attendance: 'Attendance & Presence Log',
  timetable: 'Weekly Class & Lecture Schedule',
  academics: 'Marksheets & Report Cards',
  homework: 'Assigned Homework & DPPs',
  fees_due: 'Fee Due & Outstanding Invoices',
  fees_paid: 'Fee Ledger & PDF Receipts',
  support: 'Helpdesk & Administration Support',
};

export const ParentPortal: React.FC<ParentPortalProps> = ({
  students,
  batches,
  installments,
  attendance,
  exams,
  marks,
  homework,
  submissions = [],
  timetableSlots = [],
  announcements = [],
  onRecordPayment,
}) => {
  const { signOutUser } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [activeTab, setActiveTab] = useState<ParentDashboardTab>('student_profile');
  const [selectedPaymentInst, setSelectedPaymentInst] = useState<FeeInstallment | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  // Sidebar responsive & collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('apex_parent_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('apex_parent_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Support Message state
  const [supportCategory, setSupportCategory] = useState<'password' | 'phone' | 'fee' | 'academic' | 'general'>('general');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);

  // Past Receipts Search State
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentBatch = currentStudent ? batches.find((b) => (currentStudent.batchIds || []).includes(b.id)) : undefined;

  // Timetable slot filtering hook placed before early return
  const childTimetableSlots = useMemo(() => {
    if (!currentStudent) return [];
    const childBatchIds = currentStudent.batchIds || [];
    return (timetableSlots || []).filter(
      (s) => childBatchIds.includes(s.batchId) || (studentBatch && s.batchId === studentBatch.id)
    );
  }, [timetableSlots, currentStudent, studentBatch]);

  if (!currentStudent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Smartphone className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-xl text-slate-900">No Enrolled Students Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            The Parent Portal dynamically links to your student database. Once you enroll students in the Admin Portal, parents will see live attendance, fee receipts, and exam scorecards here.
          </p>
        </div>
      </div>
    );
  }

  // Student specific data
  const studentInstallments = installments.filter((i) => i.studentId === currentStudent.id);
  const pendingInstallments = studentInstallments.filter((i) => i.status !== 'paid');
  const nextPendingFee = pendingInstallments[0] || null;
  const paidInstallments = studentInstallments.filter((i) => i.status === 'paid');

  const filteredPaidInstallments = paidInstallments.filter((inst) => {
    if (!receiptSearchQuery.trim()) return true;
    const q = receiptSearchQuery.toLowerCase().trim();
    return (
      (inst.receiptNumber || '').toLowerCase().includes(q) ||
      (inst.title || '').toLowerCase().includes(q) ||
      (inst.transactionId || '').toLowerCase().includes(q) ||
      (inst.paymentMode || '').toLowerCase().includes(q)
    );
  });

  const studentMarks = marks.filter((m) => {
    const matchesId = m.studentId === currentStudent.id;
    const matchesRoll = currentStudent.rollNo && (m.rollNo === currentStudent.rollNo || m.studentId === currentStudent.rollNo);
    const matchesAuthUid = (m as any).authUid && (m as any).authUid === currentStudent.id;
    const isPublished = m.status === 'final' || (m as any).status === 'evaluated' || !m.status;
    return (matchesId || matchesRoll || matchesAuthUid) && isPublished;
  });
  const studentHomework = homework.filter((h) => (currentStudent.batchIds || []).includes(h.batchId));

  // Attendance stats for student (strictly real records)
  let totalClasses = 0;
  let presentClasses = 0;
  let lateClasses = 0;
  const sId = (currentStudent.id || '').trim().toLowerCase();
  const sRoll = (currentStudent.rollNo || '').trim().toLowerCase();
  const sAuthUid = ((currentStudent as any).authUid || '').trim().toLowerCase();
  const sName = (currentStudent.name || '').trim().toLowerCase();

  attendance.forEach((att) => {
    const rec = (att.records || []).find((r) => {
      if (!r) return false;
      const recStudentId = (r.studentId || '').trim().toLowerCase();
      const recRollNo = ((r as any).rollNo || '').trim().toLowerCase();
      const recName = ((r as any).studentName || (r as any).name || '').trim().toLowerCase();
      return (
        (recStudentId && (recStudentId === sId || recStudentId === sRoll || recStudentId === sAuthUid)) ||
        (recRollNo && (recRollNo === sRoll || recRollNo === sId)) ||
        (recName && sName && recName === sName)
      );
    });
    if (rec) {
      totalClasses++;
      if (rec.status === 'present') presentClasses++;
      else if (rec.status === 'late') lateClasses++;
    }
  });
  const attendancePercent = totalClasses > 0 ? Math.round(((presentClasses + lateClasses * 0.5) / totalClasses) * 100) : 0;

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSent(true);
    setSupportMessage('');
    setTimeout(() => setSupportSent(false), 5000);
  };

  // Announcements filtered for parent's linked children
  const parentAnnouncements = useMemo(() => {
    return filterAnnouncementsForParent(announcements, students);
  }, [announcements, students]);

  const unreadParentAnnouncementsCount = useMemo(() => {
    const parentId = currentStudent?.parentPhone || currentStudent?.parentEmail || currentStudent?.id || 'parent-user';
    return getUnreadAnnouncementCount(parentAnnouncements, parentId);
  }, [parentAnnouncements, currentStudent]);

  const navGroups: ParentNavGroup[] = [
    {
      title: 'PROFILE & NOTICES',
      items: [
        { id: 'parent_profile', label: 'Parent Profile', icon: User },
        { id: 'student_profile', label: 'Student Profile', icon: GraduationCap },
        {
          id: 'announcements',
          label: 'Official Notices',
          icon: Megaphone,
          count: unreadParentAnnouncementsCount > 0 ? unreadParentAnnouncementsCount : undefined,
          isNew: unreadParentAnnouncementsCount > 0,
        },
      ],
    },
    {
      title: 'ACADEMICS',
      items: [
        { id: 'progress', label: 'Progress & Trends', icon: TrendingUp },
        { id: 'attendance', label: 'Student Attendance', icon: Calendar, badge: `${attendancePercent}%` },
        { id: 'timetable', label: 'Class Timetable', icon: CalendarDays, count: childTimetableSlots.length },
        { id: 'academics', label: 'Marksheet & Reports', icon: Award, count: studentMarks.length },
        { id: 'homework', label: 'Homework & DPPs', icon: BookOpen, count: studentHomework.length },
      ],
    },
    {
      title: 'PAYMENTS',
      items: [
        { id: 'fees_due', label: 'Fee Due & Invoices', icon: CreditCard, count: pendingInstallments.length },
        { id: 'fees_paid', label: 'Fee Paid & Receipts', icon: Receipt, count: paidInstallments.length },
      ],
    },
    {
      title: 'HELP & SUPPORT',
      items: [
        { id: 'support', label: 'Help & Admin Support', icon: HelpCircle },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* ========================================================= */}
      {/* LEFT SIDEBAR NAVIGATION (Matching Student, Faculty & Admin)*/}
      {/* ========================================================= */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col
          bg-slate-900 text-slate-100 border-r border-slate-800
          transition-all duration-300 ease-in-out shadow-2xl
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${isMobileSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="flex flex-col min-w-0 transition-opacity duration-200">
                <span className="font-extrabold text-sm tracking-tight text-white truncate">
                  Apex Academy
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Parent Portal
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={handleToggleSidebar}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center transition-colors shrink-0 cursor-pointer"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Item Groups */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 block mb-1">
                  {group.title}
                </span>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed && !isMobileSidebarOpen ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                      transition-all duration-150 group relative cursor-pointer
                      ${
                        isActive
                          ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      }
                      ${isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center px-0' : ''}
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                      <span className="truncate text-left flex-1">{item.label}</span>
                    )}

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && item.count !== undefined && item.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}

                    {(!isSidebarCollapsed || isMobileSidebarOpen) && item.isNew && (
                      <span className="text-[9px] uppercase tracking-wider bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">
                        NEW
                      </span>
                    )}

                    {/* Floating tooltip when collapsed */}
                    {isSidebarCollapsed && !isMobileSidebarOpen && (
                      <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Change Password Option in Sidebar Navigation List */}
          <button
            onClick={() => {
              setIsChangePasswordOpen(true);
              setIsMobileSidebarOpen(false);
            }}
            title={isSidebarCollapsed && !isMobileSidebarOpen ? 'Change Password' : undefined}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
              transition-all duration-150 group relative cursor-pointer
              text-slate-400 hover:text-slate-100 hover:bg-slate-800/80
              ${isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center px-0' : ''}
            `}
          >
            <Lock className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-200 transition-transform group-hover:scale-110" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <span className="truncate text-left flex-1">Change Password</span>
            )}
            {isSidebarCollapsed && !isMobileSidebarOpen && (
              <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                Change Password
              </div>
            )}
          </button>
        </div>

        {/* User Profile & Footer Actions */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-2">
          {/* Parent Info Card */}
          <div
            className={`
              flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/60 border border-slate-700/50
              ${isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center p-1.5' : ''}
            `}
          >
            <UserAvatar
              name={currentStudent.parentName}
              type="student"
              size="sm"
              className="shrink-0"
            />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {currentStudent.parentName}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  Ward: {currentStudent.name}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action: Sign Out */}
          <button
            type="button"
            onClick={() => setIsSignOutModalOpen(true)}
            title={isSidebarCollapsed && !isMobileSidebarOpen ? 'Sign Out' : undefined}
            className={`
              w-full flex items-center gap-2 py-2 px-3 rounded-xl text-xs font-bold
              text-rose-400 hover:text-white hover:bg-rose-600/20 transition-colors cursor-pointer group relative
              ${isSidebarCollapsed && !isMobileSidebarOpen ? 'justify-center px-0' : ''}
            `}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {(!isSidebarCollapsed || isMobileSidebarOpen) && <span>Sign Out</span>}
            {isSidebarCollapsed && !isMobileSidebarOpen && (
              <div className="fixed left-20 ml-2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA (Matching Student, Faculty & Admin)      */}
      {/* ========================================================= */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}
        `}
      >
        {/* Top Slim Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active Page Breadcrumb / Title */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block sm:inline">
                Parent Portal
              </span>
              <span className="hidden sm:inline text-slate-300 mx-2">•</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {TAB_TITLES[activeTab] || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Student Switcher if multiple students exist */}
            {students.length > 1 && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden md:inline pl-1.5">
                  Ward:
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-500 cursor-pointer outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNo})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 'announcements' && (
            <div className="space-y-6 animate-fade-in">
              <AnnouncementFeed
                announcements={parentAnnouncements}
                userId={currentStudent?.parentPhone || currentStudent?.parentEmail || currentStudent?.id || 'parent-user'}
                userRoleTitle="Parent"
                title="Parent Notices & Official Announcements"
                subtitle="Official academy broadcasts, holiday updates, fee alerts, and batch announcements for your enrolled child."
              />
            </div>
          )}

          {/* 1. SECTION: PARENT PROFILE */}
          {activeTab === 'parent_profile' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/20">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Parent / Guardian Profile</h2>
                    <p className="text-xs text-slate-500">Registered guardian account details and contact information</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-indigo-200 transition-all self-start cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Change Portal Password</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                  <span className="text-sm font-extrabold text-slate-900 block">{currentStudent.parentName}</span>
                  <span className="text-slate-500 font-medium">Relationship: {currentStudent.parentRelation || 'Father'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Login Email</span>
                  <span className="text-sm font-extrabold text-indigo-700 block">{currentStudent.parentEmail || 'Not Provided'}</span>
                  <span className="text-slate-500 font-medium">Primary identifier for portal authentication</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp Phone Number</span>
                  <span className="text-sm font-extrabold text-slate-900 block">📞 {currentStudent.parentPhone}</span>
                  <span className="text-emerald-700 font-medium">Verified for attendance & fee payment alerts</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Residential Address</span>
                  <span className="text-sm font-extrabold text-slate-900 block">{currentStudent.address || 'New Delhi, India'}</span>
                  <span className="text-slate-500 font-medium">Registered communication address</span>
                </div>
              </div>

              {/* Important Notice */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Need to update your mobile phone number?</span>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    For student security, phone numbers can only be updated by the institute administrator. When the admin updates your phone number, your portal password will automatically synchronize to match the new number.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. SECTION: STUDENT PROFILE */}
          {activeTab === 'student_profile' && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero Student Banner Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      src={currentStudent.avatar}
                      name={currentStudent.name}
                      type="student"
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                          {currentStudent.rollNo}
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                          Active Student
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white">{currentStudent.name}</h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Enrolled in <strong className="text-white">{studentBatch?.name || 'JEE Adv Titans'}</strong> ({studentBatch?.grade || 'Class 12'})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 text-right">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Attendance Rate</span>
                    <span className="text-2xl font-black text-emerald-400">{attendancePercent}%</span>
                    <span className="text-[10px] text-slate-300">Consistent Presence</span>
                  </div>
                </div>

                {/* Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Date of Birth</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{currentStudent.dob || '2008-06-15'}</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{currentStudent.gender}</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Fee Status</span>
                    <span className={`font-bold text-xs mt-0.5 block ${currentStudent.pendingFee > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {currentStudent.pendingFee > 0 ? `₹${currentStudent.pendingFee.toLocaleString('en-IN')} Due` : 'Settled ✓'}
                    </span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">School</span>
                    <span className="font-bold text-white text-xs mt-0.5 block truncate">{currentStudent.schoolName || 'DPS R.K. Puram'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Academic Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Latest Exam Summary */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" /> Recent Test Result
                    </h4>
                    {studentMarks[0] && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        Rank #{studentMarks[0].rank}
                      </span>
                    )}
                  </div>

                  {studentMarks[0] ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm block">
                            {exams.find((e) => e.id === studentMarks[0].examId)?.title || 'Academic Evaluation'}
                          </span>
                          <span className="text-[11px] text-slate-500">Score: {studentMarks[0].marksObtained}/{studentMarks[0].totalMarks}</span>
                        </div>
                        <span className="text-base font-black text-emerald-600">{studentMarks[0].percentage}%</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('academics')}
                        className="w-full bg-slate-50 hover:bg-slate-100 text-indigo-600 font-bold py-2 rounded-xl text-xs border border-slate-200 text-center block cursor-pointer"
                      >
                        View All Scorecards →
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">No published marks yet.</p>
                  )}
                </div>

                {/* Upcoming Fee Box */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" /> Fee Balance & Dues
                    </h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${nextPendingFee ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                      {nextPendingFee ? 'Installment Due' : 'All Clear'}
                    </span>
                  </div>

                  {nextPendingFee ? (
                    <div className="space-y-3 text-xs">
                      <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{nextPendingFee.title}</span>
                          <span className="text-[11px] text-slate-500">Due: {nextPendingFee.dueDate}</span>
                        </div>
                        <span className="font-extrabold text-slate-900 text-base">₹{nextPendingFee.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <button
                        onClick={() => setSelectedPaymentInst(nextPendingFee)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pay Now via 1-Click UPI</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-800">All Installments Settled</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2.5. SECTION: ACADEMIC PROGRESS & PERFORMANCE INDEX */}
          {activeTab === 'progress' && (
            <StudentProgressView
              student={currentStudent}
              batches={batches}
              marks={marks}
              exams={exams}
              attendance={attendance}
              homework={homework}
              submissions={submissions}
              isParentView={true}
            />
          )}

          {/* 3. SECTION: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <StudentAttendanceView
              student={currentStudent}
              batch={studentBatch}
              attendanceHistory={attendance}
            />
          )}

          {/* 3B. SECTION: TIMETABLE */}
          {activeTab === 'timetable' && (
            <TimetableGridView
              mode="parent"
              slots={childTimetableSlots}
              studentName={currentStudent.name}
              batchName={studentBatch?.name}
            />
          )}

          {/* 4. SECTION: MARKSHEET & REPORT CARDS */}
          {activeTab === 'academics' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="border-b pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Official Marksheets & Exam Scorecards
                </h2>
                <p className="text-xs text-slate-500">View test ranks, subject percentiles, and download official PDF report cards</p>
              </div>

              <div className="space-y-3">
                {studentMarks.length > 0 ? (
                  studentMarks.map((m) => {
                    const exam = exams.find((e) => e.id === m.examId) || exams[0];
                    return (
                      <div
                        key={m.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm">{exam?.title || 'JEE Minor Test'}</h4>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                              Rank #{m.rank} in Batch
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            Score: <strong className="text-slate-900">{m.marksObtained} / {m.totalMarks}</strong> ({m.percentage}%) • Grade: <strong className="text-emerald-700">{m.grade}</strong>
                          </p>
                        </div>

                        <button
                          onClick={() => generateReportCardPDF(currentStudent, exam || exams[0], m)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Report Card</span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No published marks yet.</p>
                )}
              </div>
            </div>
          )}

          {/* 6. SECTION: HOMEWORK & DPPs */}
          {activeTab === 'homework' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="border-b pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" /> Daily Homework & Practice DPPs
                </h2>
                <p className="text-xs text-slate-500">Track assigned tasks, due dates, and completion status</p>
              </div>

              <div className="space-y-3">
                {studentHomework.length > 0 ? (
                  studentHomework.map((hw) => {
                    const mySubmission = (submissions || []).find(
                      (s) => s.assignmentId === hw.id && s.studentId === currentStudent.id
                    );
                    const isOverdue = !mySubmission && isSubmissionLate(hw.dueDate);
                    const isGraded = mySubmission?.status === 'graded';
                    const isLateSubmission = mySubmission?.status === 'late';
                    const isSubmitted = !!mySubmission;

                    return (
                      <div key={hw.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                            <p className="text-[11px] text-slate-500">
                              Subject: <strong className="text-slate-700">{hw.subject}</strong> • Faculty: {hw.teacherName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Status Badge */}
                            {isGraded ? (
                              <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200 text-[10px]">
                                🎓 Graded: {mySubmission?.grade || 'Evaluated'}
                              </span>
                            ) : isLateSubmission ? (
                              <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                                ⚠️ Submitted Late
                              </span>
                            ) : isSubmitted ? (
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                                ✓ Submitted
                              </span>
                            ) : isOverdue ? (
                              <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 text-[10px]">
                                ⚠️ Overdue
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200 text-[10px]">
                                Pending
                              </span>
                            )}

                            <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 text-[10px]">
                              Due: {hw.dueDate}
                            </span>
                            {(() => {
                              const dueCtx = hw.dueContext || (timetableSlots.length > 0 ? calculateNextLectureDate(timetableSlots, hw.batchId, hw.subject)?.displayContext : null);
                              if (!dueCtx) return null;
                              return (
                                <span className="bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200 text-[10px] flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                  <span>{dueCtx}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <p className="text-slate-600 text-xs leading-relaxed">{hw.description}</p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
                          {/* Teacher's Attachment */}
                          {(hw.attachmentUrl || (hw.attachments && hw.attachments[0]?.url)) && (
                            <a
                              href={hw.attachmentUrl || hw.attachments?.[0]?.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={hw.attachmentName || hw.attachments?.[0]?.name || 'Worksheet.pdf'}
                              className="px-3 py-1 bg-white hover:bg-slate-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5 text-[11px] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Teacher's Worksheet ({hw.attachmentName || hw.attachments?.[0]?.name || 'Attachment'})</span>
                            </a>
                          )}

                          {/* Student's Submission Preview & Download */}
                          {mySubmission && (
                            <a
                              href={mySubmission.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={mySubmission.fileName}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 text-[11px] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Student's Solution: {mySubmission.fileName} ({mySubmission.fileSize})</span>
                            </a>
                          )}
                        </div>

                        {/* If Graded: Show teacher remarks for parents */}
                        {isGraded && mySubmission?.feedback && (
                          <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-[11px]">
                            <strong>Faculty Feedback:</strong> {mySubmission.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No homework assignments found.</p>
                )}
              </div>
            </div>
          )}

          {/* 7. SECTION: FEE DUE & INVOICES */}
          {activeTab === 'fees_due' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="border-b pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" /> Fee Due & Outstanding Invoices
                </h2>
                <p className="text-xs text-slate-500">Instant online fee clearance via 1-Click UPI & Secure Payment Gateway</p>
              </div>

              {pendingInstallments.length > 0 ? (
                <div className="space-y-3">
                  {pendingInstallments.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending Installment</span>
                        <h4 className="font-extrabold text-slate-900 text-base mt-0.5">{inst.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Due Date: <strong className="text-slate-900">{inst.dueDate}</strong> • Amount:{' '}
                          <strong className="text-base text-slate-900">₹{inst.amount.toLocaleString('en-IN')}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedPaymentInst(inst)}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Pay ₹{inst.amount.toLocaleString('en-IN')} via UPI</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="font-extrabold text-slate-900 text-base">All Fee Installments are Settled</h3>
                  <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                    Thank you! There are no outstanding dues on this student's account.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 8. SECTION: FEE PAID & RECEIPTS */}
          {activeTab === 'fees_paid' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-600" /> Past Fee Receipts & Payment Ledger
                  </h2>
                  <p className="text-xs text-slate-500">View official stamped receipts and download PDF payment records anytime</p>
                </div>
                {paidInstallments.length > 0 && (
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search receipts..."
                      value={receiptSearchQuery}
                      onChange={(e) => setReceiptSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {filteredPaidInstallments.length > 0 ? (
                <div className="space-y-3">
                  {filteredPaidInstallments.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-sm">{inst.title}</h4>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Paid ✓
                          </span>
                          {inst.receiptNumber && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">
                              #{inst.receiptNumber}
                            </span>
                          )}
                          {inst.receiptUrl && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" /> Stamped & Stored
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px]">
                          Paid on: <strong className="text-slate-800">{inst.paidDate || 'Recent'}</strong> • Amount:{' '}
                          <strong className="text-slate-900">₹{inst.amount.toLocaleString('en-IN')}</strong>
                          {inst.paymentMode && (
                            <span> • Mode: <strong className="text-slate-700">{inst.paymentMode}</strong></span>
                          )}
                          {inst.transactionId && (
                            <span> • Txn: <code className="text-[10px] text-slate-600 font-mono">{inst.transactionId}</code></span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {inst.receiptUrl && (
                          <a
                            href={inst.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </a>
                        )}
                        <button
                          onClick={() => {
                            if (inst.receiptUrl) {
                              window.open(inst.receiptUrl, '_blank');
                            } else {
                              generateFeeReceiptPDF(currentStudent, inst);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : paidInstallments.length > 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">No receipts matched "{receiptSearchQuery}"</p>
                  <button
                    onClick={() => setReceiptSearchQuery('')}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">No paid fee receipts recorded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* 9. SECTION: HELP & SUPPORT */}
          {activeTab === 'support' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="border-b pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-600" /> Parent Helpdesk & Support
                </h2>
                <p className="text-xs text-slate-500">Contact coaching administration for mobile phone updates, password resets, and fee queries</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold">
                    <Building className="w-4 h-4" />
                    <span>Institute Administration Office</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Apex Coaching Institute, Main Campus<br />
                    Sector 62, Institutional Area, Noida, UP - 201309
                  </p>
                  <div className="pt-2 border-t border-slate-200 text-slate-700 space-y-1">
                    <div>📞 <strong>Helpline:</strong> +91 98765 43210 / 0120-4567890</div>
                    <div>✉️ <strong>Email:</strong> admin@apexerp.com / support@apexerp.com</div>
                    <div>⏰ <strong>Office Hours:</strong> Monday – Saturday: 9:00 AM – 7:00 PM</div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2 text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <Key className="w-4 h-4" />
                    <span>Password Reset & Phone Update Protocol</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    • <strong>Forgot Password?</strong> Please contact the administration helpline. Upon verifying your identity, the admin will reset your password to your registered phone number.
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    • <strong>New Phone Number?</strong> Notify the administration; changing your phone number automatically updates your login password.
                  </p>
                </div>
              </div>

              {/* Direct Query Submission Form */}
              <form onSubmit={handleSupportSubmit} className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-3 text-xs">
                <h4 className="font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Submit Direct Query to Administration
                </h4>

                {supportSent && (
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Your query has been sent to the institute administration. We will contact you shortly!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-slate-600 font-bold mb-1">Category</label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="password">Password Reset Assistance</option>
                      <option value="phone">Phone Number Update</option>
                      <option value="fee">Fee & Payment Query</option>
                      <option value="academic">Academic & PTM Question</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-bold mb-1">Message / Details</label>
                    <input
                      type="text"
                      required
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Describe your inquiry or request..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="text-right pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* 1-Click UPI Payment Modal */}
      <UpiCheckoutModal
        isOpen={!!selectedPaymentInst}
        onClose={() => setSelectedPaymentInst(null)}
        installment={selectedPaymentInst}
        student={currentStudent}
        onPaymentSuccess={onRecordPayment}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userRoleTitle="Parent Portal"
      />

      {/* Crosschecking Sign Out Confirmation Modal */}
      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={() => signOutUser('/login/parent')}
        title="Parent Sign Out"
        message="Are you sure you want to sign out of the Parent Portal?"
      />
    </div>
  );
};
