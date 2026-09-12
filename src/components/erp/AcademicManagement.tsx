'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Award, 
  Download, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Users, 
  ChevronRight,
  MessageSquare,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { Batch, ExamTest, Student, StudentExamMark } from '@/lib/types';
import { CreateExamModal } from './CreateExamModal';
import { MarksEntryModal } from './MarksEntryModal';
import { generateReportCardPDF } from '@/lib/pdf-service';

interface AcademicManagementProps {
  exams: ExamTest[];
  marks: StudentExamMark[];
  batches: Batch[];
  students: Student[];
  onCreateExam: (examData: any) => void;
  onSaveMarks: (examId: string, marksList: any[]) => any;
}

export const AcademicManagement: React.FC<AcademicManagementProps> = ({
  exams,
  marks,
  batches,
  students,
  onCreateExam,
  onSaveMarks,
}) => {
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [selectedExamForGrading, setSelectedExamForGrading] = useState<ExamTest | null>(null);

  const filteredExams = exams.filter(
    (e) => selectedBatchFilter === 'all' || e.batchId === selectedBatchFilter
  );

  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const currentExamMarks = marks.filter((m) => m.examId === selectedExamId).sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Academics & Examination Engine</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              Automated PDF Report Cards
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Tests, Marks Entry & Student Report Cards</h2>
          <p className="text-xs text-slate-500">
            Schedule exams, grade student submissions with rank calculation, and dispatch branded PDF report cards to parents.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Test</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Tests Scheduled</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{exams.length} Exams</div>
          <span className="text-[10px] text-indigo-600 font-medium">{exams.filter((e) => e.status === 'evaluated').length} Evaluated</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Average Academy Score</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">84.2%</div>
          <span className="text-[10px] text-emerald-600 font-medium">Consistent Top Percentile</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">PDF Report Cards</span>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{marks.length} Generated</div>
          <span className="text-[10px] text-indigo-500 font-medium">100% Verified Digital PDF</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">WhatsApp Dispatches</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">{marks.length} Delivered</div>
          <span className="text-[10px] text-emerald-600 font-medium">Instant Parent Delivery</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Test Selector List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled & Evaluated Tests</h3>
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700"
            >
              <option value="all">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredExams.map((exam) => {
              const isSelected = selectedExam?.id === exam.id;
              const isEvaluated = exam.status === 'evaluated';

              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {exam.batchName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEvaluated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isEvaluated ? 'Evaluated ✓' : 'Scheduled'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{exam.title}</h4>
                  <div className="text-[11px] text-slate-500">
                    Subject: {exam.subject} • Max Marks: {exam.totalMarks}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>Date: {exam.examDate}</span>
                    {isEvaluated ? (
                      <span className="text-indigo-600 font-bold">Top: {exam.highestScore}/{exam.totalMarks}</span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExamForGrading(exam);
                          setIsMarksModalOpen(true);
                        }}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Enter Marks →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Test Details & Student Rank Leaderboard */}
        <div className="lg:col-span-2 space-y-4">
          {selectedExam ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              {/* Test Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {selectedExam.batchName} • {selectedExam.subject}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedExam.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conducted on {selectedExam.examDate} • Maximum Marks: {selectedExam.totalMarks} (Passing: {selectedExam.passingMarks})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedExamForGrading(selectedExam);
                      setIsMarksModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                  >
                    <Award className="w-4 h-4" />
                    <span>{selectedExam.status === 'evaluated' ? 'Edit Marks' : 'Enter Marks'}</span>
                  </button>
                </div>
              </div>

              {/* Performance Summary Pill Grid */}
              {selectedExam.status === 'evaluated' && (
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Batch Average</span>
                    <span className="text-lg font-extrabold text-indigo-700 mt-0.5 block">
                      {selectedExam.averageScore} / {selectedExam.totalMarks}
                    </span>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Highest Score</span>
                    <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block">
                      {selectedExam.highestScore} / {selectedExam.totalMarks}
                    </span>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Evaluated Students</span>
                    <span className="text-lg font-extrabold text-amber-700 mt-0.5 block">
                      {currentExamMarks.length} Students
                    </span>
                  </div>
                </div>
              )}

              {/* Students Leaderboard & Report Cards Table */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                  <span>Student Rank List & Official Report Cards</span>
                  <span className="text-xs text-slate-400 font-normal">Ranked by score</span>
                </h4>

                {currentExamMarks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed">
                    Marks have not been published for this test yet. Click "Enter Marks" to evaluate students and generate report cards.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                          <th className="p-3 text-center">Rank</th>
                          <th className="p-3">Student</th>
                          <th className="p-3">Marks Scored</th>
                          <th className="p-3">Percentage & Grade</th>
                          <th className="p-3 text-right">PDF Report Card</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentExamMarks.map((m) => {
                          const student = students.find((s) => s.id === m.studentId);
                          if (!student) return null;

                          return (
                            <tr key={m.id} className="hover:bg-slate-50/60 transition-all">
                              <td className="p-3 text-center">
                                {m.rank === 1 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs shadow-xs">
                                    🥇
                                  </span>
                                ) : m.rank === 2 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-extrabold text-xs shadow-xs">
                                    🥈
                                  </span>
                                ) : m.rank === 3 ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-extrabold text-xs shadow-xs">
                                    🥉
                                  </span>
                                ) : (
                                  <span className="font-bold text-slate-500">#{m.rank}</span>
                                )}
                              </td>

                              <td className="p-3">
                                <div className="font-bold text-slate-900">{m.studentName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{m.rollNo}</div>
                              </td>

                              <td className="p-3">
                                <span className="font-bold text-slate-900 text-sm">
                                  {m.marksObtained} / {m.totalMarks}
                                </span>
                              </td>

                              <td className="p-3">
                                <div className="font-bold text-slate-800">{m.percentage}%</div>
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-bold text-[10px]">
                                  Grade: {m.grade}
                                </span>
                              </td>

                              <td className="p-3 text-right">
                                <button
                                  onClick={() =>
                                    generateReportCardPDF(
                                      student,
                                      selectedExam,
                                      m,
                                      `Rank #${m.rank} in Batch`
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs border border-indigo-200 shadow-xs transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download PDF</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              Select or schedule a test to view details.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        batches={batches}
        onCreateExam={onCreateExam}
      />

      <MarksEntryModal
        isOpen={isMarksModalOpen}
        onClose={() => setIsMarksModalOpen(false)}
        exam={selectedExamForGrading}
        students={students}
        existingMarks={marks}
        onSaveMarks={onSaveMarks}
      />
    </div>
  );
};
