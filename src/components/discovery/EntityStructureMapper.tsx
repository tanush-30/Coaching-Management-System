'use client';

import React, { useState } from 'react';
import { 
  Layers, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { INITIAL_BATCHES, INITIAL_TEACHERS } from '@/lib/mock-data';

export const EntityStructureMapper: React.FC = () => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(INITIAL_BATCHES[0].id);
  const [activeTab, setActiveTab] = useState<'batches' | 'fees' | 'roles'>('batches');

  const selectedBatch = INITIAL_BATCHES.find(b => b.id === selectedBatchId) || INITIAL_BATCHES[0];

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
        {[
          { id: 'batches', label: '1. Course & Batch Mapping', icon: GraduationCap },
          { id: 'fees', label: '2. Fee Structure & Installment Tiers', icon: DollarSign },
          { id: 'roles', label: '3. Staff Roles & RBAC Matrix', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                isSelected 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. BATCHES TAB */}
      {activeTab === 'batches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Batch Selector List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mapped Academy Batches</h4>
            {INITIAL_BATCHES.map(batch => {
              const isSelected = batch.id === selectedBatchId;
              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{batch.grade}</span>
                    <span className="text-xs font-bold text-indigo-600">₹{batch.annualFee.toLocaleString('en-IN')}/yr</span>
                  </div>
                  <h5 className="font-bold text-sm text-slate-900 mt-2">{batch.name}</h5>
                  <p className="text-xs text-slate-500 mt-0.5">{batch.courseName}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>{batch.enrolledCount} / {batch.capacity} Students</span>
                    <span className="font-medium text-slate-700">{batch.scheduleDays.join(', ')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Batch Blueprint Specification Details */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{selectedBatch.grade} • {selectedBatch.subject}</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedBatch.name}</h3>
                <p className="text-xs text-slate-500">{selectedBatch.courseName} (Academic Year: {selectedBatch.academicYear})</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-right">
                <span className="text-[10px] text-emerald-600 font-bold uppercase block">Annual Course Fee</span>
                <span className="text-lg font-extrabold text-emerald-700">₹{selectedBatch.annualFee.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Grid Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Assigned Faculty</span>
                <span className="font-bold text-xs text-slate-900 block mt-1">{selectedBatch.teacherName}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Weekly Schedule</span>
                <span className="font-bold text-xs text-slate-900 block mt-1">{selectedBatch.scheduleDays.join(', ')}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Timing & Hall</span>
                <span className="font-bold text-xs text-slate-900 block mt-1">{selectedBatch.startTime} ({selectedBatch.room})</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Batch Capacity</span>
                <span className="font-bold text-xs text-slate-900 block mt-1">{selectedBatch.enrolledCount} / {selectedBatch.capacity} ({Math.round((selectedBatch.enrolledCount/selectedBatch.capacity)*100)}%)</span>
              </div>
            </div>

            {/* Simulated Installment Split */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase">Standard Installment Tier Architecture</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <div className="font-bold text-indigo-900">Term 1: Admission & Tech Kit</div>
                  <div className="text-base font-extrabold text-indigo-700 mt-1">₹{Math.round(selectedBatch.annualFee * 0.4).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Due: On Admission (Apr)</div>
                </div>
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <div className="font-bold text-indigo-900">Term 2: Mid-Term & Test Series</div>
                  <div className="text-base font-extrabold text-indigo-700 mt-1">₹{Math.round(selectedBatch.annualFee * 0.3).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Due: Month 4 (Jul)</div>
                </div>
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40">
                  <div className="font-bold text-indigo-900">Term 3: Revision & Grand Mocks</div>
                  <div className="text-base font-extrabold text-indigo-700 mt-1">₹{Math.round(selectedBatch.annualFee * 0.3).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Due: Month 7 (Oct)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FEES TAB */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Fee Policy & Automated Penalty Trigger Blueprint</h3>
              <p className="text-xs text-slate-500">Configured rule engine for auto-reminders and 1-click UPI payments.</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
              Automated Razorpay Webhook Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-bold text-indigo-600 uppercase">T-3 Days Alert</span>
              <h4 className="font-bold text-sm text-slate-900 mt-1">Soft WhatsApp Reminder</h4>
              <p className="text-xs text-slate-600 mt-1">Dispatches polite reminder with student name, term amount and Razorpay payment link.</p>
            </div>
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
              <span className="text-xs font-bold text-amber-700 uppercase">Due Date Alert</span>
              <h4 className="font-bold text-sm text-slate-900 mt-1">Urgent Due Notice</h4>
              <p className="text-xs text-slate-600 mt-1">Notifies parents that installment is due today to avoid late registration holds.</p>
            </div>
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
              <span className="text-xs font-bold text-rose-700 uppercase">T+7 Days Overdue</span>
              <h4 className="font-bold text-sm text-slate-900 mt-1">Admin Follow-up Flag</h4>
              <p className="text-xs text-slate-600 mt-1">Flags student card in Admin dashboard with 1-click WhatsApp escalation button.</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm overflow-x-auto">
          <h3 className="text-lg font-bold text-slate-900">Role-Based Access Control (RBAC) Matrix</h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 rounded-tl-lg">Feature Module</th>
                <th className="p-3 text-center">Super Admin (Owner)</th>
                <th className="p-3 text-center">Faculty / Teacher</th>
                <th className="p-3 text-center">Parent Portal</th>
                <th className="p-3 rounded-tr-lg text-center">Student Portal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[
                { feature: 'View Financial Revenue & Overdue Dues', admin: true, teacher: false, parent: false, student: false },
                { feature: 'Register New Student & Set Fee Structure', admin: true, teacher: false, parent: false, student: false },
                { feature: 'Mark Daily Batch Attendance', admin: true, teacher: true, parent: false, student: false },
                { feature: 'Receive Real-Time Absence WhatsApp Alerts', admin: false, teacher: false, parent: true, student: false },
                { feature: 'Record Cash/UPI Payment & Print Receipt', admin: true, teacher: false, parent: false, student: false },
                { feature: '1-Click Pay Online via UPI / GPay', admin: false, teacher: false, parent: true, student: false },
                { feature: 'Enter Exam Marks & Topic Breakdown', admin: true, teacher: true, parent: false, student: false },
                { feature: 'Download Branded PDF Report Cards', admin: true, teacher: true, parent: true, student: true },
                { feature: 'Access Homework & Study Notes', admin: true, teacher: true, parent: true, student: true },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">{row.feature}</td>
                  <td className="p-3 text-center">
                    {row.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="p-3 text-center">
                    {row.teacher ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="p-3 text-center">
                    {row.parent ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                  <td className="p-3 text-center">
                    {row.student ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
