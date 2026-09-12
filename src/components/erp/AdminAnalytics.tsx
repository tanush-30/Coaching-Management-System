'use client';

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Layers, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Sparkles,
  ArrowUpRight,
  PieChart,
  BarChart3,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Batch, FeeInstallment, Student, StudentExamMark, BatchAttendance } from '@/lib/types';

interface AdminAnalyticsProps {
  students: Student[];
  batches: Batch[];
  installments: FeeInstallment[];
  marks: StudentExamMark[];
  attendance?: BatchAttendance[];
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  students,
  batches,
  installments,
  marks,
  attendance = [],
}) => {
  // Financial KPI calculations
  const totalRevenueCollected = useMemo(() => {
    return installments
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [installments]);

  const totalOverdueDues = useMemo(() => {
    return installments
      .filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [installments]);

  const totalPendingDues = useMemo(() => {
    return installments
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
  }, [installments]);

  const totalContractedFee = useMemo(() => {
    return students.reduce((sum, s) => sum + (s.totalFee || 0), 0);
  }, [students]);

  const collectionPercentage = totalContractedFee > 0 
    ? Math.min(100, Math.round((totalRevenueCollected / totalContractedFee) * 100))
    : 0;

  const activeStudentsCount = students.filter((s) => s.status === 'active').length;
  const retentionRate = students.length > 0 
    ? ((activeStudentsCount / students.length) * 100).toFixed(1) 
    : '100.0';

  // Dynamic monthly collection aggregation from installments
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { collected: number; totalDue: number }> = {};
    const monthOrder: string[] = [];

    // Initialize with recent months or existing installment dates
    installments.forEach((inst) => {
      const dateStr = inst.paidDate || inst.dueDate;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      
      const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!monthMap[key]) {
        monthMap[key] = { collected: 0, totalDue: 0 };
        monthOrder.push(key);
      }
      monthMap[key].totalDue += inst.amount;
      if (inst.status === 'paid') {
        monthMap[key].collected += inst.amount;
      }
    });

    if (monthOrder.length === 0) {
      // Default current month if no installments yet
      const currentMonth = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
      return [{
        month: currentMonth,
        collected: totalRevenueCollected,
        target: totalContractedFee || 100000,
        percent: collectionPercentage,
      }];
    }

    return monthOrder.map((m) => {
      const { collected, totalDue } = monthMap[m];
      const percent = totalDue > 0 ? Math.round((collected / totalDue) * 100) : 100;
      return {
        month: m,
        collected,
        target: totalDue,
        percent,
      };
    });
  }, [installments, totalRevenueCollected, totalContractedFee, collectionPercentage]);

  // Dynamic calculation of attendance & fee risk for enrolled students
  const atRiskStudents = useMemo(() => {
    return students.map((student) => {
      // Calculate attendance rate from attendance history
      let totalPunched = 0;
      let presentPunched = 0;

      attendance.forEach((att) => {
        const rec = att.records.find((r) => r.studentId === student.id);
        if (rec) {
          totalPunched++;
          if (rec.status === 'present') presentPunched++;
        }
      });

      const attendancePercent = totalPunched > 0 ? Math.round((presentPunched / totalPunched) * 100) : 95;
      const studentBatch = batches.find((b) => student.batchIds?.includes(b.id));

      let riskLevel: 'High Risk' | 'Moderate' | 'Good Standing' = 'Good Standing';
      let note = 'Regular attendance and active academic profile.';

      if (student.pendingFee > 0 && attendancePercent < 80) {
        riskLevel = 'High Risk';
        note = `Attendance at ${attendancePercent}% with ₹${student.pendingFee.toLocaleString('en-IN')} pending balance.`;
      } else if (attendancePercent < 85) {
        riskLevel = 'Moderate';
        note = `Attendance at ${attendancePercent}%. Automated parent alerts active.`;
      } else if (student.pendingFee > 0) {
        riskLevel = 'Moderate';
        note = `Attendance healthy (${attendancePercent}%), installment due pending.`;
      }

      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        batchName: studentBatch?.name || 'Assigned Batch',
        attendanceRate: `${attendancePercent}%`,
        riskLevel,
        note,
      };
    });
  }, [students, attendance, batches]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Executive Business Intelligence
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
              Institute Analytics
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Revenue Realization & Operational Analytics</h2>
          <p className="text-xs text-slate-500">
            Real-time analytics across fee recovery velocity, batch capacity profitability, and student attendance consistency.
          </p>
        </div>
      </div>

      {/* Top Financial Health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Annual Contracted Value</span>
          <div className="text-2xl font-extrabold text-slate-900">₹{totalContractedFee.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-slate-500 font-semibold">{students.length} Enrolled Student Ledgers</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Collected</span>
          <div className="text-2xl font-extrabold text-emerald-600">₹{totalRevenueCollected.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">{collectionPercentage}% Realized</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Overdue Balance</span>
          <div className="text-2xl font-extrabold text-rose-600">₹{totalOverdueDues.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-rose-500 font-semibold">
            {installments.filter(i => i.status === 'overdue').length} Overdue Installments
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Student Retention Rate</span>
          <div className="text-2xl font-extrabold text-indigo-600">{retentionRate}%</div>
          <span className="text-[10px] text-indigo-500 font-semibold">{activeStudentsCount} Active Scholars</span>
        </div>
      </div>

      {/* Monthly Collection Velocity Trend Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Monthly Revenue Realization vs. Target</h3>
            <p className="text-xs text-slate-500">Live reconciliation calculated directly from fee installments</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Overall Realization: {collectionPercentage}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {monthlyData.map((data, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-bold text-slate-900">{data.month}</div>
              <div className="text-base font-extrabold text-indigo-700">₹{data.collected.toLocaleString('en-IN')}</div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, data.percent)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block">{data.percent}% of Target (₹{data.target.toLocaleString('en-IN')})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column: Batch Profitability + Attendance Risk Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batch Profitability */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Batch-wise Revenue & Utilization</h3>
              <p className="text-xs text-slate-500">Computed from enrolled student rosters</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {batches.length} Active Batches
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {batches.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active batches configured yet.
              </div>
            ) : (
              batches.map((batch) => {
                const batchStudents = students.filter((s) => s.batchIds?.includes(batch.id));
                const enrolledCount = batchStudents.length || batch.enrolledCount;
                const batchRevenue = batchStudents.reduce((sum, s) => sum + (s.totalFee || 0), 0) || (enrolledCount * (batch.annualFee || 0));
                const occupancy = batch.capacity > 0 ? Math.round((enrolledCount / batch.capacity) * 100) : 100;

                return (
                  <div key={batch.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{batch.name}</div>
                        <div className="text-[11px] text-slate-500">{batch.grade} • {batch.teacherName}</div>
                      </div>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        ₹{batchRevenue.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>Occupancy: {enrolledCount}/{batch.capacity} ({occupancy}%)</span>
                      <span className="font-bold text-indigo-600">₹{batch.annualFee?.toLocaleString('en-IN') || 0}/seat</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Student Attendance & Academic Health Monitor */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Student Monitoring & Early Intervention</h3>
              <p className="text-xs text-slate-500">Live roster health based on attendance and fee schedules</p>
            </div>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-100">
              Live Monitor
            </span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {atRiskStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No student records found.
              </div>
            ) : (
              atRiskStudents.slice(0, 6).map((student) => (
                <div key={student.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900">{student.name}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({student.rollNo})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      student.riskLevel === 'High Risk'
                        ? 'bg-rose-100 text-rose-700'
                        : student.riskLevel === 'Moderate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {student.attendanceRate} Presence
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] flex items-center justify-between">
                    <span>{student.batchName}</span>
                    <span className="text-slate-600 font-medium">{student.note}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
