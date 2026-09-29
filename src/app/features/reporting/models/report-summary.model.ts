import { ReportColumnType, ReportRow, SummaryCalculation } from './report-common.model';

/** Where a summary value is surfaced. */
export type SummaryDisplay = 'cards' | 'footer' | 'below' | 'export';

/**
 * A configurable aggregate (KPI). In client mode the value is computed from the
 * filtered dataset; in server mode it is read from {@link ReportResult.summaries}
 * by `serverKey ?? key`.
 */
export interface ReportSummaryConfig<T = ReportRow> {
  key: string;
  label: string;
  labelKey?: string;
  /** Row field/path to aggregate (not required for `count` or `compute`). */
  field?: string;
  calculation: SummaryCalculation;
  /** Formatting type for the displayed value. */
  type?: ReportColumnType;
  currencyCode?: string;
  decimals?: number;
  /** Custom aggregation (used when `calculation === 'custom'`). */
  compute?: (rows: T[]) => number;
  /** Optional PrimeIcon class for summary cards. */
  icon?: string;
  /** Where to display (defaults to `['cards', 'export']`). */
  display?: SummaryDisplay[];
  /** Key inside the server `summaries` map (defaults to `key`). */
  serverKey?: string;
  /**
   * Marks the summary as financially sensitive. Hidden unless the
   * `viewFinancials` permission is granted.
   */
  financial?: boolean;
}

/** A computed summary ready for display/export. */
export interface ComputedSummary {
  key: string;
  label: string;
  labelKey?: string;
  icon?: string;
  /** Numeric result (undefined for non-numeric custom results). */
  value: number;
  /** Formatted display string. */
  display: string;
  financial?: boolean;
}
