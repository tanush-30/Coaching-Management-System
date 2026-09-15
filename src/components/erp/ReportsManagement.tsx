'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  Student,
  Batch,
  Teacher,
  BatchAttendance,
  ExamTest,
  StudentExamMark,
  Homework,
  HomeworkSubmission,
  TimetableSlot,
} from '@/lib/types';
import {
  ReportType,
  ReportGranularity,
  DateRangePreset,
  ReportFilterCriteria,
  REPORT_DEFINITIONS,
  ReportDefinition,
} from '@/lib/report-types';
import {
  generateReportData,
  resolveDateRange,
  ReportDataStore,
  GeneratedReportResult,
} from '@/lib/report-aggregation-service';
import {
  generateReportCSV,
  downloadReportCSV,
  generateReportPDF,
  downloadReportPDF,
  buildReportFileName,
} from '@/lib/report-export-service';

interface ReportsManagementProps {
  students: Student[];
  batches: Batch[];
  teachers: Teacher[];
  attendance: BatchAttendance[];
  exams: ExamTest[];
  marks: StudentExamMark[];
  homework: Homework[];
  homeworkSubmissions: HomeworkSubmission[];
  timetableSlots: TimetableSlot[];
}

export const ReportsManagement: React.FC<ReportsManagementProps> = ({
  students,
  batches,
  teachers,
  attendance,
  exams,
  marks,
  homework,
  homeworkSubmissions,
  timetableSlots,
}) => {
  // Active Filter States
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('attendance_summary');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [granularity, setGranularity] = useState<ReportGranularity>('batch_summary');

  // Search & UI Status
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bundle data store
  const dataStore: ReportDataStore = useMemo(
    () => ({
      students,
      batches,
      teachers,
      attendance,
      exams,
      marks,
      homework,
      homeworkSubmissions,
      timetableSlots,
    }),
    [students, batches, teachers, attendance, exams, marks, homework, homeworkSubmissions, timetableSlots]
  );

  // Build filter object
  const currentFilter: ReportFilterCriteria = useMemo(
    () => ({
      reportType: selectedReportType,
      batchId: selectedBatchId,
      studentId: selectedStudentId,
      dateRangePreset,
      startDate: dateRangePreset === 'custom' ? customStartDate : undefined,
      endDate: dateRangePreset === 'custom' ? customEndDate : undefined,
      granularity,
    }),
    [selectedReportType, selectedBatchId, selectedStudentId, dateRangePreset, customStartDate, customEndDate, granularity]
  );

  // Generate live report preview
  const reportResult: GeneratedReportResult = useMemo(() => {
    return generateReportData(currentFilter, dataStore);
  }, [currentFilter, dataStore]);

  const definition = REPORT_DEFINITIONS[selectedReportType];
  const columns = definition.columns[granularity] || [];

  // Filter students for the dropdown based on selected batch
  const eligibleStudents = useMemo(() => {
    if (selectedBatchId === 'all') return students;
    return students.filter((s) => s.batchIds?.includes(selectedBatchId));
  }, [students, selectedBatchId]);

  // Search filter for preview table
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return reportResult.rows;
    const q = searchQuery.toLowerCase();
    return reportResult.rows.filter((row: any) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [reportResult.rows, searchQuery]);

  // Selected batch name for file naming
  const activeBatchName = useMemo(() => {
    if (selectedBatchId === 'all') return 'all_batches';
    const b = batches.find((item) => item.id === selectedBatchId);
    return b?.name || selectedBatchId;
  }, [selectedBatchId, batches]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    if (isExportingCSV) return;
    setIsExportingCSV(true);
    setStatusMessage(null);

    try {
      if (dateRangePreset === 'custom' && customStartDate > customEndDate) {
        throw new Error('Start date cannot be after end date.');
      }

      const csvContent = generateReportCSV(reportResult);
      const fileName = buildReportFileName(
        selectedReportType,
        granularity,
        activeBatchName,
        reportResult.resolvedDateRange.startDate,
        reportResult.resolvedDateRange.endDate,
        'csv'
      );

      downloadReportCSV(fileName, csvContent);
      setStatusMessage({ type: 'success', text: `Successfully exported CSV: ${fileName}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to export CSV.' });
    } finally {
      setIsExportingCSV(false);
    }
  };

  // Handle Export PDF
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    setStatusMessage(null);

    try {
      if (dateRangePreset === 'custom' && customStartDate > customEndDate) {
        throw new Error('Start date cannot be after end date.');
      }

      const doc = generateReportPDF(reportResult);
      const fileName = buildReportFileName(
        selectedReportType,
        granularity,
        activeBatchName,
        reportResult.resolvedDateRange.startDate,
        reportResult.resolvedDateRange.endDate,
        'pdf'
      );

      downloadReportPDF(fileName, doc);
      setStatusMessage({ type: 'success', text: `Successfully exported PDF: ${fileName}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to export PDF.' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Report Cards Config
  const reportCards: { type: ReportType; label: string; icon: any; desc: string }[] = [
    {
      type: 'attendance_summary',
      label: 'Attendance Summary',
      icon: CalendarCheck,
      desc: 'Track presence rates, session totals, and at-risk attendance alerts per batch or student.',
    },
    {
      type: 'student_progress',
      label: 'Student Progress & Marks',
      icon: Award,
      desc: 'Export unit test results, rank standings, scorecards, and academic performance trends.',
    },
    {
      type: 'homework_completion',
      label: 'Homework & DPP Completion',
      icon: FileText,
      desc: 'Analyze daily DPP submissions, completion percentages, and missing task lists.',
    },
    {
      type: 'timetable_schedule',
      label: 'Timetable & Room Allocation',
      icon: Clock,
      desc: 'Export weekly batch class schedules, room allocations, and faculty teaching workload.',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>INSTITUTE INTELLIGENCE & EXPORT ENGINE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Reports & Data Exports Center</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Generate, filter, and export live institutional metrics across attendance, academic scorecards, homework, and weekly timetables to CSV and PDF.
          </p>
        </div>

        {/* Global Action Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-indigo-950/80 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-center">
            <span className="block text-[11px] text-indigo-300 font-medium">Ready Reports</span>
            <span className="text-lg font-bold text-white">4 Modules</span>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-center">
            <span className="block text-[11px] text-emerald-300 font-medium">Data Integrity</span>
            <span className="text-lg font-bold text-emerald-400">100% Live</span>
          </div>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="ml-auto text-xs opacity-70 hover:opacity-100 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Report Type Selector Grid */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Step 1: Select Report Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon;
            const isSelected = selectedReportType === card.type;
            return (
              <button
                key={card.type}
                onClick={() => setSelectedReportType(card.type)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-600 text-indigo-950 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:shadow-xs'
                }`}
              >
                <div>
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className={`font-bold text-sm mb-1 ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                    {card.label}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{card.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
                  <span className={isSelected ? 'text-indigo-700' : 'text-slate-400'}>
                    {isSelected ? 'Active Selection' : 'Click to select'}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filter & Configuration Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Step 2: Apply Filters & Select Granularity
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Batch Filter
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setSelectedStudentId('all');
              }}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Batches (Institute-Wide)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.courseName || b.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Granularity Switch */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Report Granularity
            </label>
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as ReportGranularity)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="batch_summary">
                {selectedReportType === 'timetable_schedule' ? 'Batch Timetable Schedule' : 'Batch-Level Summary'}
              </option>
              <option value="student_detail">
                {selectedReportType === 'timetable_schedule' ? 'Faculty Workload View' : 'Student-Level Detailed'}
              </option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Date Range Preset
            </label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="current_term">Current Academic Term</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Student Filter (Optional drilldown if granularity is student_detail) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              {granularity === 'student_detail' && selectedReportType !== 'timetable_schedule'
                ? 'Student Drill-Down'
                : 'Drill-Down Scope'}
            </label>
            <select
              disabled={granularity !== 'student_detail' || selectedReportType === 'timetable_schedule'}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Students in Selection</option>
              {eligibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.rollNo || 'STU'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Pickers (Rendered if 'custom' is selected) */}
        {dateRangePreset === 'custom' && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-3 rounded-xl">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Preview & Export Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Action Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">{definition.title}</h3>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase">
                {granularity.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active window: <strong className="text-slate-700">{reportResult.resolvedDateRange.startDate}</strong> to{' '}
              <strong className="text-slate-700">{reportResult.resolvedDateRange.endDate}</strong> ({filteredRows.length} matching rows)
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Download CSV */}
            <button
              onClick={handleExportCSV}
              disabled={isExportingCSV || isExportingPDF}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isExportingCSV ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Export CSV</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleExportPDF}
              disabled={isExportingCSV || isExportingPDF}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filter Bar */}
        <div className="p-3 px-6 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in preview table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredRows.length} of {reportResult.totalRowCount} record(s)
          </span>
        </div>

        {/* Live Data Preview Table */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs text-slate-700 border-b border-slate-200 z-10 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2.5 px-4 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-12 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No data matches the selected filters or date range. Try widening your criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                    {columns.map((col) => {
                      const val = row[col.key];
                      const isStatus =
                        col.key === 'standingStatus' ||
                        col.key === 'slotStatus' ||
                        col.key === 'grade' ||
                        col.key === 'status';

                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-4 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {isStatus ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                String(val) === 'ELIGIBLE' || String(val) === 'active' || String(val) === 'A+' || String(val) === 'A'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : String(val).includes('ALERT') || String(val) === 'cancelled' || String(val) === 'F'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {val ?? '-'}
                            </span>
                          ) : (
                            <span>{val !== undefined && val !== null ? String(val) : '-'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
