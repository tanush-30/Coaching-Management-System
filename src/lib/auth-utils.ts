/**
 * Shared Auth Utilities & Constants for UID-Based Authentication System
 */

export const INTERNAL_EMAIL_DOMAIN = 'studenterp.internal';

/**
 * Returns the synthetic internal email address for a given Custom UID.
 * Used internally by Firebase Auth while the user interacts solely with their UID.
 * 
 * Example: "STU-2026-001" -> "stu-2026-001@studenterp.internal"
 */
export function getInternalEmail(customId: string): string {
  const normalized = (customId || '').trim().toLowerCase();
  return `${normalized}@${INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * Generates default temporary password from First Name + Date of Birth.
 * Rule:
 *   lowercase(first 4 letters of First Name, or full name if < 4 letters) + DOB formatted as DDMM
 * 
 * Examples:
 *   - First Name "Ananya", DOB "2010-03-14" -> "anan1403"
 *   - First Name "Al", DOB "2011-11-02"     -> "al0211"
 *   - First Name "Dr. Rajesh-Verma", DOB "1988-08-05" -> "drra0508"
 */
export function generateDefaultPassword(firstName: string, dob: string): string {
  const cleanName = (firstName || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
  const namePart = cleanName.length === 0 ? 'user' : cleanName.length < 4 ? cleanName : cleanName.slice(0, 4);

  let dobPart = '0101';
  if (dob) {
    const parts = dob.trim().split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // Format YYYY-MM-DD
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        dobPart = `${day}${month}`;
      } else {
        // Format DD-MM-YYYY
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        dobPart = `${day}${month}`;
      }
    }
  }

  return `${namePart}${dobPart}`;
}

/**
 * Masks a phone number for privacy-safe display in recovery OTP prompts.
 * Example: "+91 9876543210" -> "+91 ******3210"
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = (phone || '').replace(/\s+/g, '');
  if (cleaned.length < 6) return '******';
  const visibleLast4 = cleaned.slice(-4);
  const prefix = cleaned.startsWith('+91') ? '+91 ' : cleaned.startsWith('+') ? cleaned.slice(0, 3) + ' ' : '';
  return `${prefix}******${visibleLast4}`;
}

/**
 * Calculates and verifies the next truly available identifier for students, faculty, or batches.
 * Scans existing IDs and dynamically probes availability until an unused ID is found.
 */
export async function findNextAvailableId(
  prefix: 'STU' | 'FAC' | 'BAT',
  existingIds: (string | undefined | null)[],
  checkAvailability: (id: string) => Promise<{ available: boolean }>,
  year: number = 2026
): Promise<string> {
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`, 'i');
  let maxNum = 0;

  for (const rawId of existingIds) {
    if (!rawId) continue;
    const match = rawId.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let candidateNum = Math.max(1, maxNum + 1);

  // Proactively check availability to ensure no collisions in Firestore or local state
  for (let i = 0; i < 50; i++) {
    const candidateId = `${prefix}-${year}-${String(candidateNum).padStart(3, '0')}`;
    try {
      const res = await checkAvailability(candidateId);
      if (res.available) {
        return candidateId;
      }
    } catch {
      return candidateId;
    }
    candidateNum++;
  }

  return `${prefix}-${year}-${String(candidateNum).padStart(3, '0')}`;
}

export interface IdValidationResult {
  available: boolean;
  reason?: string;
  existingMemberType?: 'student' | 'faculty' | 'batch';
  existingName?: string;
}

/**
 * Universal ID uniqueness validator.
 * Validates across provided in-memory context, localStorage fallback, and Cloud Firestore.
 */
export async function validateUniqueMemberId(
  idToCheck: string,
  localContext?: {
    students?: { id: string; rollNo?: string; name: string }[];
    teachers?: { id: string; facultyId?: string; name: string }[];
    batches?: { id: string; batchCode?: string; name: string }[];
  }
): Promise<IdValidationResult> {
  const normalized = idToCheck?.trim().toUpperCase();
  if (!normalized) return { available: true };

  // 1. Direct Local Context Check
  if (localContext?.teachers) {
    const t = localContext.teachers.find(
      (item) => (item.facultyId && item.facultyId.toUpperCase() === normalized) || (item.id && item.id.toUpperCase() === normalized)
    );
    if (t) {
      return {
        available: false,
        existingMemberType: 'faculty',
        existingName: t.name,
        reason: `This Faculty ID is already assigned to faculty member "${t.name}" (${t.facultyId || t.id}). Please enter a different ID.`,
      };
    }
  }

  if (localContext?.students) {
    const s = localContext.students.find(
      (item) => (item.rollNo && item.rollNo.toUpperCase() === normalized) || (item.id && item.id.toUpperCase() === normalized)
    );
    if (s) {
      return {
        available: false,
        existingMemberType: 'student',
        existingName: s.name,
        reason: `This ID is already assigned to student "${s.name}" (${s.rollNo || s.id}). Please enter a different ID.`,
      };
    }
  }

  if (localContext?.batches) {
    const b = localContext.batches.find(
      (item) => (item.batchCode && item.batchCode.toUpperCase() === normalized) || (item.id && item.id.toUpperCase() === normalized)
    );
    if (b) {
      return {
        available: false,
        existingMemberType: 'batch',
        existingName: b.name,
        reason: `This ID is already assigned to batch "${b.name}" (${b.batchCode || b.id}). Please enter a different ID.`,
      };
    }
  }

  // 2. LocalStorage Persistence Fallback
  if (typeof window !== 'undefined') {
    try {
      const rawTeachers = localStorage.getItem('apex_erp_teachers_v5');
      if (rawTeachers) {
        const parsed = JSON.parse(rawTeachers);
        if (Array.isArray(parsed)) {
          const t = parsed.find(
            (item: any) => (item.facultyId && item.facultyId.toUpperCase() === normalized) || (item.id && item.id.toUpperCase() === normalized)
          );
          if (t) {
            return {
              available: false,
              existingMemberType: 'faculty',
              existingName: t.name,
              reason: `This Faculty ID is already assigned to faculty member "${t.name}" (${t.facultyId || t.id}). Please enter a different ID.`,
            };
          }
        }
      }

      const rawStudents = localStorage.getItem('apex_erp_students_v5');
      if (rawStudents) {
        const parsed = JSON.parse(rawStudents);
        if (Array.isArray(parsed)) {
          const s = parsed.find(
            (item: any) => (item.rollNo && item.rollNo.toUpperCase() === normalized) || (item.id && item.id.toUpperCase() === normalized)
          );
          if (s) {
            return {
              available: false,
              existingMemberType: 'student',
              existingName: s.name,
              reason: `This ID is already assigned to student "${s.name}" (${s.rollNo || s.id}). Please enter a different ID.`,
            };
          }
        }
      }
    } catch {
      // Safe fallback
    }
  }

  // 3. Cloud Firestore Check
  try {
    const { checkMemberIdAvailable } = await import('./firestore-service');
    const cloudCheck = await checkMemberIdAvailable(normalized);
    if (!cloudCheck.available) {
      return {
        available: false,
        existingMemberType: cloudCheck.existingMemberType,
        existingName: cloudCheck.existingName,
        reason: cloudCheck.reason || `This ID is already assigned. Please enter a different ID.`,
      };
    }
  } catch (err) {
    console.warn('[validateUniqueMemberId] Cloud verification warning:', err);
  }

  return { available: true };
}

