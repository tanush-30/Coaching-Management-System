'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { 
  AttendanceRecord, 
  Batch, 
  BatchAttendance, 
  ExamTest, 
  Homework, 
  Student, 
  StudentExamMark, 
  Teacher, 
  TimetableSlot 
} from '@/lib/types';
import { INITIAL_TIMETABLE } from '@/lib/mock-data';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PortalSidebar } from '@/components/common/PortalSidebar';
import { AttendanceManagement } from '@/components/erp/AttendanceManagement';
import { AcademicManagement } from '@/components/erp/AcademicManagement';

interface TeacherPortalProps {
  teachers: Teacher[];
  batches: Batch[];
  students: Student[];
  homework: Homework[];
  attendance?: BatchAttendance[];
  exams?: ExamTest[];
  marks?: StudentExamMark[];
  onAddHomework: (newHw: Omit<Homework, 'id' | 'submissionCount'>) => void;
  onMarkAttendance?: (
    batchId: string,
    date: string,
    records: AttendanceRecord[],
    markedBy: string
  ) => Promise<{ presentCount: number; absentCount: number; alertsSent: number }> | { presentCount: number; absentCount: number; alertsSent: number };
  onCreateExam?: (examData: any) => any;
  onSaveMarks?: (examId: string, marksList: any[]) => any;
  onNavigateAttendance?: () => void;
  onNavigateAcademics?: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  teachers,
  batches,
  students,
  homework,
  attendance = [],
  exams = [],
  marks = [],
  onAddHomework,
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

  // Substitute State
  const [timetable, setTimetable] = useState<TimetableSlot[]>(INITIAL_TIMETABLE);
  const [substituteSuccessMsg, setSubstituteSuccessMsg] = useState<string | null>(null);

  // New Homework Form State
  const [isAddHwOpen, setIsAddHwOpen] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwBatchId, setHwBatchId] = useState(batches[0]?.id || '');
  const [hwSubject, setHwSubject] = useState('Physics');
  const [hwDueDate, setHwDueDate] = useState(new Date(Date.now() + 3*86400000).toISOString().split('T')[0]);
  const [hwDescription, setHwDescription] = useState('');

  const currentTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

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
  const teacherTimetable = timetable.filter((slot) => slot.teacherName === currentTeacher.name);
  const teacherHomework = homework.filter((h) => h.teacherName === currentTeacher.name || assignedBatches.some(b => b.id === h.batchId));
  const teacherExams = exams.filter((e) => assignedBatches.some((b) => b.id === e.batchId));
  const teacherAttendance = attendance.filter((a) => assignedBatches.some((b) => b.id === a.batchId));

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
    if (!hwTitle || !hwDescription) return;

    const targetBatch = batches.find((b) => b.id === hwBatchId);
    onAddHomework({
      title: hwTitle,
      batchId: hwBatchId,
      batchName: targetBatch ? targetBatch.name : 'Target Batch',
      subject: hwSubject,
      teacherName: currentTeacher.name,
      assignedDate: new Date().toISOString().split('T')[0],
      dueDate: hwDueDate,
      description: hwDescription,
      totalStudents: targetBatch ? targetBatch.enrolledCount : 25,
      attachments: [{ name: `${hwTitle.replace(/\s+/g, '_')}_Sheet.pdf`, size: '2.1 MB' }],
    });

    setHwTitle('');
    setHwDescription('');
    setIsAddHwOpen(false);
  };

  const badgeCounts: Record<string, number | string> = {
    schedule: teacherTimetable.length,
    attendance: teacherAttendance.length,
    academics: teacherExams.length,
    homework: teacherHomework.length,
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
            <button
              onClick={() => setIsAddHwOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Post Homework</span>
            </button>

            {/* Change Password Button */}
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
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

          {/* 1. TEACHING SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Lecture Timetable</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Class Schedule</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Weekly Teaching & Smart Lab Schedule</h2>
                  <p className="text-xs text-slate-500">Scheduled classroom timings, smart lab allocations, and attendance shortcuts.</p>
                </div>
              </div>

              <div className="space-y-3">
                {teacherTimetable.length === 0 ? (
                  <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-3xl border border-slate-200 shadow-sm">
                    No scheduled slots for this faculty today.
                  </div>
                ) : (
                  teacherTimetable.map((slot) => (
                    <div key={slot.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{slot.batchName}</span>
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md font-bold text-[10px]">
                            {slot.subject}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {slot.day} • {slot.time} • Room: <span className="font-bold text-slate-700">{slot.room}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('attendance')}
                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center gap-1.5 border border-emerald-200 shadow-xs"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Open Attendance Grid</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. ATTENDANCE MANAGEMENT TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <AttendanceManagement
                batches={assignedBatches}
                students={students}
                teachers={teachers}
                attendanceHistory={attendance}
                onMarkAttendance={
                  onMarkAttendance ||
                  (async () => ({ presentCount: 0, absentCount: 0, alertsSent: 0 }))
                }
              />
            </div>
          )}

          {/* 3. ACADEMICS & TEST MARKS TAB */}
          {activeTab === 'academics' && (
            <div className="space-y-6 animate-fade-in">
              <AcademicManagement
                exams={exams}
                marks={marks}
                batches={assignedBatches}
                students={students}
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

              <div className="space-y-3">
                {teacherHomework.length === 0 ? (
                  <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-3xl border border-slate-200 shadow-sm">
                    No homework assigned yet. Click &quot;Post New Homework&quot; to assign a practice set.
                  </div>
                ) : (
                  teacherHomework.map((hw) => {
                    const submissionRate = Math.round((hw.submissionCount / (hw.totalStudents || 25)) * 100);
                    return (
                      <div key={hw.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Batch: <span className="font-bold text-slate-800">{hw.batchName}</span> • Due: {hw.dueDate}
                            </div>
                          </div>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 text-[11px]">
                            {hw.submissionCount} / {hw.totalStudents || 25} Submitted ({submissionRate}%)
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{hw.description}</p>
                      </div>
                    );
                  })
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
                {teacherTimetable.map((slot) => (
                  <div key={slot.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{slot.subject} ({slot.batchName})</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{slot.day} • {slot.time} • Room {slot.room}</div>
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
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                  />
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

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddHwOpen(false)}
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

      {/* Password Change Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userRoleTitle="Faculty Member"
      />
    </div>
  );
};
