'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Award, 
  User,
  UserCheck,
  Sparkles,
  Search,
  Check,
  TrendingUp,
  FolderDown,
  Menu,
  Key,
  ShieldCheck,
  Receipt,
  ExternalLink,
  Upload,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  X,
  CheckCheck,
} from 'lucide-react';
import { Announcement, Batch, BatchAttendance, ExamTest, FeeInstallment, Homework, HomeworkSubmission, Student, StudentExamMark, StudyMaterial, TimetableSlot } from '@/lib/types';
import { INITIAL_TIMETABLE } from '@/lib/mock-data';
import { generateReportCardPDF, generateFeeReceiptPDF } from '@/lib/pdf-service';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PortalSidebar } from '@/components/common/PortalSidebar';
import { StudentAttendanceView } from './StudentAttendanceView';
import { StudentProgressView } from './StudentProgressView';
import { TimetableGridView } from './TimetableGridView';
import { AnnouncementFeed } from './AnnouncementFeed';
import { filterAnnouncementsForStudent, getUnreadAnnouncementCount } from '@/lib/announcement-feed-service';
import { FileUploadZone } from '@/components/common/FileUploadZone';
import type { UploadResult } from '@/lib/storage-upload';
import { isSubmissionLate, type SubmitHomeworkInput } from '@/lib/homework-submissions-service';
import { calculateNextLectureDate } from '@/lib/timetable-utils';

