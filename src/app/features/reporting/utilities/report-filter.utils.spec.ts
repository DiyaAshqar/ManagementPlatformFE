import { ReportFilterConfig } from '../models/report-filter.model';
import {
  applyFilters,
  applySearch,
  applySort,
  FieldResolver,
  isBlankFilterValue,
  paginate,
} from './report-filter.utils';
import { resolvePath } from './report-value.utils';

interface Row {
  id: number;
  name: string;
  total: number;
  date: string;
  status: string;
  paid: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', total: 100, date: '2026-01-10', status: 'Paid', paid: true },
  { id: 2, name: 'Grace', total: 250, date: '2026-02-15', status: 'Pending', paid: false },
  { id: 3, name: 'Alan', total: 50, date: '2026-03-20', status: 'Paid', paid: true },
  { id: 4, name: 'Katherine', total: 900, date: '2026-04-25', status: 'Overdue', paid: false },
];

const resolver: FieldResolver<Row> = (row, field) => resolvePath(row, field);

describe('report-filter.utils', () => {
  describe('isBlankFilterValue', () => {
    it('treats null / empty / empty-array / empty-range as blank', () => {
      expect(isBlankFilterValue(null)).toBeTrue();
      expect(isBlankFilterValue('')).toBeTrue();
      expect(isBlankFilterValue([])).toBeTrue();
      expect(isBlankFilterValue({ from: null, to: null })).toBeTrue();
    });

    it('treats false and 0 as non-blank', () => {
      expect(isBlankFilterValue(false)).toBeFalse();
      expect(isBlankFilterValue(0)).toBeFalse();
    });
  });

  describe('applyFilters', () => {
    it('filters by text (substring, case-insensitive)', () => {
      const filters: ReportFilterConfig<Row>[] = [{ key: 'name', type: 'text', label: 'Name' }];
      const result = applyFilters(ROWS, filters, { name: 'al' }, resolver);
      expect(result.map((r) => r.name)).toEqual(['Alan', 'Katherine']);
    });

    it('filters by number range', () => {
      const filters: ReportFilterConfig<Row>[] = [
        { key: 'amount', type: 'numberRange', label: 'Amount', fieldKey: 'total' },
      ];
      const result = applyFilters(ROWS, filters, { amount: { from: 100, to: 300 } }, resolver);
      expect(result.map((r) => r.id)).toEqual([1, 2]);
    });

    it('filters by date range (inclusive of day boundaries)', () => {
      const filters: ReportFilterConfig<Row>[] = [
        { key: 'date', type: 'dateRange', label: 'Date', fieldKey: 'date' },
      ];
      const result = applyFilters(
        ROWS,
        filters,
        { date: [new Date('2026-02-01'), new Date('2026-03-31')] },
        resolver
      );
      expect(result.map((r) => r.id)).toEqual([2, 3]);
    });

    it('filters by multiSelect membership', () => {
      const filters: ReportFilterConfig<Row>[] = [{ key: 'status', type: 'multiSelect', label: 'Status' }];
      const result = applyFilters(ROWS, filters, { status: ['Paid', 'Overdue'] }, resolver);
      expect(result.map((r) => r.id)).toEqual([1, 3, 4]);
    });

    it('uses a custom matcher when provided', () => {
      const filters: ReportFilterConfig<Row>[] = [
        { key: 'fullyPaid', type: 'boolean', label: 'Paid', matcher: (row, value) => row.paid === value },
      ];
      const result = applyFilters(ROWS, filters, { fullyPaid: true }, resolver);
      expect(result.map((r) => r.id)).toEqual([1, 3]);
    });
  });

  describe('applySearch', () => {
    it('matches any searchable field', () => {
      const result = applySearch(ROWS, 'grace', ['name', 'status'], resolver);
      expect(result.map((r) => r.id)).toEqual([2]);
    });

    it('returns all rows for a blank term', () => {
      expect(applySearch(ROWS, '   ', ['name'], resolver).length).toBe(4);
    });
  });

  describe('applySort', () => {
    it('sorts ascending / descending', () => {
      const asc = applySort(ROWS, [{ field: 'total', direction: 'asc' }], resolver);
      expect(asc.map((r) => r.total)).toEqual([50, 100, 250, 900]);
      const desc = applySort(ROWS, [{ field: 'total', direction: 'desc' }], resolver);
      expect(desc.map((r) => r.total)).toEqual([900, 250, 100, 50]);
    });

    it('supports multi-column sort', () => {
      const rows = [
        { a: 'x', b: 2 },
        { a: 'x', b: 1 },
        { a: 'y', b: 1 },
      ];
      const sorted = applySort(
        rows,
        [
          { field: 'a', direction: 'asc' },
          { field: 'b', direction: 'asc' },
        ],
        (row, field) => resolvePath(row, field)
      );
      expect(sorted).toEqual([
        { a: 'x', b: 1 },
        { a: 'x', b: 2 },
        { a: 'y', b: 1 },
      ]);
    });
  });

  describe('paginate', () => {
    it('returns the requested 1-based page', () => {
      expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    });
  });
});
