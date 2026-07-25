import { ReportExportModel } from '../models/report-export.model';

export interface CsvOptions {
  delimiter?: string;
  /** Prepend a UTF-8 BOM so Excel renders Arabic/UTF-8 correctly. */
  bom?: boolean;
  /** Use raw values instead of display text where the raw value is primitive. */
  useRawValues?: boolean;
  includeSummaries?: boolean;
}

/** Leading characters Excel/Sheets may interpret as a formula. */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Neutralise CSV formula injection: a leading `=`, `+`, `-`, `@`, tab or CR in
 * untrusted text is prefixed with a single quote so spreadsheets treat it as
 * text, never a formula. See OWASP "CSV Injection".
 */
export function sanitizeCsvValue(value: string): string {
  if (value.length > 0 && FORMULA_TRIGGERS.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

/** Escape a single field (quote when it contains the delimiter/quote/newline). */
export function escapeCsvField(value: string, delimiter: string): string {
  const sanitized = sanitizeCsvValue(value);
  const needsQuoting =
    sanitized.includes(delimiter) ||
    sanitized.includes('"') ||
    sanitized.includes('\n') ||
    sanitized.includes('\r');
  if (!needsQuoting) {
    return sanitized;
  }
  return `"${sanitized.replace(/"/g, '""')}"`;
}

function cellToString(raw: unknown, text: string, useRaw: boolean): string {
  if (!useRaw) {
    return text;
  }
  if (raw === null || raw === undefined) {
    return '';
  }
  if (raw instanceof Date) {
    return raw.toISOString();
  }
  if (typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'string') {
    return String(raw);
  }
  return text;
}

/** Build a full CSV document string from a neutral export model. */
export function buildCsv(model: ReportExportModel, options: CsvOptions = {}): string {
  const delimiter = options.delimiter && options.delimiter.length > 0 ? options.delimiter : ',';
  const useRaw = options.useRawValues ?? false;
  const lines: string[] = [];

  const headerRow = model.columns
    .map((column) => escapeCsvField(column.header, delimiter))
    .join(delimiter);
  lines.push(headerRow);

  for (const row of model.rows) {
    const line = row
      .map((cell) => escapeCsvField(cellToString(cell.raw, cell.text, useRaw), delimiter))
      .join(delimiter);
    lines.push(line);
  }

  if (options.includeSummaries && model.summaries.length > 0) {
    lines.push('');
    for (const summary of model.summaries) {
      lines.push(
        [escapeCsvField(summary.label, delimiter), escapeCsvField(summary.value, delimiter)].join(
          delimiter
        )
      );
    }
  }

  const content = lines.join('\r\n');
  return options.bom === false ? content : `﻿${content}`;
}
