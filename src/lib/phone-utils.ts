/**
 * Phone Number Normalization & WhatsApp Click-to-Chat Utilities
 * Ensures all parent and student phone numbers conform to E.164 and WhatsApp wa.me standards.
 */

export interface NormalizedPhoneResult {
  isValid: boolean;
  raw: string;
  cleanDigits: string;
  formattedE164: string; // e.g. "+919876543210"
  whatsappDigits: string; // e.g. "919876543210" (no leading '+')
  displayFormat: string; // e.g. "+91 98765 43210"
}

/**
 * Normalizes an input phone string into standard E.164 and WhatsApp formats.
 * Handles standard 10-digit Indian numbers, prefixed +91 / 91 / 0, and international formats.
 */
export function formatWhatsAppPhone(phone?: string | null): NormalizedPhoneResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      raw: '',
      cleanDigits: '',
      formattedE164: '',
      whatsappDigits: '',
      displayFormat: 'N/A',
    };
  }

  const raw = phone.trim();
  let cleanDigits = raw.replace(/\D/g, '');

  // Strip leading zero if present (e.g. 09876543210 -> 9876543210)
  if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
    cleanDigits = cleanDigits.slice(1);
  }

  // Handle standard 10-digit Indian numbers -> add default country code 91
  if (cleanDigits.length === 10) {
    cleanDigits = `91${cleanDigits}`;
  }

  // Minimum valid phone length check (e.g. 91XXXXXXXXXX = 12 digits)
  const isValid = cleanDigits.length >= 10 && cleanDigits.length <= 15;

  const formattedE164 = isValid ? `+${cleanDigits}` : raw;
  const whatsappDigits = cleanDigits;

  let displayFormat = raw;
  if (isValid && cleanDigits.startsWith('91') && cleanDigits.length === 12) {
    const mobile = cleanDigits.slice(2);
    displayFormat = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  }

  return {
    isValid,
    raw,
    cleanDigits,
    formattedE164,
    whatsappDigits,
    displayFormat,
  };
}

/**
 * Builds an official WhatsApp click-to-chat link with pre-filled payment reminder text.
 * Returns null if the phone number is invalid or missing.
 */
export function buildWhatsAppFeeReminderUrl({
  parentPhone,
  parentName,
  studentName,
  title,
  amount,
  dueDate,
  paymentLink,
}: {
  parentPhone?: string | null;
  parentName?: string;
  studentName: string;
  title: string;
  amount: number;
  dueDate: string;
  paymentLink?: string;
}): string | null {
  const phoneResult = formatWhatsAppPhone(parentPhone);
  if (!phoneResult.isValid) {
    return null;
  }

  const greeting = parentName ? `Dear ${parentName},` : `Dear Parent,`;
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  const payLinkText = paymentLink ? `\n\n💳 Pay Online Securely:\n${paymentLink}` : '';

  const message = `🔔 *Apex Academy Fee Reminder*\n\n${greeting}\nThis is a gentle reminder regarding the pending fee installment for *${studentName}*.\n\n📌 *Particulars:* ${title}\n💰 *Amount Due:* ${formattedAmount}\n📅 *Due Date:* ${dueDate}${payLinkText}\n\nFor any queries or payment confirmation, please contact the academy front-desk.\n\n_Apex Career Institute_`;

  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${phoneResult.whatsappDigits}?text=${encodedText}`;
}
