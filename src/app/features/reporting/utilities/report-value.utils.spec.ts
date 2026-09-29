import { ReportColumn } from '../models/report-column.model';
import { compareValues, getColumnValue, isEmptyValue, resolvePath, toDate, toNumber } from './report-value.utils';

describe('report-value.utils', () => {
  describe('resolvePath', () => {
    it('resolves a flat property', () => {
      expect(resolvePath({ name: 'Ada' }, 'name')).toBe('Ada');
    });

    it('resolves a nested path', () => {
      expect(resolvePath({ customer: { name: 'Ada' } }, 'customer.name')).toBe('Ada');
    });

    it('is safe against nullish links', () => {
      expect(resolvePath({ customer: null }, 'customer.name')).toBeUndefined();
      expect(resolvePath(null, 'a.b')).toBeUndefined();
    });
  });

  describe('getColumnValue', () => {
    it('prefers a custom getter over the path', () => {
      const column: ReportColumn = { key: 'total', header: 'Total', value: () => 42 };
      expect(getColumnValue({ total: 1 }, column)).toBe(42);
    });

    it('falls back to path resolution', () => {
      const column: ReportColumn = { key: 'customer.name', header: 'Customer' };
      expect(getColumnValue({ customer: { name: 'Ada' } }, column)).toBe('Ada');
    });
  });

  describe('coercion', () => {
    it('toNumber parses numeric strings and rejects the rest', () => {
      expect(toNumber('12.5')).toBe(12.5);
      expect(toNumber('abc')).toBeNull();
      expect(toNumber(null)).toBeNull();
    });

    it('toDate parses ISO strings', () => {
      const date = toDate('2026-01-15T00:00:00.000Z');
      expect(date instanceof Date).toBeTrue();
      expect(toDate('not-a-date')).toBeNull();
    });

    it('isEmptyValue detects blanks', () => {
      expect(isEmptyValue('')).toBeTrue();
      expect(isEmptyValue(null)).toBeTrue();
      expect(isEmptyValue(0)).toBeFalse();
    });
  });

  describe('compareValues', () => {
    it('sorts numbers numerically', () => {
      expect(compareValues(2, 10)).toBeLessThan(0);
    });

    it('sorts nullish values last', () => {
      expect(compareValues(null, 5)).toBeGreaterThan(0);
      expect(compareValues(5, null)).toBeLessThan(0);
    });
  });
});
