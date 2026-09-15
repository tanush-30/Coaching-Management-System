'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  Plus, 
  Users, 
  Clock, 
  CheckCircle2, 
  FileText, 
  RefreshCw, 
  Sparkles, 
  Send, 
  Award,
  ChevronRight,
  ShieldCheck,
  Building,
  Menu,
  Key,
  X,
  CalendarCheck,
  User,
  Download,
  Paperclip,
  Trash2,
  CheckCheck,
  AlertTriangle,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { 
  AttendanceRecord, 
  Batch, 
  BatchAttendance, 
  ExamTest, 
  Homework, 
  HomeworkSubmission,
  Student, 
  StudentExamMark, 
  Teacher, 
  TimetableSlot,
  StudyMaterial,
  Announcement,
} from '@/lib/types';
import type { GradeSubmissionInput } from '@/lib/homework-submissions-service';
import { INITIAL_TIMETABLE } from '@/lib/mock-data';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PortalSidebar } from '@/components/common/PortalSidebar';
import { AttendanceManagement } from '@/components/erp/AttendanceManagement';
import { AcademicManagement } from '@/components/erp/AcademicManagement';
import { TimetableGridView } from './TimetableGridView';
import { AnnouncementFeed } from './AnnouncementFeed';
import { filterAnnouncementsForTeacher, getUnreadAnnouncementCount } from '@/lib/announcement-feed-service';
import { calculateNextLectureDate, formatTimeDisplay } from '@/lib/timetable-utils';
import { FileUploadZone } from '@/components/common/FileUploadZone';
import type { UploadResult } from '@/lib/storage-upload';
import { UploadStudyMaterialModal } from '@/components/erp/UploadStudyMaterialModal';
import { deleteStudyMaterialRecord } from '@/lib/study-materials-service';
import { TeacherAtRiskProgressView } from './TeacherAtRiskProgressView';
import { TeacherSalaryView } from './TeacherSalaryView';

interface TeacherPortalProps {
  teachers: Teacher[];
  batches: Batch[];
  students: Student[];
  homework: Homework[];
  submissions?: HomeworkSubmission[];
  materials?: StudyMaterial[];
  attendance?: BatchAttendance[];
  exams?: ExamTest[];
  marks?: StudentExamMark[];
  timetableSlots?: TimetableSlot[];
  announcements?: Announcement[];
  onAddHomework: (newHw: Omit<Homework, 'submissionCount'> & { id?: string }) => void | Promise<any>;
  onDeleteHomework?: (homeworkId: string) => void | Promise<any>;
  onGradeSubmission?: (input: GradeSubmissionInput) => Promise<any> | void;
  onAddMaterial?: (mat: StudyMaterial) => void;
  onDeleteMaterial?: (id: string) => void;
  onMarkAttendance?: (
    batchId: string,
    date: string,
    records: AttendanceRecord[],
    markedBy: string,
    status?: 'draft' | 'final',
    reason?: string
  ) => Promise<{ presentCount: number; absentCount: number; alertsSent: number }> | { presentCount: number; absentCount: number; alertsSent: number };
  onCreateExam?: (examData: any) => any;
  onSaveMarks?: (examId: string, marksList: any[], status?: 'draft' | 'final', reason?: string) => any;
  onNavigateAttendance?: () => void;
  onNavigateAcademics?: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  teachers,
  batches,
  students,
  homework,
  submissions = [],
  materials = [],
  attendance = [],
  exams = [],
  marks = [],
  timetableSlots = [],
  announcements = [],
  onAddHomework,
  onDeleteHomework,
  onGradeSubmission,
  onAddMaterial,
  onDeleteMaterial,
  onMarkAttendance,
  onCreateExam,
  onSaveMarks,
  onNavigateAttendance,
  onNavigateAcademics,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('schedule');
  
