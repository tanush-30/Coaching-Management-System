'use client';

import React, { useState } from 'react';
import { X, UserPlus, GraduationCap, DollarSign, Calendar, Phone, Mail, Building } from 'lucide-react';
import { Batch, Student } from '@/lib/types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onAddStudent: (
    studentData: Omit<Student, 'id' | 'rollNo' | 'paidFee' | 'pendingFee'>,
    installmentPlan?: { count: number; amounts: number[]; dueDates: string[] }
  ) => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  batches,
  onAddStudent,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('2008-06-15');
  const [address, setAddress] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  // Parent info
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentRelation, setParentRelation] = useState<'Father' | 'Mother' | 'Guardian'>('Father');
  
  // Batch & Fee Plan
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [totalFee, setTotalFee] = useState<number>(batches[0]?.annualFee || 85000);
  const [installmentCount, setInstallmentCount] = useState<number>(3);

  if (!isOpen) return null;

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const b = batches.find(x => x.id === batchId);
    if (b) setTotalFee(b.annualFee);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !parentName || !parentPhone) {
      alert('Please fill all mandatory fields (Student Name, Student Phone, Parent Name, Parent Phone).');
      return;
    }

    // Calculate installment split
    const amounts: number[] = [];
    const dueDates: string[] = [];
    const baseSplit = Math.round(totalFee / installmentCount);

    for (let i = 0; i < installmentCount; i++) {
      if (i === installmentCount - 1) {
        // remainder to last
        const prevTotal = amounts.reduce((a, b) => a + b, 0);
        amounts.push(totalFee - prevTotal);
      } else {
        amounts.push(baseSplit);
      }

      // Generate staggered due dates
      const date = new Date();
      date.setMonth(date.getMonth() + i * 3);
      dueDates.push(date.toISOString().split('T')[0]);
    }

    onAddStudent(
      {
        name,
        email: email || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        phone,
        avatar: `https://images.unsplash.com/photo-${gender === 'Female' ? '1534528741775-53994a69daeb' : '1539571696357-5a69c17a67c6'}?w=150&auto=format&fit=crop&q=80`,
        gender,
        dob,
        address: address || 'New Delhi, India',
        schoolName: schoolName || 'Delhi Public School',
        parentName,
        parentPhone,
        parentEmail: parentEmail || `${parentName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        parentRelation,
        batchIds: selectedBatchId ? [selectedBatchId] : [],
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active',
        totalFee,
      },
      {
        count: installmentCount,
        amounts,
        dueDates,
      }
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Student Enrollment Form</h3>
              <p className="text-xs text-slate-500">Register profile, assign batch, and configure automated fee schedule</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* 1. Student Personal Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-indigo-600 flex items-center gap-1.5">
              <span>1. Student Profile</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aryan Malhotra"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Phone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98111 00000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current School / College</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Delhi Public School"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Sector 15, Noida"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Parent / Guardian Details */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-indigo-600">
              2. Parent / Guardian Details (For WhatsApp Alerts)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent Full Name *</label>
                <input
                  type="text"
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. Sanjay Malhotra"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parent WhatsApp Mobile *</label>
                <input
                  type="text"
                  required
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+91 98111 99999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relation</label>
                <select
                  value={parentRelation}
                  onChange={(e) => setParentRelation(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Batch Assignment & Fee Structure */}
          <div className="space-y-3 pt-3 border-t">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-indigo-600">
              3. Course Assignment & Automated Fee Plan
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Batch</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.grade})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Course Fee (₹)</label>
                <input
                  type="number"
                  value={totalFee}
                  onChange={(e) => setTotalFee(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Installment Split</label>
                <select
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="1">1 (Lump-sum single payment)</option>
                  <option value="2">2 Installments (Half-Yearly)</option>
                  <option value="3">3 Installments (Recommended)</option>
                  <option value="4">4 Installments (Quarterly)</option>
                </select>
              </div>
            </div>

            {/* Simulated Installments Preview */}
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Auto-generates {installmentCount} installments of ~₹{Math.round(totalFee / installmentCount).toLocaleString('en-IN')} each with 1-click UPI links.
              </span>
              <span className="font-extrabold text-indigo-700 text-sm">Total: ₹{totalFee.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Student & Generate Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
