'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  GraduationCap,
  Layers,
  MapPin,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Grid,
  List,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Users,
  Sparkles,
} from 'lucide-react';
import { Batch, DayOfWeek, ScheduleChangeEvent, Teacher, TimetableConflict, TimetableSlot, TimetableSlotInput } from '@/lib/types';
import { DAYS_OF_WEEK, detectScheduleChanges, formatTimeDisplay, timeToMinutes } from '@/lib/timetable-utils';
import { AddTimetableSlotModal } from './AddTimetableSlotModal';
import { ScheduleChangeAlertModal } from './ScheduleChangeAlertModal';

interface TimetableManagementProps {
  batches: Batch[];
  teachers: Teacher[];
  timetableSlots: TimetableSlot[];
  onAddSlot: (
    slotInput: TimetableSlotInput
  ) => Promise<{ success: boolean; conflict?: TimetableConflict; error?: string; slotId?: string }>;
  onUpdateSlot: (
    id: string,
    slotInput: Partial<TimetableSlotInput>
  ) => Promise<{ success: boolean; conflict?: TimetableConflict; error?: string }>;
  onDeleteSlot: (id: string) => Promise<{ success: boolean; error?: string }>;
  onSendBroadcast?: (targetBatchIds: string | string[], title: string, message: string) => Promise<any>;
}

