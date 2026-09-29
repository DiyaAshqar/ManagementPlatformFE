import {
  clampPercent,
  computeElapsedRemaining,
  computeRemainingBalance,
  daysBetween,
  formatReportDate,
  formatReportNumber,
  formatReportPercent,
  isImageFileName,
  sumBy,
} from './project-report-calculations.util';

describe('project-report-calculations.util', () => {
  describe('daysBetween', () => {
    it('counts whole calendar days regardless of time-of-day', () => {
      const a = new Date(2026, 0, 1, 23, 45);
      const b = new Date(2026, 0, 11, 0, 5);
      expect(daysBetween(a, b)).toBe(10);
    });

    it('is negative when b is before a', () => {
      expect(daysBetween(new Date(2026, 0, 10), new Date(2026, 0, 1))).toBe(-9);
    });
  });

  describe('computeElapsedRemaining', () => {
    it('returns null for both when start/end are unavailable (never fabricates a date)', () => {
      const result = computeElapsedRemaining(null, null, new Date(2026, 0, 1));
      expect(result.elapsed).toBeNull();
      expect(result.remaining).toBeNull();
    });

    it('computes elapsed from start and remaining until end independently', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 1, 1);
      const asOf = new Date(2026, 0, 11);
      const result = computeElapsedRemaining(start, end, asOf);
      expect(result.elapsed).toBe(10);
      expect(result.remaining).toBe(21);
    });

    it('never returns a negative elapsed figure for an as-of date before start', () => {
      const start = new Date(2026, 5, 1);
      const asOf = new Date(2026, 0, 1);
      const result = computeElapsedRemaining(start, null, asOf);
      expect(result.elapsed).toBe(0);
    });
  });

  describe('sumBy', () => {
    it('sums a numeric selector, treating null/undefined as zero contribution', () => {
      const items = [{ v: 10 }, { v: null }, { v: 5.5 }, { v: undefined }];
      expect(sumBy(items, (i) => i.v)).toBe(15.5);
    });

    it('returns 0 for an empty list (not fabricated, genuinely zero)', () => {
      expect(sumBy([], (i: { v: number }) => i.v)).toBe(0);
    });
  });

  describe('computeRemainingBalance', () => {
    it('returns null when the committed value itself is unavailable', () => {
      expect(computeRemainingBalance(null, 500)).toBeNull();
    });

    it('subtracts paid/used from the committed value when known, including a genuine zero', () => {
      expect(computeRemainingBalance(1000, 400)).toBe(600);
      expect(computeRemainingBalance(1000, 1000)).toBe(0);
    });
  });

  describe('clampPercent', () => {
    it('clamps into [0, 100] and rounds to one decimal', () => {
      expect(clampPercent(142.36)).toBe(100);
      expect(clampPercent(-5)).toBe(0);
      expect(clampPercent(42.36)).toBe(42.4);
    });

    it('returns 0 for non-finite input rather than throwing/NaN leaking into the report', () => {
      expect(clampPercent(NaN)).toBe(0);
    });
  });

  describe('isImageFileName', () => {
    it('recognizes common image extensions case-insensitively', () => {
      expect(isImageFileName('site-photo.JPG')).toBeTrue();
      expect(isImageFileName('plan.png')).toBeTrue();
    });

    it('rejects non-image extensions', () => {
      expect(isImageFileName('contract.pdf')).toBeFalse();
      expect(isImageFileName('boq.xlsx')).toBeFalse();
      expect(isImageFileName('no-extension')).toBeFalse();
    });
  });

  describe('formatReportNumber / formatReportPercent', () => {
    it('always renders Western digits with two decimals regardless of report language', () => {
      expect(formatReportNumber(1234.5)).toBe('1,234.50');
      expect(formatReportPercent(42)).toBe('42.0%');
    });
  });

  describe('formatReportDate', () => {
    it('formats using the English locale for "en"', () => {
      const formatted = formatReportDate(new Date(2026, 0, 15), 'en');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('15');
    });

    it('formats using an Arabic locale for "ar" without throwing', () => {
      const formatted = formatReportDate(new Date(2026, 0, 15), 'ar');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
