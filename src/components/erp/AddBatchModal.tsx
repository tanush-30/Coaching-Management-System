'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, GraduationCap, Calendar, Clock, DollarSign, Hash, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Batch, Teacher } from '@/lib/types';
import { useERPStore } from '@/lib/store';
import { findNextAvailableId, validateUniqueMemberId } from '@/lib/auth-utils';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  batches?: Batch[];
  onAddBatch: (batchData: Omit<Batch, 'id' | 'enrolledCount'> & { batchCode?: string }) => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  teachers,
  batches: propBatches,
  onAddBatch,
}) => {
  const { batches: storeBatches } = useERPStore();
  const currentBatches = propBatches || storeBatches;

  const [batchCode, setBatchCode] = useState('');
  const [idValidation, setIdValidation] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; message?: string }>({
    status: 'idle',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('Class 12');
  const [subject, setSubject] = useState('Physics, Chemistry, Mathematics');
  const [teacherId, setTeacherId] = useState(teachers[0]?.id || '');
  const [scheduleDays, setScheduleDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [startTime, setStartTime] = useState('04:00 PM');
  const [endTime, setEndTime] = useState('06:30 PM');
  const [room, setRoom] = useState('Hall A (Smart Lab)');
  const [capacity, setCapacity] = useState<number>(35);
  const [annualFee, setAnnualFee] = useState<number>(85000);
  const [accentColor, setAccentColor] = useState('#4f46e5');

  // Auto-suggest next truly available Batch UID on open
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      findNextAvailableId(
        'BAT',
        currentBatches.map((b) => b.batchCode || b.id),
        (id) => validateUniqueMemberId(id, { batches: currentBatches }),
        2026
      ).then((nextId) => {
        setBatchCode(nextId);
        setIdValidation({ status: 'valid', message: 'Batch UID is available' });
      });
    } else {
      setBatchCode('');
      setIdValidation({ status: 'idle' });
      setFormError(null);
    }
  }, [isOpen]);

  // Real-time batch code uniqueness check
  useEffect(() => {
    setFormError(null);
    const trimmed = batchCode.trim().toUpperCase();
    if (!trimmed) {
      setIdValidation({ status: 'invalid', message: 'Batch UID / Code is required' });
      return;
    }

    let isMounted = true;
    setIdValidation({ status: 'checking' });

    const timeout = setTimeout(async () => {
      const res = await validateUniqueMemberId(trimmed, { batches: currentBatches });
      if (isMounted) {
        if (res.available) {
          setIdValidation({ status: 'valid', message: 'Batch UID is available' });
        } else {
          setIdValidation({ status: 'invalid', message: res.reason || 'This ID is already in use' });
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [batchCode]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalBatchCode = batchCode.trim().toUpperCase();
    if (!finalBatchCode) {
      setFormError('Batch UID / Code is required.');
      return;
    }

    if (!name.trim() || !courseName.trim()) {
      setFormError('Please enter batch name and course name.');
      return;
    }

    const assignedTeacher = teachers.find((t) => t.id === teacherId);

    setIsSubmitting(true);
    try {
      // 1. Proactive availability check before saving
      const preCheck = await validateUniqueMemberId(finalBatchCode, { batches: currentBatches });
      if (!preCheck.available) {
        setFormError(preCheck.reason || `Batch UID "${finalBatchCode}" is already in use.`);
        setIdValidation({ status: 'invalid', message: preCheck.reason || 'This ID is already in use' });
        setIsSubmitting(false);
        return;
      }

      // 2. Add batch to local store & Firestore
      await onAddBatch({
        batchCode: finalBatchCode,
        name: name.trim(),
        courseName: courseName.trim(),
        grade,
        subject,
        teacherId,
        teacherName: assignedTeacher ? assignedTeacher.name : 'Dr. Rajesh Verma',
        scheduleDays,
        startTime,
        endTime,
        room,
        capacity,
        annualFee,
        accentColor,
        academicYear: '2026-2027',
      });

      onClose();
    } catch (err: any) {
      console.error('[AddBatchModal] Error adding batch:', err);
      setFormError(err?.message || 'Failed to create batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 relative overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />

        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Create New Course Batch</h3>
              <p className="text-xs text-slate-500">Configure UID, schedule, classroom, capacity, and faculty</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5 font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold">Batch Creation Error</div>
                <div className="text-[11px] text-rose-600 leading-relaxed">{formError}</div>
              </div>
            </div>
          )}
          {/* Unique Batch UID Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-600" />
              <span>Batch UID / Unique Code</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
              placeholder="e.g. BAT-2026-001 or BAT-JEE-ADV-2026"
              className={`w-full text-xs font-mono font-bold bg-white border rounded-xl px-3 py-2.5 outline-none transition-all ${
                idValidation.status === 'valid'
                  ? 'border-emerald-500 ring-1 ring-emerald-500/20'
                  : idValidation.status === 'invalid'
                  ? 'border-rose-500 ring-1 ring-rose-500/20 bg-rose-50/40'
                  : 'border-slate-300 focus:border-indigo-500'
              }`}
            />
            <div className="text-[11px] font-semibold flex items-center gap-1">
              {idValidation.status === 'valid' && (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {idValidation.message}
                </span>
              )}
              {idValidation.status === 'invalid' && (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {idValidation.message}
                </span>
              )}
              {idValidation.status === 'checking' && (
                <span className="text-amber-600">Checking Batch UID uniqueness...</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batch Display Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. JEE Pinnacle 2027"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Course Program Name *</label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. 2-Year Integrated IIT-JEE"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard / Target Class</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Class 12">Class 12 (Target 2027)</option>
                <option value="Class 11">Class 11 (Target 2028)</option>
                <option value="Class 10">Class 10 (CBSE Boards)</option>
                <option value="Class 9">Class 9 (Foundation / NTSE)</option>
                <option value="Dropper / Repeater">Dropper / Repeater (Intensive)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Lead Faculty</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {teachers.length === 0 ? (
                  <option value="">No faculty enrolled yet</option>
                ) : (
                  teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subjects?.[0] || 'General'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Schedule Days */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Weekly Class Days</label>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const isSelected = scheduleDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Timing</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="04:00 PM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Classroom / Hall</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Hall A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 30)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Annual Course Fee (₹)</label>
              <input
                type="number"
                value={annualFee}
                onChange={(e) => setAnnualFee(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Theme Color</label>
              <div className="flex items-center gap-2 mt-1">
                {['#4f46e5', '#059669', '#d97706', '#0284c7', '#dc2626', '#7c3aed'].map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setAccentColor(color)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      accentColor === color ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Creating Batch...' : 'Create Batch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

