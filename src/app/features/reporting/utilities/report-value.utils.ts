import { ReportColumn } from '../models/report-column.model';
import { ReportRow } from '../models/report-common.model';

/**
 * Resolve a (possibly nested) property path against an object.
 * `resolvePath({ a: { b: 1 } }, 'a.b')` → `1`. Safe against nullish links.
 */
export function resolvePath(row: unknown, path: string): unknown {
  if (row == null || !path) {
    return undefined;
  }
  if (!path.includes('.')) {
    return (row as ReportRow)[path];
  }
  let current: unknown = row;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as ReportRow)[segment];
  }
  return current;
}

/** Raw value for a column (custom getter wins over path resolution). */
export function getColumnValue<T>(row: T, column: ReportColumn<T>): unknown {
  return column.value ? column.value(row) : resolvePath(row, column.key);
}

/** Treat null / undefined / empty-string as "empty". */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/** Coerce a value to a finite number, or `null` when not numeric. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Coerce a value to a `Date`, or `null` when it isn't a valid date. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * A comparable primitive for sorting. Numbers/dates compare naturally,
 * everything else falls back to a lowercased string.
 */
export function toComparable(value: unknown): number | string | null {
  if (isEmptyValue(value)) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  const asNumber = typeof value === 'string' ? Number(value) : NaN;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(asNumber)) {
    return asNumber;
  }
  return String(value).toLowerCase();
}

/**
 * Compare two arbitrary values for sorting. Nullish values sort last
 * regardless of direction. Returns a stable-ish comparator result.
 */
export function compareValues(a: unknown, b: unknown, locale?: string): number {
  const ca = toComparable(a);
  const cb = toComparable(b);
  if (ca === null && cb === null) {
    return 0;
  }
  if (ca === null) {
    return 1;
  }
  if (cb === null) {
    return -1;
  }
  if (typeof ca === 'number' && typeof cb === 'number') {
    return ca - cb;
  }
  return String(ca).localeCompare(String(cb), locale);
}
