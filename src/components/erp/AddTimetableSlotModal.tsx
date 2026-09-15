'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  GraduationCap,
  Layers,
  MapPin,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Palette,
  Loader2,
} from 'lucide-react';
import { Batch, DayOfWeek, Teacher, TimetableConflict, TimetableSlot, TimetableSlotInput } from '@/lib/types';
import {
  DAYS_OF_WEEK,
  detectTimetableConflicts,
  formatTimeDisplay,
  timeToMinutes,
  validateTimetableSlotInput,
} from '@/lib/timetable-utils';

interface AddTimetableSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  teachers: Teacher[];
  existingSlots: TimetableSlot[];
  initialSlot?: TimetableSlot | null;
  initialDay?: DayOfWeek;
  initialTime?: string;
  initialBatchId?: string;
  onSave: (
    slotData: TimetableSlotInput
  ) => Promise<{ success: boolean; conflict?: TimetableConflict; error?: string }>;
}

const COMMON_ROOMS = [
  'Room 101',
  'Room 102',
  'Room 201',
  'Physics Lab',
  'Chemistry Lab',
  'Hall A (Smart Lab)',
  'Main Auditorium',
  'Online Classroom',
];

const TIME_PRESETS = [
  { start: '08:00', end: '08:45' },
  { start: '09:00', end: '09:45' },
  { start: '10:00', end: '10:45' },
  { start: '11:00', end: '11:45' },
  { start: '12:00', end: '12:45' },
  { start: '14:00', end: '15:30' },
  { start: '16:00', end: '17:30' },
  { start: '17:30', end: '19:00' },
  { start: '19:00', end: '20:30' },
];

const COLOR_OPTIONS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Sky Blue', value: '#0284c7' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Teal', value: '#0d9488' },
];

