import { Observable } from 'rxjs';
import { ReportRow } from './report-common.model';

/** Supported filter widget types. */
export type ReportFilterType =
  | 'text'
  | 'number'
  | 'numberRange'
  | 'date'
  | 'dateRange'
  | 'select'
  | 'multiSelect'
  | 'boolean'
  | 'status'
  | 'autocomplete'
  | 'custom';

/** A selectable option for select / multiSelect / status / autocomplete filters. */
export interface ReportFilterOption {
  label: string;
  /** Translation key (preferred over `label`). */
  labelKey?: string;
  value: unknown;
  /** Optional severity for status options (drives the tag colour). */
  severity?: string;
}

/** Map of `filterKey -> value`. */
export type ReportFilterValues = Record<string, unknown>;

/**
 * Dynamic filter definition. A filter both renders a widget and (in client
 * mode) knows how to match rows; in server mode its value is emitted verbatim
 * (after `transform`) inside the {@link ReportQuery}.
 */
export interface ReportFilterConfig<T = ReportRow> {
  key: string;
  type: ReportFilterType;
  label: string;
  labelKey?: string;
  placeholder?: string;
  placeholderKey?: string;
  defaultValue?: unknown;
  required?: boolean;

  /** Min bound for `number`/`numberRange`/`date`/`dateRange`. */
  min?: number | Date;
  /** Max bound for `number`/`numberRange`/`date`/`dateRange`. */
  max?: number | Date;

  /** Static options for select-like filters. */
  options?: ReportFilterOption[];
  /** Async option loader (lazy — only invoked when the filter is first shown). */
  optionsLoader?: () => Observable<ReportFilterOption[]>;

  /** Only render the filter when this predicate (over current values) is true. */
  visibleWhen?: (values: ReportFilterValues) => boolean;
  /** Key of another filter this one depends on (reset when the parent changes). */
  dependsOn?: string;
  /** Group under the collapsible "advanced filters" section. */
  advanced?: boolean;
  /** Debounce (ms) before the value is committed — primarily for text inputs. */
  debounceMs?: number;

  /** Transform the raw widget value before it is emitted to the API / matcher. */
  transform?: (value: unknown) => unknown;
  /**
   * Client-side row matcher. When omitted a sensible default per `type` is
   * used against `fieldKey ?? key`. Return `true` to keep the row.
   */
  matcher?: (row: T, value: unknown) => boolean;
  /** Row field this filter targets in client mode (defaults to `key`). */
  fieldKey?: string;

  /**
   * Name of a consumer-provided `<ng-template>` for `custom` filters (see the
   * viewer's `filterTemplates` input).
   */
  templateName?: string;
}
