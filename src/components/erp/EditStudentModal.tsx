'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  Lock,
  ShieldAlert,
  Save,
  Users,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Batch, Student } from '@/lib/types';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { logAdminEdit } from '@/lib/audit-service';
import { useAuth } from '@/lib/auth-context';

export interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  batches: Batch[];
  onUpdateStudent: (id: string, updates: Partial<Student>) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  batches,
  onUpdateStudent,
}) => {
  const { user } = useAuth();

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        gender: student.gender || 'Male',
        dob: student.dob || '',
        address: student.address || '',
        schoolName: student.schoolName || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        parentEmail: student.parentEmail || '',
        parentRelation: student.parentRelation || 'Father',
        batchIds: Array.isArray(student.batchIds) ? [...student.batchIds] : [],
        status: student.status || 'active',
      });
      setErrorMessage(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMessage('Student name is required.');
      return;
    }
    if (!formData.parentName?.trim()) {
      setErrorMessage('Parent / Guardian name is required.');
      return;
    }
    if (!formData.parentPhone?.trim()) {
      setErrorMessage('Parent phone number is required.');
      return;
    }
    setErrorMessage(null);
    setIsConfirmSaveOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // 1. Prepare updates without locked identifiers
      const updates: Partial<Student> = {
        name: formData.name?.trim(),
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        gender: formData.gender,
        dob: formData.dob || '',
        address: formData.address?.trim() || '',
        schoolName: formData.schoolName?.trim() || '',
        parentName: formData.parentName?.trim(),
        parentPhone: formData.parentPhone?.trim(),
        parentEmail: formData.parentEmail?.trim() || '',
        parentRelation: formData.parentRelation,
        batchIds: formData.batchIds || [],
        status: formData.status || 'active',
      };

      // 2. Perform optimistic and Firestore update
      await onUpdateStudent(student.id, updates);

      // 3. Write audit log
      await logAdminEdit({
        actorUid: user?.uid || 'admin-session',
        actorEmail: user?.email || 'admin@apexacademy.edu',
        actorRole: 'admin',
        targetId: student.id,
        targetRole: 'student',
        targetName: student.name,
        before: student,
        after: { ...student, ...updates },
        action: 'admin_edit_student_and_parent',
      });

      setIsConfirmSaveOpen(false);
      onClose();
    } catch (err: any) {
      console.error('[EditStudentModal] Save error:', err);
      setErrorMessage(err.message || 'Failed to update student profile.');
      setIsConfirmSaveOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 my-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                  Admin Edit Access
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  {student.rollNo}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Edit Student & Parent Profile
              </h3>
              <p className="text-xs text-slate-500">
                Updating records for <strong className="text-slate-800">{student.name}</strong>. System IDs and credentials remain locked.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* System Locked Identifiers Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-600">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Enrollment ID (Locked)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{student.rollNo}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 italic bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                🔒 System identifier & authentication keys are protected
              </div>
            </div>

            {/* Section 1: Student Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Student Personal Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Student Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Student Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    School / College Name
                  </label>
                  <input
                    type="text"
                    value={formData.schoolName || ''}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Assigned Classroom Batch
                  </label>
                  <select
                    value={formData.batchIds?.[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, batchIds: val ? [val] : [] });
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                  >
                    <option value="">-- No Batch Assigned --</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.courseName} • {b.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Enrollment Status
                  </label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium"
                  >
                    <option value="active">Active (Currently Attending)</option>
                    <option value="inactive">Inactive (Suspended / On Leave)</option>
                    <option value="alumni">Alumni (Course Completed)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Parent / Guardian Information */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-600" /> Parent & Guardian Contact Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Parent / Guardian Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentName || ''}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.parentRelation || 'Father'}
                    onChange={(e) => setFormData({ ...formData, parentRelation: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Parent Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.parentPhone || ''}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Parent Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.parentEmail || ''}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Stage 2 Save Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isConfirmSaveOpen}
        onClose={() => setIsConfirmSaveOpen(false)}
        onConfirm={handleConfirmSave}
        title="Confirm Save Changes"
        message={
          <div>
            Are you sure you want to save these changes for <strong className="text-slate-900">{student.name}</strong>? This action will update the student and parent records and log an audit trail.
          </div>
        }
        confirmText="Yes, Save Changes"
        cancelText="Review Again"
        variant="primary"
        isLoading={isSaving}
      />
    </>
  );
};