export const AddTimetableSlotModal: React.FC<AddTimetableSlotModalProps> = ({
  isOpen,
  onClose,
  batches,
  teachers,
  existingSlots,
  initialSlot,
  initialDay = 'Monday',
  initialTime = '10:00',
  initialBatchId,
  onSave,
}) => {
  const isEditing = Boolean(initialSlot);

  const [batchId, setBatchId] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [day, setDay] = useState<DayOfWeek>(initialDay);
  const [startTime, setStartTime] = useState<string>(initialTime);
  const [endTime, setEndTime] = useState<string>('10:45');
  const [roomId, setRoomId] = useState<string>('Room 101');
  const [color, setColor] = useState<string>('#4f46e5');
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync initial values on open or edit
  useEffect(() => {
    if (!isOpen) {
      setSubmitError(null);
      return;
    }

    if (initialSlot) {
      setBatchId(initialSlot.batchId || '');
      setSubjectName(initialSlot.subjectName || initialSlot.subjectId || '');
      setTeacherId(initialSlot.teacherId || '');
      setDay(initialSlot.day || 'Monday');
      setStartTime(initialSlot.startTime || '10:00');
      setEndTime(initialSlot.endTime || '10:45');
      setRoomId(initialSlot.roomId || initialSlot.roomName || 'Room 101');
      setColor(initialSlot.color || '#4f46e5');
      setAcademicYear(initialSlot.academicYear || '2026-2027');
    } else {
      const defaultBatch = initialBatchId
        ? batches.find((b) => b.id === initialBatchId) || batches[0]
        : batches[0];

      const defaultBatchId = defaultBatch?.id || '';
      setBatchId(defaultBatchId);
      setSubjectName(defaultBatch?.subject?.split(',')[0]?.trim() || defaultBatch?.name || 'Mathematics');

      const defaultTeacher = defaultBatch?.teacherId
        ? teachers.find((t) => t.id === defaultBatch.teacherId) || teachers[0]
        : teachers[0];
      setTeacherId(defaultTeacher?.id || '');

      setDay(initialDay || 'Monday');
      setStartTime(initialTime || '10:00');
      const startMins = timeToMinutes(initialTime || '10:00');
      const endMins = startMins + 45;
      const endHrs = Math.floor(endMins / 60);
      const endM = endMins % 60;
      setEndTime(`${endHrs.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);

      setRoomId(defaultBatch?.room || 'Room 101');
      setColor(defaultBatch?.accentColor || '#4f46e5');
      setAcademicYear(defaultBatch?.academicYear || '2026-2027');
    }
  }, [isOpen, initialSlot, initialDay, initialTime, initialBatchId, batches, teachers]);

  // When batch changes, suggest its lead teacher & subject
  const handleBatchChange = (newBatchId: string) => {
    setBatchId(newBatchId);
    const selected = batches.find((b) => b.id === newBatchId);
    if (selected) {
      if (selected.subject) {
        setSubjectName(selected.subject.split(',')[0].trim());
      }
      if (selected.teacherId) {
        setTeacherId(selected.teacherId);
      }
      if (selected.room) {
        setRoomId(selected.room);
      }
      if (selected.accentColor) {
        setColor(selected.accentColor);
      }
    }
  };

  // Selected entities resolution
  const selectedBatch = useMemo(() => batches.find((b) => b.id === batchId), [batches, batchId]);
  const selectedTeacher = useMemo(() => teachers.find((t) => t.id === teacherId), [teachers, teacherId]);

  // Candidate Slot Construction
  const candidateSlotInput = useMemo<TimetableSlotInput & { id?: string }>(() => {
    return {
      id: initialSlot?.id,
      batchId,
      batchName: selectedBatch?.name || batchId,
      subjectId: subjectName.toLowerCase().replace(/\s+/g, '-'),
      subjectName,
      teacherId,
      teacherName: selectedTeacher?.name || teacherId,
      day,
      startTime,
      endTime,
      roomId,
      roomName: roomId,
      color,
      academicYear,
    };
  }, [
    initialSlot,
    batchId,
    selectedBatch,
    subjectName,
    teacherId,
    selectedTeacher,
    day,
    startTime,
    endTime,
    roomId,
    color,
    academicYear,
  ]);

  // Live Conflict Evaluation
  const activeConflicts = useMemo(() => {
    if (!batchId || !teacherId || !roomId || !startTime || !endTime || !day) {
      return [];
    }
    return detectTimetableConflicts(existingSlots, candidateSlotInput, initialSlot?.id);
  }, [existingSlots, candidateSlotInput, initialSlot, batchId, teacherId, roomId, startTime, endTime, day]);

  // Validation
  const validation = useMemo(() => {
    return validateTimetableSlotInput(candidateSlotInput);
  }, [candidateSlotInput]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validation.valid) {
      setSubmitError(validation.errors[0]);
      return;
    }

    if (activeConflicts.length > 0) {
      setSubmitError(activeConflicts[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSave(candidateSlotInput);
      if (!res.success) {
        setSubmitError(res.error || 'Failed to save timetable slot.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? 'Edit Timetable Slot' : 'Create Timetable Slot'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update schedule, teacher, or room allocation with conflict checks'
                  : 'Assign lecture time, teacher, and classroom with zero double-booking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Live Conflict Alert Banner */}
          {activeConflicts.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5 animate-shake">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Scheduling Conflict Detected</span>
              </div>
              <ul className="space-y-1 text-[11px] list-disc list-inside text-rose-700">
                {activeConflicts.map((c, i) => (
                  <li key={i}>{c.message}</li>
                ))}
              </ul>
              <div className="text-[10px] text-rose-600/80 font-medium">
                Please adjust the day, time, teacher, or room to resolve the conflict.
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {submitError && activeConflicts.length === 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Section 1: Batch & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Target Batch</span>
              </label>
              <select
                value={batchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                required
              >
                {batches.length === 0 ? (
                  <option value="">No batches available</option>
                ) : (
                  batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.grade || 'All Grades'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Subject / Course</span>
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Mathematics, Physics"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                required
              />
            </div>
          </div>

          {/* Section 2: Teacher & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assigned Faculty / Teacher</span>
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                required
              >
                {teachers.length === 0 ? (
                  <option value="">No faculty available</option>
                ) : (
                  teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.qualifications ? `(${t.qualifications})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Classroom / Room</span>
              </label>
              <input
                type="text"
                list="room-options"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. Room 101, Lab A"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                required
              />
              <datalist id="room-options">
                {COMMON_ROOMS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Section 3: Day & Time Range */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3.5">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Day of the Week</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`py-2 px-1 text-center rounded-xl font-bold transition-all text-[11px] ${
                      day === d
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {d.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Start Time (24h)</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-slate-800 text-sm"
                  required
                />
                <span className="text-[10px] text-slate-400 font-medium">
                  Display: {formatTimeDisplay(startTime)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>End Time (24h)</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-slate-800 text-sm"
                  required
                />
                <span className="text-[10px] text-slate-400 font-medium">
                  Display: {formatTimeDisplay(endTime)}
                </span>
              </div>
            </div>

            {/* Quick Time Presets */}
            <div className="pt-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Time Presets:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStartTime(p.start);
                      setEndTime(p.end);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-[10px] font-semibold text-slate-600 transition-colors"
                  >
                    {p.start} - {p.end}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Color Badge */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar Badge Accent Color</span>
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-7 h-7 rounded-xl transition-transform ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs'
                      : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            {activeConflicts.length === 0 && validation.valid ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" /> Ready to Save
              </span>
            ) : (
              <span className="text-[11px] text-amber-600 font-medium">
                {activeConflicts.length > 0
                  ? `${activeConflicts.length} conflict(s) must be resolved`
                  : 'Complete all required fields'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || activeConflicts.length > 0 || !validation.valid}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                'Update Slot'
              ) : (
                'Create Slot'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
