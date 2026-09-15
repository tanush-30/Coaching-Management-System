// Settings Validator — Field-level validation rules & constraint enforcement for ApexERP Settings

import {
  SchoolInfoSettings,
  FeeStructureSettings,
  NotificationTemplatesSettings,
  GradingScaleSettings,
} from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates School Info settings document
 */
export function validateSchoolInfo(data: Partial<SchoolInfoSettings>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.institutionName || data.institutionName.trim().length < 3) {
    errors.push({ field: 'institutionName', message: 'Institution name must be at least 3 characters long.' });
  }

  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push({ field: 'email', message: 'Please enter a valid email address (e.g. contact@domain.com).' });
    }
  } else {
    errors.push({ field: 'email', message: 'Official correspondence email is required.' });
  }

  if (data.phone) {
    const cleanPhone = data.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      errors.push({ field: 'phone', message: 'Primary phone number must contain at least 10 digits.' });
    }
  } else {
    errors.push({ field: 'phone', message: 'Primary phone number is required.' });
  }

  if (data.academicYear) {
    const yearRegex = /^\d{4}-\d{4}$/;
    if (!yearRegex.test(data.academicYear.trim())) {
      errors.push({ field: 'academicYear', message: 'Academic year format must be YYYY-YYYY (e.g. 2026-2027).' });
    }
  }

  if (data.pincode && data.pincode.trim().length > 0) {
    const cleanPin = data.pincode.replace(/[^0-9]/g, '');
    if (cleanPin.length < 4 || cleanPin.length > 10) {
      errors.push({ field: 'pincode', message: 'Postal / PIN code must be between 4 and 10 digits.' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates Fee Structure settings document
 */
export function validateFeeStructure(data: Partial<FeeStructureSettings>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.availablePlans || data.availablePlans.length === 0) {
    errors.push({ field: 'availablePlans', message: 'At least one installment distribution plan must be configured.' });
  } else {
    data.availablePlans.forEach((plan, idx) => {
      if (!plan.name || plan.name.trim().length === 0) {
        errors.push({ field: `availablePlans.${idx}.name`, message: `Plan #${idx + 1} must have a name.` });
      }

      if (!plan.splitPercentages || plan.splitPercentages.length === 0) {
        errors.push({ field: `availablePlans.${idx}.splitPercentages`, message: `Plan "${plan.name}" has no splits.` });
      } else {
        const sum = plan.splitPercentages.reduce((a, b) => a + (Number(b) || 0), 0);
        if (sum !== 100) {
          errors.push({
            field: `availablePlans.${idx}.splitPercentages`,
            message: `Plan "${plan.name}" split percentages sum to ${sum}%. They must total exactly 100%.`,
          });
        }
      }
    });
  }

  if (data.lateFeeGraceDays !== undefined && (data.lateFeeGraceDays < 0 || isNaN(data.lateFeeGraceDays))) {
    errors.push({ field: 'lateFeeGraceDays', message: 'Grace days cannot be negative.' });
  }

  if (data.lateFeeDailyAmount !== undefined && (data.lateFeeDailyAmount < 0 || isNaN(data.lateFeeDailyAmount))) {
    errors.push({ field: 'lateFeeDailyAmount', message: 'Daily late fine amount cannot be negative.' });
  }

  if (data.lateFeeMaxCap !== undefined && (data.lateFeeMaxCap < 0 || isNaN(data.lateFeeMaxCap))) {
    errors.push({ field: 'lateFeeMaxCap', message: 'Maximum penalty cap cannot be negative.' });
  }

  if (
    data.lateFeeDailyAmount !== undefined &&
    data.lateFeeMaxCap !== undefined &&
    data.lateFeeMaxCap > 0 &&
    data.lateFeeDailyAmount > data.lateFeeMaxCap
  ) {
    errors.push({ field: 'lateFeeDailyAmount', message: 'Daily fine amount cannot exceed maximum penalty cap.' });
  }

  if (data.upiId && data.upiId.trim().length > 0) {
    if (!data.upiId.includes('@')) {
      errors.push({ field: 'upiId', message: 'UPI ID (VPA) must be in valid format (e.g. apexcoaching@icici).' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates Notification Templates document
 */
export function validateNotificationTemplates(data: Partial<NotificationTemplatesSettings>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.templates) {
    errors.push({ field: 'templates', message: 'Notification templates object is missing.' });
    return { isValid: false, errors };
  }

  const requiredKeys = ['absenceAlert', 'feeReminder', 'paymentReceipt', 'reportCard', 'broadcast', 'batchAnnouncement'] as const;

  requiredKeys.forEach((key) => {
    const tpl = (data.templates as any)?.[key];
    if (!tpl || !tpl.bodyTemplate || tpl.bodyTemplate.trim().length === 0) {
      errors.push({ field: `templates.${key}`, message: `Template for "${key}" cannot be empty.` });
    } else if (tpl.bodyTemplate.length > 1024) {
      errors.push({ field: `templates.${key}`, message: `Template for "${key}" exceeds max length of 1024 characters.` });
    }
  });

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates Grading Scale document
 */
export function validateGradingScale(data: Partial<GradingScaleSettings>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.scaleName || data.scaleName.trim().length === 0) {
    errors.push({ field: 'scaleName', message: 'Grading scale title is required.' });
  }

  if (
    data.passingPercentage === undefined ||
    isNaN(data.passingPercentage) ||
    data.passingPercentage <= 0 ||
    data.passingPercentage > 100
  ) {
    errors.push({ field: 'passingPercentage', message: 'Passing percentage must be between 1% and 100%.' });
  }

  if (!data.grades || data.grades.length < 2) {
    errors.push({ field: 'grades', message: 'Grading scale must contain at least 2 grade boundaries (e.g. Pass and Fail).' });
  } else {
    data.grades.forEach((g, idx) => {
      if (!g.grade || g.grade.trim().length === 0) {
        errors.push({ field: `grades.${idx}.grade`, message: `Grade label in row #${idx + 1} cannot be empty.` });
      }

      if (g.minScore < 0 || g.maxScore > 100) {
        errors.push({ field: `grades.${idx}.scores`, message: `Grade "${g.grade}" scores must be within 0% to 100%.` });
      }

      if (g.minScore > g.maxScore) {
        errors.push({
          field: `grades.${idx}.scores`,
          message: `Grade "${g.grade}" minimum score (${g.minScore}%) cannot exceed maximum score (${g.maxScore}%).`,
        });
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}
