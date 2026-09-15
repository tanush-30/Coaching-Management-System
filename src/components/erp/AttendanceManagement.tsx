'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Check, 
  X, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  GraduationCap, 
  MessageSquare, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  History,
  Lock,
  FileEdit,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { AttendanceRecord, Batch, BatchAttendance, Student, Teacher } from '@/lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';

interface AttendanceManagementProps {
  batches: Batch[];
  students: Student[];
  teachers: Teacher[];
  attendanceHistory: BatchAttendance[];
  userRole?: 'admin' | 'teacher';
  onMarkAttendance: (
    batchId: string,
    date: string,
    records: AttendanceRecord[],
    markedBy: string,
    status?: 'draft' | 'final',
    reason?: string
  ) => Promise<{ presentCount: number; absentCount: number; alertsSent: number }> | { presentCount: number; absentCount: number; alertsSent: number };
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  batches,
  students,
  teachers,
  attendanceHistory,
  userRole = 'admin',
  onMarkAttendance,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');

  useEffect(() => {
    if ((!selectedBatchId || !batches.some(b => b.id === selectedBatchId)) && batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || batches[0] || null;
  const enrolledStudents = selectedBatch
    ? students.filter(
        (s) =>
          (s.batchIds || []).includes(selectedBatch.id) ||
          (s as any).batchId === selectedBatch.id
      )
    : [];

  // Find if attendance for selected batch + date already exists
  const existingAttendance = attendanceHistory.find(
    (a) => a.batchId === selectedBatch?.id && a.date === selectedDate
  );

  const isFinal = existingAttendance?.status === 'final';
  const isDraft = existingAttendance?.status === 'draft';

  // Local state for mark attendance form
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent' | 'late'; remarks?: string }>>({});
  const [submissionFeedback, setSubmissionFeedback] = useState<{ present: number; absent: number; alerts: number; status: 'draft' | 'final' } | null>(null);

  // Workflow / Confirmation state
  const [adminUnlockedForEdit, setAdminUnlockedForEdit] = useState<boolean>(false);
  const [adminReason, setAdminReason] = useState<string>('');
  const [showFacultyFinalConfirm, setShowFacultyFinalConfirm] = useState<boolean>(false);
  const [showAdminEditConfirm, setShowAdminEditConfirm] = useState<boolean>(false);
  const [showAdminSaveConfirm, setShowAdminSaveConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize attendance map when batch or date changes
  useEffect(() => {
    setAdminUnlockedForEdit(false);
    setAdminReason('');
    setShowFacultyFinalConfirm(false);
    setShowAdminEditConfirm(false);
    setShowAdminSaveConfirm(false);
    setErrorMessage(null);
    setSubmissionFeedback(null);

    if (!selectedBatch) {
      setAttendanceMap({});
      return;
    }

    const existing = attendanceHistory.find((a) => a.batchId === selectedBatch.id && a.date === selectedDate);
    const initialMap: Record<string, { status: 'present' | 'absent' | 'late'; remarks?: string }> = {};

    enrolledStudents.forEach((student) => {
      if (existing) {
        const rec = existing.records.find(
          (r) =>
            r.studentId === student.id ||
            r.studentId === student.rollNo ||
            (r as any).rollNo === student.rollNo ||
            ((r as any).studentName && (r as any).studentName.toLowerCase() === student.name.toLowerCase())
        );
        initialMap[student.id] = {
          status: rec ? rec.status : 'present',
          remarks: rec?.remarks || '',
        };
      } else {
        initialMap[student.id] = { status: 'present' };
      }
    });

    setAttendanceMap(initialMap);
  }, [selectedBatchId, selectedDate, students, batches, attendanceHistory]);

  const isReadOnly = (userRole === 'teacher' && isFinal) || (userRole === 'admin' && isFinal && !adminUnlockedForEdit);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (isReadOnly) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setSubmissionFeedback(null);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (isReadOnly) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    if (isReadOnly) return;
    const updated: Record<string, { status: 'present' | 'absent' | 'late'; remarks?: string }> = {};
    enrolledStudents.forEach((student) => {
      updated[student.id] = { ...attendanceMap[student.id], status };
    });
    setAttendanceMap(updated);
    setSubmissionFeedback(null);
  };

  const getAttendanceRecords = (): AttendanceRecord[] => {
    return enrolledStudents.map((s) => ({
      studentId: s.id,
      rollNo: s.rollNo,
      studentName: s.name,
      status: attendanceMap[s.id]?.status || 'present',
      remarks: attendanceMap[s.id]?.remarks || '',
    } as any));
  };

  const executeSave = async (status: 'draft' | 'final') => {
    if (enrolledStudents.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setShowFacultyFinalConfirm(false);
    setShowAdminSaveConfirm(false);

    try {
      const records = getAttendanceRecords();
      const result = await onMarkAttendance(
        selectedBatchId,
        selectedDate,
        records,
        selectedBatch?.teacherName || 'Lead Faculty',
        status,
        adminReason.trim() || undefined
      );

      if (result) {
        setSubmissionFeedback({
          present: result.presentCount,
          absent: result.absentCount,
          alerts: result.alertsSent,
          status,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter((v) => v.status === 'present').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v.status === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter((v) => v.status === 'late').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Attendance Register & Dispatch</span>
            {isFinal ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 border border-emerald-200">
                <Lock className="w-3 h-3" /> Final Session Locked
              </span>
            ) : isDraft ? (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 border border-amber-200">
                <FileEdit className="w-3 h-3" /> Draft Mode (Editable)
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                Unmarked Session
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Daily Attendance & Submission Lock</h2>
          <p className="text-xs text-slate-500">
            Mark student attendance as Draft, review carefully, and lock upon Final Submission with verified WhatsApp alerts.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'mark' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mark Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance Logs ({attendanceHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'mark' ? (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Select Batch</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.enrolledCount} Students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleMarkAll('present')}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3.5 py-2 rounded-xl text-xs border border-emerald-200 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Mark All Present</span>
                </button>
              )}
            </div>
          </div>

          {/* Lock Notice Banner for Faculty */}
          {userRole === 'teacher' && isFinal && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3 animate-fade-in">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">🔒 Attendance Finalized & Submission Locked</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Attendance for this date has been officially submitted as final. Editing is locked for faculty. For any attendance corrections, please submit a written physical letter/request to the coaching administration.
                </p>
              </div>
            </div>
          )}

          {/* Admin Unlock Banner for Final Attendance */}
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
                      : 'Final Attendance (Locked for Faculty)'}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {adminUnlockedForEdit
                      ? 'All modifications will be recorded in the security audit trail with student-level changes.'
                      : 'Faculty cannot edit this attendance session. Admin can edit only upon official written request from the faculty.'}
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

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-bold animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Counter Banner */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase">Present</span>
                <div className="text-2xl font-extrabold text-emerald-700">{presentCount}</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-800 uppercase">Absent</span>
                <div className="text-2xl font-extrabold text-rose-700">{absentCount}</div>
              </div>
              <AlertCircle className="w-8 h-8 text-rose-600" />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase">Late Entry</span>
                <div className="text-2xl font-extrabold text-amber-700">{lateCount}</div>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Feedback Banner */}
          {submissionFeedback && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between animate-fade-in text-xs ${
              submissionFeedback.status === 'final'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-5 h-5 ${submissionFeedback.status === 'final' ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                  <span className="font-bold block">
                    {submissionFeedback.status === 'final'
                      ? 'Attendance Officially Submitted & Locked as Final!'
                      : 'Attendance Saved as Draft (You can still edit)'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {submissionFeedback.present} Present, {submissionFeedback.absent} Absent
                    {submissionFeedback.status === 'final' && ` • ${submissionFeedback.alerts} WhatsApp Alerts Dispatched`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                    <th className="p-4">Roll No</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Attendance Status</th>
                    <th className="p-4">Remarks / Faculty Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrolledStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400">
                        No students enrolled in this batch.
                      </td>
                    </tr>
                  ) : (
                    enrolledStudents.map((student) => {
                      const currentStatus = attendanceMap[student.id]?.status || 'present';
                      const currentRemark = attendanceMap[student.id]?.remarks || '';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/60 transition-all">
                          {/* Roll No */}
                          <td className="p-4 font-mono font-bold text-slate-500 text-[11px]">
                            {student.rollNo}
                          </td>

                          {/* Student Name */}
                          <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                            <UserAvatar
                              src={student.avatar}
                              name={student.name}
                              type="student"
                              size="sm"
                            />
                            <div>
                              <div className="text-slate-900 font-bold">{student.name}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Parent: {student.parentName} ({student.parentPhone})
                              </div>
                            </div>
                          </td>

                          {/* Status Toggle */}
                          <td className="p-4">
                            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                              <button
                                type="button"
                                disabled={isReadOnly || isSubmitting}
                                onClick={() => handleStatusChange(student.id, 'present')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                                } ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                PRESENT
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly || isSubmitting}
                                onClick={() => handleStatusChange(student.id, 'absent')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                                } ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-rose-600'
                                }`}
                              >
                                ABSENT
                              </button>
                              <button
                                type="button"
                                disabled={isReadOnly || isSubmitting}
                                onClick={() => handleStatusChange(student.id, 'late')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isReadOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                                } ${
                                  currentStatus === 'late'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-amber-600'
                                }`}
                              >
                                LATE
                              </button>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="p-4">
                            <input
                              type="text"
                              value={currentRemark}
                              disabled={isReadOnly || isSubmitting}
                              onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                              placeholder={currentStatus === 'absent' ? 'e.g. Fever / Leave approved' : 'Optional remarks...'}
                              className={`w-full border rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 ${
                                isReadOnly
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                  : currentStatus === 'absent'
                                  ? 'border-rose-300 bg-rose-50/30 text-slate-900'
                                  : 'border-slate-200 bg-slate-50 text-slate-900'
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

            {/* Action Bar */}
            {enrolledStudents.length > 0 && (
              <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isFinal
                      ? 'Attendance is locked. Verified WhatsApp absence alerts have been dispatched.'
                      : 'Save Draft to revise freely, or Submit Final to lock attendance.'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Draft Mode Actions */}
                  {!isFinal && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => executeSave('draft')}
                        className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Saving...' : 'Save Draft'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setShowFacultyFinalConfirm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Final</span>
                      </button>
                    </>
                  )}

                  {/* Admin Edit Final Attendance Action */}
                  {userRole === 'admin' && isFinal && adminUnlockedForEdit && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowAdminSaveConfirm(true)}
                      className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/30 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Attendance History View */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900">Historical Batch Attendance Records</h3>
          <div className="space-y-3">
            {attendanceHistory.map((att) => (
              <div key={att.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{att.batchName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                      {att.date}
                    </span>
                    {att.status === 'final' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 inline-flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Final ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] border border-amber-300 inline-flex items-center gap-1">
                        <FileEdit className="w-2.5 h-2.5" /> Draft
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Marked by {att.markedBy} at {att.markedAt}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {att.presentCount} Present
                  </span>
                  <span className="text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    {att.absentCount} Absent
                  </span>
                  <span className="text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp Dispatched ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. FACULTY CONFIRMATION MODAL: Submit Final */}
      {showFacultyFinalConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Submit Attendance as Final?</h3>
                <p className="text-xs text-slate-500">Official submission confirmation</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-amber-50/80 border border-amber-200 p-4 rounded-2xl leading-relaxed">
              Are you sure you want to submit today&apos;s attendance as final? <strong>Once submitted, you will not be able to edit it</strong> — any correction will require an official written request to the coaching administration.
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
                onClick={() => executeSave('final')}
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

      {/* 2. ADMIN CONFIRMATION MODAL: Unlock Final Attendance for Edit */}
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
              Are you sure you want to edit attendance for <strong>{selectedBatch?.name}</strong> — <strong>{selectedDate}</strong>? This action should only be done based on an official request from the faculty.
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

      {/* 3. ADMIN CONFIRMATION MODAL: Save Changes to Final Attendance */}
      {showAdminSaveConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Save Corrected Attendance?</h3>
                <p className="text-xs text-slate-500">Security Audit Log Will Be Generated</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-2xl leading-relaxed">
              Are you sure you want to save these changes to attendance? All modified student presence statuses will be updated immediately and recorded in the administrative audit log.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Official Faculty Request / Letter Reference (Optional)
              </label>
              <input
                type="text"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="e.g. Letter Ref #FAC-2026-088 / Faculty medical leave correction"
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
                onClick={() => executeSave('final')}
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
