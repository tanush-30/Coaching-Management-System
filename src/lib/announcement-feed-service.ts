/**
 * Announcement Feed Service (Phase 9 Step 4)
 * 
 * Provides:
 * 1. Role-specific announcement filtering (student, parent, teacher, admin).
 * 2. Strict batch & individual isolation to prevent cross-recipient leakage.
 * 3. Priority sorting (pinned items on top, then newest sent date).
 * 4. User-isolated read/unread state tracking via localStorage.
 */

import { Announcement, Student, Teacher } from './types';

/**
 * Filter announcements visible to a specific student.
 * - Excludes drafts (`status !== 'sent'`).
 * - Includes 'all' announcements.
 * - Includes 'batch' announcements if student is enrolled in any targeted batch.
 * - Includes 'individual' announcements if student's ID matches audienceIds.
 */
export function filterAnnouncementsForStudent(
  announcements: Announcement[],
  student: Student | null | undefined
): Announcement[] {
  if (!student || !Array.isArray(announcements)) return [];

  const studentBatchIds = new Set<string>([
    ...(((student as any).batchId ? [(student as any).batchId] : [])),
    ...(student.batchIds || []),
  ]);

  return announcements
    .filter((ann) => {
      // 1. Strictly exclude non-sent announcements (drafts/failed)
      if (ann.status !== 'sent') return false;

      // 2. Audience: All
      if (ann.audienceType === 'all') {
        if (ann.targetRoles && ann.targetRoles.length > 0) {
          return ann.targetRoles.includes('student');
        }
        return true;
      }

      // 3. Audience: Batch
      if (ann.audienceType === 'batch') {
        const targetBatchIds = ann.audienceIds || (ann as any).audience_ids || [];
        return targetBatchIds.some((bId: string) => studentBatchIds.has(bId));
      }

      // 4. Audience: Individual
      if (ann.audienceType === 'individual') {
        const targetIds = ann.audienceIds || (ann as any).audience_ids || [];
        return targetIds.includes(student.id);
      }

      return false;
    })
    .sort(sortAnnouncementsByPriorityAndDate);
}

/**
 * Filter announcements visible to a parent based on their linked children.
 */
export function filterAnnouncementsForParent(
  announcements: Announcement[],
  linkedStudents: Student[]
): Announcement[] {
  if (!Array.isArray(linkedStudents) || linkedStudents.length === 0 || !Array.isArray(announcements)) {
    return [];
  }

  const allChildIds = new Set<string>(linkedStudents.map((s) => s.id));
  const allChildBatchIds = new Set<string>();

  linkedStudents.forEach((s) => {
    if ((s as any).batchId) allChildBatchIds.add((s as any).batchId);
    (s.batchIds || []).forEach((bId) => allChildBatchIds.add(bId));
  });

  return announcements
    .filter((ann) => {
      // 1. Strictly exclude non-sent announcements
      if (ann.status !== 'sent') return false;

      // 2. Audience: All
      if (ann.audienceType === 'all') {
        if (ann.targetRoles && ann.targetRoles.length > 0) {
          return ann.targetRoles.includes('parent') || ann.targetRoles.includes('student');
        }
        return true;
      }

      // 3. Audience: Batch
      if (ann.audienceType === 'batch') {
        const targetBatchIds = ann.audienceIds || (ann as any).audience_ids || [];
        return targetBatchIds.some((bId: string) => allChildBatchIds.has(bId));
      }

      // 4. Audience: Individual (Matches any linked child)
      if (ann.audienceType === 'individual') {
        const targetIds = ann.audienceIds || (ann as any).audience_ids || [];
        return targetIds.some((id: string) => allChildIds.has(id));
      }

      return false;
    })
    .sort(sortAnnouncementsByPriorityAndDate);
}

/**
 * Filter announcements visible to a faculty teacher.
 */
export function filterAnnouncementsForTeacher(
  announcements: Announcement[],
  teacher: Teacher | null | undefined
): Announcement[] {
  if (!teacher || !Array.isArray(announcements)) return [];

  const teacherBatchIds = new Set<string>([
    ...(teacher.assignedBatches || []),
    ...(teacher.batchIds || []),
  ]);

  return announcements
    .filter((ann) => {
      // 1. Strictly exclude non-sent announcements
      if (ann.status !== 'sent') return false;

      // 2. Audience: All
      if (ann.audienceType === 'all') {
        if (ann.targetRoles && ann.targetRoles.length > 0) {
          return ann.targetRoles.includes('teacher');
        }
        return true;
      }

      // 3. Audience: Batch
      if (ann.audienceType === 'batch') {
        const targetBatchIds = ann.audienceIds || (ann as any).audience_ids || [];
        return targetBatchIds.some((bId: string) => teacherBatchIds.has(bId));
      }

      // 4. Audience: Individual
      if (ann.audienceType === 'individual') {
        const targetIds = ann.audienceIds || (ann as any).audience_ids || [];
        return targetIds.includes(teacher.id) || (teacher.facultyId && targetIds.includes(teacher.facultyId));
      }

      return false;
    })
    .sort(sortAnnouncementsByPriorityAndDate);
}

/**
 * Comparator to rank:
 * 1. Pinned announcements first.
 * 2. Sent date (descending, newest first).
 * 3. Created date as fallback.
 */
export function sortAnnouncementsByPriorityAndDate(a: Announcement, b: Announcement): number {
  const isPinnedA = a.priority === 'pinned' ? 1 : 0;
  const isPinnedB = b.priority === 'pinned' ? 1 : 0;

  if (isPinnedA !== isPinnedB) {
    return isPinnedB - isPinnedA; // Pinned on top
  }

  const dateA = new Date(a.sentAt || a.sent_at || a.createdAt || a.created_at || 0).getTime();
  const dateB = new Date(b.sentAt || b.sent_at || b.createdAt || b.created_at || 0).getTime();

  return dateB - dateA; // Newest first
}

// =========================================================================
// Local Storage Read Tracking (User-Isolated, Zero Firestore Mutex Impact)
// =========================================================================

const READ_STORAGE_PREFIX = 'apex_read_announcements_';

export function getReadAnnouncementIds(userId: string): string[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markAnnouncementAsRead(userId: string, announcementId: string): void {
  if (typeof window === 'undefined' || !userId || !announcementId) return;
  try {
    const existing = getReadAnnouncementIds(userId);
    if (!existing.includes(announcementId)) {
      const updated = [...existing, announcementId];
      localStorage.setItem(`${READ_STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function markAllAnnouncementsAsRead(userId: string, announcementIds: string[]): void {
  if (typeof window === 'undefined' || !userId || !Array.isArray(announcementIds)) return;
  try {
    const existing = getReadAnnouncementIds(userId);
    const combined = Array.from(new Set([...existing, ...announcementIds]));
    localStorage.setItem(`${READ_STORAGE_PREFIX}${userId}`, JSON.stringify(combined));
  } catch {
    // Ignore localStorage errors
  }
}

export function getUnreadAnnouncementCount(
  announcements: Announcement[],
  userId: string
): number {
  if (!userId || !Array.isArray(announcements) || announcements.length === 0) return 0;
  const readIds = new Set(getReadAnnouncementIds(userId));
  return announcements.filter((a) => !readIds.has(a.id)).length;
}
