'use client';

import React, { useState } from 'react';
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
  Building
} from 'lucide-react';
import { Batch, Homework, Student, Teacher, TimetableSlot } from '@/lib/types';
import { INITIAL_TIMETABLE } from '@/lib/mock-data';

interface TeacherPortalProps {
  teachers: Teacher[];
  batches: Batch[];
  students: Student[];
  homework: Homework[];
  onAddHomework: (newHw: Omit<Homework, 'id' | 'submissionCount'>) => void;
  onNavigateAttendance: () => void;
  onNavigateAcademics: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  teachers,
  batches,
  students,
  homework,
  onAddHomework,
  onNavigateAttendance,
  onNavigateAcademics,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'schedule' | 'homework' | 'substitute' | 'roster'>('schedule');
  
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
  const assignedBatches = batches.filter((b) => currentTeacher.assignedBatches.includes(b.id) || b.teacherId === currentTeacher.id);
  const teacherTimetable = timetable.filter((slot) => slot.teacherName === currentTeacher.name);
  const teacherHomework = homework.filter((h) => h.teacherName === currentTeacher.name || assignedBatches.some(b => b.id === h.batchId));

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Faculty Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={currentTeacher.avatar}
                alt={currentTeacher.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Apex Faculty Portal
                </div>
                <h2 className="text-2xl font-extrabold text-white">{currentTeacher.name}</h2>
                <p className="text-xs text-slate-300">
                  {currentTeacher.qualifications} • <span className="text-indigo-300">{currentTeacher.subjects[0]}</span>
                </p>
              </div>
            </div>

            {/* Faculty Switcher */}
            <div className="bg-slate-800/80 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase pl-2">Switch Faculty:</span>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.subjects[0].split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <button
              onClick={onNavigateAttendance}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Clock className="w-4 h-4" />
              <span>Mark Batch Attendance</span>
            </button>
            <button
              onClick={onNavigateAcademics}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Enter Test Marks & Ranks</span>
            </button>
            <button
              onClick={() => setIsAddHwOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Post Homework / DPP</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'schedule', label: `My Teaching Schedule (${teacherTimetable.length})`, icon: Calendar },
            { id: 'homework', label: `Homework Assigned (${teacherHomework.length})`, icon: BookOpen },
            { id: 'substitute', label: 'Substitute Teacher Manager', icon: RefreshCw },
            { id: 'roster', label: `My Assigned Batches (${assignedBatches.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                  isSelected ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* 1. TEACHING SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">Weekly Lecture Timetable & Labs</h3>
              <div className="space-y-3">
                {teacherTimetable.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border">
                    No scheduled slots for this faculty today.
                  </div>
                ) : (
                  teacherTimetable.map((slot) => (
                    <div key={slot.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{slot.batchName}</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px]">
                            {slot.subject}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {slot.day} • {slot.time} • Classroom: <span className="font-bold text-slate-700">{slot.room}</span>
                        </div>
                      </div>

                      <button
                        onClick={onNavigateAttendance}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center gap-1 border border-indigo-200 shadow-xs"
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

          {/* 2. HOMEWORK ASSIGNMENT TAB */}
          {activeTab === 'homework' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Posted Homework & Submission Rates</h3>
                <button
                  onClick={() => setIsAddHwOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Homework</span>
                </button>
              </div>

              <div className="space-y-3">
                {teacherHomework.map((hw) => {
                  const submissionRate = Math.round((hw.submissionCount / hw.totalStudents) * 100);
                  return (
                    <div key={hw.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                          <div className="text-[11px] text-slate-500">
                            Batch: <span className="font-bold text-slate-800">{hw.batchName}</span> • Due: {hw.dueDate}
                          </div>
                        </div>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                          {hw.submissionCount} / {hw.totalStudents} Submitted ({submissionRate}%)
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">{hw.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. SUBSTITUTE TEACHER MANAGER TAB */}
          {activeTab === 'substitute' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Class Swap & Substitute Teacher Management</h3>
                  <p className="text-xs text-slate-500">Reassign upcoming class slots in case of faculty leave or timetable adjustments.</p>
                </div>
              </div>

              {substituteSuccessMsg && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-3 rounded-2xl text-xs font-bold animate-fade-in">
                  ✅ {substituteSuccessMsg}
                </div>
              )}

              <div className="space-y-3">
                {timetable.map((slot) => (
                  <div key={slot.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{slot.batchName} ({slot.subject})</div>
                      <div className="text-[11px] text-slate-500">
                        {slot.day} • {slot.time} ({slot.room}) • Current Faculty: <span className="font-bold text-slate-800">{slot.teacherName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Swap To:</span>
                      <select
                        onChange={(e) => handleAssignSubstitute(slot.id, e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        defaultValue=""
                      >
                        <option value="" disabled>Select Substitute</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.subjects[0].split(' ')[0]})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ROSTER TAB */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">Assigned Batches & Student Strength</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedBatches.map((batch) => (
                  <div key={batch.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{batch.name}</h4>
                        <div className="text-[11px] text-slate-500">{batch.courseName}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px]">
                        {batch.grade}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border flex justify-between text-[11px]">
                      <span>Enrolled Students:</span>
                      <span className="font-bold text-slate-900">{batch.enrolledCount} / {batch.capacity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post Homework Modal */}
      {isAddHwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Post Homework Assignment</h3>
                  <p className="text-xs text-slate-500">Notify students and attach problem sheets</p>
                </div>
              </div>
              <button onClick={() => setIsAddHwOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHw} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="e.g. DPP #15: Center of Mass & Collision"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Batch</label>
                  <select
                    value={hwBatchId}
                    onChange={(e) => setHwBatchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={hwDueDate}
                    onChange={(e) => setHwDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructions & Problem Set Details</label>
                <textarea
                  required
                  rows={3}
                  value={hwDescription}
                  onChange={(e) => setHwDescription(e.target.value)}
                  placeholder="Solve questions 1 to 20 from Chapter 6. Bring hardcopy to next lecture."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddHwOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post to Student Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
