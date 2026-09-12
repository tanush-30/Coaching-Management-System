'use client';

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Award, 
  Sparkles,
  Search,
  Check,
  TrendingUp,
  FolderDown,
  Menu,
  Key,
  ShieldCheck
} from 'lucide-react';
import { Batch, BatchAttendance, ExamTest, Homework, Student, StudentExamMark, StudyMaterial, TimetableSlot } from '@/lib/types';
import { INITIAL_TIMETABLE } from '@/lib/mock-data';
import { generateReportCardPDF } from '@/lib/pdf-service';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ChangePasswordModal } from './ChangePasswordModal';
import { PortalSidebar } from '@/components/common/PortalSidebar';
import { StudentAttendanceView } from './StudentAttendanceView';

interface StudentPortalProps {
  students: Student[];
  batches: Batch[];
  homework: Homework[];
  materials: StudyMaterial[];
  exams: ExamTest[];
  marks: StudentExamMark[];
  attendance?: BatchAttendance[];
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  batches,
  homework,
  materials,
  exams,
  marks,
  attendance = [],
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('attendance');
  const [completedHwIds, setCompletedHwIds] = useState<string[]>([]);
  const [materialFilter, setMaterialFilter] = useState('all');

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

  const studentBatch = batches.find((b) => (currentStudent.batchIds || []).includes(b.id));

  const studentHomework = homework.filter((h) => (currentStudent.batchIds || []).includes(h.batchId));
  const studentMaterials = materials.filter(
    (m) => (materialFilter === 'all' || m.subject.toLowerCase().includes(materialFilter)) &&
           (currentStudent.batchIds || []).includes(m.batchId)
  );
  const studentMarks = marks.filter((m) => m.studentId === currentStudent.id);

  const toggleHomeworkCompleted = (id: string) => {
    setCompletedHwIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Badge count indicators for sidebar
  const badgeCounts: Record<string, number | string> = {
    homework: studentHomework.length,
    materials: studentMaterials.length,
    results: studentMarks.length,
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
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
                {activeTab === 'attendance' && 'Attendance & Session Logs'}
                {activeTab === 'homework' && 'Assigned Homework & DPPs'}
                {activeTab === 'materials' && 'Study Sheets & Notes'}
                {activeTab === 'results' && 'Test Scorecards & Performance'}
                {activeTab === 'schedule' && 'Class Timetable & Schedule'}
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
          {/* 1. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <StudentAttendanceView
              student={currentStudent}
              batch={studentBatch}
              attendanceHistory={attendance}
            />
          )}

          {/* 2. HOMEWORK TAB */}
          {activeTab === 'homework' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Daily Academic Tasks</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">DPP Tracker</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Assigned Homework & Worksheets</h2>
                  <p className="text-xs text-slate-500">Practice questions, daily problem sets, and submission status.</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
                  {completedHwIds.length} of {studentHomework.length} Completed
                </div>
              </div>

              <div className="space-y-3">
                {studentHomework.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm">No Pending Homework</h4>
                    <p className="text-xs text-slate-400">All assigned problem sets for your batch are up to date.</p>
                  </div>
                ) : (
                  studentHomework.map((hw) => {
                    const isCompleted = completedHwIds.includes(hw.id);
                    return (
                      <div
                        key={hw.id}
                        className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                          isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{hw.title}</span>
                            <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                              {hw.subject}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{hw.description}</p>
                          <div className="text-[10px] text-slate-400">
                            Assigned by {hw.teacherName} • Due:{' '}
                            <span className="font-bold text-slate-700">{hw.dueDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hw.attachments?.[0] && (
                            <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF Sheet</span>
                            </button>
                          )}
                          <button
                            onClick={() => toggleHomeworkCompleted(hw.id)}
                            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                              isCompleted
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3.5 h-3.5" /> : null}
                            <span>{isCompleted ? 'Submitted ✓' : 'Mark as Done'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 3. STUDY MATERIALS TAB */}
          {activeTab === 'materials' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Resource Library</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">Verified Notes</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Study Notes & Formula Sheets</h2>
                  <p className="text-xs text-slate-500">Official curated study notes and reference handbooks.</p>
                </div>

                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
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
                  <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-slate-700 text-sm">No Study Materials Found</h4>
                    <p className="text-xs text-slate-400">Notes uploaded by faculty will be available here.</p>
                  </div>
                ) : (
                  studentMaterials.map((mat) => (
                    <div key={mat.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 font-bold shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{mat.title}</h4>
                            <span className="text-[10px] text-slate-400">{mat.subject} • {mat.fileSize}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Uploaded {mat.uploadedAt}</span>
                        <button className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 text-xs">
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
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
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Lecture Timetable</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">Class Schedule</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">Weekly Class & Smart Lab Schedule</h2>
                  <p className="text-xs text-slate-500">Scheduled classroom timings, smart lab locations, and faculty assignments.</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {INITIAL_TIMETABLE.map((slot) => (
                  <div key={slot.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{slot.subject}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{slot.day} • {slot.time} ({slot.room})</div>
                    </div>
                    <span className="font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-xl border border-violet-100">
                      Faculty: {slot.teacherName}
                    </span>
                  </div>
                ))}
              </div>
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
    </div>
  );
};
