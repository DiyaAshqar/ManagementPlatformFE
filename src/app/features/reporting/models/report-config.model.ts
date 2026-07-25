import { ReportColumn } from './report-column.model';
import {
  ReportContext,
  ReportDataMode,
  ReportRow,
  ReportSortConfig,
} from './report-common.model';
import { ReportExportConfig } from './report-export.model';
import { ReportFilterConfig } from './report-filter.model';
import { ReportSummaryConfig } from './report-summary.model';

/** Toggleable table/toolbar features. All optional; sensible defaults apply. */
export interface ReportFeaturesConfig {
  search?: boolean;
  filters?: boolean;
  pagination?: boolean;
  sorting?: boolean;
  /** Allow sorting by multiple columns at once. */
  multiSort?: boolean;
  columnSelection?: boolean;
  columnReordering?: boolean;
  columnResizing?: boolean;
  rowSelection?: boolean;
  /** Show a leading 1-based row-number column. */
  rowNumbers?: boolean;
  grouping?: boolean;
  summaries?: boolean;
  print?: boolean;
  refresh?: boolean;
  fullscreen?: boolean;
  stickyHeader?: boolean;
}

export interface ReportPaginationConfig {
  pageSize?: number;
  pageSizeOptions?: number[];
}

/** State persistence options (per report id, optionally per user). */
export interface ReportPersistenceConfig {
  enabled: boolean;
  storage?: 'localStorage' | 'sessionStorage';
  /** Override the storage key (defaults to the report id). */
  key?: string;
  /** Scope the key to a user so preferences don't leak across accounts. */
  userId?: string;
  includeFilters?: boolean;
  includeColumns?: boolean;
  includeSorting?: boolean;
  includePageSize?: boolean;
  includeGrouping?: boolean;
  /** Sync a subset of state to the URL query string. */
  syncUrl?: boolean;
}

/** Granular action for permission resolution. */
export type ReportPermissionAction =
  | 'view'
  | 'exportPdf'
  | 'exportExcel'
  | 'exportCsv'
  | 'print'
  | 'viewFinancials';

/** Static permission flags. Any omitted flag defaults to allowed. */
export interface ReportPermissions {
  view?: boolean;
  exportPdf?: boolean;
  exportExcel?: boolean;
  exportCsv?: boolean;
  print?: boolean;
  /** Gate for financial summaries/columns marked `financial`. */
  viewFinancials?: boolean;
}

/** Callback form of permission resolution (evaluated per action). */
export type ReportPermissionResolver = (action: ReportPermissionAction) => boolean;

/** Optional grouping definition. Multiple groups nest in declared order. */
export interface ReportGroupConfig<T = ReportRow> {
  key: string;
  field: string;
  label?: string;
  labelKey?: string;
  /** Bucket a raw value into a group key (e.g. a date → `YYYY-MM`). */
  valueFormatter?: (value: unknown, row: T) => string;
  /** Group-level summaries (defaults to the report's summaries). */
  summaries?: ReportSummaryConfig<T>[];
  collapsedByDefault?: boolean;
}

/**
 * The single, generic configuration object that fully describes a report.
 *
 * A new report is created by declaring columns/filters/summaries — no bespoke
 * component is required.
 */
export interface ReportConfig<T = ReportRow> {
  id: string;
  title: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;

  /** `client` (local processing) or `server` (emits queries). Default `client`. */
  dataMode?: ReportDataMode;

  columns: ReportColumn<T>[];
  filters?: ReportFilterConfig<T>[];
  summaries?: ReportSummaryConfig<T>[];
  groups?: ReportGroupConfig<T>[];

  features?: ReportFeaturesConfig;
  export?: ReportExportConfig;
  pagination?: ReportPaginationConfig;
  persistence?: ReportPersistenceConfig;
  permissions?: ReportPermissions;

  /** Stable row identity (used for selection & tracking). */
  rowId?: (row: T) => string | number;
  defaultSort?: ReportSortConfig[];
  /** Group keys active by default. */
  defaultGroups?: string[];

  /** Export file name (string or context-aware factory). */
  fileName?: string | ((context: ReportContext) => string);

  emptyStateMessage?: string;
  emptyStateMessageKey?: string;

  /** BCP-47 locale override (defaults to the app language). */
  locale?: string;
  /** Default currency code for `currency` columns/summaries. */
  currencyCode?: string;
  /** Debounce (ms) for the global search box (default 300). */
  searchDebounceMs?: number;
}

/**
 * Authoring helper. Lets a report be declared against a concrete row type `T`
 * (full type-safety in every column/filter/summary callback) while returning
 * the erased `ReportConfig` shape the non-generic `<app-report-viewer>` binds
 * to. This keeps the reusable component free of generic-component friction
 * without sacrificing authoring ergonomics or resorting to `any`.
 *
 * ```ts
 * readonly config = defineReport<InvoiceReportRow>({ id: 'invoices', ... });
 * ```
 */
export function defineReport<T>(config: ReportConfig<T>): ReportConfig {
  return config as unknown as ReportConfig;
}
