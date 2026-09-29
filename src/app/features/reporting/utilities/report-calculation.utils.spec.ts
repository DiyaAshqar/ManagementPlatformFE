import { aggregate, roundTo, safeAverage, safeSum } from './report-calculation.utils';

describe('report-calculation.utils', () => {
  describe('roundTo', () => {
    it('rounds half-up without the classic float error', () => {
      expect(roundTo(1.005, 2)).toBe(1.01);
      expect(roundTo(2.675, 2)).toBe(2.68);
    });

    it('handles non-finite values', () => {
      expect(roundTo(Number.NaN, 2)).toBe(0);
      expect(roundTo(Number.POSITIVE_INFINITY, 2)).toBe(0);
    });
  });

  describe('safeSum', () => {
    it('sums without floating-point drift', () => {
      expect(safeSum([0.1, 0.2])).toBe(0.3);
      expect(safeSum([0.1, 0.1, 0.1])).toBe(0.3);
    });

    it('ignores non-finite entries', () => {
      expect(safeSum([1, Number.NaN, 2])).toBe(3);
    });
  });

  describe('safeAverage', () => {
    it('averages finite values', () => {
      expect(safeAverage([10, 20, 30])).toBe(20);
    });

    it('returns 0 for an empty set', () => {
      expect(safeAverage([])).toBe(0);
    });
  });

  describe('aggregate', () => {
    const values = [100, 200, 50, 300];

    it('counts rows regardless of value', () => {
      expect(aggregate('count', ['a', null, 3])).toBe(3);
    });

    it('computes sum / avg / min / max', () => {
      expect(aggregate('sum', values)).toBe(650);
      expect(aggregate('avg', values)).toBe(162.5);
      expect(aggregate('min', values)).toBe(50);
      expect(aggregate('max', values)).toBe(300);
    });

    it('ignores non-numeric values for numeric aggregates', () => {
      expect(aggregate('sum', [10, 'x', null, 5])).toBe(15);
    });

    it('returns 0 for min/max over an empty numeric set', () => {
      expect(aggregate('min', ['x', null])).toBe(0);
      expect(aggregate('max', [])).toBe(0);
    });
  });
});
