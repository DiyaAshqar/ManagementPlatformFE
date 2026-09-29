import { createZip, ZipEntry } from './zip.utils';

/**
 * Tiny, dependency-free `.xlsx` (OOXML SpreadsheetML) writer.
 *
 * Deliberately scoped to what reporting needs: genuine typed cells (numbers,
 * currency, percentage, dates, booleans), a styled + frozen header row, per
 * column widths and multiple sheets. It intentionally does **not** implement
 * the full spec — the goal is a valid workbook Excel/LibreOffice open cleanly
 * without shipping a heavyweight spreadsheet dependency.
 */

export type XlsxCellType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'empty';

export interface XlsxCell {
  type: XlsxCellType;
  value: string | number | Date | boolean | null;
  currencyCode?: string;
  decimals?: number;
  /** Render with the bold, filled, centred header style. */
  header?: boolean;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
  /** Column widths in Excel character units. */
  columnWidths?: number[];
  /** Number of leading rows to freeze (keeps the header visible on scroll). */
  freezeRows?: number;
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const encoder = new TextEncoder();

// Matches XML 1.0 illegal C0 control chars (all below 0x20 except tab/LF/CR).
const INVALID_XML_CHARS = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F]', 'g');

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip characters that are illegal in XML 1.0 (would corrupt the file). */
function stripInvalidXml(value: string): string {
  return value.replace(INVALID_XML_CHARS, '');
}

function safeText(value: string): string {
  return xmlEscape(stripInvalidXml(value));
}

/** 0-based column index → spreadsheet letters (0 → A, 26 → AA). */
export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** Excel date serial (days since 1899-12-30), using local calendar fields. */
export function excelSerial(date: Date): number {
  const epoch = Date.UTC(1899, 11, 30);
  const utc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );
  return (utc - epoch) / 86400000;
}

function decimalsPart(decimals: number | undefined, fallback: number): string {
  const count = decimals ?? fallback;
  return count > 0 ? `.${'0'.repeat(count)}` : '';
}

/** Accumulates number formats + cell styles and emits `styles.xml`. */
class StyleRegistry {
  private readonly numFmts = new Map<string, number>();
  private nextNumFmtId = 164;
  private readonly xfs: string[] = [];
  private readonly xfKeys = new Map<string, number>();

  constructor() {
    this.xfs.push('<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>');
    this.xfKeys.set('0|0|0|0|', 0);
  }

  private numFmtId(code: string): number {
    if (!code) {
      return 0;
    }
    const existing = this.numFmts.get(code);
    if (existing !== undefined) {
      return existing;
    }
    const id = this.nextNumFmtId++;
    this.numFmts.set(code, id);
    return id;
  }

  xf(options: {
    code?: string;
    fontId?: number;
    fillId?: number;
    borderId?: number;
    align?: 'left' | 'center' | 'right';
  }): number {
    const numFmtId = this.numFmtId(options.code ?? '');
    const fontId = options.fontId ?? 0;
    const fillId = options.fillId ?? 0;
    const borderId = options.borderId ?? 1;
    const align = options.align ?? '';
    const key = `${numFmtId}|${fontId}|${fillId}|${borderId}|${align}`;
    const existing = this.xfKeys.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const index = this.xfs.length;
    const applyNumFmt = numFmtId !== 0 ? ' applyNumberFormat="1"' : '';
    const applyFont = fontId !== 0 ? ' applyFont="1"' : '';
    const applyFill = fillId !== 0 ? ' applyFill="1"' : '';
    const applyBorder = borderId !== 0 ? ' applyBorder="1"' : '';
    const applyAlign = align ? ' applyAlignment="1"' : '';
    const alignmentXml = align ? `<alignment horizontal="${align}" vertical="center"/>` : '';
    this.xfs.push(
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
        `${applyNumFmt}${applyFont}${applyFill}${applyBorder}${applyAlign}>${alignmentXml}</xf>`
    );
    this.xfKeys.set(key, index);
    return index;
  }

  buildStylesXml(): string {
    const numFmtEntries = [...this.numFmts.entries()]
      .map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${xmlEscape(code)}"/>`)
      .join('');
    const numFmtsXml =
      this.numFmts.size > 0
        ? `<numFmts count="${this.numFmts.size}">${numFmtEntries}</numFmts>`
        : '';

    return (
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      numFmtsXml +
      '<fonts count="2">' +
      '<font><sz val="11"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/></font>' +
      '</fonts>' +
      '<fills count="3">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="2">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border>' +
      '<left style="thin"><color rgb="FFE5E7EB"/></left>' +
      '<right style="thin"><color rgb="FFE5E7EB"/></right>' +
      '<top style="thin"><color rgb="FFE5E7EB"/></top>' +
      '<bottom style="thin"><color rgb="FFE5E7EB"/></bottom>' +
      '<diagonal/></border>' +
      '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>'
    );
  }
}

