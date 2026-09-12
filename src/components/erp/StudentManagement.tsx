'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Phone, 
  Mail, 
  Download, 
  CreditCard, 
  MoreVertical, 
  GraduationCap, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  DollarSign,
  X
} from 'lucide-react';
import { Batch, FeeInstallment, Student } from '@/lib/types';
import { AddStudentModal } from './AddStudentModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { generateFeeReceiptPDF } from '@/lib/pdf-service';
import { UserAvatar } from '@/components/common/UserAvatar';

interface StudentManagementProps {
  students: Student[];
  batches: Batch[];
  installments: FeeInstallment[];
  onAddStudent: (studentData: any, installmentPlan?: any) => void;
  onUpdateStudent: (id: string, updates: any) => void;
  onDeleteStudent: (id: string) => void;
  onRecordPayment: (installmentId: string, paymentMode: any, transactionId?: string) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  batches,
  installments,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Modals
  const [selectedStudentForView, setSelectedStudentForView] = useState<Student | null>(null);
  const [selectedPaymentInst, setSelectedPaymentInst] = useState<{ installment: FeeInstallment; student: Student } | null>(null);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBatch = selectedBatchFilter === 'all' || student.batchIds.includes(selectedBatchFilter);
    return matchesSearch && matchesBatch;
  });

  const totalFeeCollected = students.reduce((sum, s) => sum + s.paidFee, 0);
  const totalFeePending = students.reduce((sum, s) => sum + s.pendingFee, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Student Directory & Admissions</span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Live Student Roster</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Student & Parent Profile Management</h2>
          <p className="text-xs text-slate-500">Centralized directory replacing paper registers with automated fee & contact linking.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Student</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Enrolled</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{students.length} Students</div>
          <span className="text-[10px] text-emerald-600 font-medium">100% Active Records</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Collected Revenue</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{totalFeeCollected.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Digital Receipts Issued</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Dues</span>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">₹{totalFeePending.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-rose-500 font-medium">Auto-Reminders Active</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Active Batches</span>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">{batches.length} Batches</div>
          <span className="text-[10px] text-indigo-500 font-medium">Capacity Monitored</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll no, parent or school..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Filter Batch:</span>
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Batches ({students.length})</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
                <th className="p-4">Student Name & Roll No</th>
                <th className="p-4">Parent / Guardian Contact</th>
                <th className="p-4">Assigned Batch</th>
                <th className="p-4">Fee Overview</th>
                <th className="p-4">Installment Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentBatch = batches.find((b) => student.batchIds.includes(b.id));
                  const studentInsts = installments.filter((i) => i.studentId === student.id);
                  const nextPendingInst = studentInsts.find((i) => i.status !== 'paid');
                  const lastPaidInst = studentInsts.filter((i) => i.status === 'paid').slice(-1)[0];

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-all">
                      {/* Student Info */}
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
                            <div className="text-[10px] text-indigo-600 font-mono font-semibold">{student.rollNo}</div>
                            <div className="text-[10px] text-slate-500">{student.schoolName}</div>
                          </div>
                        </div>
                      </td>

                      {/* Parent Contact */}
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{student.parentName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{student.parentPhone}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{student.parentRelation}</div>
                      </td>

                      {/* Batch Assignment */}
                      <td className="p-4">
                        <select
                          value={student.batchIds?.[0] || ''}
                          onChange={(e) => {
                            const newBatchId = e.target.value;
                            onUpdateStudent(student.id, {
                              batchIds: newBatchId ? [newBatchId] : [],
                            });
                          }}
                          className="bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-900 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 max-w-[200px] cursor-pointer transition-colors"
                        >
                          <option value="">-- No Batch Assigned --</option>
                          {batches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.courseName})
                            </option>
                          ))}
                        </select>
                        {studentBatch && (
                          <div className="text-[10px] text-slate-500 mt-1 pl-1">
                            {studentBatch.scheduleDays.join(', ')} • {studentBatch.startTime}
                          </div>
                        )}
                      </td>

                      {/* Fee Overview */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900">₹{student.totalFee.toLocaleString('en-IN')}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            Paid: ₹{student.paidFee.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {student.pendingFee > 0 ? (
                          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                            Due: ₹{student.pendingFee.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Fully Cleared ✓</span>
                        )}
                      </td>

                      {/* Installment Status */}
                      <td className="p-4">
                        {nextPendingInst ? (
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              nextPendingInst.status === 'overdue' 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {nextPendingInst.title}: ₹{nextPendingInst.amount.toLocaleString('en-IN')}
                            </span>
                            <div className="text-[10px] text-slate-500">Due: {nextPendingInst.dueDate}</div>
                            <button
                              onClick={() => setSelectedPaymentInst({ installment: nextPendingInst, student })}
                              className="text-[10px] text-indigo-600 font-bold hover:underline block"
                            >
                              + Collect ₹{nextPendingInst.amount.toLocaleString('en-IN')}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              All Installments Paid
                            </span>
                            {lastPaidInst && (
                              <button
                                onClick={() => generateFeeReceiptPDF(student, lastPaidInst)}
                                className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Receipt #{lastPaidInst.receiptNumber}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedStudentForView(student)}
                            className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            title="View Student Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${student.name}?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        batches={batches}
        onAddStudent={onAddStudent}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!selectedPaymentInst}
        onClose={() => setSelectedPaymentInst(null)}
        installment={selectedPaymentInst?.installment || null}
        student={selectedPaymentInst?.student || null}
        onRecord={onRecordPayment}
      />

      {/* View Student Profile Modal */}
      {selectedStudentForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={selectedStudentForView.avatar}
                  name={selectedStudentForView.name}
                  type="student"
                  size="md"
                />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedStudentForView.name}</h3>
                  <p className="text-xs text-indigo-600 font-mono font-bold">{selectedStudentForView.rollNo} • {selectedStudentForView.gender}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudentForView(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Parent Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{selectedStudentForView.parentName} ({selectedStudentForView.parentRelation})</span>
                <span className="text-[11px] text-slate-600">{selectedStudentForView.parentPhone}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">School / College</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{selectedStudentForView.schoolName}</span>
                <span className="text-[11px] text-slate-600">{selectedStudentForView.address}</span>
              </div>
            </div>

            {/* Enrolled Batch Selector */}
            <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Assigned Batch / Program</span>
              <select
                value={selectedStudentForView.batchIds?.[0] || ''}
                onChange={(e) => {
                  const newBatchId = e.target.value;
                  onUpdateStudent(selectedStudentForView.id, {
                    batchIds: newBatchId ? [newBatchId] : [],
                  });
                  setSelectedStudentForView({
                    ...selectedStudentForView,
                    batchIds: newBatchId ? [newBatchId] : [],
                  });
                }}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- No Batch Assigned --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.courseName} • {b.grade})
                  </option>
                ))}
              </select>
            </div>

            {/* Fee Schedule */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-900 uppercase">Fee Installment Ledger</h4>
              <div className="space-y-2">
                {installments
                  .filter((i) => i.studentId === selectedStudentForView.id)
                  .map((inst) => (
                    <div key={inst.id} className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{inst.title}</div>
                        <div className="text-[10px] text-slate-500">Due: {inst.dueDate}</div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="font-bold text-slate-900">₹{inst.amount.toLocaleString('en-IN')}</span>
                        {inst.status === 'paid' ? (
                          <button
                            onClick={() => generateFeeReceiptPDF(selectedStudentForView, inst)}
                            className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-bold text-[10px] flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> PDF Receipt
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStudentForView(null);
                              setSelectedPaymentInst({ installment: inst, student: selectedStudentForView });
                            }}
                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px]"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
