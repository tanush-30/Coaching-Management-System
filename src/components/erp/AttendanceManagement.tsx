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
  History
} from 'lucide-react';
import { AttendanceRecord, Batch, BatchAttendance, Student, Teacher } from '@/lib/types';
import { UserAvatar } from '@/components/common/UserAvatar';

interface AttendanceManagementProps {
  batches: Batch[];
  students: Student[];
  teachers: Teacher[];
  attendanceHistory: BatchAttendance[];
  onMarkAttendance: (
    batchId: string,
    date: string,
    records: AttendanceRecord[],
    markedBy: string
  ) => Promise<{ presentCount: number; absentCount: number; alertsSent: number }> | { presentCount: number; absentCount: number; alertsSent: number };
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({
  batches,
  students,
  teachers,
  attendanceHistory,
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

  // Local state for mark attendance form
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: 'present' | 'absent' | 'late'; remarks?: string }>>({});
  const [submissionFeedback, setSubmissionFeedback] = useState<{ present: number; absent: number; alerts: number } | null>(null);

  // Initialize attendance map when batch or date changes
  useEffect(() => {
    if (!selectedBatch) {
      setAttendanceMap({});
      return;
    }

    // Check if attendance is already recorded in history
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
    setSubmissionFeedback(null);
  }, [selectedBatchId, selectedDate, students, batches, attendanceHistory]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setSubmissionFeedback(null);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    const updated: Record<string, { status: 'present' | 'absent' | 'late'; remarks?: string }> = {};
    enrolledStudents.forEach((student) => {
      updated[student.id] = { ...attendanceMap[student.id], status };
    });
    setAttendanceMap(updated);
    setSubmissionFeedback(null);
  };

  const handleMarkAllPresent = () => {
    handleMarkAll('present');
  };

  const toggleStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    handleStatusChange(studentId, status);
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    handleRemarksChange(studentId, remarks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enrolledStudents.length === 0) return;

    const records: AttendanceRecord[] = enrolledStudents.map((s) => ({
      studentId: s.id,
      rollNo: s.rollNo,
      studentName: s.name,
      status: attendanceMap[s.id]?.status || 'present',
      remarks: attendanceMap[s.id]?.remarks || '',
    } as any));

    const result = await onMarkAttendance(
      selectedBatchId,
      selectedDate,
      records,
      selectedBatch?.teacherName || 'Lead Faculty'
    );

    if (result) {
      setSubmissionFeedback({
        present: result.presentCount,
        absent: result.absentCount,
        alerts: result.alertsSent,
      });
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
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
              Meta Cloud API Active
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Daily Attendance & Real-Time WhatsApp Alerts</h2>
          <p className="text-xs text-slate-500">
            1-Tap attendance marking that instantly dispatches verified WhatsApp notifications to absent student parents.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'mark' ? 'bg-white text-indigo-600 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mark Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
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
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3.5 py-2 rounded-xl text-xs border border-emerald-200 flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
            </div>
          </div>

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
                <span className="text-xs font-bold text-rose-800 uppercase">Absent (Auto-Alerts)</span>
                <div className="text-2xl font-extrabold text-rose-600">{absentCount}</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase">Late</span>
                <div className="text-2xl font-extrabold text-amber-600">{lateCount}</div>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Submission Success Banner */}
          {submissionFeedback && (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Attendance Submitted & Saved!</h4>
                  <p className="text-xs text-emerald-100">
                    {submissionFeedback.present} Present, {submissionFeedback.absent} Absent •{' '}
                    <span className="font-extrabold text-white">
                      {submissionFeedback.alerts} Real-Time WhatsApp Alerts Dispatched
                    </span>
                  </p>
                </div>
              </div>
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Live in WhatsApp Hub →</span>
            </div>
          )}

          {/* Student Roster Grid */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                      <th className="p-4">Student & Roll No</th>
                      <th className="p-4">Parent WhatsApp Contact</th>
                      <th className="p-4 text-center">Attendance Status</th>
                      <th className="p-4">Remarks / Absent Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrolledStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No students enrolled in {selectedBatch?.name || 'this batch'}. Enroll students in the Student Directory first.
                        </td>
                      </tr>
                    ) : (
                      enrolledStudents.map((student) => {
                        const currentStatus = attendanceMap[student.id]?.status || 'present';
                        const currentRemark = attendanceMap[student.id]?.remarks || '';

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/60 transition-all">
                            {/* Student */}
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  src={student.avatar}
                                  name={student.name}
                                  type="student"
                                  size="sm"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                                  <div className="text-[10px] text-indigo-600 font-mono font-bold">{student.rollNo}</div>
                                </div>
                              </div>
                            </td>

                            {/* Parent WhatsApp */}
                            <td className="p-4">
                              <div className="font-medium text-slate-800">{student.parentName}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>{student.parentPhone}</span>
                              </div>
                            </td>

                            {/* Status Buttons */}
                            <td className="p-4 text-center">
                              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(student.id, 'present')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  PRESENT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(student.id, 'absent')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentStatus === 'absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-slate-600 hover:text-rose-600'
                                  }`}
                                >
                                  ABSENT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleStatus(student.id, 'late')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                                onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                                placeholder={currentStatus === 'absent' ? 'e.g. Fever / Leave approved' : 'Optional remarks...'}
                                className={`w-full bg-slate-50 border rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 ${
                                  currentStatus === 'absent' ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
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

              {/* Submit Action Bar */}
              {enrolledStudents.length > 0 && (
                <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Submitting will immediately send verified WhatsApp absence alerts to parents.</span>
                  </div>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Attendance & Dispatch WhatsApp Alerts</span>
                  </button>
                </div>
              )}
            </div>
          </form>
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
    </div>
  );
};