function cellXml(cell: XlsxCell, ref: string, registry: StyleRegistry): string {
  const isEmpty =
    cell.type === 'empty' || cell.value === null || cell.value === undefined || cell.value === '';
  if (isEmpty) {
    return '';
  }

  if (cell.header) {
    const style = registry.xf({ fontId: 1, fillId: 2, borderId: 1, align: cell.align ?? 'center' });
    return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${safeText(
      String(cell.value)
    )}</t></is></c>`;
  }

  switch (cell.type) {
    case 'text': {
      const style = registry.xf({ borderId: 1, fontId: cell.bold ? 1 : 0, align: cell.align });
      return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${safeText(
        String(cell.value)
      )}</t></is></c>`;
    }
    case 'number': {
      const num = Number(cell.value);
      if (!Number.isFinite(num)) {
        return '';
      }
      const code = cell.decimals != null ? `#,##0${decimalsPart(cell.decimals, 0)}` : '#,##0.##';
      const style = registry.xf({ code, borderId: 1, align: 'right' });
      return `<c r="${ref}" s="${style}"><v>${num}</v></c>`;
    }
    case 'currency': {
      const num = Number(cell.value);
      if (!Number.isFinite(num)) {
        return '';
      }
      const suffix = cell.currencyCode ? ` "${cell.currencyCode}"` : '';
      const code = `#,##0${decimalsPart(cell.decimals, 2)}${suffix}`;
      const style = registry.xf({ code, borderId: 1, align: 'right' });
      return `<c r="${ref}" s="${style}"><v>${num}</v></c>`;
    }
    case 'percentage': {
      const num = Number(cell.value);
      if (!Number.isFinite(num)) {
        return '';
      }
      const code = `0${decimalsPart(cell.decimals, 2)}"%"`;
      const style = registry.xf({ code, borderId: 1, align: 'right' });
      return `<c r="${ref}" s="${style}"><v>${num}</v></c>`;
    }
    case 'date':
    case 'datetime': {
      const date = cell.value instanceof Date ? cell.value : new Date(String(cell.value));
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      const code = cell.type === 'datetime' ? 'yyyy\\-mm\\-dd\\ hh:mm' : 'yyyy\\-mm\\-dd';
      const style = registry.xf({ code, borderId: 1, align: 'left' });
      return `<c r="${ref}" s="${style}"><v>${excelSerial(date)}</v></c>`;
    }
    case 'boolean': {
      const style = registry.xf({ borderId: 1, align: 'center' });
      return `<c r="${ref}" t="b" s="${style}"><v>${cell.value ? 1 : 0}</v></c>`;
    }
    default:
      return '';
  }
}

function sheetXml(sheet: XlsxSheet, registry: StyleRegistry): string {
  const rowCount = sheet.rows.length;
  const colCount = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  const dimension = rowCount > 0 ? `A1:${columnLetter(Math.max(colCount - 1, 0))}${rowCount}` : 'A1';

  const rowsXml = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => cellXml(cell, `${columnLetter(colIndex)}${rowIndex + 1}`, registry))
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  const freeze = sheet.freezeRows ?? 0;
  const sheetViews =
    freeze > 0
      ? '<sheetViews><sheetView workbookViewId="0">' +
        `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>` +
        `<selection pane="bottomLeft" activeCell="A${freeze + 1}" sqref="A${freeze + 1}"/>` +
        '</sheetView></sheetViews>'
      : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const cols =
    sheet.columnWidths && sheet.columnWidths.length > 0
      ? '<cols>' +
        sheet.columnWidths
          .map(
            (width, index) =>
              `<col min="${index + 1}" max="${index + 1}" width="${Math.max(
                6,
                Math.min(80, Math.round(width * 100) / 100)
              )}" customWidth="1"/>`
          )
          .join('') +
        '</cols>'
      : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<dimension ref="${dimension}"/>` +
    sheetViews +
    cols +
    `<sheetData>${rowsXml}</sheetData>` +
    '</worksheet>'
  );
}

/** Build a valid `.xlsx` Blob from one or more sheets. */
export function buildXlsxBlob(sheets: readonly XlsxSheet[]): Blob {
  const registry = new StyleRegistry();
  const list = sheets.length > 0 ? sheets : [{ name: 'Sheet1', rows: [] as XlsxCell[][] }];

  // Generate sheet XML first so the style registry is fully populated.
  const sheetXmls = list.map((sheet) => sheetXml(sheet, registry));

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    list
      .map(
        (_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    list
      .map(
        (sheet, index) =>
          `<sheet name="${safeText(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join('') +
    '</sheets></workbook>';

  const stylesRelId = list.length + 1;
  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    list
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    { name: '_rels/.rels', data: encoder.encode(rootRels) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
    { name: 'xl/styles.xml', data: encoder.encode(registry.buildStylesXml()) },
    ...sheetXmls.map((xml, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: encoder.encode(xml),
    })),
  ];

  const zipped = createZip(entries);
  return new Blob([zipped as BlobPart], { type: XLSX_MIME });
}

/** Rough auto-width: widest cell text, clamped, plus a little padding. */
export function estimateColumnWidth(headerText: string, sampleTexts: readonly string[]): number {
  const longest = sampleTexts.reduce((max, text) => Math.max(max, text.length), headerText.length);
  return Math.max(8, Math.min(60, longest + 2));
}
