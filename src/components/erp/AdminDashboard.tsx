'use client';

import React from 'react';
import { 
  Users, 
  Layers, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  MessageSquare, 
  Plus, 
  Download,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Batch, FeeInstallment, Student, WhatsAppMessage } from '@/lib/types';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';

interface AdminDashboardProps {
  students: Student[];
  batches: Batch[];
  installments: FeeInstallment[];
  whatsappLogs: WhatsAppMessage[];
  onNavigateTab: (tab: string) => void;
  onOpenEnrollModal: () => void;
  onOpenBatchModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  batches,
  installments,
  whatsappLogs,
  onNavigateTab,
  onOpenEnrollModal,
  onOpenBatchModal,
}) => {
  const totalRevenueCollected = installments.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalOverdueDues = installments.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);
  const totalPendingDues = installments.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalCapacity = batches.reduce((sum, b) => sum + b.capacity, 0);
  const totalEnrolled = batches.reduce((sum, b) => sum + b.enrolledCount, 0);
  const occupancyPercent = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const overdueInstallments = installments.filter((i) => i.status === 'overdue');
  const recentPaidInstallments = installments.filter((i) => i.status === 'paid').slice(-4);

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-900 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Apex Academy Executive Dashboard
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Academy Operations & Financial Command Center
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl">
              Live overview of student enrollments, batch occupancy, fee collection velocity, and real-time WhatsApp parent alerts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onOpenEnrollModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Student</span>
            </button>
            <button
              onClick={onOpenBatchModal}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition-all"
            >
              <span>+ New Batch</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Students</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900">{students.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +14 enrolled this term
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Collected Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-600">₹{totalRevenueCollected.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500 font-medium">Reconciled via UPI & Cash</div>
        </div>

        {/* Overdue Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overdue Dues</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-rose-600">₹{totalOverdueDues.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-rose-600 font-semibold">{overdueInstallments.length} installments pending</div>
        </div>

        {/* Batch Occupancy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Batch Capacity</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900">{occupancyPercent}%</div>
          <div className="text-[11px] text-indigo-600 font-medium">{totalEnrolled} of {totalCapacity} seats filled</div>
        </div>
      </div>

      {/* Main Grid: Live Batches & Overdue Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Batches Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Academic Batches & Faculty Schedules</h3>
              <p className="text-xs text-slate-500">Live roster capacity and classroom allocation</p>
            </div>
            <button
              onClick={() => onNavigateTab('batches')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Manage Batches</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {batches.map((batch) => {
              const capPercent = Math.round((batch.enrolledCount / batch.capacity) * 100);
              return (
                <div key={batch.id} className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{batch.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                        {batch.grade}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Lead Faculty: <span className="font-semibold text-slate-700">{batch.teacherName}</span> • {batch.room}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {batch.scheduleDays.join(', ')} ({batch.startTime})
                    </div>
                  </div>

                  <div className="text-right space-y-1 min-w-[120px]">
                    <div className="text-xs font-bold text-slate-900">
                      {batch.enrolledCount} / {batch.capacity} Students
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, capPercent)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{capPercent}% Occupancy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue Dues & WhatsApp Reminder Queue */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Overdue Follow-ups</h3>
              <p className="text-xs text-slate-500">1-Click WhatsApp payment reminders</p>
            </div>
            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {overdueInstallments.length} Alerts
            </span>
          </div>

          <div className="space-y-3">
            {overdueInstallments.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                🎉 No overdue installments! All collections on track.
              </div>
            ) : (
              overdueInstallments.map((inst) => {
                const student = students.find((s) => s.id === inst.studentId);
                if (!student) return null;

                return (
                  <div key={inst.id} className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-[10px] text-slate-500">Parent: {student.parentName} ({student.parentPhone})</div>
                      </div>
                      <span className="font-extrabold text-rose-600 text-sm">₹{inst.amount.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-rose-100 text-[11px]">
                      <span className="text-rose-700 font-semibold">Due: {inst.dueDate}</span>
                      <button
                        onClick={() => onNavigateTab('fees')}
                        className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 text-[10px] flex items-center gap-1 transition-all"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>Send WhatsApp Link</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity & Real-Time WhatsApp Logs */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-base text-slate-900">Recent Automated WhatsApp Parent Dispatches</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Official WhatsApp Cloud API</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {whatsappLogs.slice(0, 4).map((log) => (
            <div key={log.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{log.recipientName}</span>
                <span className="text-[10px] text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-slate-600 text-[11px] line-clamp-2">{log.content.replace(/\*/g, '')}</p>
              <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500">
                <span className="capitalize font-semibold text-indigo-600">{log.type.replace('_', ' ')}</span>
                <span className="text-emerald-700 font-bold">Delivered ✓✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
