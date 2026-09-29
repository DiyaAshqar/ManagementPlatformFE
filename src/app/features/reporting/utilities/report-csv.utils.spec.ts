import { ReportExportModel } from '../models/report-export.model';
import { buildCsv, escapeCsvField, sanitizeCsvValue } from './report-csv.utils';

function model(partial: Partial<ReportExportModel> = {}): ReportExportModel {
  return {
    title: 'Report',
    generatedAt: new Date('2026-01-01T00:00:00Z'),
    locale: 'en',
    rtl: false,
    orientation: 'portrait',
    filtersSummary: [],
    columns: [
      { key: 'a', header: 'Name', type: 'text', alignment: 'start' },
      { key: 'b', header: 'Total', type: 'currency', alignment: 'end' },
    ],
    rows: [
      [
        { raw: 'Ada', text: 'Ada' },
        { raw: 100, text: '$100.00' },
      ],
    ],
    summaries: [],
    includeCompanyHeader: false,
    includeGeneratedDate: false,
    includeFilters: false,
    includeSummaries: false,
    ...partial,
  };
}

describe('report-csv.utils', () => {
  describe('sanitizeCsvValue (formula injection)', () => {
    it('neutralises leading formula triggers', () => {
      expect(sanitizeCsvValue('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvValue('+cmd')).toBe("'+cmd");
      expect(sanitizeCsvValue('-2')).toBe("'-2");
      expect(sanitizeCsvValue('@x')).toBe("'@x");
    });

    it('leaves safe values untouched', () => {
      expect(sanitizeCsvValue('Ada')).toBe('Ada');
    });
  });

  describe('escapeCsvField', () => {
    it('quotes fields containing the delimiter, quotes or newlines', () => {
      expect(escapeCsvField('a,b', ',')).toBe('"a,b"');
      expect(escapeCsvField('she said "hi"', ',')).toBe('"she said ""hi"""');
    });

    it('does not quote plain values', () => {
      expect(escapeCsvField('plain', ',')).toBe('plain');
    });
  });

  describe('buildCsv', () => {
    it('prepends a UTF-8 BOM and includes the header row', () => {
      const csv = buildCsv(model());
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('Name,Total');
      expect(csv).toContain('Ada,$100.00');
    });

    it('can omit the BOM and honours a custom delimiter', () => {
      const csv = buildCsv(model(), { bom: false, delimiter: ';' });
      expect(csv.charCodeAt(0)).not.toBe(0xfeff);
      expect(csv.split('\r\n')[0]).toBe('Name;Total');
    });

    it('sanitizes an injected formula coming from row text', () => {
      const injected = model({
        rows: [[{ raw: '=HYPERLINK(1)', text: '=HYPERLINK(1)' }, { raw: 0, text: '0' }]],
      });
      const csv = buildCsv(injected, { bom: false });
      expect(csv).toContain("'=HYPERLINK(1)");
    });
  });
});
