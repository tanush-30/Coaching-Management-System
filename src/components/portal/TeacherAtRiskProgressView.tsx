'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Users,
  Search,
  Award,
  CalendarCheck,
  FileText,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Eye,
  Phone,
  MessageSquare,
  CheckCircle2,
  X,
  Filter,
  ArrowUpDown,
  GraduationCap,
} from 'lucide-react';
import {
  Student,
  Batch,
  StudentExamMark,
  ExamTest,
  BatchAttendance,
  Homework,
  HomeworkSubmission,
  Teacher,
  StudentProgress,
} from '@/lib/types';
import {
  computeAllStudentsProgress,
  computeBatchProgressSummary,
  BatchProgressSummary,
} from '@/lib/student-progress-service';
import { StudentProgressView } from './StudentProgressView';
import { UserAvatar } from '@/components/common/UserAvatar';

interface TeacherAtRiskProgressViewProps {
  currentTeacher: Teacher;
  batches: Batch[];
  students: Student[];
  marks: StudentExamMark[];
  exams: ExamTest[];
  attendance: BatchAttendance[];
  homework: Homework[];
  submissions: HomeworkSubmission[];
}

export const TeacherAtRiskProgressView: React.FC<TeacherAtRiskProgressViewProps> = ({
  currentTeacher,
  batches,
  students,
  marks,
  exams,
  attendance,
  homework,
  submissions,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'at_risk' | 'attention' | 'top'>('all');
  const [sortBy, setSortBy] = useState<'overall_asc' | 'overall_desc' | 'attendance_asc' | 'exam_asc' | 'name'>('overall_asc');
  const [drilldownStudent, setDrilldownStudent] = useState<Student | null>(null);

  // Filter students strictly belonging to this teacher's assigned batches
  const teacherBatchIds = useMemo(() => {
    return new Set(batches.map((b) => b.id));
  }, [batches]);

  const scopedStudents = useMemo(() => {
    return students.filter((s) => (s.batchIds || []).some((bId) => teacherBatchIds.has(bId)));
  }, [students, teacherBatchIds]);

  // Compute all student progress records
  const allProgressList: StudentProgress[] = useMemo(() => {
    return computeAllStudentsProgress(
      scopedStudents,
      batches,
      marks,
      exams,
      attendance,
      homework,
      submissions
    );
  }, [scopedStudents, batches, marks, exams, attendance, homework, submissions]);

  // Compute batch-specific or global summary
  const summary: BatchProgressSummary = useMemo(() => {
    if (selectedBatchId === 'all') {
      const total = allProgressList.length;
      if (total === 0) {
        return {
          batchId: 'all',
          batchName: 'All Assigned Batches',
          totalStudents: 0,
          averageOverallScore: 0,
          averageExamScore: 0,
          averageAttendance: 0,
          averageHomeworkRate: 0,
          atRiskCount: 0,
          topPerformers: [],
          atRiskStudents: [],
        };
      }
      return {
        batchId: 'all',
        batchName: 'All Assigned Batches',
        totalStudents: total,
        averageOverallScore: Math.round(allProgressList.reduce((acc, p) => acc + p.overallScore, 0) / total),
        averageExamScore: Math.round(allProgressList.reduce((acc, p) => acc + p.examAverage, 0) / total),
        averageAttendance: Math.round(allProgressList.reduce((acc, p) => acc + p.attendancePercentage, 0) / total),
        averageHomeworkRate: Math.round(allProgressList.reduce((acc, p) => acc + p.homeworkCompletionRate, 0) / total),
        atRiskCount: allProgressList.filter((p) => p.isAtRisk).length,
        topPerformers: [...allProgressList].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5),
        atRiskStudents: allProgressList.filter((p) => p.isAtRisk),
      };
    }

    const batch = batches.find((b) => b.id === selectedBatchId);
    return computeBatchProgressSummary(selectedBatchId, allProgressList, batch?.name);
  }, [selectedBatchId, allProgressList, batches]);

  // Filter and sort the table roster
  const filteredRoster = useMemo(() => {
    return allProgressList
      .filter((p) => {
        // Batch filter
        if (selectedBatchId !== 'all' && p.batchId !== selectedBatchId) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = p.studentName.toLowerCase().includes(q);
          const matchesRoll = (p.rollNo || '').toLowerCase().includes(q);
          if (!matchesName && !matchesRoll) return false;
        }

        // Status filter
        if (statusFilter === 'at_risk') return p.isAtRisk;
        if (statusFilter === 'attention') return p.performanceTier === 'Needs Attention' || p.isAtRisk;
        if (statusFilter === 'top') return p.performanceTier === 'Outstanding' || p.performanceTier === 'Good';

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'overall_asc') return a.overallScore - b.overallScore; // At-Risk first
        if (sortBy === 'overall_desc') return b.overallScore - a.overallScore;
        if (sortBy === 'attendance_asc') return a.attendancePercentage - b.attendancePercentage;
        if (sortBy === 'exam_asc') return a.examAverage - b.examAverage;
        if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
        return 0;
      });
  }, [allProgressList, selectedBatchId, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* 1. Header & Batch Selector */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Academic Intelligence & Intervention
            </span>
            <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
              {summary.atRiskCount} Flagged for Review
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            Student Academic Progress & At-Risk Radar
          </h2>
          <p className="text-xs text-slate-500">
            Automated multi-pillar tracking across attendance, exam marks, and homework completion.
          </p>
        </div>

        {/* Batch Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 hidden sm:inline">Select Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-emerald-600 cursor-pointer shadow-xs"
          >
            <option value="all">All Assigned Batches ({scopedStudents.length} Students)</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.enrolledCount || 0} Students)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* At-Risk Count Card */}
        <div
          onClick={() => setStatusFilter('at_risk')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            summary.atRiskCount > 0
              ? 'bg-rose-50/80 border-rose-200 hover:bg-rose-100/70 shadow-xs'
              : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/70 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={summary.atRiskCount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
              At-Risk Students
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${summary.atRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            />
          </div>
          <div
            className={`text-3xl font-black mt-2 font-mono ${
              summary.atRiskCount > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {summary.atRiskCount}
          </div>
          <div className="pt-2 text-[11px] text-slate-500">
            {summary.atRiskCount > 0 ? 'Click to filter struggling students' : 'All students in good standing'}
          </div>
        </div>

        {/* Batch Average Score */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Batch Index Average</span>
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {summary.averageOverallScore}%
          </div>
          <div className="pt-2 text-[11px] text-slate-500">Composite performance index</div>
        </div>

        {/* Batch Attendance Average */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Average Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {summary.averageAttendance}%
          </div>
          <div className="pt-2 text-[11px] text-slate-500">Classroom session presence</div>
        </div>

        {/* Batch Homework Velocity */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Homework Velocity</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {summary.averageHomeworkRate}%
          </div>
          <div className="pt-2 text-[11px] text-slate-500">Assignment submission rate</div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All Students ({allProgressList.length})
          </button>
          <button
            onClick={() => setStatusFilter('at_risk')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              statusFilter === 'at_risk'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>At-Risk Only ({summary.atRiskCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('attention')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              statusFilter === 'attention'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
            }`}
          >
            Needs Attention
          </button>
          <button
            onClick={() => setStatusFilter('top')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              statusFilter === 'top'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            Top Performers
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-48 sm:w-56 focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-700 font-bold text-xs outline-none cursor-pointer"
            >
              <option value="overall_asc">Lowest Score (At-Risk First)</option>
              <option value="overall_desc">Highest Score First</option>
              <option value="attendance_asc">Lowest Attendance First</option>
              <option value="exam_asc">Lowest Exam Score First</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Student Roster & At-Risk Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRoster.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No students match the current filter criteria</p>
            <p className="text-[11px] text-slate-400">Try selecting "All Students" or clear the search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Student & Batch</th>
                  <th className="py-3.5 px-3">Standing Tier</th>
                  <th className="py-3.5 px-3">Exam Average</th>
                  <th className="py-3.5 px-3">Attendance</th>
                  <th className="py-3.5 px-3">Homework</th>
                  <th className="py-3.5 px-3 text-center">Composite Score</th>
                  <th className="py-3.5 px-4">At-Risk Diagnostic Trigger</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.map((prog) => {
                  const studentObj = scopedStudents.find((s) => s.id === prog.studentId);

                  return (
                    <tr
                      key={prog.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        prog.isAtRisk ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={studentObj?.avatar}
                            name={prog.studentName}
                            type="student"
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{prog.studentName}</span>
                              {prog.isAtRisk && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="font-mono">{prog.rollNo}</span>
                              <span>•</span>
                              <span className="truncate max-w-[120px]">{prog.batchName}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Standing Tier */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md text-[10px] border ${
                            prog.performanceTier === 'Outstanding'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : prog.performanceTier === 'Good'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : prog.performanceTier === 'Average'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : prog.performanceTier === 'Needs Attention'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {prog.performanceTier}
                        </span>
                      </td>

                      {/* Exam Average */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={prog.examAverage < 40 ? 'text-rose-600' : 'text-slate-800'}>
                              {prog.examsCount > 0 ? `${prog.examAverage}%` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({prog.examsCount} tests)
                            </span>
                          </div>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                prog.examAverage < 40 ? 'bg-rose-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${prog.examAverage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={prog.attendancePercentage < 75 ? 'text-rose-600' : 'text-slate-800'}>
                              {prog.totalAttendanceDays > 0 ? `${prog.attendancePercentage}%` : '100%'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({prog.presentDays}/{prog.totalAttendanceDays})
                            </span>
                          </div>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                prog.attendancePercentage < 75 ? 'bg-rose-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${prog.attendancePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Homework */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={prog.homeworkCompletionRate < 50 ? 'text-rose-600' : 'text-slate-800'}>
                              {prog.homeworkAssigned > 0 ? `${prog.homeworkCompletionRate}%` : '100%'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({prog.homeworkSubmitted}/{prog.homeworkAssigned})
                            </span>
                          </div>
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                prog.homeworkCompletionRate < 50 ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${prog.homeworkCompletionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Composite Overall Score */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-1 rounded-xl border ${
                            prog.overallScore >= 75
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : prog.overallScore >= 50
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {prog.overallScore}%
                        </span>
                      </td>

                      {/* At-Risk Reasons */}
                      <td className="py-3.5 px-4">
                        {prog.isAtRisk ? (
                          <div className="space-y-1 max-w-xs">
                            {prog.atRiskReasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 mr-1 mb-0.5"
                              >
                                <span>⚠️ {reason}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Normal Track</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {studentObj && (
                            <button
                              onClick={() => setDrilldownStudent(studentObj)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="View full academic diagnostic & charts"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          )}
                          {studentObj?.parentPhone && (
                            <a
                              href={`tel:${studentObj.parentPhone}`}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title={`Call Guardian: ${studentObj.parentPhone}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Student Drill-Down Modal */}
      {drilldownStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  src={drilldownStudent.avatar}
                  name={drilldownStudent.name}
                  type="student"
                  size="md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900">{drilldownStudent.name}</h3>
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                      ID: {drilldownStudent.rollNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Parent: <strong className="text-slate-800">{drilldownStudent.parentName}</strong> (📞{' '}
                    {drilldownStudent.parentPhone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrilldownStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Embedded StudentProgressView */}
            <div className="p-6 overflow-y-auto flex-1">
              <StudentProgressView
                student={drilldownStudent}
                batches={batches}
                marks={marks}
                exams={exams}
                attendance={attendance}
                homework={homework}
                submissions={submissions}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Emergency Contact:</span>
                <strong className="text-slate-800">{drilldownStudent.parentPhone}</strong>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownStudent(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
