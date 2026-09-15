'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  GraduationCap,
  BookOpen,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Layers,
  Check,
} from 'lucide-react';
import { Batch, Teacher } from '@/lib/types';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { logAdminEdit } from '@/lib/audit-service';
import { useAuth } from '@/lib/auth-context';

export interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  batches: Batch[];
  onUpdateTeacher: (id: string, updates: Partial<Teacher>) => void;
}

export const EditTeacherModal: React.FC<EditTeacherModalProps> = ({
  isOpen,
  onClose,
  teacher,
  batches,
  onUpdateTeacher,
}) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<Teacher>>({});
  const [subjectsInput, setSubjectsInput] = useState('');
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        qualifications: teacher.qualifications || '',
        subjects: Array.isArray(teacher.subjects) ? [...teacher.subjects] : [],
        status: teacher.status || 'active',
        assignedBatches: Array.isArray(teacher.assignedBatches) ? [...teacher.assignedBatches] : [],
      });
      setSubjectsInput((teacher.subjects || []).join(', '));
      setErrorMessage(null);
    }
  }, [teacher]);

  if (!isOpen || !teacher) return null;

  const handleToggleBatch = (batchId: string) => {
    const current = formData.assignedBatches || [];
    const updated = current.includes(batchId)
      ? current.filter((id) => id !== batchId)
      : [...current, batchId];
    setFormData({ ...formData, assignedBatches: updated });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMessage('Faculty full name is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }
    setErrorMessage(null);
    setIsConfirmSaveOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const parsedSubjects = subjectsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updates: Partial<Teacher> = {
        name: formData.name?.trim(),
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        qualifications: formData.qualifications?.trim() || '',
        subjects: parsedSubjects,
        status: formData.status || 'active',
        assignedBatches: formData.assignedBatches || [],
      };

      // 1. Update Firestore & Local Store
      await onUpdateTeacher(teacher.id, updates);

      // 2. Record audit log
      await logAdminEdit({
        actorUid: user?.uid || 'admin-session',
        actorEmail: user?.email || 'admin@apexacademy.edu',
        actorRole: 'admin',
        targetId: teacher.id,
        targetRole: 'faculty',
        targetName: teacher.name,
        before: teacher,
        after: { ...teacher, ...updates },
        action: 'admin_edit_faculty',
      });

      setIsConfirmSaveOpen(false);
      onClose();
    } catch (err: any) {
      console.error('[EditTeacherModal] Save error:', err);
      setErrorMessage(err.message || 'Failed to update faculty profile.');
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
                <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                  Admin Edit Access
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  {teacher.facultyId || teacher.id}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Edit Faculty & Teacher Profile
              </h3>
              <p className="text-xs text-slate-500">
                Updating records for <strong className="text-slate-800">{teacher.name}</strong>. System IDs and credentials remain locked.
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
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Faculty ID (Locked)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {teacher.facultyId || teacher.id}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 italic bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                🔒 System identifier & authentication keys are protected
              </div>
            </div>

            {/* Faculty Details Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Qualifications & Degree
                </label>
                <input
                  type="text"
                  value={formData.qualifications || ''}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="e.g. M.Sc Physics, B.Ed"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Subjects / Specializations (comma separated)
              </label>
              <input
                type="text"
                value={subjectsInput}
                onChange={(e) => setSubjectsInput(e.target.value)}
                placeholder="e.g. Physics, Advanced Mechanics, Thermodynamics"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>

            {/* Status Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Faculty Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'active' })}
                  className={`text-xs py-2.5 rounded-xl font-bold border transition-all ${
                    formData.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  Active Instructor
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'on_leave' })}
                  className={`text-xs py-2.5 rounded-xl font-bold border transition-all ${
                    formData.status === 'on_leave'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  On Leave
                </button>
              </div>
            </div>

            {/* Assigned Batches */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Assigned Batches (Classroom Coverage)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {(formData.assignedBatches || []).length} assigned
                </span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {batches.map((batch) => {
                  const isAssigned = (formData.assignedBatches || []).includes(batch.id);
                  return (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => handleToggleBatch(batch.id)}
                      className={`text-left p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                        isAssigned
                          ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold truncate">{batch.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {batch.grade} • {batch.subject}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isAssigned ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isAssigned && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
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
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
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
            Are you sure you want to save these changes for <strong className="text-slate-900">{teacher.name}</strong>? This action will update the faculty profile and log an audit trail.
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
