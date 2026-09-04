'use client';

import React, { useState } from 'react';
import { X, Award, Check, Send, Sparkles, TrendingUp } from 'lucide-react';
import { ExamTest, Student, StudentExamMark } from '@/lib/types';

interface MarksEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamTest | null;
  students: Student[];
  existingMarks: StudentExamMark[];
  onSaveMarks: (
    examId: string,
    marksList: { studentId: string; marksObtained: number; teacherRemarks?: string }[]
  ) => { evaluatedCount: number; averageScore: number; highestScore: number };
}

export const MarksEntryModal: React.FC<MarksEntryModalProps> = ({
  isOpen,
  onClose,
  exam,
  students,
  existingMarks,
  onSaveMarks,
}) => {
  if (!isOpen || !exam) return null;

  const batchStudents = students.filter((s) => s.batchIds.includes(exam.batchId));

  // State for marks per student
  const [marksState, setMarksState] = useState<Record<string, { marks: number; remarks: string }>>(() => {
    const map: Record<string, { marks: number; remarks: string }> = {};
    batchStudents.forEach((s) => {
      const existing = existingMarks.find((m) => m.studentId === s.id && m.examId === exam.id);
      map[s.id] = {
        marks: existing ? existing.marksObtained : Math.round(exam.totalMarks * 0.75),
        remarks: existing?.teacherRemarks || 'Good conceptual understanding. Focus on accuracy and speed.',
      };
    });
    return map;
  });

  const handleScoreChange = (studentId: string, val: number) => {
    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: Math.max(0, Math.min(exam.totalMarks, val)),
      },
    }));
  };

  const handleRemarkChange = (studentId: string, val: string) => {
    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: val,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const evaluatedList = batchStudents.map((s) => ({
      studentId: s.id,
      marksObtained: marksState[s.id]?.marks ?? 0,
      teacherRemarks: marksState[s.id]?.remarks,
    }));

    onSaveMarks(exam.id, evaluatedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Marks Entry Matrix</span>
              <h3 className="text-lg font-bold text-slate-900">{exam.title}</h3>
              <p className="text-xs text-slate-500">
                Batch: <span className="font-bold text-slate-800">{exam.batchName}</span> • Max Marks: {exam.totalMarks}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b text-[10px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Marks Scored (/{exam.totalMarks})</th>
                    <th className="p-3 text-center">Calculated % & Grade</th>
                    <th className="p-3">Faculty Observation Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 bg-white">
                  {batchStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        No students enrolled in this batch.
                      </td>
                    </tr>
                  ) : (
                    batchStudents.map((student) => {
                      const score = marksState[student.id]?.marks ?? 0;
                      const percentage = Number(((score / exam.totalMarks) * 100).toFixed(1));
                      const remarks = marksState[student.id]?.remarks ?? '';

                      let gradeBadge = 'bg-emerald-100 text-emerald-800';
                      if (percentage < 60) gradeBadge = 'bg-amber-100 text-amber-800';
                      if (percentage < 40) gradeBadge = 'bg-rose-100 text-rose-700';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{student.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{student.rollNo}</div>
                          </td>

                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              max={exam.totalMarks}
                              value={score}
                              onChange={(e) => handleScoreChange(student.id, parseInt(e.target.value) || 0)}
                              className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <div className="font-extrabold text-slate-800">{percentage}%</div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${gradeBadge}`}>
                              {percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'F'}
                            </span>
                          </td>

                          <td className="p-3">
                            <input
                              type="text"
                              value={remarks}
                              onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                              placeholder="Teacher remarks on performance..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Saving will automatically calculate batch ranks & dispatch WhatsApp report cards.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Publish Marks & Generate Report Cards</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
