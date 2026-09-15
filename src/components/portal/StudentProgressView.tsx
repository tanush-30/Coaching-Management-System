'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Award,
  CalendarCheck,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  Clock,
  ChevronRight,
  Info,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import {
  Student,
  Batch,
  StudentExamMark,
  ExamTest,
  BatchAttendance,
  Homework,
  HomeworkSubmission,
  StudentProgress,
} from '@/lib/types';
import { computeStudentProgress } from '@/lib/student-progress-service';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

interface StudentProgressViewProps {
  student: Student;
  batches: Batch[];
  marks: StudentExamMark[];
  exams: ExamTest[];
  attendance: BatchAttendance[];
  homework: Homework[];
  submissions: HomeworkSubmission[];
  isParentView?: boolean;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({
  student,
  batches,
  marks,
  exams,
  attendance,
  homework,
  submissions,
  isParentView = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'subjects' | 'exams'>('overview');

  // Compute live progress metrics for this student
  const studentBatches = useMemo(() => {
    return batches.filter((b) => (student.batchIds || []).includes(b.id));
  }, [batches, student]);

  const progress: StudentProgress = useMemo(() => {
    return computeStudentProgress(
      student,
      studentBatches,
      marks,
      exams,
      attendance,
      homework,
      submissions
    );
  }, [student, studentBatches, marks, exams, attendance, homework, submissions]);

  // Prepare chart data for overall metrics comparison
  const metricsComparisonData = useMemo(() => {
    return [
      {
        name: 'Exam Average',
        score: progress.examAverage,
        weight: '40% Weight',
        color: '#6366f1', // Indigo
        fill: '#818cf8',
      },
      {
        name: 'Attendance Rate',
        score: progress.attendancePercentage,
        weight: '30% Weight',
        color: '#10b981', // Emerald
        fill: '#34d399',
      },
      {
        name: 'Homework Rate',
        score: progress.homeworkCompletionRate,
        weight: '30% Weight',
        color: '#f59e0b', // Amber
        fill: '#fbbf24',
      },
      {
        name: 'Overall Index',
        score: progress.overallScore,
        weight: 'Composite',
        color: '#8b5cf6', // Violet
        fill: '#a78bfa',
      },
    ];
  }, [progress]);

  // Prepare subject-wise comparison chart data
  const subjectChartData = useMemo(() => {
    if (!progress.subjectBreakdown) return [];
    return Object.values(progress.subjectBreakdown).map((s) => ({
      subject: s.subject,
      examAvg: s.examAverage,
      homeworkRate: s.homeworkCompletionRate,
      testsTaken: s.examsCount,
      hwSubmitted: `${s.homeworkSubmitted}/${s.homeworkAssigned}`,
    }));
  }, [progress]);

  // Prepare exam progression timeline data
  const examTimelineData = useMemo(() => {
    if (!progress.recentExams || progress.recentExams.length === 0) return [];
    return [...progress.recentExams]
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
      .map((e, idx) => ({
        index: idx + 1,
        title: e.examTitle.length > 15 ? `${e.examTitle.slice(0, 15)}...` : e.examTitle,
        fullTitle: e.examTitle,
        subject: e.subject,
        percentage: e.percentage,
        marks: `${e.marksObtained}/${e.totalMarks}`,
        date: e.examDate,
      }));
  }, [progress]);

  // Performance tier badge styling
  const tierColor = {
    Outstanding: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Good: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Average: 'bg-sky-50 text-sky-700 border-sky-200',
    'Needs Attention': 'bg-amber-50 text-amber-700 border-amber-200',
    'At Risk': 'bg-rose-50 text-rose-700 border-rose-200',
  }[progress.performanceTier];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Header Banner & Profile Summary */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600">
              {isParentView ? 'Student Progress Dashboard' : 'Academic Standing & Growth'}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tierColor}`}>
              {progress.performanceTier}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mt-1">
            {student.name}'s Academic Performance Index
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Roll No: <strong className="text-slate-700">{student.rollNo}</strong> • Primary Batch:{' '}
            <strong className="text-slate-700">{progress.batchName}</strong>
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSubTab('subjects')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'subjects'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Subjects ({subjectChartData.length})
          </button>
          <button
            onClick={() => setActiveSubTab('exams')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'exams'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exam History ({progress.examsCount})
          </button>
        </div>
      </div>

      {/* 2. Top 4 Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Composite Academic Score */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-600/15 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-24 h-24" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-violet-200">Composite Score</span>
              <Sparkles className="w-4 h-4 text-violet-200" />
            </div>
            <div className="text-3xl font-black mt-2 font-mono">{progress.overallScore}%</div>
          </div>
          <div className="pt-3 border-t border-violet-500/40 text-[11px] text-violet-100 flex items-center justify-between">
            <span>Formula: 40% Exams • 30% Att • 30% HW</span>
          </div>
        </div>

        {/* Exam Score Average */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span className="uppercase tracking-wider">Exam Performance</span>
              <Award className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {progress.examsCount > 0 ? `${progress.examAverage}%` : 'N/A'}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{progress.examsCount} Tests Evaluated</span>
            {progress.highestExamScore !== undefined && (
              <span className="text-emerald-600 font-bold">High: {progress.highestExamScore}%</span>
            )}
          </div>
        </div>

        {/* Attendance Percentage */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span className="uppercase tracking-wider">Attendance Rate</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {progress.totalAttendanceDays > 0 ? `${progress.attendancePercentage}%` : '100%'}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{progress.presentDays} Present / {progress.totalAttendanceDays} Sessions</span>
            {progress.absentDays > 0 && (
              <span className="text-rose-600 font-bold">{progress.absentDays} Absent</span>
            )}
          </div>
        </div>

        {/* Homework Completion */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span className="uppercase tracking-wider">Homework Completion</span>
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
              {progress.homeworkAssigned > 0 ? `${progress.homeworkCompletionRate}%` : '100%'}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{progress.homeworkSubmitted} of {progress.homeworkAssigned} Submitted</span>
            {progress.homeworkPending > 0 && (
              <span className="text-amber-600 font-bold">{progress.homeworkPending} Pending</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. At-Risk / Encouragement Alert Banner */}
      {progress.isAtRisk ? (
        <div className="p-5 bg-rose-50/80 border border-rose-200 rounded-3xl flex flex-col sm:flex-row items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="font-extrabold text-sm text-rose-900">
              Academic Attention Recommended
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              We identified the following focus areas to help {student.name} achieve academic excellence:
            </p>
            <ul className="list-disc list-inside text-xs text-rose-800 space-y-0.5 font-medium pt-1">
              {progress.atRiskReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-3xl flex items-center gap-3.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-extrabold">Good Standing! </span>
            <span>
              {student.name} is consistently maintaining strong attendance and active assignment submissions across their enrolled batches.
            </span>
          </div>
        </div>
      )}

      {/* 4. Tab Sub-Views */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Core Metrics Bar Comparison */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Academic Pillars Comparison</h4>
                  <p className="text-xs text-slate-500">Benchmark across exams, attendance, and assignments</p>
                </div>
                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                  Target: 80%+
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Score']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                      {metricsComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Exam Score Progression Timeline */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Exam Score Progression</h4>
                  <p className="text-xs text-slate-500">Chronological test percentage trajectory</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Trendline
                </span>
              </div>

              {examTimelineData.length > 0 ? (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={examTimelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="examColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="title" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${val}% (${item.payload.marks} Marks)`,
                          item.payload.fullTitle,
                        ]}
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#examColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Award className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No evaluated tests recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Test trendlines will appear here after upcoming exams.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Subject Summaries */}
          {subjectChartData.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Subject Performance Quick Cards</h4>
                  <p className="text-xs text-slate-500">Exam average & homework velocity by subject</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectChartData.map((subj) => (
                  <div key={subj.subject} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-slate-900 text-sm">{subj.subject}</h5>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {subj.testsTaken} Exams Taken
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>Exam Mastery</span>
                          <span className="font-mono text-slate-900">{subj.examAvg}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${subj.examAvg}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                          <span>Homework Completion</span>
                          <span className="font-mono text-slate-900">{subj.homeworkRate}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${subj.homeworkRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Subjects Detail Tab */}
      {activeSubTab === 'subjects' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h4 className="font-extrabold text-base text-slate-900">Subject-wise Academic Mastery</h4>
            <p className="text-xs text-slate-500">Detailed overview of scores and assignment discipline per subject</p>
          </div>

          {subjectChartData.length > 0 ? (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="examAvg" name="Exam Average (%)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="homeworkRate" name="Homework Completion (%)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-12">No subject breakdown data available yet.</p>
          )}
        </div>
      )}

      {/* 6. Exams History Detail Tab */}
      {activeSubTab === 'exams' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-base text-slate-900">Evaluated Exam History</h4>
              <p className="text-xs text-slate-500">Record of all tests taken with score percentages and grades</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
              Average: {progress.examAverage}%
            </span>
          </div>

          {progress.recentExams && progress.recentExams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-3">Exam Title</th>
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Score</th>
                    <th className="py-3 px-3">Percentage</th>
                    <th className="py-3 px-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {progress.recentExams.map((exam) => (
                    <tr key={exam.examId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-900">{exam.examTitle}</td>
                      <td className="py-3.5 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                          {exam.subject}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">{exam.examDate}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        {exam.marksObtained} / {exam.totalMarks}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-indigo-600">{exam.percentage}%</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-md text-[10px] ${
                            ['A+', 'A'].includes(exam.grade)
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ['B+', 'B'].includes(exam.grade)
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {exam.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-12">No evaluated exam scorecards found for this student.</p>
          )}
        </div>
      )}
    </div>
  );
};
