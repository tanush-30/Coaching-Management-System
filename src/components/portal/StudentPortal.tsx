'use client';

import React, { useState } from 'react';
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
  FolderDown
} from 'lucide-react';
import { Batch, ExamTest, Homework, Student, StudentExamMark, StudyMaterial, TimetableSlot } from '@/lib/types';
import { INITIAL_TIMETABLE } from '@/lib/mock-data';
import { generateReportCardPDF } from '@/lib/pdf-service';

interface StudentPortalProps {
  students: Student[];
  batches: Batch[];
  homework: Homework[];
  materials: StudyMaterial[];
  exams: ExamTest[];
  marks: StudentExamMark[];
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  batches,
  homework,
  materials,
  exams,
  marks,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'homework' | 'materials' | 'results' | 'schedule'>('homework');
  const [completedHwIds, setCompletedHwIds] = useState<string[]>([]);
  const [materialFilter, setMaterialFilter] = useState('all');

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const studentBatch = batches.find((b) => currentStudent.batchIds.includes(b.id));

  const studentHomework = homework.filter((h) => currentStudent.batchIds.includes(h.batchId));
  const studentMaterials = materials.filter(
    (m) => (materialFilter === 'all' || m.subject.toLowerCase().includes(materialFilter)) &&
           currentStudent.batchIds.includes(m.batchId)
  );
  const studentMarks = marks.filter((m) => m.studentId === currentStudent.id);

  const toggleHomeworkCompleted = (id: string) => {
    setCompletedHwIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Student Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={currentStudent.avatar}
                alt={currentStudent.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-md"
              />
              <div>
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Apex Student Dashboard
                </div>
                <h2 className="text-2xl font-extrabold text-white">{currentStudent.name}</h2>
                <p className="text-xs text-slate-300">
                  Roll No: <span className="font-mono text-indigo-300 font-bold">{currentStudent.rollNo}</span> •{' '}
                  <span className="font-bold text-white">{studentBatch?.name || 'Classroom Batch'}</span>
                </p>
              </div>
            </div>

            {/* Persona Switcher */}
            <div className="bg-slate-800/80 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase pl-2">Switch Student:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rollNo})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'homework', label: `Homework & DPPs (${studentHomework.length})`, icon: BookOpen },
            { id: 'materials', label: `Study Materials (${studentMaterials.length})`, icon: FolderDown },
            { id: 'results', label: `My Test Results (${studentMarks.length})`, icon: Award },
            { id: 'schedule', label: 'Class Timetable', icon: Calendar },
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

        {/* Tab Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* 1. HOMEWORK TAB */}
          {activeTab === 'homework' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Assigned Practice Worksheets & DPPs</h3>
                <span className="text-xs text-slate-500">
                  {completedHwIds.length} of {studentHomework.length} Completed
                </span>
              </div>

              <div className="space-y-3">
                {studentHomework.map((hw) => {
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
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px]">
                            {hw.subject}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{hw.description}</p>
                        <div className="text-[10px] text-slate-400">
                          Assigned by {hw.teacherName} • Due: <span className="font-bold text-slate-700">{hw.dueDate}</span>
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
                          className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                            isCompleted
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5" /> : null}
                          <span>{isCompleted ? 'Submitted ✓' : 'Mark as Done'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. STUDY MATERIALS TAB */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-base text-slate-900">Digital Lecture Notes & Formula Handbooks</h3>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  {['all', 'physics', 'biology', 'science'].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setMaterialFilter(sub)}
                      className={`capitalize px-3 py-1 rounded-lg ${
                        materialFilter === sub ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentMaterials.map((mat) => (
                  <div key={mat.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{mat.title}</h4>
                          <span className="text-[10px] text-slate-400">{mat.subject} • {mat.fileSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Uploaded {mat.uploadedAt}</span>
                      <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-xs active:scale-95">
                        <Download className="w-3 h-3" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TEST RESULTS TAB */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">My Exam Performance & Rank Cards</h3>
              <div className="space-y-3">
                {studentMarks.map((m) => {
                  const exam = exams.find((e) => e.id === m.examId) || exams[0];
                  return (
                    <div key={m.id} className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{exam.title}</span>
                          <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
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
                          className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Report</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">Weekly Lecture & Lab Timetable</h3>
              <div className="space-y-2">
                {INITIAL_TIMETABLE.map((slot) => (
                  <div key={slot.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{slot.subject}</div>
                      <div className="text-[11px] text-slate-500">{slot.day} • {slot.time} ({slot.room})</div>
                    </div>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      Faculty: {slot.teacherName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
