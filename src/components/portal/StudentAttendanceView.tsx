'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  Award,
  Calendar,
  Sparkles,
  BarChart2,
  FileText,
  Loader2,
} from 'lucide-react';
import { Batch, BatchAttendance, Student } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import { generateStudentAttendancePDF, AttendancePDFRecord } from '@/lib/pdf-service';
import { format, parseISO } from 'date-fns';

interface StudentAttendanceViewProps {
  student: Student;
  batch?: Batch;
  attendanceHistory: BatchAttendance[];
  isLoading?: boolean;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  student,
  batch,
  attendanceHistory,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // 1. Filter and extract attendance records specific to this student
  const studentRecords = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0 || !student) return [];

    const list: (AttendancePDFRecord & { id: string; rawDate: string })[] = [];

    const sId = (student.id || '').trim().toLowerCase();
    const sRoll = (student.rollNo || '').trim().toLowerCase();
    const sAuthUid = ((student as any).authUid || '').trim().toLowerCase();
    const sEmail = (student.email || '').trim().toLowerCase();
    const sName = (student.name || '').trim().toLowerCase();

    attendanceHistory.forEach((batchEntry) => {
      // Find matching record inside the batch attendance entry
      const record = (batchEntry.records || []).find((r) => {
        if (!r) return false;
        const recStudentId = (r.studentId || '').trim().toLowerCase();
        const recRollNo = ((r as any).rollNo || '').trim().toLowerCase();
        const recName = ((r as any).studentName || (r as any).name || '').trim().toLowerCase();

        return (
          (recStudentId && (recStudentId === sId || recStudentId === sRoll || recStudentId === sAuthUid)) ||
          (recRollNo && (recRollNo === sRoll || recRollNo === sId)) ||
          (recName && sName && recName === sName)
        );
      });

      if (record) {
        list.push({
          id: `${batchEntry.id}-${student.id || student.rollNo}`,
          date: batchEntry.date,
          rawDate: batchEntry.date,
          status: record.status,
          batchName: batchEntry.batchName || batch?.name || 'Assigned Batch',
          remarks:
            record.remarks ||
            (record.status === 'present'
              ? 'On-time presence'
              : record.status === 'late'
              ? 'Late arrival'
              : 'Absent without leave'),
        });
      }
    });

    // Sort descending by date (most recent first)
    return list.sort((a, b) => (a.rawDate < b.rawDate ? 1 : -1));
  }, [attendanceHistory, student, batch]);

  // 2. Compute attendance KPI summary statistics
  const stats = useMemo(() => {
    const totalConducted = studentRecords.length;
    const presentCount = studentRecords.filter((r) => r.status === 'present').length;
    const absentCount = studentRecords.filter((r) => r.status === 'absent').length;
    const lateCount = studentRecords.filter((r) => r.status === 'late').length;

    const percentage =
      totalConducted > 0
        ? Math.round(((presentCount + lateCount * 0.5) / totalConducted) * 100)
        : 0;

    return {
      totalConducted,
      presentCount,
      absentCount,
      lateCount,
      percentage,
    };
  }, [studentRecords]);

  // 3. Compute Monthly Breakdown Chart Data for Recharts
  const chartData = useMemo(() => {
    if (studentRecords.length === 0) return [];

    const monthMap: Record<string, { month: string; present: number; absent: number; late: number }> = {};

    studentRecords.forEach((r) => {
      let monthLabel = 'Recent';
      try {
        monthLabel = format(parseISO(r.rawDate), 'MMM yyyy');
      } catch {
        monthLabel = r.rawDate.slice(0, 7);
      }

      if (!monthMap[monthLabel]) {
        monthMap[monthLabel] = { month: monthLabel, present: 0, absent: 0, late: 0 };
      }

      if (r.status === 'present') monthMap[monthLabel].present += 1;
      else if (r.status === 'absent') monthMap[monthLabel].absent += 1;
      else if (r.status === 'late') monthMap[monthLabel].late += 1;
    });

    return Object.values(monthMap).slice(-6); // Last 6 months
  }, [studentRecords]);

  // 4. Apply search & filter to display table
  const filteredRecords = useMemo(() => {
    return studentRecords.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        r.date.includes(searchQuery) ||
        (r.remarks && r.remarks.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.batchName && r.batchName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [studentRecords, statusFilter, searchQuery]);

  // 5. Handle PDF export
  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      generateStudentAttendancePDF(student, batch?.name || 'Class Batch', studentRecords, stats);
    } catch (err) {
      console.error('[StudentAttendanceView] PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="text-xs text-slate-500 font-medium">Fetching attendance history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600">
              Attendance & Presence Record
            </span>
            <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">
              Live Tracker
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Class Attendance & Session Log
          </h2>
          <p className="text-xs text-slate-500">
            Real-time biometric & faculty-verified presence log for {student.name} ({student.rollNo}).
          </p>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Download Attendance PDF</span>
        </button>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Overall Percentage Card */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="absolute right-2 top-2 opacity-10">
            <Award className="w-16 h-16" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200 block">
            Presence Rate
          </span>
          <div className="text-3xl font-extrabold mt-1">
            {stats.totalConducted > 0 ? `${stats.percentage}%` : 'N/A'}
          </div>
          <div className="mt-2 text-[10px] font-medium text-violet-100 flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                stats.totalConducted === 0
                  ? 'bg-slate-300'
                  : stats.percentage >= 75
                  ? 'bg-emerald-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>
              {stats.totalConducted === 0
                ? 'No Sessions Recorded'
                : stats.percentage >= 75
                ? 'Meets 75% Rule'
                : 'Below Target'}
            </span>
          </div>
        </div>

        {/* Total Conducted */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Classes Held
          </span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {stats.totalConducted}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Session Total</span>
        </div>

        {/* Present Days */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Present Days
          </span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {stats.presentCount}
          </div>
          <span className="text-[10px] text-emerald-500 font-medium">Full Attendance</span>
        </div>

        {/* Absent Days */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Absent Days
          </span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">
            {stats.absentCount}
          </div>
          <span className="text-[10px] text-rose-400 font-medium">Missed Sessions</span>
        </div>

        {/* Late Days */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
            Late Marked
          </span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {stats.lateCount}
          </div>
          <span className="text-[10px] text-amber-500 font-medium">Late Arrival</span>
        </div>
      </div>

      {/* Monthly Performance Visual Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-violet-600" />
              <h3 className="font-bold text-sm text-slate-900">Monthly Attendance Breakdown</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Recent Sessions</span>
          </div>

          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by date (YYYY-MM-DD) or remarks..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All Records', count: studentRecords.length },
            { id: 'present', label: 'Present', count: stats.presentCount },
            { id: 'absent', label: 'Absent', count: stats.absentCount },
            { id: 'late', label: 'Late', count: stats.lateCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`
                px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shrink-0
                ${
                  statusFilter === tab.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }
              `}
            >
              <span>{tab.label}</span>
              <span
                className={`
                  text-[10px] px-1.5 py-0.2 rounded-full font-bold
                  ${statusFilter === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}
                `}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-violet-600" />
            <h3 className="font-bold text-sm text-slate-900">Session Attendance History</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredRecords.length} of {studentRecords.length} records
          </span>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">No Attendance Records Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {studentRecords.length === 0
                ? 'No class attendance has been marked yet for your enrolled batch. When your faculty records class attendance, your presence log will appear here.'
                : 'No records match the current filter criteria. Try resetting your search filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Batch / Course</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Session Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredRecords.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{item.batchName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'present' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </span>
                      )}
                      {item.status === 'absent' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </span>
                      )}
                      {item.status === 'late' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Late</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {item.remarks || 'Standard Session'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
