'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  GraduationCap,
  Layers,
  MapPin,
  BookOpen,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { DayOfWeek, TimetableSlot } from '@/lib/types';
import { DAYS_OF_WEEK, formatTimeDisplay, timeToMinutes } from '@/lib/timetable-utils';

interface TimetableGridViewProps {
  mode: 'student' | 'teacher' | 'parent';
  slots: TimetableSlot[];
  batchName?: string;
  teacherName?: string;
  studentName?: string;
  onOpenAttendance?: (batchId?: string) => void;
}

const JS_DAY_MAP: Record<number, DayOfWeek> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export const TimetableGridView: React.FC<TimetableGridViewProps> = ({
  mode,
  slots,
  batchName,
  teacherName,
  studentName,
  onOpenAttendance,
}) => {
  // Current Day of Week in local time
  const todayDayOfWeek = useMemo<DayOfWeek>(() => {
    const dayNum = new Date().getDay();
    return JS_DAY_MAP[dayNum] || 'Monday';
  }, []);

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDayOfWeek);
  const [viewStyle, setViewStyle] = useState<'grid' | 'agenda'>('agenda');

  // Sorted slots for the selected day
  const currentDaySlots = useMemo(() => {
    return slots
      .filter((s) => s.day === selectedDay)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [slots, selectedDay]);

  // Count slots per day
  const slotsCountByDay = useMemo(() => {
    const counts: Record<DayOfWeek, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };
    slots.forEach((s) => {
      if (counts[s.day] !== undefined) {
        counts[s.day]++;
      }
    });
    return counts;
  }, [slots]);

  // Today's upcoming lecture
  const todaysTotalSlots = slotsCountByDay[todayDayOfWeek] || 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Weekly Timetable</span>
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
              {mode === 'student' ? 'Class Schedule' : mode === 'teacher' ? 'Teaching Schedule' : 'Student Schedule'}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            {mode === 'student'
              ? `${batchName || 'Your Class'} Lecture Timetable`
              : mode === 'teacher'
              ? `${teacherName || 'Faculty'} Weekly Lecture Schedule`
              : `${studentName || 'Student'}'s Weekly Class Timetable`}
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'student'
              ? 'Stay on track with lecture timings, assigned faculty, and classroom allocations.'
              : mode === 'teacher'
              ? 'Your assigned lectures across all cohorts with quick attendance shortcuts.'
              : 'Weekly academic schedule and classroom locations for your child.'}
          </p>
        </div>

        {/* View Toggle */}
        <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setViewStyle('agenda')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              viewStyle === 'agenda'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Day View
          </button>
          <button
            onClick={() => setViewStyle('grid')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              viewStyle === 'grid'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Full Week Grid
          </button>
        </div>
      </div>

      {/* Day Selector Tabs (For Agenda Mode or Quick Navigation) */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {DAYS_OF_WEEK.map((d) => {
            const count = slotsCountByDay[d] || 0;
            const isToday = d === todayDayOfWeek;
            const isSelected = d === selectedDay;

            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isToday
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{d.substring(0, 3)}</span>
                {isToday && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold uppercase ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-800'
                    }`}
                  >
                    Today
                  </span>
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-slate-200/80 text-slate-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode 1: Daily Agenda View */}
      {viewStyle === 'agenda' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>{selectedDay} Schedule</span>
              {selectedDay === todayDayOfWeek && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                  Live Today
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {currentDaySlots.length} {currentDaySlots.length === 1 ? 'lecture' : 'lectures'} scheduled
            </span>
          </div>

          {currentDaySlots.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Lectures Scheduled on {selectedDay}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {mode === 'student'
                  ? 'Enjoy your study hours or prepare for upcoming unit tests and assignments.'
                  : mode === 'teacher'
                  ? 'You have no assigned lectures on this day.'
                  : 'Your child has no classes scheduled on this day.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentDaySlots.map((slot) => (
                <div
                  key={slot.id}
                  style={{ borderLeftColor: slot.color || '#4f46e5' }}
                  className="bg-white rounded-3xl p-5 border-y border-r border-l-4 border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          style={{
                            backgroundColor: `${slot.color || '#4f46e5'}15`,
                            color: slot.color || '#4f46e5',
                          }}
                          className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 mb-1"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>{slot.subjectName || slot.subjectId}</span>
                        </span>
                        <h4 className="text-base font-bold text-slate-900">
                          {mode === 'teacher' ? slot.batchName || slot.batchId : slot.subjectName || slot.subjectId}
                        </h4>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold shrink-0">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      {mode !== 'teacher' && (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Faculty: <strong className="text-slate-800">{slot.teacherName || 'Assigned Instructor'}</strong>
                          </span>
                        </div>
                      )}

                      {mode === 'teacher' && (
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Batch: <strong className="text-slate-800">{slot.batchName || slot.batchId}</strong>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Classroom: <strong className="text-slate-700">{slot.roomName || slot.roomId}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Teacher Quick Action */}
                  {mode === 'teacher' && onOpenAttendance && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">15-sec rapid roll call</span>
                      <button
                        onClick={() => onOpenAttendance(slot.batchId)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Mark Attendance</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View Mode 2: Full Week Matrix Grid View */}
      {viewStyle === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = slots
              .filter((s) => s.day === day)
              .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

            const isToday = day === todayDayOfWeek;

            return (
              <div
                key={day}
                className={`bg-white rounded-3xl border shadow-xs flex flex-col min-h-[300px] overflow-hidden ${
                  isToday ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
                }`}
              >
                {/* Column Header */}
                <div
                  className={`px-3.5 py-2.5 border-b flex items-center justify-between ${
                    isToday ? 'bg-indigo-50/80 border-indigo-100' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.2 rounded-md uppercase">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200/60">
                    {daySlots.length}
                  </span>
                </div>

                {/* Day Slots */}
                <div className="p-2.5 flex-1 space-y-2 overflow-y-auto">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-3 text-[10px] text-slate-400">
                      No classes
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        style={{ borderLeftColor: slot.color || '#4f46e5' }}
                        className="p-2.5 bg-slate-50 hover:bg-white rounded-xl border-y border-r border-l-3 border-slate-100 shadow-2xs space-y-1.5 text-xs transition-all"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-[11px] line-clamp-1">
                            {mode === 'teacher' ? slot.batchName : slot.subjectName || slot.subjectId}
                          </div>
                          <div className="text-[9px] font-bold text-indigo-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-0.5 text-[10px] text-slate-500">
                          {mode !== 'teacher' && (
                            <div className="line-clamp-1 font-medium text-slate-700">
                              {slot.teacherName}
                            </div>
                          )}
                          {mode === 'teacher' && (
                            <div className="line-clamp-1 font-medium text-slate-700">
                              {slot.subjectName}
                            </div>
                          )}
                          <div className="line-clamp-1 text-slate-400">
                            {slot.roomName || slot.roomId}
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
      )}
    </div>
  );
};
