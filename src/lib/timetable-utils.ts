import { DayOfWeek, ScheduleChangeEvent, TimetableConflict, TimetableSlot, TimetableSlotInput } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Converts a 24-hour time string ("HH:mm" or "H:mm") into minutes from midnight (0 - 1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight into a standard 24-hour time string ("HH:mm").
 */
export function minutesToTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const hrs = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats a 24-hour time string ("14:30") to 12-hour display format ("02:30 PM" or "2:30 PM").
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const totalMins = timeToMinutes(timeStr);
  const hrs24 = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const period = hrs24 >= 12 ? 'PM' : 'AM';
  const hrs12 = hrs24 % 12 === 0 ? 12 : hrs24 % 12;
  const minsStr = mins.toString().padStart(2, '0');
  return `${hrs12}:${minsStr} ${period}`;
}

/**
 * Determines whether two time intervals on the same day overlap.
 * Strictly checks: max(startA, startB) < min(endA, endB).
 * Boundary case: If slot A ends at 10:45 and slot B starts at 10:45, they DO NOT overlap.
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  // If start >= end for either interval, it's invalid or empty
  if (aStart >= aEnd || bStart >= bEnd) return false;

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Detects conflicts (Teacher double-booking, Room double-booking, or Batch double-booking).
 * Can exclude a specific slot ID (when editing an existing slot so it doesn't conflict with itself).
 */
export function detectTimetableConflicts(
  existingSlots: TimetableSlot[],
  candidate: TimetableSlotInput & { id?: string },
  excludeSlotId?: string
): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];
  const activeExcludeId = excludeSlotId || candidate.id;

  for (const slot of existingSlots) {
    // Skip if comparing slot with itself (during edit)
    if (activeExcludeId && slot.id === activeExcludeId) {
      continue;
    }

    // Skip inactive or cancelled slots
    if (slot.status === 'cancelled') {
      continue;
    }

    // Must be on the exact same day to conflict
    if (slot.day !== candidate.day) {
      continue;
    }

    // Check if time intervals overlap
    const overlaps = doIntervalsOverlap(
      slot.startTime,
      slot.endTime,
      candidate.startTime,
      candidate.endTime
    );

    if (!overlaps) {
      continue;
    }

    // 1. Teacher Double-Booking Check
    if (slot.teacherId && candidate.teacherId && slot.teacherId === candidate.teacherId) {
      conflicts.push({
        type: 'teacher',
        conflictingSlot: slot,
        message: `Teacher conflict: ${slot.teacherName || 'Assigned teacher'} is already scheduled for "${slot.batchName || slot.batchId}" in ${slot.roomName || slot.roomId} on ${slot.day} (${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)}).`,
      });
    }

    // 2. Room Double-Booking Check
    if (slot.roomId && candidate.roomId && slot.roomId.toLowerCase().trim() === candidate.roomId.toLowerCase().trim()) {
      conflicts.push({
        type: 'room',
        conflictingSlot: slot,
        message: `Room conflict: ${slot.roomName || slot.roomId} is already booked for "${slot.batchName || slot.batchId}" with ${slot.teacherName || 'teacher'} on ${slot.day} (${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)}).`,
      });
    }

    // 3. Batch Double-Booking Check
    if (slot.batchId && candidate.batchId && slot.batchId === candidate.batchId) {
      conflicts.push({
        type: 'batch',
        conflictingSlot: slot,
        message: `Batch conflict: Batch "${slot.batchName || slot.batchId}" already has "${slot.subjectName || slot.subjectId}" scheduled with ${slot.teacherName || 'teacher'} on ${slot.day} (${formatTimeDisplay(slot.startTime)} - ${formatTimeDisplay(slot.endTime)}).`,
      });
    }
  }

  return conflicts;
}

/**
 * Validates timetable slot input fields and time logic.
 */