export const TimetableManagement: React.FC<TimetableManagementProps> = ({
  batches,
  teachers,
  timetableSlots,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onSendBroadcast,
}) => {
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterType, setFilterType] = useState<'batch' | 'teacher' | 'room'>('batch');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [presetDay, setPresetDay] = useState<DayOfWeek>('Monday');
  const [presetTime, setPresetTime] = useState<string>('10:00');

  // Delete modal state
  const [slotToDelete, setSlotToDelete] = useState<TimetableSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Schedule Change Announcement state
  const [pendingChangeEvent, setPendingChangeEvent] = useState<ScheduleChangeEvent | null>(null);

  // Extract unique rooms from slots & batches
  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    timetableSlots.forEach((s) => {
      if (s.roomId) roomSet.add(s.roomId);
      if (s.roomName) roomSet.add(s.roomName);
    });
    batches.forEach((b) => {
      if (b.room) roomSet.add(b.room);
    });
    return Array.from(roomSet).sort();
  }, [timetableSlots, batches]);

  // Filtered slots calculation
  const filteredSlots = useMemo(() => {
    return timetableSlots.filter((slot) => {
      // 1. Filter by specific category
      if (filterType === 'batch' && selectedBatchId !== 'ALL' && slot.batchId !== selectedBatchId) {
        return false;
      }
      if (filterType === 'teacher' && selectedTeacherId !== 'ALL' && slot.teacherId !== selectedTeacherId) {
        return false;
      }
      if (
        filterType === 'room' &&
        selectedRoom !== 'ALL' &&
        slot.roomId.toLowerCase() !== selectedRoom.toLowerCase() &&
        slot.roomName?.toLowerCase() !== selectedRoom.toLowerCase()
      ) {
        return false;
      }

      // 2. Global search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = slot.subjectName?.toLowerCase().includes(q) || slot.subjectId?.toLowerCase().includes(q);
        const matchTeacher = slot.teacherName?.toLowerCase().includes(q);
        const matchBatch = slot.batchName?.toLowerCase().includes(q);
        const matchRoom = slot.roomName?.toLowerCase().includes(q) || slot.roomId?.toLowerCase().includes(q);
        if (!matchSubject && !matchTeacher && !matchBatch && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [timetableSlots, filterType, selectedBatchId, selectedTeacherId, selectedRoom, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalSlots = timetableSlots.length;
    const activeTeachers = new Set(timetableSlots.map((s) => s.teacherId)).size;
    const activeRooms = new Set(timetableSlots.map((s) => s.roomId)).size;

    let totalMinutes = 0;
    timetableSlots.forEach((s) => {
      const diff = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
      if (diff > 0) totalMinutes += diff;
    });
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    return {
      totalSlots,
      activeTeachers,
      activeRooms,
      totalHours,
    };
  }, [timetableSlots]);

  // Handlers
  const handleOpenCreate = (day?: DayOfWeek, time?: string) => {
    setEditingSlot(null);
    if (day) setPresetDay(day);
    if (time) setPresetTime(time);
    setIsSlotModalOpen(true);
  };

  const handleOpenEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (slotInput: TimetableSlotInput) => {
    if (editingSlot) {
      const changeEvent = detectScheduleChanges(editingSlot, slotInput);
      const res = await onUpdateSlot(editingSlot.id, slotInput);
      if (res.success && changeEvent && onSendBroadcast) {
        setPendingChangeEvent(changeEvent);
      }
      return res;
    } else {
      return await onAddSlot(slotInput);
    }
  };

  const handleConfirmAnnouncement = async (announcementText: string) => {
    if (!pendingChangeEvent || !onSendBroadcast) return;
    await onSendBroadcast([pendingChangeEvent.batchId], 'Schedule Update', announcementText);
    setPendingChangeEvent(null);
  };

  const confirmDelete = async () => {
    if (!slotToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteSlot(slotToDelete.id);
      setSlotToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-600/10 text-indigo-600">
              <Calendar className="w-6 h-6" />
            </span>
            <span>Weekly Timetable & Room Allocation</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build clash-free master schedules, manage teacher assignments, and optimize classroom utilization.
          </p>
        </div>

        <button
          onClick={() => handleOpenCreate()}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Timetable Slot</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Scheduled Slots</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalSlots}</div>
          <div className="text-[10px] text-slate-500 font-medium">Across all weekly batches</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Faculty Teaching</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.activeTeachers}</div>
          <div className="text-[10px] text-slate-500 font-medium">Assigned to active slots</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Classrooms in Use</span>
            <MapPin className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.activeRooms}</div>
          <div className="text-[10px] text-slate-500 font-medium">Physical & virtual rooms</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Weekly Hours</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalHours} hrs</div>
          <div className="text-[10px] text-slate-500 font-medium">Total lecture instruction</div>
        </div>
      </div>

      {/* Control Bar: Filters & View Modes */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Filter Switcher & Entity Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Type Toggle */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setFilterType('batch')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'batch'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              By Batch
            </button>
            <button
              onClick={() => setFilterType('teacher')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'teacher'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              By Faculty
            </button>
            <button
              onClick={() => setFilterType('room')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'room'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              By Room
            </button>
          </div>

          {/* Dynamic Entity Dropdown */}
          {filterType === 'batch' && (
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Batches ({batches.length})</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.grade || 'All Grades'})
                </option>
              ))}
            </select>
          )}

          {filterType === 'teacher' && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Faculty ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {filterType === 'room' && (
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Classrooms ({availableRooms.length})</option>
              {availableRooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Search & View Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, room, teacher..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Weekly Matrix Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List / Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid vs Table */}
      {viewMode === 'grid' ? (
        /* Weekly Matrix Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3.5">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = filteredSlots
              .filter((s) => s.day === day)
              .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            return (
              <div
                key={day}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col min-h-[350px] overflow-hidden"
              >
                {/* Day Header */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{day}</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200/70 text-slate-600">
                      {daySlots.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenCreate(day)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 flex items-center justify-center text-slate-500 transition-colors"
                    title={`Add slot on ${day}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Slots Column */}
                <div className="p-3 flex-1 space-y-2.5 overflow-y-auto">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-2xl text-[11px] text-slate-400">
                      <span>No lectures scheduled</span>
                      <button
                        onClick={() => handleOpenCreate(day)}
                        className="mt-2 text-indigo-600 hover:underline font-bold text-[10px] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Slot
                      </button>
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        style={{ borderLeftColor: slot.color || '#4f46e5' }}
                        className="p-3 bg-slate-50/80 hover:bg-white rounded-2xl border-y border-r border-l-4 border-slate-100 shadow-2xs hover:shadow-xs transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-xs line-clamp-1">
                              {slot.subjectName || slot.subjectId}
                            </span>
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                              </span>
                            </div>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(slot)}
                              className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                              title="Edit slot"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setSlotToDelete(slot)}
                              className="p-1 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{slot.batchName || slot.batchId}</span>
                          </div>

                          <div className="flex items-center gap-1.5 line-clamp-1">
                            <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{slot.teacherName || 'Assigned Faculty'}</span>
                          </div>

                          <div className="flex items-center gap-1.5 line-clamp-1 text-slate-500 text-[10px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{slot.roomName || slot.roomId}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Day & Time</th>
                  <th className="px-5 py-3.5">Batch</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Assigned Faculty</th>
                  <th className="px-5 py-3.5">Classroom</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSlots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No timetable slots match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSlots
                    .sort((a, b) => {
                      const dayDiff = DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day);
                      if (dayDiff !== 0) return dayDiff;
                      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
                    })
                    .map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium">
                          <div className="font-bold text-slate-900">{slot.day}</div>
                          <div className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-800">{slot.batchName || slot.batchId}</span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            style={{ backgroundColor: `${slot.color || '#4f46e5'}15`, color: slot.color || '#4f46e5' }}
                            className="px-2.5 py-1 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{slot.subjectName || slot.subjectId}</span>
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.teacherName || slot.teacherId}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="text-slate-600 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.roomName || slot.roomId}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(slot)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit slot"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSlotToDelete(slot)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Timetable Slot Modal */}
      <AddTimetableSlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        batches={batches}
        teachers={teachers}
        existingSlots={timetableSlots}
        initialSlot={editingSlot}
        initialDay={presetDay}
        initialTime={presetTime}
        initialBatchId={selectedBatchId !== 'ALL' ? selectedBatchId : undefined}
        onSave={handleSaveSlot}
      />

      {/* Delete Confirmation Modal */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Timetable Slot?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove the <strong className="text-slate-800">{slotToDelete.subjectName} ({slotToDelete.day} {formatTimeDisplay(slotToDelete.startTime)})</strong> slot for {slotToDelete.batchName}? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Schedule Change Announcement Confirmation Modal */}
      <ScheduleChangeAlertModal
        isOpen={Boolean(pendingChangeEvent)}
        onClose={() => setPendingChangeEvent(null)}
        event={pendingChangeEvent}
        onConfirmSend={handleConfirmAnnouncement}
        onSkipSend={() => setPendingChangeEvent(null)}
      />
    </div>
  );
};
