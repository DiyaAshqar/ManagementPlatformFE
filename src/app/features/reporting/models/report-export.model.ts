import { ReportAlignment, ReportColumnType } from './report-common.model';

/** Supported export/print formats. */
export type ReportExportFormat = 'pdf' | 'excel' | 'csv' | 'print';

/** Which records an export covers. */
export type ReportExportScope = 'currentPage' | 'filtered' | 'selected';

export type ReportOrientation = 'portrait' | 'landscape';

/** Optional company header rendered in PDF/print/Excel exports. */
export interface ReportCompanyInfo {
  name?: string;
  /**
   * Logo as a **data URL** (`data:image/png;base64,...`). A data URL is used
   * deliberately so the module never depends on a committed asset file.
   */
  logoDataUrl?: string;
}

/** Static export configuration declared on the report config. */
export interface ReportExportConfig {
  pdf?: boolean;
  excel?: boolean;
  csv?: boolean;
  print?: boolean;
  /** Base file name (without extension). */
  fileName?: string;
  /** CSV field delimiter (default `,`). */
  csvDelimiter?: string;
  /** Default PDF/print orientation. */
  orientation?: ReportOrientation;
  company?: ReportCompanyInfo;
  includeFilters?: boolean;
  includeSummaries?: boolean;
  includeCompanyHeader?: boolean;
  includeGeneratedDate?: boolean;
  /** Diagonal watermark text for PDF/print. */
  watermark?: string;
  /** Footer text for PDF/print. */
  footerText?: string;
  /** Render a signature block at the end of PDF/print. */
  signature?: boolean;
}

/** A concrete export request produced by the export dialog. */
export interface ReportExportRequest {
  format: ReportExportFormat;
  scope: ReportExportScope;
  fileName: string;
  /** Column keys to include (already filtered to exportable + visible). */
  columns: string[];
  orientation: ReportOrientation;
  delimiter: string;
  includeFilters: boolean;
  includeSummaries: boolean;
  includeCompanyHeader: boolean;
  includeGeneratedDate: boolean;
}

// ---- Neutral export model (business-free) ---------------------------------

/** A column as needed by the export/print writers. */
export interface ReportExportColumn {
  key: string;
  header: string;
  type: ReportColumnType;
  alignment: ReportAlignment;
  currencyCode?: string;
  decimals?: number;
}

/** A single exported cell — carries both the raw value and its display text. */
export interface ReportExportCell {
  /** Raw value (number/Date/boolean/string) for typed spreadsheet cells. */
  raw: unknown;
  /** Locale-formatted display text (used by CSV/PDF/print). */
  text: string;
}

/** A named label/value pair (filters summary, totals, ...). */
export interface ReportExportLabelValue {
  label: string;
  value: string;
  raw?: number;
}

/** An optional grouped block for grouped exports. */
export interface ReportExportGroup {
  title: string;
  rows: ReportExportCell[][];
  summaries?: ReportExportLabelValue[];
}

/**
 * The neutral, fully-resolved model handed to every export/print writer. It is
 * intentionally free of any Angular / business types so the writers stay
 * generic and unit-testable.
 */
export interface ReportExportModel {
  title: string;
  description?: string;
  generatedAt: Date;
  generatedBy?: string;
  locale: string;
  rtl: boolean;
  orientation: ReportOrientation;
  company?: ReportCompanyInfo;
  filtersSummary: ReportExportLabelValue[];
  columns: ReportExportColumn[];
  rows: ReportExportCell[][];
  groups?: ReportExportGroup[];
  summaries: ReportExportLabelValue[];
  watermark?: string;
  footerText?: string;
  signature?: boolean;
  includeCompanyHeader: boolean;
  includeGeneratedDate: boolean;
  includeFilters: boolean;
  includeSummaries: boolean;
}
