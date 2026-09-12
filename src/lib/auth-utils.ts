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
