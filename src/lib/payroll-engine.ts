import { SalaryStructure, LineItem } from './types';

export interface LectureSessionInput {
  id?: string;
  batchId?: string;
  batchName?: string;
  date: string;
  durationMinutes?: number;
}

export interface CalculatePayrollOptions {
  structure: SalaryStructure;
  period: string; // "YYYY-MM"
  lectureCount?: number;
  lectures?: LectureSessionInput[];
  adjustments?: LineItem[];
  joiningDate?: string; // "YYYY-MM-DD"
}

export interface PayrollCalculationResult {
  lineItems: LineItem[];
  gross: number;           // In paise
  totalDeductions: number; // In paise
  net: number;             // In paise (gross - totalDeductions, >= 0)
  lectureCount: number;
  proRatedInfo?: {
    isProRated: boolean;
    activeDays: number;
    totalDays: number;
  };
}

/**
 * Converts paise (integer) to Rupees (float or integer)
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return Number((paise / 100).toFixed(2));
}

/**
 * Converts Rupees to paise (integer) safely with rounding
 */
export function rupeesToPaise(rupees: number): number {
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Formats an amount in paise to Indian Rupee (INR) currency string e.g. "₹50,000" or "₹50,000.50"
 */
export function formatPaiseToINR(paise: number, includeDecimals: boolean = false): string {
  if (isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Helper to get the total days in a given YYYY-MM period
 */
export function getDaysInMonth(period: string): number {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return 30; // fallback standard month
  }
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates pro-rated base amount for mid-month joining
 */
export function calculateProRatedAmount(
  baseMonthlyAmount: number,
  period: string,
  joiningDateStr?: string
): { amount: number; activeDays: number; totalDays: number; isProRated: boolean } {
  const totalDays = getDaysInMonth(period);
  if (!joiningDateStr) {
    return { amount: baseMonthlyAmount, activeDays: totalDays, totalDays, isProRated: false };
  }

  const [periodYear, periodMonth] = period.split('-').map(Number);
  const joiningDate = new Date(joiningDateStr);
  const joinYear = joiningDate.getFullYear();
  const joinMonth = joiningDate.getMonth() + 1;
  const joinDay = joiningDate.getDate();

  // If joined in a future month (relative to period) -> 0 days
  if (joinYear > periodYear || (joinYear === periodYear && joinMonth > periodMonth)) {
    return { amount: 0, activeDays: 0, totalDays, isProRated: true };
  }

  // If joined before this period month -> full month
  if (joinYear < periodYear || (joinYear === periodYear && joinMonth < periodMonth)) {
    return { amount: baseMonthlyAmount, activeDays: totalDays, totalDays, isProRated: false };
  }

  // Joined within this month
  const activeDays = Math.max(0, totalDays - joinDay + 1);
  if (activeDays >= totalDays) {
    return { amount: baseMonthlyAmount, activeDays: totalDays, totalDays, isProRated: false };
  }

  const proRated = Math.round((baseMonthlyAmount / totalDays) * activeDays);
  return {
    amount: proRated,
    activeDays,
    totalDays,
    isProRated: true,
  };
}

/**
 * Pure calculation engine for faculty payroll
 * - No side-effects, no database queries
 * - Clamps net to 0 minimum
 * - Itemizes earnings and deductions clearly with metadata
 */
export function calculatePayroll(options: CalculatePayrollOptions): PayrollCalculationResult {
  const { structure, period, lectureCount, lectures, adjustments = [], joiningDate } = options;

  if (!structure) {
    throw new Error('Cannot calculate payroll: SalaryStructure is required.');
  }

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    throw new Error(`Invalid payroll period format: "${period}". Expected "YYYY-MM".`);
  }

  const lineItems: LineItem[] = [];

  // 1. Resolve Lecture Count
  const effectiveLectureCount =
    typeof lectureCount === 'number'
      ? Math.max(0, lectureCount)
      : Array.isArray(lectures)
      ? lectures.length
      : 0;

  // 2. Fixed Component (for 'fixed' or 'hybrid')
  let proRatedInfo: { isProRated: boolean; activeDays: number; totalDays: number } | undefined;

  if (structure.type === 'fixed' || structure.type === 'hybrid') {
    const rawBase = structure.baseAmount || 0;
    const proRating = calculateProRatedAmount(rawBase, period, joiningDate);
    proRatedInfo = {
      isProRated: proRating.isProRated,
      activeDays: proRating.activeDays,
      totalDays: proRating.totalDays,
    };

    if (proRating.amount > 0) {
      lineItems.push({
        id: 'item_base_pay',
        label: proRating.isProRated
          ? `Base Monthly Salary (Pro-rated: ${proRating.activeDays}/${proRating.totalDays} days)`
          : 'Base Monthly Salary',
        type: 'earning',
        amount: proRating.amount,
        meta: {
          baseAmount: rawBase,
          isProRated: proRating.isProRated,
          activeDays: proRating.activeDays,
          totalDays: proRating.totalDays,
        },
      });
    }
  }

  // 3. Per-Lecture Component (for 'per_lecture' or 'hybrid')
  if (structure.type === 'per_lecture' || structure.type === 'hybrid') {
    const rate = structure.perLectureRate || 0;
    const lectureEarnings = Math.round(effectiveLectureCount * rate);

    if (effectiveLectureCount > 0 || structure.type === 'per_lecture') {
      lineItems.push({
        id: 'item_lecture_pay',
        label: `Lecture Payout (${effectiveLectureCount} lecture${effectiveLectureCount === 1 ? '' : 's'} @ ${formatPaiseToINR(rate)})`,
        type: 'earning',
        amount: lectureEarnings,
        meta: {
          lectureCount: effectiveLectureCount,
          perLectureRate: rate,
        },
      });
    }
  }

  // 4. Adjustments (Bonuses, Deductions, TDS, Penalties)
  if (Array.isArray(adjustments) && adjustments.length > 0) {
    for (const adj of adjustments) {
      if (typeof adj.amount === 'number' && adj.amount > 0) {
        lineItems.push({
          id: adj.id || `item_adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          label: adj.label || (adj.type === 'earning' ? 'Additional Allowance / Bonus' : 'Deduction'),
          type: adj.type,
          amount: Math.round(adj.amount),
          meta: adj.meta,
        });
      }
    }
  }

  // 5. Calculate Totals
  let gross = 0;
  let totalDeductions = 0;

  for (const item of lineItems) {
    if (item.type === 'earning') {
      gross += item.amount;
    } else if (item.type === 'deduction') {
      totalDeductions += item.amount;
    }
  }

  // Net pay is clamped to 0 (never negative)
  const net = Math.max(0, gross - totalDeductions);

  return {
    lineItems,
    gross,
    totalDeductions,
    net,
    lectureCount: effectiveLectureCount,
    proRatedInfo,
  };
}
