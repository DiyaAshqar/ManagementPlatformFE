import { buildXlsxBlob, columnLetter, excelSerial, XlsxSheet } from './xlsx.utils';

describe('xlsx.utils', () => {
  describe('columnLetter', () => {
    it('maps 0-based indices to spreadsheet letters', () => {
      expect(columnLetter(0)).toBe('A');
      expect(columnLetter(25)).toBe('Z');
      expect(columnLetter(26)).toBe('AA');
      expect(columnLetter(27)).toBe('AB');
    });
  });

  describe('excelSerial', () => {
    it('converts a date to the Excel serial number', () => {
      expect(excelSerial(new Date(2020, 0, 1))).toBe(43831);
    });
  });

  describe('buildXlsxBlob', () => {
    it('produces a valid xlsx Blob', () => {
      const sheet: XlsxSheet = {
        name: 'Invoices',
        freezeRows: 1,
        columnWidths: [12, 10],
        rows: [
          [
            { type: 'text', value: 'Name', header: true },
            { type: 'text', value: 'Total', header: true },
          ],
          [
            { type: 'text', value: 'Ada' },
            { type: 'currency', value: 100.5, currencyCode: 'JOD', decimals: 2 },
          ],
        ],
      };
      const blob = buildXlsxBlob([sheet]);
      expect(blob instanceof Blob).toBeTrue();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('does not throw on an empty workbook', () => {
      expect(() => buildXlsxBlob([])).not.toThrow();
    });
  });
});
