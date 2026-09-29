/**
 * Shared primitive types for the reporting module.
 *
 * These are intentionally dependency-free so every other model/service can
 * import from here without creating circular references.
 */

/** Loose row shape when a report is not bound to a concrete DTO. */
export type ReportRow = Record<string, unknown>;

/** Supported cell/value data types (drives formatting and export mapping). */
export type ReportColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'dateTime'
  | 'boolean'
  | 'status'
  | 'custom';

/** Horizontal alignment. `start`/`end` are direction-aware (RTL friendly). */
export type ReportAlignment = 'start' | 'center' | 'end';

/** Aggregation kinds supported by summaries and column footers. */
export type SummaryCalculation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'custom';

/** How the report loads/paginates data. */
export type ReportDataMode = 'client' | 'server';

/** A single sort instruction (supports multi-sort as an ordered list). */
export interface ReportSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/** Severity used by status tags — mirrors PrimeNG `p-tag` severities. */
export type ReportSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

/**
 * Runtime context handed to dynamic config callbacks (e.g. `fileName`).
 */
export interface ReportContext {
  reportId: string;
  title: string;
  locale: string;
  rtl: boolean;
  now: Date;
  filters: Record<string, unknown>;
  generatedBy?: string;
}

/** A normalized inclusive numeric range filter value. */
export interface NumberRangeValue {
  from?: number | null;
  to?: number | null;
}

/** A normalized inclusive date range filter value. */
export interface DateRangeValue {
  from?: Date | null;
  to?: Date | null;
}