export function validateTimetableSlotInput(
  input: Partial<TimetableSlotInput>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.batchId?.trim()) errors.push('Batch is required.');
  if (!input.subjectId?.trim() && !input.subjectName?.trim()) errors.push('Subject is required.');
  if (!input.teacherId?.trim()) errors.push('Teacher is required.');
  if (!input.day || !DAYS_OF_WEEK.includes(input.day)) errors.push('A valid day of the week is required.');
  if (!input.startTime?.trim()) errors.push('Start time is required.');
  if (!input.endTime?.trim()) errors.push('End time is required.');
  if (!input.roomId?.trim()) errors.push('Room is required.');

  if (input.startTime && input.endTime) {
    const startMins = timeToMinutes(input.startTime);
    const endMins = timeToMinutes(input.endTime);
    if (startMins >= endMins) {
      errors.push('Start time must be strictly earlier than end time.');
    }
    if (endMins - startMins < 10) {
      errors.push('Slot duration must be at least 10 minutes.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Finds the next upcoming slot for a given batch and subject on or after the reference day/time.
 * Used for Homework Tracker due-date cross-linking (Step 4).
 */
export function getNextSlotForSubject(
  slots: TimetableSlot[],
  batchId: string,
  subjectIdOrName: string,
  currentDay: DayOfWeek = 'Monday',
  currentTime: string = '00:00'
): TimetableSlot | null {
  const relevantSlots = slots.filter(
    (s) =>
      s.batchId === batchId &&
      (s.subjectId === subjectIdOrName ||
        s.subjectName?.toLowerCase() === subjectIdOrName.toLowerCase() ||
        s.subject?.toLowerCase() === subjectIdOrName.toLowerCase()) &&
      s.status !== 'cancelled'
  );

  if (relevantSlots.length === 0) return null;

  const currentDayIndex = DAYS_OF_WEEK.indexOf(currentDay);
  const currentMinutes = timeToMinutes(currentTime);

  let bestSlot: TimetableSlot | null = null;
  let minDayOffset = 8;
  let minStartMinutes = 1440;

  for (const slot of relevantSlots) {
    const slotDayIndex = DAYS_OF_WEEK.indexOf(slot.day);
    if (slotDayIndex === -1) continue;

    let dayOffset = slotDayIndex - currentDayIndex;
    const slotStartMins = timeToMinutes(slot.startTime);

    if (dayOffset === 0 && slotStartMins < currentMinutes) {
      // Slot earlier today has passed, consider it for next week (+7 days)
      dayOffset = 7;
    } else if (dayOffset < 0) {
      // Day is earlier in the week, occurs next week
      dayOffset += 7;
    }

    if (
      dayOffset < minDayOffset ||
      (dayOffset === minDayOffset && slotStartMins < minStartMinutes)
    ) {
      minDayOffset = dayOffset;
      minStartMinutes = slotStartMins;
      bestSlot = slot;
    }
  }

  return bestSlot;
}

/**
 * Calculates the exact calendar date (YYYY-MM-DD) and context for the next lecture.
 */
export function calculateNextLectureDate(
  slots: TimetableSlot[],
  batchId: string,
  subjectIdOrName: string,
  referenceDate: Date = new Date()
): { slot: TimetableSlot; dateString: string; displayContext: string } | null {
  const currentDayIndex = referenceDate.getDay(); // 0 is Sunday
  const jsToDayOfWeek: Record<number, DayOfWeek> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  const currentDay = jsToDayOfWeek[currentDayIndex] || 'Monday';
  const currentHours = referenceDate.getHours().toString().padStart(2, '0');
  const currentMins = referenceDate.getMinutes().toString().padStart(2, '0');
  const currentTime = `${currentHours}:${currentMins}`;

  const nextSlot = getNextSlotForSubject(slots, batchId, subjectIdOrName, currentDay, currentTime);
  if (!nextSlot) return null;

  // Calculate day offset
  const curIdx = DAYS_OF_WEEK.indexOf(currentDay);
  const targetIdx = DAYS_OF_WEEK.indexOf(nextSlot.day);
  let offset = targetIdx - curIdx;
  if (offset < 0 || (offset === 0 && timeToMinutes(nextSlot.startTime) <= timeToMinutes(currentTime))) {
    offset += 7;
  }

  const targetDate = new Date(referenceDate);
  targetDate.setDate(targetDate.getDate() + offset);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateString = `${yyyy}-${mm}-${dd}`;

  const displayContext = `Due before next ${nextSlot.subjectName || nextSlot.subjectId} lecture (${nextSlot.day}, ${formatTimeDisplay(nextSlot.startTime)})`;

  return {
    slot: nextSlot,
    dateString,
    displayContext,
  };
}

/**
 * Detects whether an edit to a timetable slot qualifies as a schedule change and builds diff metadata.
 */
export function detectScheduleChanges(
  oldSlot: TimetableSlot,
  newInput: Partial<TimetableSlotInput>
): ScheduleChangeEvent | null {
  const changes: {
    field: 'day' | 'time' | 'room' | 'teacher';
    oldValue: string;
    newValue: string;
  }[] = [];

  if (newInput.day && newInput.day !== oldSlot.day) {
    changes.push({
      field: 'day',
      oldValue: oldSlot.day,
      newValue: newInput.day,
    });
  }

  const newStartTime = newInput.startTime || oldSlot.startTime;
  const newEndTime = newInput.endTime || oldSlot.endTime;
  if (newStartTime !== oldSlot.startTime || newEndTime !== oldSlot.endTime) {
    changes.push({
      field: 'time',
      oldValue: `${formatTimeDisplay(oldSlot.startTime)} - ${formatTimeDisplay(oldSlot.endTime)}`,
      newValue: `${formatTimeDisplay(newStartTime)} - ${formatTimeDisplay(newEndTime)}`,
    });
  }

  const newRoom = (newInput.roomName || newInput.roomId || '').trim();
  const oldRoom = (oldSlot.roomName || oldSlot.roomId || '').trim();
  if (newRoom && oldRoom && newRoom.toLowerCase() !== oldRoom.toLowerCase()) {
    changes.push({
      field: 'room',
      oldValue: oldRoom,
      newValue: newRoom,
    });
  }

  const newTeacher = (newInput.teacherName || newInput.teacherId || '').trim();
  const oldTeacher = (oldSlot.teacherName || oldSlot.teacherId || '').trim();
  if (newTeacher && oldTeacher && newTeacher.toLowerCase() !== oldTeacher.toLowerCase()) {
    changes.push({
      field: 'teacher',
      oldValue: oldTeacher,
      newValue: newTeacher,
    });
  }

  if (changes.length === 0) return null;

  const batchName = oldSlot.batchName || oldSlot.batchId;
  const subjectName = oldSlot.subjectName || oldSlot.subjectId;

  const generatedAnnouncementText = `📢 *Schedule Update for ${batchName}*\n\nThe lecture for *${subjectName}* has been updated:\n${changes.map((c) => `• *${c.field.charAt(0).toUpperCase() + c.field.slice(1)}*: ${c.oldValue} ➔ ${c.newValue}`).join('\n')}\n\nPlease check your portal timetable for the updated classroom and timings.`;

  return {
    slotId: oldSlot.id,
    batchId: oldSlot.batchId,
    batchName,
    subjectName,
    changes,
    generatedAnnouncementText,
  };
}
