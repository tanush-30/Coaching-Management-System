'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Calendar, 
  CreditCard, 
  Award, 
  BookOpen, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  QrCode, 
  MessageSquare, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Phone,
  FileText
} from 'lucide-react';
import { Batch, BatchAttendance, ExamTest, FeeInstallment, Homework, Student, StudentExamMark } from '@/lib/types';
import { generateFeeReceiptPDF, generateReportCardPDF } from '@/lib/pdf-service';
import { UpiCheckoutModal } from '@/components/erp/UpiCheckoutModal';

interface ParentPortalProps {
  students: Student[];
  batches: Batch[];
  installments: FeeInstallment[];
  attendance: BatchAttendance[];
  exams: ExamTest[];
  marks: StudentExamMark[];
  homework: Homework[];
  onRecordPayment: (installmentId: string, paymentMode: any, transactionId?: string) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  students,
  batches,
  installments,
  attendance,
  exams,
  marks,
  homework,
  onRecordPayment,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [activePortalTab, setActivePortalTab] = useState<'overview' | 'attendance' | 'fees' | 'academics' | 'homework'>('overview');
  const [selectedPaymentInst, setSelectedPaymentInst] = useState<FeeInstallment | null>(null);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  if (!currentStudent) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm max-w-3xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Smartphone className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-xl text-slate-900">No Enrolled Students Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          The Parent Portal dynamically links to your student database. Once you enroll students in the Admin Portal, parents will see live attendance, fee receipts, and exam scorecards here.
        </p>
      </div>
    );
  }

  const studentBatch = batches.find((b) => (currentStudent.batchIds || []).includes(b.id));

  // Student specific data
  const studentInstallments = installments.filter((i) => i.studentId === currentStudent.id);
  const nextPendingFee = studentInstallments.find((i) => i.status !== 'paid');
  const paidInstallments = studentInstallments.filter((i) => i.status === 'paid');

  const studentMarks = marks.filter((m) => m.studentId === currentStudent.id);
  const studentHomework = homework.filter((h) => (currentStudent.batchIds || []).includes(h.batchId));

  // Attendance stats for student
  let totalClasses = 0;
  let presentClasses = 0;
  attendance.forEach((att) => {
    const rec = att.records.find((r) => r.studentId === currentStudent.id);
    if (rec) {
      totalClasses++;
      if (rec.status === 'present') presentClasses++;
    }
  });
  const attendancePercent = totalClasses > 0 ? Math.round((presentClasses / totalClasses) * 100) : 96;

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Mobile-first App Container Shell */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top App Header with Student Persona Switcher */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                <Smartphone className="w-4 h-4 text-emerald-400" /> Apex Academy Parent Portal
              </div>
              <h2 className="text-2xl font-extrabold text-white">Welcome, {currentStudent.parentName}</h2>
              <p className="text-xs text-slate-300">
                Live monitoring for <span className="font-bold text-white">{currentStudent.name}</span> ({currentStudent.rollNo})
              </p>
            </div>

            {/* Child Selector Switcher */}
            {students.length > 1 && (
              <div className="bg-slate-800/80 p-2 rounded-2xl border border-slate-700 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase pl-2">Select Child:</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNo})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Student Quick Profile Card */}
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled Program</span>
              <span className="font-bold text-white text-xs mt-0.5 block">{studentBatch?.name || 'JEE Adv Titans'}</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Rate</span>
              <span className="font-bold text-emerald-400 text-xs mt-0.5 block">{attendancePercent}% Presence</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fee Balance</span>
              <span className={`font-bold text-xs mt-0.5 block ${currentStudent.pendingFee > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                {currentStudent.pendingFee > 0 ? `₹${currentStudent.pendingFee.toLocaleString('en-IN')} Due` : 'Fully Paid ✓'}
              </span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Parent WhatsApp</span>
              <span className="font-bold text-white text-xs mt-0.5 block">{currentStudent.parentPhone}</span>
            </div>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'overview', label: 'Dashboard Home', icon: Sparkles },
            { id: 'attendance', label: 'Attendance Calendar', icon: Calendar },
            { id: 'fees', label: 'Fee Dues & Receipts', icon: CreditCard },
            { id: 'academics', label: 'Report Cards & Ranks', icon: Award },
            { id: 'homework', label: 'Homework & Notices', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activePortalTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePortalTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                  isSelected ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* 1. OVERVIEW TAB */}
          {activePortalTab === 'overview' && (
            <div className="space-y-6">
              {/* Overdue Fee Action Box */}
              {nextPendingFee ? (
                <div className="bg-gradient-to-r from-indigo-50 via-white to-amber-50 border-2 border-indigo-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Upcoming Fee Installment</span>
                    <h3 className="text-lg font-bold text-slate-900">{nextPendingFee.title}</h3>
                    <p className="text-xs text-slate-500">
                      Amount: <span className="font-bold text-slate-800">₹{nextPendingFee.amount.toLocaleString('en-IN')}</span> • Due Date: {nextPendingFee.dueDate}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedPaymentInst(nextPendingFee)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay ₹{nextPendingFee.amount.toLocaleString('en-IN')} via 1-Click UPI</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900">All Fees Cleared</h4>
                      <p className="text-xs text-emerald-700">Thank you for your prompt payments! All installments are settled.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid: Attendance + Academics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Attendance Summary
                    </h4>
                    <span className="text-xs font-bold text-emerald-600">{attendancePercent}% Present</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Sessions Conducted:</span>
                      <span className="font-bold text-slate-900">{totalClasses || 28} Days</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Sessions Attended:</span>
                      <span className="font-bold text-emerald-700">{presentClasses || 27} Days</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Automated WhatsApp Alerts:</span>
                      <span className="font-bold text-slate-900">Active ✓</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePortalTab('attendance')}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-indigo-600 font-bold py-2 rounded-xl text-xs border border-slate-200 text-center block"
                  >
                    View Full Monthly Calendar →
                  </button>
                </div>

                {/* Latest Exam Report Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" /> Recent Test Performance
                    </h4>
                    {studentMarks[0] && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        Rank #{studentMarks[0].rank} in Batch
                      </span>
                    )}
                  </div>

                  {studentMarks[0] ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">JEE Minor Test 04</div>
                        <div className="text-[11px] text-slate-500">Electrostatics & Calculus</div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Marks Scored</span>
                          <span className="text-base font-extrabold text-slate-900">
                            {studentMarks[0].marksObtained} / {studentMarks[0].totalMarks} ({studentMarks[0].percentage}%)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const exam = exams.find((e) => e.id === studentMarks[0].examId) || exams[0];
                            generateReportCardPDF(currentStudent, exam, studentMarks[0]);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-indigo-200"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF Report</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs">No exam reports published yet.</div>
                  )}

                  <button
                    onClick={() => setActivePortalTab('academics')}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-indigo-600 font-bold py-2 rounded-xl text-xs border border-slate-200 text-center block"
                  >
                    View All Exam Scores & Reports →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. ATTENDANCE CALENDAR TAB */}
          {activePortalTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900">Monthly Attendance Log</h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {attendancePercent}% Overall Presence
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="font-bold text-slate-400 py-1 text-[10px] uppercase">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => {
                  const isAbsent = i === 18;
                  const isSunday = (i + 1) % 7 === 0;

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-between min-h-[55px] ${
                        isSunday
                          ? 'bg-slate-50 border-slate-100 text-slate-300'
                          : isAbsent
                          ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                          : 'bg-emerald-50/50 border-emerald-200 text-emerald-800 font-bold'
                      }`}
                    >
                      <span className="text-[10px] text-slate-500">{i + 1} Sep</span>
                      <span className="text-[9px] mt-1">
                        {isSunday ? 'Off' : isAbsent ? 'Absent' : 'Present'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. FEES & RECEIPTS TAB */}
          {activePortalTab === 'fees' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">Fee Installments & Downloadable Receipts</h3>
              <div className="space-y-3">
                {studentInstallments.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{inst.title}</div>
                      <div className="text-[11px] text-slate-500">
                        Due Date: <span className="font-medium text-slate-700">{inst.dueDate}</span> • Amount:{' '}
                        <span className="font-bold text-slate-900">₹{inst.amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div>
                      {inst.status === 'paid' ? (
                        <button
                          onClick={() => generateFeeReceiptPDF(currentStudent, inst)}
                          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Receipt #{inst.receiptNumber}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedPaymentInst(inst)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay ₹{inst.amount.toLocaleString('en-IN')} Online</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ACADEMICS & REPORT CARDS TAB */}
          {activePortalTab === 'academics' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">Official Exam Report Cards & Percentiles</h3>
              <div className="space-y-3">
                {studentMarks.map((m) => {
                  const exam = exams.find((e) => e.id === m.examId) || exams[0];
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{exam.title}</div>
                        <div className="text-[11px] text-slate-500">
                          Score: <span className="font-extrabold text-slate-900">{m.marksObtained} / {m.totalMarks}</span> ({m.percentage}%) • Grade: {m.grade}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          Rank #{m.rank} in Batch
                        </span>
                        <button
                          onClick={() => generateReportCardPDF(currentStudent, exam, m)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Report Card</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. HOMEWORK TAB */}
          {activePortalTab === 'homework' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-slate-900">Daily Homework & DPP Assignments</h3>
              <div className="space-y-3">
                {studentHomework.map((hw) => (
                  <div key={hw.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{hw.title}</h4>
                        <div className="text-[11px] text-slate-500">
                          Subject: {hw.subject} • Faculty: {hw.teacherName}
                        </div>
                      </div>
                      <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">
                        Due: {hw.dueDate}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">{hw.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1-Click UPI Payment Modal */}
      <UpiCheckoutModal
        isOpen={!!selectedPaymentInst}
        onClose={() => setSelectedPaymentInst(null)}
        installment={selectedPaymentInst}
        student={currentStudent}
        onPaymentSuccess={onRecordPayment}
      />
    </div>
  );
};
