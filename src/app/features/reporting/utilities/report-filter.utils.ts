import { DateRangeValue, NumberRangeValue, ReportSortConfig } from '../models/report-common.model';
import { ReportFilterConfig, ReportFilterValues } from '../models/report-filter.model';
import { compareValues, toDate, toNumber } from './report-value.utils';

/** Resolves a raw field value for a row (path- or getter-based). */
export type FieldResolver<T> = (row: T, field: string) => unknown;

/** Whether a filter value should be treated as "no filter applied". */
export function isBlankFilterValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Date) {
    return false;
  }
  if (typeof value === 'object') {
    const range = value as NumberRangeValue & DateRangeValue;
    return isBlankFilterValue(range.from ?? null) && isBlankFilterValue(range.to ?? null);
  }
  return false;
}

/** Normalize a range widget value (`{from,to}` or a `[a,b]` tuple). */
function normalizeRange(value: unknown): { from: unknown; to: unknown } {
  if (Array.isArray(value)) {
    return { from: value[0] ?? null, to: value[1] ?? null };
  }
  const range = (value ?? {}) as NumberRangeValue & DateRangeValue;
  return { from: range.from ?? null, to: range.to ?? null };
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Default per-type client-side matcher. */
function defaultMatch(type: ReportFilterConfig['type'], fieldValue: unknown, filterValue: unknown): boolean {
  switch (type) {
    case 'text':
    case 'autocomplete': {
      const haystack = String(fieldValue ?? '').toLowerCase();
      return haystack.includes(String(filterValue ?? '').toLowerCase());
    }
    case 'number': {
      const a = toNumber(fieldValue);
      const b = toNumber(filterValue);
      return a !== null && b !== null && a === b;
    }
    case 'numberRange': {
      const { from, to } = normalizeRange(filterValue);
      const value = toNumber(fieldValue);
      if (value === null) {
        return false;
      }
      const min = toNumber(from);
      const max = toNumber(to);
      if (min !== null && value < min) {
        return false;
      }
      if (max !== null && value > max) {
        return false;
      }
      return true;
    }
    case 'date': {
      const value = toDate(fieldValue);
      const target = toDate(filterValue);
      return value !== null && target !== null && sameDay(value, target);
    }
    case 'dateRange': {
      const { from, to } = normalizeRange(filterValue);
      const value = toDate(fieldValue);
      if (value === null) {
        return false;
      }
      const min = toDate(from);
      const max = toDate(to);
      if (min !== null && value.getTime() < startOfDay(min)) {
        return false;
      }
      if (max !== null && value.getTime() > endOfDay(max)) {
        return false;
      }
      return true;
    }
    case 'boolean':
      return Boolean(fieldValue) === Boolean(filterValue);
    case 'multiSelect': {
      const selected = Array.isArray(filterValue) ? filterValue : [filterValue];
      return selected.map((v) => String(v)).includes(String(fieldValue));
    }
    case 'select':
    case 'status':
      return String(fieldValue) === String(filterValue);
    case 'custom':
    default:
      return true;
  }
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
}

function endOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

/** Apply every active filter to the rows (client mode). */
export function applyFilters<T>(
  rows: readonly T[],
  filters: readonly ReportFilterConfig<T>[],
  values: ReportFilterValues,
  resolver: FieldResolver<T>
): T[] {
  const active = filters.filter((filter) => !isBlankFilterValue(values[filter.key]));
  if (active.length === 0) {
    return [...rows];
  }
  return rows.filter((row) =>
    active.every((filter) => {
      const value = values[filter.key];
      if (filter.matcher) {
        return filter.matcher(row, value);
      }
      const fieldValue = resolver(row, filter.fieldKey ?? filter.key);
      return defaultMatch(filter.type, fieldValue, value);
    })
  );
}

/** Global search across the given searchable field keys. */
export function applySearch<T>(
  rows: readonly T[],
  term: string,
  searchFields: readonly string[],
  resolver: FieldResolver<T>
): T[] {
  const needle = term.trim().toLowerCase();
  if (!needle || searchFields.length === 0) {
    return [...rows];
  }
  return rows.filter((row) =>
    searchFields.some((field) => String(resolver(row, field) ?? '').toLowerCase().includes(needle))
  );
}

/** Multi-column stable sort (client mode). */
export function applySort<T>(
  rows: readonly T[],
  sort: readonly ReportSortConfig[],
  resolver: FieldResolver<T>,
  locale?: string
): T[] {
  if (sort.length === 0) {
    return [...rows];
  }
  // Decorate-sort-undecorate keeps the sort stable across engines.
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (const instruction of sort) {
        const direction = instruction.direction === 'desc' ? -1 : 1;
        const result = compareValues(
          resolver(a.row, instruction.field),
          resolver(b.row, instruction.field),
          locale
        );
        if (result !== 0) {
          return result * direction;
        }
      }
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

/** 1-based client-side pagination. */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) {
    return [...rows];
  }
  const start = Math.max(0, (page - 1) * pageSize);
  return rows.slice(start, start + pageSize);
}