interface StudentPortalProps {
  students: Student[];
  batches: Batch[];
  homework: Homework[];
  submissions?: HomeworkSubmission[];
  materials: StudyMaterial[];
  exams: ExamTest[];
  marks: StudentExamMark[];
  attendance?: BatchAttendance[];
  installments?: FeeInstallment[];
  timetableSlots?: TimetableSlot[];
  announcements?: Announcement[];
  onSubmitHomework?: (input: SubmitHomeworkInput) => Promise<any> | void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  batches,
  homework,
  submissions = [],
  materials,
  exams,
  marks,
  attendance = [],
  installments = [],
  timetableSlots = [],
  announcements = [],
  onSubmitHomework,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [submittingHw, setSubmittingHw] = useState<Homework | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [completedHwIds, setCompletedHwIds] = useState<string[]>([]);
  const [materialFilter, setMaterialFilter] = useState('all');
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  // Sidebar responsive & collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('apex_student_sidebar_collapsed');
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
        localStorage.setItem('apex_student_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentBatch = currentStudent ? batches.find((b) => (currentStudent.batchIds || []).includes(b.id)) : undefined;

  // Filter timetable slots for student's enrolled batches (Hook placed before early return)
  const studentTimetableSlots = useMemo(() => {
    if (!currentStudent) return [];
    const studentBatchIds = currentStudent.batchIds || [];
    return (timetableSlots || []).filter(
      (s) => studentBatchIds.includes(s.batchId) || (studentBatch && s.batchId === studentBatch.id)
    );
  }, [timetableSlots, currentStudent, studentBatch]);

  if (!currentStudent) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-3xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">No Student Records Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The Student Learning App connects to your academy roster. Once students are enrolled in the Admin Portal, they can log in to view assignments, study notes, attendance, and test ranks.
        </p>
      </div>
    );
  }

  const studentHomework = useMemo(() => {
    const list = homework.filter((h) => (currentStudent.batchIds || []).includes(h.batchId));
    return list.sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime() || 0;
      const dateB = new Date(b.dueDate).getTime() || 0;
      return dateA - dateB;
    });
  }, [homework, currentStudent]);
  const studentMaterials = materials.filter(
    (m) => (materialFilter === 'all' || m.subject.toLowerCase().includes(materialFilter)) &&
           (currentStudent.batchIds || []).includes(m.batchId)
  );
  const studentMarks = marks.filter((m) => {
    const matchesId = m.studentId === currentStudent.id;
    const matchesRoll = currentStudent.rollNo && (m.rollNo === currentStudent.rollNo || m.studentId === currentStudent.rollNo);
    const matchesAuthUid = (m as any).authUid && (m as any).authUid === currentStudent.id;
    const isPublished = m.status === 'final' || (m as any).status === 'evaluated' || !m.status;
    return (matchesId || matchesRoll || matchesAuthUid) && isPublished;
  });

  const toggleHomeworkCompleted = (id: string) => {
    setCompletedHwIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const studentPaidInstallments = (installments || []).filter(
    (i) => i.studentId === currentStudent.id && i.status === 'paid'
  );

  const filteredStudentReceipts = studentPaidInstallments.filter((inst) => {
    if (!receiptSearchQuery.trim()) return true;
    const q = receiptSearchQuery.toLowerCase().trim();
    return (
      (inst.receiptNumber || '').toLowerCase().includes(q) ||
      (inst.title || '').toLowerCase().includes(q) ||
      (inst.transactionId || '').toLowerCase().includes(q) ||
      (inst.paymentMode || '').toLowerCase().includes(q)
    );
  });

  // Attendance rate calculation for Student Profile (strictly real records)
  let totalStudentClasses = 0;
  let presentStudentClasses = 0;
  let lateStudentClasses = 0;
  const sId = (currentStudent?.id || '').trim().toLowerCase();
  const sRoll = (currentStudent?.rollNo || '').trim().toLowerCase();
  const sAuthUid = ((currentStudent as any)?.authUid || '').trim().toLowerCase();
  const sName = (currentStudent?.name || '').trim().toLowerCase();

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
      totalStudentClasses++;
      if (rec.status === 'present') presentStudentClasses++;
      else if (rec.status === 'late') lateStudentClasses++;
    }
  });
  const attendanceRate =
    totalStudentClasses > 0
      ? Math.round(((presentStudentClasses + lateStudentClasses * 0.5) / totalStudentClasses) * 100)
      : 0;

  // Filtered Announcements for current student
  const studentAnnouncements = useMemo(() => {
    return filterAnnouncementsForStudent(announcements, currentStudent);
  }, [announcements, currentStudent]);

  const unreadAnnouncementsCount = useMemo(() => {
    return getUnreadAnnouncementCount(studentAnnouncements, currentStudent?.id || '');
  }, [studentAnnouncements, currentStudent]);

  // Badge count indicators for sidebar
  const badgeCounts: Record<string, number | string> = {
    announcements: unreadAnnouncementsCount > 0 ? unreadAnnouncementsCount : '',
    schedule: studentTimetableSlots.length,
    homework: studentHomework.length,
    materials: studentMaterials.length,
    results: studentMarks.length,
    receipts: studentPaidInstallments.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Collapsible Sidebar */}
      <PortalSidebar
        role="student"
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        userProfile={{
          name: currentStudent.name,
          subtext: studentBatch?.name || 'Enrolled Student',
          avatar: currentStudent.avatar,
          customId: currentStudent.rollNo,
        }}
        onChangePassword={() => setIsChangePasswordOpen(true)}
        badgeCounts={badgeCounts}
      />

      {/* Main Content Area */}
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 block sm:inline">
                Student App
              </span>
              <span className="hidden sm:inline text-slate-300 mx-2">•</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {activeTab === 'profile' && 'My Student Profile & Official Record'}
                {activeTab === 'announcements' && 'Announcements & Official Notices'}
                {activeTab === 'progress' && 'Academic Progress Index & Growth Trends'}
                {activeTab === 'attendance' && 'Attendance & Session Logs'}
                {activeTab === 'homework' && 'Assigned Homework & DPPs'}
                {activeTab === 'materials' && 'Study Sheets & Notes'}
                {activeTab === 'results' && 'Test Scorecards & Performance'}
                {activeTab === 'schedule' && 'Class Timetable & Schedule'}
                {activeTab === 'receipts' && 'Fee Receipts & Payment History'}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Student Switcher if multiple students */}
            {students.length > 1 && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden md:inline pl-1.5">
                  Student:
                </span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-violet-500"
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
                announcements={studentAnnouncements}
                userId={currentStudent.id}
                userRoleTitle="Student"
                title="Student Announcements & Official Notices"
                subtitle="Official academy broadcasts, urgent schedule updates, and batch notifications."
              />
            </div>
          )}

          {/* 0. STUDENT PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero Student Banner Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
                <div className="absolute right-0 top-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      src={currentStudent.avatar}
                      name={currentStudent.name}
                      type="student"
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] bg-violet-500/30 text-violet-300 font-bold px-2.5 py-0.5 rounded-full border border-violet-400/30 font-mono">
                          {currentStudent.rollNo}
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                          Enrolled Student ✓
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white">{currentStudent.name}</h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Batch: <strong className="text-white">{studentBatch?.name || 'Class 12 Elite'}</strong> ({studentBatch?.courseName || studentBatch?.grade || 'Science Stream'})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1 text-right">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Attendance Rate</span>
                    <span className="text-2xl font-black text-emerald-400">{attendanceRate}%</span>
                    <span className="text-[10px] text-slate-300">Official Presence Record</span>
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
                    <span className="font-bold text-white text-xs mt-0.5 block capitalize">{currentStudent.gender || 'Not Specified'}</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Fee Ledger</span>
                    <span className={`font-bold text-xs mt-0.5 block ${currentStudent.pendingFee > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                      {currentStudent.pendingFee > 0 ? `₹${currentStudent.pendingFee.toLocaleString('en-IN')} Due` : 'Settled ✓'}
                    </span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Homework DPPs</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{completedHwIds.length} / {studentHomework.length} Done</span>
                  </div>
                </div>
              </div>

              {/* Details Grid: Personal & Guardian Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Academic & Student Info */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-violet-600" /> Academic & Enrollment Details
                    </h3>
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200">
                      ID: {currentStudent.rollNo}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Assigned Batch</span>
                      <span className="font-bold text-slate-900">{studentBatch?.name || 'Class 12 Elite'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Batch Code / Grade</span>
                      <span className="font-bold text-slate-900">{studentBatch?.batchCode || 'BAT-12'} ({studentBatch?.grade || 'Class 12'})</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Enrolled Course</span>
                      <span className="font-bold text-slate-900">{studentBatch?.courseName || 'JEE Advanced & Boards'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Student Email</span>
                      <span className="font-bold text-slate-900">{currentStudent.email || `${currentStudent.rollNo.toLowerCase()}@apexerp.internal`}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Student Phone</span>
                      <span className="font-bold text-slate-900">{currentStudent.phone || 'Not Provided'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Residential Address</span>
                      <span className="font-bold text-slate-900 text-right truncate max-w-[200px]">{currentStudent.address || 'Bengaluru, India'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Guardian & Parent Info */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-600" /> Parent & Guardian Contact
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      SMS/WhatsApp Sync Active
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Guardian Name</span>
                      <span className="font-bold text-slate-900">{currentStudent.parentName}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Relationship</span>
                      <span className="font-bold text-slate-900">{currentStudent.parentRelation || 'Father'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Guardian Phone (WhatsApp)</span>
                      <span className="font-bold text-slate-900">📞 {currentStudent.parentPhone}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Guardian Login Email</span>
                      <span className="font-bold text-indigo-700">{currentStudent.parentEmail || 'Registered with Academy'}</span>
                    </div>

                    <div className="p-4 bg-violet-50 rounded-2xl border border-violet-200 text-xs text-violet-900 space-y-2 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-violet-600" /> Student Account Security
                        </span>
                        <button
                          onClick={() => setIsChangePasswordOpen(true)}
                          className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Change Password
                        </button>
                      </div>
                      <p className="text-[11px] text-violet-800 leading-relaxed">
                        Keep your student portal password confidential. You can update your password anytime using your verified credentials.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 0. ACADEMIC PROGRESS & PERFORMANCE INDEX TAB */}
          {activeTab === 'progress' && (
            <StudentProgressView
              student={currentStudent}
              batches={batches}
              marks={marks}
              exams={exams}
              attendance={attendance}
              homework={homework}
              submissions={submissions}
            />
          )}

          {/* 1. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <StudentAttendanceView
              student={currentStudent}
              batch={studentBatch}
              attendanceHistory={attendance}
            />
          )}

          {/* 2. HOMEWORK TAB */}
          {/* 2. HOMEWORK TAB */}
          {activeTab === 'homework' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Daily Academic Tasks</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">DPP & Assignment Tracker</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Assigned Homework & Worksheets</h2>
                  <p className="text-xs text-slate-500">Practice questions, daily problem sets, and submission tracking.</p>
                </div>
                <div className="flex items-center gap-2">
                  {submissionSuccess && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl animate-fade-in">
                      {submissionSuccess}
                    </span>
                  )}
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
                    {submissions.filter((s) => s.studentId === currentStudent.id).length} of {studentHomework.length} Submitted
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {studentHomework.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm">No Pending Homework</h4>
                    <p className="text-xs text-slate-400">All assigned problem sets for your batch are up to date.</p>
                  </div>
                ) : (
                  studentHomework.map((hw) => {
                    const mySubmission = (submissions || []).find(
                      (s) => s.assignmentId === hw.id && s.studentId === currentStudent.id
                    );
                    const isOverdue = !mySubmission && isSubmissionLate(hw.dueDate);
                    const isGraded = mySubmission?.status === 'graded';
                    const isLateSubmission = mySubmission?.status === 'late';
                    const isSubmitted = !!mySubmission;

                    return (
                      <div
                        key={hw.id}
                        className={`p-5 rounded-3xl border transition-all flex flex-col gap-4 text-xs ${
                          isGraded
                            ? 'bg-purple-50/40 border-purple-200'
                            : isSubmitted
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : isOverdue
                            ? 'bg-rose-50/40 border-rose-200'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-base">{hw.title}</span>
                              <span className="bg-violet-100 text-violet-800 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                                {hw.subject}
                              </span>
                              
                              {/* Status Badges */}
                              {isGraded ? (
                                <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <Award className="w-3 h-3 text-purple-600" />
                                  <span>Graded ({mySubmission?.grade || 'Evaluated'})</span>
                                </span>
                              ) : isLateSubmission ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  <span>Submitted Late</span>
                                </span>
                              ) : isSubmitted ? (
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Submitted</span>
                                </span>
                              ) : isOverdue ? (
                                <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Overdue</span>
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Pending Submission</span>
                                </span>
                              )}
                            </div>

                            <p className="text-slate-600 leading-relaxed text-xs">{hw.description}</p>

                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 pt-1">
                              <span>Assigned by <strong className="text-slate-700">{hw.teacherName}</strong></span>
                              <span>•</span>
                              <span>Due: <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>{hw.dueDate}</strong></span>
                              {(() => {
                                const dueCtx = hw.dueContext || (timetableSlots.length > 0 ? calculateNextLectureDate(timetableSlots, hw.batchId, hw.subject)?.displayContext : null);
                                if (!dueCtx) return null;
                                return (
                                  <span className="inline-flex items-center gap-1 font-bold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-200 text-[10px]">
                                    <Sparkles className="w-3 h-3 text-violet-600" />
                                    <span>{dueCtx}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Action Buttons: Download Reference Worksheet & Submit Button */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {(hw.attachmentUrl || (hw.attachments && hw.attachments[0]?.url)) && (
                              <a
                                href={hw.attachmentUrl || hw.attachments?.[0]?.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={hw.attachmentName || hw.attachments?.[0]?.name || 'Worksheet.pdf'}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-colors cursor-pointer border border-slate-200"
                              >
                                <Download className="w-3.5 h-3.5 text-violet-600" />
                                <span>Download Sheet ({hw.attachmentName || hw.attachments?.[0]?.name || 'PDF'})</span>
                              </a>
                            )}

                            {!isSubmitted ? (
                              <button
                                onClick={() => {
                                  setSubmittingHw(hw);
                                  setSubmissionError(null);
                                }}
                                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm ${
                                  isOverdue
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-600/20'
                                }`}
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isOverdue ? 'Submit Late' : 'Upload Solution'}</span>
                              </button>
                            ) : !isGraded ? (
                              <button
                                onClick={() => {
                                  setSubmittingHw(hw);
                                  setSubmissionError(null);
                                }}
                                className="px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                <span>Resubmit Solution</span>
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* If Submitted: Display submission preview box */}
                        {mySubmission && (
                          <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/70 p-3 rounded-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-xs truncate">
                                  Your Solution: {mySubmission.fileName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {mySubmission.fileSize} • Submitted on {new Date(mySubmission.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={mySubmission.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={mySubmission.fileName}
                                className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold rounded-xl flex items-center gap-1 text-[11px] transition-colors border border-violet-200 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>View My Submission</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* If Graded: Show teacher remarks */}
                        {isGraded && mySubmission?.feedback && (
                          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs space-y-1">
                            <div className="flex items-center gap-1 font-bold text-purple-900">
                              <Award className="w-3.5 h-3.5 text-purple-600" />
                              <span>Teacher Feedback & Evaluation</span>
                            </div>
                            <p className="text-purple-800 leading-relaxed text-[11px]">{mySubmission.feedback}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. STUDY MATERIALS TAB */}
          {/* 3. STUDY MATERIALS & RESOURCE LIBRARY TAB */}
          {activeTab === 'materials' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Resource Library</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                      {studentBatch ? studentBatch.name : 'Batch Resources'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Study Notes & Reference Handouts</h2>
                  <p className="text-xs text-slate-500">Official curated study materials, chapter summaries, and formula guides uploaded by faculty.</p>
                </div>

                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold flex-wrap">
                  {['all', 'physics', 'mathematics', 'chemistry', 'biology'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setMaterialFilter(sub)}
                      className={`capitalize px-3 py-1.5 rounded-lg text-xs transition-all ${
                        materialFilter === sub ? 'bg-white text-violet-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentMaterials.length === 0 ? (
                  <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">No Study Materials Available Yet</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Your teachers haven't published notes for this batch yet. New handouts and chapter formula sheets will appear here as soon as they are uploaded.
                      </p>
                    </div>
                  </div>
                ) : (
                  studentMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-violet-300 hover:shadow-md transition-all space-y-3.5 text-xs group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">{mat.title}</h4>
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                              <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 font-bold border border-violet-200/60 text-[10px]">
                                {mat.subject}
                              </span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500 font-mono text-[10px]">{mat.fileSize}</span>
                              {mat.uploaderName && (
                                <>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-500 text-[10px]">By {mat.uploaderName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {mat.description && (
                        <p className="text-slate-600 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          {mat.description}
                        </p>
                      )}

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Published {mat.uploadedAt ? new Date(mat.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                        </span>

                        <div className="flex items-center gap-2">
                          {mat.downloadUrl && (
                            <a
                              href={mat.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1 transition-all active:scale-95 text-[11px]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          )}

                          {mat.downloadUrl ? (
                            <a
                              href={mat.downloadUrl}
                              download={mat.fileName || 'study-notes.pdf'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-violet-600/20 active:scale-95 text-xs transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="px-3.5 py-1.5 bg-slate-100 text-slate-400 font-bold rounded-xl flex items-center gap-1.5 text-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Offline</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 4. TEST RESULTS TAB */}
          {activeTab === 'results' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Academics & Analytics</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">Official Rank Cards</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Test Results & Performance Reports</h2>
                  <p className="text-xs text-slate-500">Unit test evaluations, percentile rankings, and downloadable scorecards.</p>
                </div>
              </div>

              <div className="space-y-3">
                {studentMarks.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
                    <Award className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm">No Exam Records Yet</h4>
                    <p className="text-xs text-slate-400">Test scores will appear here after faculty grading.</p>
                  </div>
                ) : (
                  studentMarks.map((m) => {
                    const exam = exams.find((e) => e.id === m.examId) || exams[0];
                    return (
                      <div key={m.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{exam?.title || 'Assessment Test'}</span>
                            <span className="font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px]">
                              Rank #{m.rank}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">{m.teacherRemarks}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-base font-extrabold text-slate-900 block">
                              {m.marksObtained} / {m.totalMarks}
                            </span>
                            <span className="text-emerald-600 font-bold text-[10px]">{m.percentage}% (Grade: {m.grade})</span>
                          </div>

                          <button
                            onClick={() => generateReportCardPDF(currentStudent, exam, m)}
                            className="px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold rounded-xl flex items-center gap-1.5 border border-violet-200 shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF Report</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 5. SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <TimetableGridView
              mode="student"
              slots={studentTimetableSlots}
              batchName={studentBatch?.name}
              studentName={currentStudent.name}
            />
          )}

          {/* 6. FEE RECEIPTS TAB */}
          {activeTab === 'receipts' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Official Records</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Paid Receipts</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Fee Receipts & Payment History</h2>
                  <p className="text-xs text-slate-500">View and download your official stamped tuition fee receipts.</p>
                </div>

                {studentPaidInstallments.length > 0 && (
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search receipts..."
                      value={receiptSearchQuery}
                      onChange={(e) => setReceiptSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {filteredStudentReceipts.length > 0 ? (
                <div className="space-y-3">
                  {filteredStudentReceipts.map((inst) => (
                    <div
                      key={inst.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-violet-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-all"
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
                            <span className="text-[10px] bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full border border-violet-200 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-violet-600" /> Stored Online
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
                          className="px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold rounded-xl border border-violet-200 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : studentPaidInstallments.length > 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
                  <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">No receipts matched "{receiptSearchQuery}"</p>
                  <button
                    onClick={() => setReceiptSearchQuery('')}
                    className="text-[11px] font-bold text-violet-600 hover:text-violet-700 cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                </div>
              ) : (
                <div className="p-10 bg-white rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">No Past Receipts</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When your tuition fee installments are paid online or recorded by the institute, official stamped PDF receipts will appear here for instant download.
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userRoleTitle="Student"
      />

      {/* Student Submit Homework Modal */}
      {submittingHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                  {submittingHw.subject} • Due: {submittingHw.dueDate}
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-1">Submit Your Assignment</h3>
                <p className="text-xs text-slate-500">{submittingHw.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmittingHw(null);
                  setSubmissionError(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSubmissionLate(submittingHw.dueDate) && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Notice:</strong> The assignment due date ({submittingHw.dueDate}) has passed. Your submission will be recorded and marked as <strong>Late</strong> for your teacher.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Attach Your Solution Sheet / Document
              </label>
              <FileUploadZone
                storagePath={(file) =>
                  `homeworkSubmissions/${submittingHw.id}/${currentStudent.id}/${file.name}`
                }
                acceptedFileTypes={['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.zip', '.txt']}
                maxFileSizeMB={25}
                label="Drop your solution PDF, photo, or doc here"
                sublabel="Accepted: PDF, Word, Images up to 25MB"
                className="p-4"
                onUploadComplete={async (result: UploadResult) => {
                  if (!onSubmitHomework) return;
                  try {
                    const formattedSize =
                      result.fileSize >= 1024 * 1024
                        ? `${(result.fileSize / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(result.fileSize / 1024)} KB`;

                    await onSubmitHomework({
                      assignmentId: submittingHw.id,
                      studentId: currentStudent.id,
                      studentName: currentStudent.name,
                      rollNo: currentStudent.rollNo,
                      batchId: submittingHw.batchId,
                      fileUrl: result.downloadUrl,
                      fileName: result.fileName,
                      fileSize: formattedSize,
                      storagePath: result.storagePath,
                      dueDate: submittingHw.dueDate,
                    });

                    setSubmittingHw(null);
                    setSubmissionSuccess('Assignment submitted successfully! 🎉');
                    setTimeout(() => setSubmissionSuccess(null), 4000);
                  } catch (err: any) {
                    setSubmissionError(err.message || 'Failed to submit assignment.');
                  }
                }}
                onError={(err) => setSubmissionError(err)}
              />

              {submissionError && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{submissionError}</span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setSubmittingHw(null);
                  setSubmissionError(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
