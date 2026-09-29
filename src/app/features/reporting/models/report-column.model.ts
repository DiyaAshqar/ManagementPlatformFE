import { ReportAlignment, ReportColumnType, ReportRow, ReportSeverity, SummaryCalculation } from './report-common.model';

/** A single mapping used to render `status` typed values as coloured tags. */
export interface ReportStatusOption {
  /** Raw value stored on the row (matched with `===`, coerced to string). */
  value: string;
  /** Literal label. */
  label?: string;
  /** Translation key (takes precedence over `label`). */
  labelKey?: string;
  /** Tag severity/colour. */
  severity?: ReportSeverity;
  /** Optional PrimeIcon class (never rely on colour alone — a11y). */
  icon?: string;
}

/** Sticky/frozen behaviour for a column. */
export type ReportColumnSticky = boolean | 'start' | 'end';

/**
 * Fully generic, strongly typed column definition.
 *
 * `key` may be a plain field, a nested path (`customer.name`) or a purely
 * logical id when a `value` getter / custom template is supplied.
 */
export interface ReportColumn<T = ReportRow> {
  /** Field key, nested path (`a.b.c`) or logical id. */
  key: string;
  /** Literal header text (fallback when `headerKey` is absent). */
  header: string;
  /** Translation key for the header (preferred). */
  headerKey?: string;
  /** Value type — drives formatting, alignment defaults and export mapping. */
  type?: ReportColumnType;

  // ---- value & formatting -------------------------------------------------
  /** Custom value getter (overrides path resolution). */
  value?: (row: T) => unknown;
  /** Custom display formatter (overrides the type-based formatter). */
  formatter?: (value: unknown, row: T) => string;
  /** Placeholder shown for null / undefined / empty values. */
  emptyText?: string;

  // number / currency / percentage
  /** ISO currency code for `currency` columns (falls back to report currency). */
  currencyCode?: string;
  /** Fixed decimal digits for numeric formatting. */
  decimals?: number;

  // date / dateTime
  /** `Intl.DateTimeFormat`-style override; when omitted a sensible default is used. */
  dateFormat?: Intl.DateTimeFormatOptions;

  // status
  /** Value → tag mapping for `status` columns. */
  statusMap?: ReportStatusOption[];

  // ---- layout -------------------------------------------------------------
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  alignment?: ReportAlignment;
  /** Freeze the column (`true`/`'start'` pins to the leading edge, `'end'` trailing). */
  sticky?: ReportColumnSticky;

  // ---- capabilities -------------------------------------------------------
  /** Initial visibility (default `true`). */
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  /** Include this column's text in global search (default `true` for text). */
  searchable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  /** Included in file exports (default `true`). */
  exportable?: boolean;
  /** Included in print output (default `true`). */
  printable?: boolean;
  /** User cannot hide this column via the column selector. */
  mandatory?: boolean;

  // ---- aggregation --------------------------------------------------------
  /** Footer aggregation for this column. */
  summary?: SummaryCalculation;

  // ---- conditional presentation ------------------------------------------
  cellClass?: (value: unknown, row: T) => string | string[] | null;
  cellStyle?: (value: unknown, row: T) => Record<string, string> | null;

  /**
   * Name of a consumer-provided `<ng-template>` (registered via the viewer's
   * `cellTemplates` input). When set the template renders the cell instead of
   * the default formatter.
   */
  templateName?: string;
}

/** Runtime column state used internally by the table (config + user prefs). */
export interface ReportColumnState {
  key: string;
  visible: boolean;
  /** Display order (lower first). */
  order: number;
  /** Resized width, if the user dragged it. */
  width?: string;
}
