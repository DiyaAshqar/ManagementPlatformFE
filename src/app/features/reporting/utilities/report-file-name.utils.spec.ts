import { buildFileName, sanitizeFileName, sanitizeSheetName } from './report-file-name.utils';

describe('report-file-name.utils', () => {
  describe('sanitizeFileName', () => {
    it('strips illegal characters and collapses whitespace to dashes', () => {
      expect(sanitizeFileName('Invoice Report: 2026/Q1')).toBe('Invoice-Report-2026Q1');
    });

    it('falls back when the result is empty', () => {
      expect(sanitizeFileName('***', 'report')).toBe('report');
    });
  });

  describe('buildFileName', () => {
    it('appends a timestamp and extension when requested', () => {
      const name = buildFileName('invoices', 'csv', true);
      expect(name).toMatch(/^invoices-\d{8}-\d{4}\.csv$/);
    });

    it('omits the timestamp when disabled', () => {
      expect(buildFileName('invoices', 'xlsx', false)).toBe('invoices.xlsx');
    });
  });

  describe('sanitizeSheetName', () => {
    it('removes illegal worksheet characters and caps length at 31', () => {
      expect(sanitizeSheetName('Data/Sheet:1*[test]')).toBe('Data Sheet 1 test');
      expect(sanitizeSheetName('x'.repeat(50)).length).toBe(31);
    });
  });
});
