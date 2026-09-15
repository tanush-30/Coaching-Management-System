'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  Check, 
  Send, 
  Sparkles, 
  TrendingUp, 
  Lock, 
  AlertTriangle, 
  FileEdit, 
  ShieldAlert, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { ExamTest, Student, StudentExamMark } from '@/lib/types';

interface MarksEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamTest | null;
  students: Student[];
  existingMarks: StudentExamMark[];
  userRole?: 'admin' | 'teacher';
  onSaveMarks: (
    examId: string,
    marksList: { studentId: string; marksObtained: number; teacherRemarks?: string }[],
    status?: 'draft' | 'final',
    reason?: string
  ) => Promise<any> | any;
}

export const MarksEntryModal: React.FC<MarksEntryModalProps> = ({
  isOpen,
  onClose,
  exam,
  students,
  existingMarks,
  userRole = 'admin',
  onSaveMarks,
}) => {
  if (!isOpen || !exam) return null;

  const batchStudents = students.filter((s) => s.batchIds.includes(exam.batchId));
  const examExistingMarks = existingMarks.filter((m) => m.examId === exam.id);

  // Check if marks are already submitted as final
  const isFinal =
    exam.marksStatus === 'final' ||
    exam.status === 'evaluated' ||
    examExistingMarks.some((m) => m.status === 'final');

  // State for marks per student
  const [marksState, setMarksState] = useState<Record<string, { marks: number; remarks: string }>>(() => {
    const map: Record<string, { marks: number; remarks: string }> = {};
    batchStudents.forEach((s) => {
      const existing = examExistingMarks.find((m) => m.studentId === s.id);
      map[s.id] = {
        marks: existing ? existing.marksObtained : Math.round(exam.totalMarks * 0.75),
        remarks: existing?.teacherRemarks || 'Good conceptual understanding. Focus on accuracy and speed.',
      };
    });
    return map;
  });

  // Flow State
  const [adminUnlockedForEdit, setAdminUnlockedForEdit] = useState<boolean>(false);
  const [adminReason, setAdminReason] = useState<string>('');
  const [showFacultyFinalConfirm, setShowFacultyFinalConfirm] = useState<boolean>(false);
  const [showAdminEditConfirm, setShowAdminEditConfirm] = useState<boolean>(false);
  const [showAdminSaveConfirm, setShowAdminSaveConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset modal state when opened/closed or when exam changes
  useEffect(() => {
    setAdminUnlockedForEdit(false);
    setAdminReason('');
    setShowFacultyFinalConfirm(false);
    setShowAdminEditConfirm(false);
    setShowAdminSaveConfirm(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [isOpen, exam?.id]);

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

  // Determine if editing is currently permitted
  const isReadOnly = (userRole === 'teacher' && isFinal) || (userRole === 'admin' && isFinal && !adminUnlockedForEdit);

  const getEvaluatedList = () => {
    return batchStudents.map((s) => ({
      studentId: s.id,
      marksObtained: marksState[s.id]?.marks ?? 0,
      teacherRemarks: marksState[s.id]?.remarks,
    }));
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const evaluatedList = getEvaluatedList();
      await onSaveMarks(exam.id, evaluatedList, 'draft');
      setSuccessMessage('Draft marks saved successfully. You can continue editing later.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save draft marks.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeFinalSubmission = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setShowFacultyFinalConfirm(false);
    setShowAdminSaveConfirm(false);
    try {
      const evaluatedList = getEvaluatedList();
      await onSaveMarks(exam.id, evaluatedList, 'final', adminReason.trim() || undefined);
      setSuccessMessage('Marks officially submitted as Final! Scorecards and ranks are now locked.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit final marks.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isFinal ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-600'
            }`}>
              {isFinal ? <Lock className="w-5 h-5" /> : <Award className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Marks Entry Matrix</span>
                {isFinal ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Final (Locked)</span>
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 inline-flex items-center gap-1">
                    <FileEdit className="w-3 h-3" />
                    <span>Draft Mode (Editable)</span>
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{exam.title}</h3>
              <p className="text-xs text-slate-500">
                Batch: <span className="font-bold text-slate-800">{exam.batchName}</span> • Max Marks: {exam.totalMarks}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Notice Banner for Faculty */}
        {userRole === 'teacher' && isFinal && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3 animate-fade-in">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">🔒 Marks Finalized & Submission Locked</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                These marks were officially submitted as final. Editing is locked for faculty. For any score corrections or mark revisions, please submit a written physical letter/request to the coaching administration office.
              </p>
            </div>
          </div>
        )}

        {/* Admin Unlock Banner for Final Marks */}
        {userRole === 'admin' && isFinal && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 animate-fade-in ${
            adminUnlockedForEdit ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-start gap-3">
              <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${adminUnlockedForEdit ? 'text-purple-600' : 'text-slate-500'}`} />
              <div className="space-y-1">
                <p className="font-bold">
                  {adminUnlockedForEdit
                    ? 'Admin Official Correction Mode Active'
                    : 'Final Marks (Locked for Faculty)'}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {adminUnlockedForEdit
                    ? 'All revisions made by Admin will be recorded in the security audit trail with before & after diffs.'
                    : 'Faculty cannot edit these marks. Admin can edit only upon official written request from the faculty.'}
                </p>
              </div>
            </div>

            {!adminUnlockedForEdit && (
              <button
                type="button"
                onClick={() => setShowAdminEditConfirm(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Edit (Official Request)</span>
              </button>
            )}
          </div>
        )}

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-bold animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Marks Table */}
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
                            disabled={isReadOnly || isSubmitting}
                            onChange={(e) => handleScoreChange(student.id, parseInt(e.target.value) || 0)}
                            className={`w-24 border rounded-xl px-3 py-1.5 font-bold text-sm focus:ring-2 focus:ring-indigo-500 ${
                              isReadOnly
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
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
                            disabled={isReadOnly || isSubmitting}
                            onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                            placeholder="Teacher remarks on performance..."
                            className={`w-full border rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 ${
                              isReadOnly
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
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

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isFinal
                ? 'Finalized marks are visible on the student dashboard and report cards.'
                : 'Save Draft to revise marks freely, or Submit Final to lock submission.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer text-xs"
            >
              Close
            </button>

            {/* If Faculty or Admin in Draft Mode */}
            {!isFinal && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowFacultyFinalConfirm(true)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Final</span>
                </button>
              </>
            )}

            {/* If Admin editing Final Marks */}
            {userRole === 'admin' && isFinal && adminUnlockedForEdit && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowAdminSaveConfirm(true)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30 flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 1. FACULTY CONFIRMATION DIALOG: Submit Final */}
      {showFacultyFinalConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Submit Marks as Final?</h3>
                <p className="text-xs text-slate-500">Official submission confirmation</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-amber-50/80 border border-amber-200 p-4 rounded-2xl leading-relaxed">
              Are you sure you want to submit these marks as final? <strong>Once submitted, you will not be able to edit them</strong> — any correction will require an official written request to the coaching administration.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowFacultyFinalConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel / Keep Editing
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeFinalSubmission}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Yes, Submit Final</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN CONFIRMATION DIALOG 1: Unlock Final Marks for Edit */}
      {showAdminEditConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Official Request Confirmation</h3>
                <p className="text-xs text-slate-500">Administrative Override</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-purple-50/70 border border-purple-200 p-4 rounded-2xl leading-relaxed">
              Are you sure you want to edit marks for <strong>{exam.title}</strong> — <strong>{exam.batchName}</strong>? This action should only be done based on an official request from the faculty.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdminEditConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdminEditConfirm(false);
                  setAdminUnlockedForEdit(true);
                }}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-purple-600/30 cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Confirm & Enable Editing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN CONFIRMATION DIALOG 2: Save Changes to Final Marks */}
      {showAdminSaveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Save Corrected Marks?</h3>
                <p className="text-xs text-slate-500">Security Audit Log Will Be Generated</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-2xl leading-relaxed">
              Are you sure you want to save these changes to the marks? All modified student scores will be updated immediately and recorded in the administrative audit log.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Official Faculty Request / Letter Reference (Optional)
              </label>
              <input
                type="text"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="e.g. Letter Ref #FAC-2026-042 / Math faculty correction request"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white transition"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowAdminSaveConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeFinalSubmission}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-purple-600/30 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Yes, Save Changes</span>
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