  // Sidebar responsive & collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('apex_teacher_sidebar_collapsed');
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
        localStorage.setItem('apex_teacher_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

  // Homework Form State
  const [isAddHwOpen, setIsAddHwOpen] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwBatchId, setHwBatchId] = useState('');
  const [hwSubject, setHwSubject] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwDueContext, setHwDueContext] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwAttachment, setHwAttachment] = useState<{
    name: string;
    size: string;
    url?: string;
    storagePath?: string;
  } | null>(null);
  const [hwUploadError, setHwUploadError] = useState<string | null>(null);
  const [tempHwId, setTempHwId] = useState<string>(`hw-${Date.now()}`);

  // Review & Grading Submissions Modal State
  const [reviewingHw, setReviewingHw] = useState<Homework | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'submitted' | 'graded' | 'missing'>('all');
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradingGrade, setGradingGrade] = useState<string>('A');
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [gradeSuccess, setGradeSuccess] = useState<string | null>(null);

  // Delete Homework Confirmation State
  const [deletingHw, setDeletingHw] = useState<Homework | null>(null);
  const [isDeletingHw, setIsDeletingHw] = useState(false);
  const [deleteHwError, setDeleteHwError] = useState<string | null>(null);
  const [deleteHwSuccess, setDeleteHwSuccess] = useState<string | null>(null);

  // Study Materials State
  const [isUploadMaterialOpen, setIsUploadMaterialOpen] = useState(false);
  const [localMaterials, setLocalMaterials] = useState<StudyMaterial[]>(materials || []);
  const [matBatchFilter, setMatBatchFilter] = useState('all');
  const [matSubjectFilter, setMatSubjectFilter] = useState('all');

  useEffect(() => {
    if (materials && materials.length > 0) {
      setLocalMaterials(materials);
    }
  }, [materials]);

  // Substitute State
  const [timetable, setTimetable] = useState<TimetableSlot[]>(INITIAL_TIMETABLE);
  const [substituteSuccessMsg, setSubstituteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentTeacher) {
      const teacherBatches = batches.filter((b) => (currentTeacher.assignedBatches || []).includes(b.id) || b.teacherId === currentTeacher.id);
      if (teacherBatches.length > 0 && !hwBatchId) {
        setHwBatchId(teacherBatches[0].id);
        setHwSubject(teacherBatches[0].subject || currentTeacher.subjects[0] || 'Mathematics');
      }
    }
  }, [currentTeacher, batches, hwBatchId]);

  // Timetable and Next Lecture calculation hooks placed before conditional returns
  const teacherTimetable = useMemo(() => {
    if (!currentTeacher) return [];
    return (timetableSlots || []).filter(
      (slot) =>
        slot.teacherId === currentTeacher.id ||
        (currentTeacher.facultyId && slot.teacherId === currentTeacher.facultyId) ||
        slot.teacherName?.toLowerCase() === currentTeacher.name?.toLowerCase()
    );
  }, [timetableSlots, currentTeacher]);

  const nextLectureInfo = useMemo(() => {
    if (!hwBatchId || !hwSubject) return null;
    return calculateNextLectureDate(timetableSlots || [], hwBatchId, hwSubject);
  }, [timetableSlots, hwBatchId, hwSubject]);

  if (!currentTeacher) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-3xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">No Faculty Records Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The Teacher Workspace lets faculty take fast 15-second batch attendance and assign homework. Create a batch and add teachers in the Admin Portal to get started.
        </p>
      </div>
    );
  }

  const assignedBatches = batches.filter((b) => (currentTeacher.assignedBatches || []).includes(b.id) || b.teacherId === currentTeacher.id);
  
  const teacherHomework = homework.filter((h) => h.teacherName === currentTeacher.name || assignedBatches.some(b => b.id === h.batchId));
  const teacherExams = exams.filter((e) => assignedBatches.some((b) => b.id === e.batchId));
  const teacherAttendance = attendance.filter((a) => assignedBatches.some((b) => b.id === a.batchId));
  const teacherMaterials = localMaterials.filter(
    (m) =>
      (matBatchFilter === 'all' || m.batchId === matBatchFilter) &&
      (matSubjectFilter === 'all' || m.subject.toLowerCase() === matSubjectFilter.toLowerCase()) &&
      (assignedBatches.some((b) => b.id === m.batchId) || m.uploaderId === currentTeacher.id || m.uploaderId === currentTeacher.facultyId)
  );

  const handleAssignSubstitute = (slotId: string, substituteTeacherName: string) => {
    setTimetable((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, teacherName: substituteTeacherName } : slot
      )
    );
    setSubstituteSuccessMsg(`Substitute faculty (${substituteTeacherName}) assigned successfully!`);
    setTimeout(() => setSubstituteSuccessMsg(null), 3000);
  };

  const handleCreateHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !hwDescription.trim()) return;

    const targetBatch = batches.find((b) => b.id === hwBatchId);
    onAddHomework({
      id: tempHwId,
      title: hwTitle.trim(),
      batchId: hwBatchId,
      batchName: targetBatch ? targetBatch.name : 'Target Batch',
      subject: hwSubject.trim(),
      teacherName: currentTeacher.name,
      assignedBy: currentTeacher.facultyId || currentTeacher.id,
      assignedDate: new Date().toISOString().split('T')[0],
      assignedAt: new Date().toISOString(),
      dueDate: hwDueDate,
      dueContext: hwDueContext || undefined,
      description: hwDescription.trim(),
      attachmentUrl: hwAttachment?.url || null,
      attachmentPath: hwAttachment?.storagePath || null,
      attachmentName: hwAttachment?.name || null,
      attachmentSize: hwAttachment?.size || null,
      attachments: hwAttachment
        ? [
            {
              name: hwAttachment.name,
              size: hwAttachment.size,
              url: hwAttachment.url,
              storagePath: hwAttachment.storagePath,
            },
          ]
        : [],
      totalStudents: targetBatch ? targetBatch.enrolledCount : 25,
    });

    setHwTitle('');
    setHwDescription('');
    setHwDueContext('');
    setHwAttachment(null);
    setHwUploadError(null);
    setTempHwId(`hw-${Date.now()}`);
    setIsAddHwOpen(false);
  };

  const handleDeleteMaterialItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this study material?')) return;
    try {
      await deleteStudyMaterialRecord(id);
      setLocalMaterials((prev) => prev.filter((m) => m.id !== id));
      if (onDeleteMaterial) onDeleteMaterial(id);
    } catch (err: any) {
      console.error('[TeacherPortal] Delete error:', err);
      alert(err?.message || 'Failed to delete material.');
    }
  };

  // Filtered announcements for faculty
  const teacherAnnouncements = useMemo(() => {
    return filterAnnouncementsForTeacher(announcements, currentTeacher);
  }, [announcements, currentTeacher]);

  const unreadTeacherAnnouncementsCount = useMemo(() => {
    return getUnreadAnnouncementCount(teacherAnnouncements, currentTeacher?.id || '');
  }, [teacherAnnouncements, currentTeacher]);

  const badgeCounts: Record<string, number | string> = {
    announcements: unreadTeacherAnnouncementsCount > 0 ? unreadTeacherAnnouncementsCount : '',
    schedule: teacherTimetable.length,
    attendance: teacherAttendance.length,
    academics: teacherExams.length,
    homework: teacherHomework.length,
    materials: teacherMaterials.length,
    roster: assignedBatches.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Collapsible Sidebar */}
      <PortalSidebar
        role="faculty"
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        userProfile={{
          name: currentTeacher.name,
          subtext: currentTeacher.subjects[0] || 'Faculty Member',
          avatar: currentTeacher.avatar,
          customId: currentTeacher.facultyId,
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
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Active Breadcrumb / Title */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block sm:inline">
                Faculty Workspace
              </span>
              <span className="hidden sm:inline text-slate-300 mx-2">•</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {activeTab === 'profile' && 'Faculty Member Profile & Details'}
                {activeTab === 'payroll' && 'My Salary, Compensation & Payslips'}
                {activeTab === 'announcements' && 'Announcements & Official Notices'}
                {activeTab === 'progress' && 'Student Academic Progress & At-Risk Radar'}
                {activeTab === 'schedule' && 'Teaching Schedule & Labs'}
                {activeTab === 'attendance' && 'Mark Batch Attendance'}
                {activeTab === 'academics' && 'Test Marks & Report Cards'}
                {activeTab === 'homework' && 'Assignments & Homework'}
                {activeTab === 'substitute' && 'Substitute Requests Manager'}
                {activeTab === 'roster' && 'Assigned Batch Directory'}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {teachers.length > 1 && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden md:inline pl-1.5">
                  Faculty:
                </span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.facultyId || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <UserAvatar
                src={currentTeacher.avatar}
                name={currentTeacher.name}
                type="faculty"
                size="md"
              />
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Active Faculty Profile
                </div>
                <h2 className="text-xl font-extrabold text-white">{currentTeacher.name}</h2>
                <p className="text-xs text-slate-300">
                  {currentTeacher.facultyId && (
                    <span className="font-mono font-bold text-emerald-400 mr-2">{currentTeacher.facultyId}</span>
                  )}
                  {currentTeacher.qualifications} • <span className="text-emerald-300">{currentTeacher.subjects[0]}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('profile')}
                className={`font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs shadow-sm active:scale-95 transition-all ${
                  activeTab === 'profile'
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('attendance');
                  if (onNavigateAttendance) onNavigateAttendance();
                }}
                className={`font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs shadow-sm active:scale-95 transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mark Attendance</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('academics');
                  if (onNavigateAcademics) onNavigateAcademics();
                }}
                className={`font-bold px-3.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs transition-all ${
                  activeTab === 'academics'
                    ? 'bg-amber-500 text-white border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter Marks & Ranks</span>
              </button>
            </div>
          </div>

          {/* PAYROLL & SALARY TAB */}
          {activeTab === 'payroll' && (
            <div className="space-y-6 animate-fade-in">
              <TeacherSalaryView teacher={currentTeacher} />
            </div>
          )}

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 'announcements' && (
            <div className="space-y-6 animate-fade-in">
              <AnnouncementFeed
                announcements={teacherAnnouncements}
                userId={currentTeacher.id}
                userRoleTitle="Faculty"
                title="Faculty Notices & Official Announcements"
                subtitle="Official academy broadcasts, schedule updates, admin instructions, and batch notifications."
              />
            </div>
          )}

          {/* 0. FACULTY PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero Faculty Banner Card */}
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-slate-800">
                <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      src={currentTeacher.avatar}
                      name={currentTeacher.name}
                      type="faculty"
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {currentTeacher.facultyId && (
                          <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-mono">
                            {currentTeacher.facultyId}
                          </span>
                        )}
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                          Active Faculty Member ✓
                        </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white">{currentTeacher.name}</h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {currentTeacher.qualifications} • <span className="text-emerald-300 font-semibold">{currentTeacher.subjects.join(', ')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1 text-right">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Weekly Workload</span>
                    <span className="text-2xl font-black text-emerald-400">{teacherTimetable.length} Lectures</span>
                    <span className="text-[10px] text-slate-300">Across {assignedBatches.length} Assigned Batches</span>
                  </div>
                </div>

                {/* Workload Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Batches</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{assignedBatches.length} Active Batches</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Students Mentored</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{assignedBatches.reduce((acc, b) => acc + (b.enrolledCount || 0), 0)} Enrolled</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Homework DPPs</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{teacherHomework.length} Published</span>
                  </div>
                  <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Unit Exams</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">{teacherExams.length} Conducted</span>
                  </div>
                </div>
              </div>

              {/* Details Grid: Professional & Workload Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Professional & Academic Details */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" /> Faculty Credentials & Information
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Verified Faculty
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Faculty Member UID</span>
                      <span className="font-bold text-slate-900 font-mono">{currentTeacher.facultyId || currentTeacher.id}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Teaching Subjects</span>
                      <div className="flex gap-1 flex-wrap">
                        {currentTeacher.subjects.map((sub) => (
                          <span key={sub} className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Highest Qualification</span>
                      <span className="font-bold text-slate-900">{currentTeacher.qualifications || 'Master of Science (M.Sc.)'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Official Email</span>
                      <span className="font-bold text-slate-900">{currentTeacher.email || `${(currentTeacher.facultyId || 'faculty').toLowerCase()}@apexerp.internal`}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Contact Phone</span>
                      <span className="font-bold text-slate-900">{currentTeacher.phone || 'Provided to Administration'}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Campus / Department</span>
                      <span className="font-bold text-slate-900">Apex Main Campus — Academic Wing</span>
                    </div>
                  </div>
                </div>

                {/* 2. Teaching Batches & Security */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" /> Assigned Batches & Class Rosters
                    </h3>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {assignedBatches.length} Batches
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs max-h-56 overflow-y-auto pr-1">
                    {assignedBatches.map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.batchCode} • {b.courseName || b.grade}</div>
                        </div>
                        <span className="bg-white text-emerald-700 font-bold px-2.5 py-1 rounded-xl text-[11px] border border-emerald-200 shadow-xs">
                          {b.enrolledCount} Students
                        </span>
                      </div>
                    ))}
                    {assignedBatches.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No batches assigned yet.</p>
                    )}
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-600" /> Faculty Portal Security
                      </span>
                      <button
                        onClick={() => setIsChangePasswordOpen(true)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                      >
                        Change Password
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Ensure your faculty credentials are kept secure. You can update your password anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. TEACHING SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <TimetableGridView
              mode="teacher"
              slots={teacherTimetable}
              teacherName={currentTeacher.name}
              onOpenAttendance={() => setActiveTab('attendance')}
            />
          )}

          {/* 2. ATTENDANCE MANAGEMENT TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <AttendanceManagement
                batches={assignedBatches}
                students={students}
                teachers={teachers}
                attendanceHistory={attendance}
                userRole="teacher"
                onMarkAttendance={
                  onMarkAttendance ||
                  (async () => ({ presentCount: 0, absentCount: 0, alertsSent: 0 }))
                }
              />
            </div>
          )}

          {/* 2.5. STUDENT PROGRESS & AT-RISK RADAR TAB */}
          {activeTab === 'progress' && (
            <TeacherAtRiskProgressView
              currentTeacher={currentTeacher}
              batches={assignedBatches}
              students={students}
              marks={marks}
              exams={exams}
              attendance={attendance}
              homework={homework}
              submissions={submissions}
            />
          )}

          {/* 3. ACADEMICS & TEST MARKS TAB */}
          {activeTab === 'academics' && (
            <div className="space-y-6 animate-fade-in">
              <AcademicManagement
                exams={exams}
                marks={marks}
                batches={assignedBatches}
                students={students}
                userRole="teacher"
                onCreateExam={
                  onCreateExam ||
                  (async () => ({} as any))
                }
                onSaveMarks={
                  onSaveMarks ||
                  (async () => {})
                }
              />
            </div>
          )}

          {/* 4. HOMEWORK ASSIGNMENT TAB */}
          {activeTab === 'homework' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Academic Tasks</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">DPP Distribution</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Posted Homework & Submission Rates</h2>
                  <p className="text-xs text-slate-500">Track student completion rates across your assigned batches.</p>
                </div>
                <button
                  onClick={() => setIsAddHwOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post New Homework</span>
                </button>
              </div>

              {deleteHwSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{deleteHwSuccess}</span>
                </div>
              )}

              <div className="space-y-4">
                {teacherHomework.length === 0 ? (
                  <div className="bg-white p-12 text-center text-xs rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">No Homework Assigned Yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                      Assign daily practice problems (DPPs), chapter exercises, or revision worksheets to your assigned batches.
                    </p>
                    <button
                      onClick={() => setIsAddHwOpen(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Post New Homework</span>
                    </button>
                  </div>
                ) : (
                  teacherHomework.map((hw) => {
                    const hwSubs = submissions.filter((s) => s.assignmentId === hw.id);
                    const batchStudents = students.filter((s) => (s.batchIds || []).includes(hw.batchId));
                    const totalEnrolled = batchStudents.length || hw.totalStudents || 0;
                    const submittedCount = hwSubs.length;
                    const gradedCount = hwSubs.filter((s) => s.status === 'graded').length;
                    const submissionRate = totalEnrolled > 0 ? Math.round((submittedCount / totalEnrolled) * 100) : 0;

                    return (
                      <div key={hw.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-base">{hw.title}</h4>
                              <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
                                {hw.subject}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                              <span>Batch: <strong className="text-slate-800">{hw.batchName}</strong></span>
                              <span>•</span>
                              <span>Due: <strong>{hw.dueDate}</strong></span>
                              {hw.dueContext && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{hw.dueContext}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs">
                              {submittedCount} / {totalEnrolled} Submitted ({submissionRate}%) • {gradedCount} Graded
                            </span>
                            <button
                              onClick={() => {
                                setReviewingHw(hw);
                                setGradingSubId(null);
                                setGradeError(null);
                                setGradeSuccess(null);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Review Submissions ({submittedCount})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingHw(hw);
                                setDeleteHwError(null);
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-rose-200 cursor-pointer transition-colors"
                              title="Delete this homework assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-600 text-xs leading-relaxed">{hw.description}</p>

                        {(hw.attachmentUrl || (hw.attachments && hw.attachments[0]?.url)) && (
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-xs">
                                <strong>{hw.attachmentName || hw.attachments?.[0]?.name || 'Attached Reference'}</strong>
                              </span>
                              {(hw.attachmentSize || hw.attachments?.[0]?.size) && (
                                <span className="text-slate-400 font-mono text-[10px]">({hw.attachmentSize || hw.attachments?.[0]?.size})</span>
                              )}
                            </div>
                            <a
                              href={hw.attachmentUrl || hw.attachments?.[0]?.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={hw.attachmentName || hw.attachments?.[0]?.name || 'Worksheet.pdf'}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] border border-emerald-200 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download Worksheet</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4.5. STUDY MATERIALS MANAGEMENT TAB */}
          {activeTab === 'materials' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Curriculum Materials</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      {assignedBatches.length} Assigned Batches
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Study Materials & Notes Management</h2>
                  <p className="text-xs text-slate-500">Upload lecture PDFs, handouts & formula sheets scoped to your batches.</p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <select
                    value={matBatchFilter}
                    onChange={(e) => setMatBatchFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    <option value="all">All Batches</option>
                    {assignedBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setIsUploadMaterialOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Study Material</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {teacherMaterials.length === 0 ? (
                  <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-3xl border border-dashed border-slate-200 shadow-xs space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm">No Study Materials Uploaded Yet</p>
                      <p className="text-slate-400 max-w-sm mx-auto">Click &quot;Upload Study Material&quot; to share chapter notes or formula sheets with your students.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teacherMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all space-y-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <h4 className="font-bold text-slate-900 text-sm truncate">{mat.title}</h4>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 text-[10px]">
                                  {mat.batchName || 'Batch'}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 font-medium">{mat.subject}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500 font-mono text-[10px]">{mat.fileSize}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteMaterialItem(mat.id)}
                            title="Delete Material"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {mat.description && (
                          <p className="text-slate-600 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {mat.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Uploaded {mat.uploadedAt ? new Date(mat.uploadedAt).toLocaleDateString() : 'Recently'}
                          </span>

                          <div className="flex items-center gap-2">
                            {mat.downloadUrl && (
                              <a
                                href={mat.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-all"
                              >
                                View
                              </a>
                            )}
                            {mat.downloadUrl && (
                              <a
                                href={mat.downloadUrl}
                                download={mat.fileName || 'material.pdf'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs transition-all"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. SUBSTITUTE MANAGER TAB */}
          {activeTab === 'substitute' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Faculty Coverage</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">1-Click Handover</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Substitute Teacher Assignment</h2>
                <p className="text-xs text-slate-500">Need emergency leave? Assign your lecture slot to an available faculty colleague.</p>
              </div>

              {substituteSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-scale-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{substituteSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                {teacherTimetable.map((slot: TimetableSlot) => (
                  <div key={slot.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{slot.subjectName || slot.subject} ({slot.batchName})</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{slot.day} • {formatTimeDisplay(slot.startTime)} • Room {slot.roomName || slot.room || slot.roomId}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        id={`sub-${slot.id}`}
                        defaultValue=""
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="" disabled>Select Colleague...</option>
                        {teachers
                          .filter((t) => t.id !== currentTeacher.id)
                          .map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.subjects[0]})
                            </option>
                          ))}
                      </select>

                      <button
                        onClick={() => {
                          const selectEl = document.getElementById(`sub-${slot.id}`) as HTMLSelectElement;
                          if (selectEl && selectEl.value) {
                            handleAssignSubstitute(slot.id, selectEl.value);
                          } else {
                            alert('Please select a colleague first.');
                          }
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Handover Slot</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ROSTER TAB */}
          {activeTab === 'roster' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Student Directory</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Class List</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Assigned Batch Rosters & Parent Contacts</h2>
                <p className="text-xs text-slate-500">Student directory and emergency guardian contact details for your classes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedBatches.map((b) => {
                  const batchStudents = students.filter((s) => (s.batchIds || []).includes(b.id));
                  return (
                    <div key={b.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4 text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">{b.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{b.batchCode}</span>
                        </div>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl text-[11px] border border-emerald-200">
                          {batchStudents.length} Students
                        </span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {batchStudents.map((st) => (
                          <div key={st.id} className="p-2.5 rounded-xl bg-slate-50 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800">{st.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{st.rollNo}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-500">{st.parentName} ({st.parentRelation})</div>
                              <div className="text-[10px] font-bold text-slate-700">{st.parentPhone}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Homework Modal */}
      {isAddHwOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">Post New Homework / DPP Worksheet</h3>
              <button
                onClick={() => setIsAddHwOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHw} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Batch</label>
                <select
                  value={hwBatchId}
                  onChange={(e) => setHwBatchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.courseName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Worksheet Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Electrostatics DPP 04 — Gauss Law Problems"
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={hwSubject}
                    onChange={(e) => setHwSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={hwDueDate}
                    onChange={(e) => {
                      setHwDueDate(e.target.value);
                      setHwDueContext('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
                  {nextLectureInfo ? (
                    <div className="mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>Timetable Suggestion</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          {nextLectureInfo.slot.day} {formatTimeDisplay(nextLectureInfo.slot.startTime)}
                        </span>
                      </div>
                      <p className="text-emerald-800 text-[10px] leading-tight">
                        Next {nextLectureInfo.slot.subjectName || hwSubject} class occurs on <strong>{nextLectureInfo.dateString}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHwDueDate(nextLectureInfo.dateString);
                          setHwDueContext(nextLectureInfo.displayContext);
                        }}
                        className="w-full text-center text-[10px] text-white bg-emerald-600 hover:bg-emerald-700 font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        ⚡ Apply Next Lecture as Due Date
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instructions & Question Guidelines</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Attempt all 15 subjective questions in notebook before Friday class."
                  value={hwDescription}
                  onChange={(e) => setHwDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                />
              </div>

              {/* Optional File Attachment via Reusable FileUploadZone */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Attach Reference File / Worksheet</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                </label>

                {hwAttachment ? (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate max-w-xs">{hwAttachment.name}</div>
                        <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Uploaded ({hwAttachment.size})</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHwAttachment(null)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <FileUploadZone
                    storagePath={(file) => {
                      const bSlug = hwBatchId || 'general';
                      const sSlug = encodeURIComponent((hwSubject || 'general').toLowerCase().replace(/\s+/g, '-'));
                      return `homework/${bSlug}/${sSlug}/${tempHwId}/${file.name}`;
                    }}
                    acceptedFileTypes={['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.zip', '.txt']}
                    maxFileSizeMB={25}
                    label="Drop worksheet, problem set, or PDF instructions here"
                    sublabel="Optional: PDF, DOC, Images up to 25MB"
                    className="p-3.5"
                    onUploadComplete={(result) => {
                      const formattedSize =
                        result.fileSize >= 1024 * 1024
                          ? `${(result.fileSize / (1024 * 1024)).toFixed(1)} MB`
                          : `${Math.round(result.fileSize / 1024)} KB`;
                      setHwAttachment({
                        name: result.fileName,
                        size: formattedSize,
                        url: result.downloadUrl,
                        storagePath: result.storagePath,
                      });
                      setHwUploadError(null);
                    }}
                    onError={(err) => setHwUploadError(err)}
                  />
                )}

                {hwUploadError && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                    <span>⚠️ {hwUploadError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setHwAttachment(null);
                    setHwUploadError(null);
                    setIsAddHwOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20"
                >
                  Publish Worksheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Grade Submissions Modal */}
      {reviewingHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {reviewingHw.batchName} • {reviewingHw.subject}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    Due Date: {reviewingHw.dueDate}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-slate-900 mt-1">
                  Submission Queue & Grading: {reviewingHw.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review submitted solutions, assign grades, and provide feedback remarks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewingHw(null);
                  setGradingSubId(null);
                  setGradeError(null);
                  setGradeSuccess(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Tabs & Summary stats */}
            {(() => {
              const currentHwSubs = submissions.filter((s) => s.assignmentId === reviewingHw.id);
              const batchStudents = students.filter((s) => (s.batchIds || []).includes(reviewingHw.batchId));
              const gradedCount = currentHwSubs.filter((s) => s.status === 'graded').length;
              const pendingGradingCount = currentHwSubs.filter((s) => s.status !== 'graded').length;
              const missingCount = Math.max(0, batchStudents.length - currentHwSubs.length);

              const filteredStudents = batchStudents.filter((student) => {
                const sub = currentHwSubs.find((s) => s.studentId === student.id);
                if (submissionFilter === 'submitted') return sub && sub.status !== 'graded';
                if (submissionFilter === 'graded') return sub && sub.status === 'graded';
                if (submissionFilter === 'missing') return !sub;
                return true;
              });

              return (
                <>
                  <div className="px-6 py-3 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setSubmissionFilter('all')}
                        className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                          submissionFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        All ({batchStudents.length})
                      </button>
                      <button
                        onClick={() => setSubmissionFilter('submitted')}
                        className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                          submissionFilter === 'submitted'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                        }`}
                      >
                        Pending Review ({pendingGradingCount})
                      </button>
                      <button
                        onClick={() => setSubmissionFilter('graded')}
                        className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                          submissionFilter === 'graded'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                        }`}
                      >
                        Graded ({gradedCount})
                      </button>
                      <button
                        onClick={() => setSubmissionFilter('missing')}
                        className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-colors ${
                          submissionFilter === 'missing'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                        }`}
                      >
                        Missing ({missingCount})
                      </button>
                    </div>

                    {gradeSuccess && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl animate-fade-in">
                        {gradeSuccess}
                      </span>
                    )}
                  </div>

                  {/* Student Submission List */}
                  <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {filteredStudents.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No students match the selected filter.
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const sub = currentHwSubs.find((s) => s.studentId === student.id);
                        const isGraded = sub?.status === 'graded';
                        const isLate = sub?.status === 'late';
                        const isBeingGraded = gradingSubId === sub?.id;

                        return (
                          <div
                            key={student.id}
                            className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                              isGraded
                                ? 'bg-purple-50/30 border-purple-200'
                                : sub
                                ? 'bg-white border-slate-200 shadow-xs'
                                : 'bg-slate-50/50 border-dashed border-slate-200 opacity-80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <UserAvatar name={student.name} size="sm" />
                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm">{student.name}</h4>
                                  <p className="text-[11px] text-slate-400">
                                    Roll No: <strong className="text-slate-700">{student.rollNo || student.id}</strong>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {isGraded ? (
                                  <span className="bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                    <Award className="w-3 h-3 text-purple-600" />
                                    <span>Grade: {sub.grade}</span>
                                  </span>
                                ) : isLate ? (
                                  <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Submitted Late</span>
                                  </span>
                                ) : sub ? (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    <span>Submitted</span>
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                    Not Submitted
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Submission Details & Solution File Link */}
                            {sub ? (
                              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                    <span className="font-bold text-slate-800 truncate text-[11px]">
                                      {sub.fileName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">({sub.fileSize})</span>
                                    <span className="text-[10px] text-slate-400">
                                      • Submitted on {new Date(sub.submittedAt).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={sub.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={sub.fileName}
                                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 flex items-center gap-1 text-[10px] transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>View Solution</span>
                                    </a>

                                    {!isBeingGraded && (
                                      <button
                                        onClick={() => {
                                          setGradingSubId(sub.id);
                                          setGradingGrade(sub.grade || 'A');
                                          setGradingFeedback(sub.feedback || '');
                                          setGradeError(null);
                                        }}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                      >
                                        <Award className="w-3 h-3" />
                                        <span>{isGraded ? 'Edit Grade' : 'Grade Solution'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Display Graded Feedback if not editing */}
                                {isGraded && !isBeingGraded && sub.feedback && (
                                  <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-[11px] flex items-start gap-2">
                                    <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold">Faculty Feedback: </span>
                                      <span>{sub.feedback}</span>
                                    </div>
                                  </div>
                                )}

                                {/* In-line Grading Form */}
                                {isBeingGraded && (
                                  <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Assign Grade & Feedback</span>
                                      </span>
                                      <button
                                        onClick={() => setGradingSubId(null)}
                                        className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>

                                    {/* Quick Grade Selector Buttons */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                        Select Grade / Score
                                      </label>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {['A+', 'A', 'B+', 'B', 'C', '10/10', '9/10', 'Pass'].map((g) => (
                                          <button
                                            key={g}
                                            type="button"
                                            onClick={() => setGradingGrade(g)}
                                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                                              gradingGrade === g
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
                                            }`}
                                          >
                                            {g}
                                          </button>
                                        ))}
                                        <input
                                          type="text"
                                          placeholder="Custom (e.g. 95/100)"
                                          value={gradingGrade}
                                          onChange={(e) => setGradingGrade(e.target.value)}
                                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 w-32 focus:outline-emerald-600"
                                        />
                                      </div>
                                    </div>

                                    {/* Feedback Textarea */}
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                        Evaluation Feedback / Teacher Remarks (Optional)
                                      </label>
                                      <textarea
                                        rows={2}
                                        placeholder="Add encouraging remarks, notes on errors, or step-by-step guidance..."
                                        value={gradingFeedback}
                                        onChange={(e) => setGradingFeedback(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-emerald-600 leading-relaxed"
                                      />
                                    </div>

                                    {gradeError && (
                                      <p className="text-xs text-rose-600 font-medium">⚠️ {gradeError}</p>
                                    )}

                                    <div className="flex justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setGradingSubId(null)}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs border border-slate-200 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingGrade}
                                        onClick={async () => {
                                          if (!onGradeSubmission || !gradingGrade.trim()) return;
                                          setIsSavingGrade(true);
                                          setGradeError(null);
                                          try {
                                            await onGradeSubmission({
                                              submissionId: sub.id,
                                              grade: gradingGrade.trim(),
                                              feedback: gradingFeedback.trim() || undefined,
                                              gradedBy: currentTeacher.name || currentTeacher.id,
                                            });
                                            setGradingSubId(null);
                                            setGradeSuccess(`Grade saved for ${student.name}! 🎉`);
                                            setTimeout(() => setGradeSuccess(null), 3000);
                                          } catch (err: any) {
                                            setGradeError(err.message || 'Failed to save grade.');
                                          } finally {
                                            setIsSavingGrade(false);
                                          }
                                        }}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm shadow-emerald-600/20 cursor-pointer"
                                      >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span>{isSavingGrade ? 'Saving...' : 'Save Grade & Remarks'}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic pt-1">
                                Awaiting student submission. Solution will appear here once submitted.
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setReviewingHw(null);
                  setGradingSubId(null);
                  setGradeError(null);
                  setGradeSuccess(null);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userRoleTitle="Faculty Member"
      />

      {/* Upload Study Material Modal */}
      <UploadStudyMaterialModal
        isOpen={isUploadMaterialOpen}
        onClose={() => setIsUploadMaterialOpen(false)}
        batches={assignedBatches}
        currentTeacher={currentTeacher}
        onMaterialCreated={(newMat) => {
          setLocalMaterials((prev) => [newMat, ...prev]);
          if (onAddMaterial) onAddMaterial(newMat);
        }}
      />

      {/* Delete Homework Confirmation Modal */}
      {deletingHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Homework Assignment?</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete this homework?</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Assignment Title</span>
                <span className="font-bold text-slate-900 text-sm">{deletingHw.title}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Batch</span>
                  <span className="font-semibold text-slate-800">{deletingHw.batchName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Subject</span>
                  <span className="font-semibold text-slate-800">{deletingHw.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                  <span className="font-semibold text-slate-800">{deletingHw.dueDate}</span>
                </div>
              </div>
              {(deletingHw.attachmentName || (deletingHw.attachments && deletingHw.attachments[0]?.name)) && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Attached Worksheet</span>
                  <span className="font-semibold text-rose-700 text-[11px] truncate block">
                    📄 {deletingHw.attachmentName || deletingHw.attachments?.[0]?.name}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200/80 p-3 rounded-xl leading-relaxed">
              ⚠️ Deleting this homework will make it <strong>permanently invisible</strong> from both your faculty dashboard and the student dashboard of <strong>{deletingHw.batchName}</strong>.
            </p>

            {deleteHwError && (
              <p className="text-xs text-rose-600 font-medium">⚠️ {deleteHwError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingHw}
                onClick={() => {
                  setDeletingHw(null);
                  setDeleteHwError(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingHw}
                onClick={async () => {
                  if (!onDeleteHomework || !deletingHw) return;
                  setIsDeletingHw(true);
                  setDeleteHwError(null);
                  try {
                    await onDeleteHomework(deletingHw.id);
                    setDeleteHwSuccess(`"${deletingHw.title}" has been deleted successfully.`);
                    setDeletingHw(null);
                    setTimeout(() => setDeleteHwSuccess(null), 4000);
                  } catch (err: any) {
                    setDeleteHwError(err.message || 'Failed to delete homework assignment.');
                  } finally {
                    setIsDeletingHw(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer"
              >
                {isDeletingHw ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Homework</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
