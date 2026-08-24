import { safeSum } from '../../../../reporting/utilities/report-calculation.utils';
import { ProjectReportLanguage } from '../models/project-report.model';

/** Truncate to a UTC calendar day so DST/timezone drift never off-by-ones a day count. */
function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days between two dates (`b - a`), positive when `b` is after `a`. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((toUtcMidnight(b) - toUtcMidnight(a)) / MS_PER_DAY);
}

export interface ElapsedRemaining {
  elapsed: number | null;
  remaining: number | null;
}

/**
 * Days elapsed since `start` and remaining until `end`, both measured against
 * `asOf` (the report's reporting cutoff, not necessarily "today"). Returns
 * `null` for either figure when the corresponding date is unavailable —
 * never fabricates a start/end date to force a number.
 */
export function computeElapsedRemaining(start: Date | null, end: Date | null, asOf: Date): ElapsedRemaining {
  return {
    elapsed: start ? Math.max(0, daysBetween(start, asOf)) : null,
    remaining: end ? daysBetween(asOf, end) : null,
  };
}

/** Sum a numeric field across a list, treating `null`/`undefined`/non-finite entries as zero contribution. */
export function sumBy<T>(items: readonly T[], selector: (item: T) => number | null | undefined): number {
  return safeSum(items.map((item) => selector(item) ?? 0));
}

/** Remaining balance for a contractor/ledger line; `null` when the contract value itself is unknown. */
export function computeRemainingBalance(committedValue: number | null, paidOrUsed: number): number | null {
  if (committedValue === null) {
    return null;
  }
  return Math.round((committedValue - paidOrUsed) * 100) / 100;
}

/** Clamp a percentage into the sane [0, 100] display range without hiding out-of-range data by fabricating it. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp']);

/** Mirrors `AttachmentService.determineFileType`'s image list — used to route attachments to photos vs. the document register. */
export function isImageFileName(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

function resolveDateLocale(language: ProjectReportLanguage): string {
  return language === 'ar' ? 'ar' : 'en-US';
}

/**
 * Numbers and currency figures are deliberately always rendered with Western
 * (`en-US`) digits, matching the existing convention in this codebase's other
 * print builders (`payment-claim-report.builder.ts`) — Arabic construction
 * documents in this domain still record amounts in Western digits, and mixing
 * digit systems mid-table reads as a bug, not a localization win.
 */
export function formatReportNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatReportPercent(value: number): string {
  return `${formatReportNumber(value, 1)}%`;
}

/** Date formatting *does* follow the selected report language (day/month names read naturally translated). */
export function formatReportDate(date: Date, language: ProjectReportLanguage): string {
  return new Intl.DateTimeFormat(resolveDateLocale(language), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}
