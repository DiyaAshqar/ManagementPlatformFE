import { inject, Injectable } from '@angular/core';

import { ReportColumnType } from '../models/report-common.model';
import {
  ReportExportColumn,
  ReportExportModel,
  ReportExportRequest,
} from '../models/report-export.model';
import { buildFileName, sanitizeSheetName } from '../utilities/report-file-name.utils';
import type { XlsxCell, XlsxCellType, XlsxSheet } from '../utilities/xlsx.utils';
import { ReportFileService } from './report-file.service';

/** Builds and downloads real `.xlsx` exports with typed cells. */
@Injectable({ providedIn: 'root' })
export class ReportExcelExportService {
  private readonly fileService = inject(ReportFileService);

  async export(model: ReportExportModel, request: ReportExportRequest): Promise<void> {
    // Lazy-load the XLSX writer so it is code-split out of the eager path.
    const { buildXlsxBlob, estimateColumnWidth } = await import('../utilities/xlsx.utils');
    const sheet = this.buildSheet(model, request, estimateColumnWidth);
    const blob = buildXlsxBlob([sheet]);
    this.fileService.downloadBlob(blob, buildFileName(request.fileName, 'xlsx'));
  }

  private buildSheet(
    model: ReportExportModel,
    request: ReportExportRequest,
    estimateWidth: (header: string, samples: readonly string[]) => number
  ): XlsxSheet {
    const rows: XlsxCell[][] = [];

    if (request.includeCompanyHeader && model.company?.name) {
      rows.push([{ type: 'text', value: model.company.name, bold: true }]);
    }
    rows.push([{ type: 'text', value: model.title, bold: true }]);
    if (model.description) {
      rows.push([{ type: 'text', value: model.description }]);
    }
    if (request.includeGeneratedDate) {
      rows.push([{ type: 'text', value: `Generated: ${model.generatedAt.toLocaleString(model.locale)}` }]);
    }
    if (request.includeFilters && model.filtersSummary.length > 0) {
      for (const filter of model.filtersSummary) {
        rows.push([
          { type: 'text', value: filter.label, bold: true },
          { type: 'text', value: filter.value },
        ]);
      }
    }
    if (rows.length > 0) {
      rows.push([]); // spacer before the table
    }

    const freezeRows = rows.length + 1; // meta rows + the header row itself
    rows.push(model.columns.map((column) => ({ type: 'text', value: column.header, header: true })));

    for (const row of model.rows) {
      rows.push(row.map((cell, index) => this.toXlsxCell(cell.raw, cell.text, model.columns[index])));
    }

    if (request.includeSummaries && model.summaries.length > 0) {
      rows.push([]);
      for (const summary of model.summaries) {
        rows.push([
          { type: 'text', value: summary.label, bold: true },
          summary.raw != null
            ? { type: 'number', value: summary.raw, decimals: 2 }
            : { type: 'text', value: summary.value },
        ]);
      }
    }

    const columnWidths = model.columns.map((column, index) =>
      estimateWidth(
        column.header,
        model.rows.map((row) => row[index]?.text ?? '')
      )
    );

    return {
      name: sanitizeSheetName(model.title),
      rows,
      columnWidths,
      freezeRows,
    };
  }

  private toXlsxCell(raw: unknown, text: string, column: ReportExportColumn | undefined): XlsxCell {
    const type = this.mapType(column?.type);
    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage':
        return {
          type,
          value: typeof raw === 'number' ? raw : Number(raw),
          currencyCode: column?.currencyCode,
          decimals: column?.decimals,
        };
      case 'date':
      case 'datetime':
        return { type, value: raw instanceof Date ? raw : (raw as string | number) };
      case 'boolean':
        return { type, value: Boolean(raw) };
      default:
        // Untrusted text stays text — the writer strips illegal XML chars.
        return { type: 'text', value: text };
    }
  }

  private mapType(type: ReportColumnType | undefined): XlsxCellType {
    switch (type) {
      case 'number':
        return 'number';
      case 'currency':
        return 'currency';
      case 'percentage':
        return 'percentage';
      case 'date':
        return 'date';
      case 'dateTime':
        return 'datetime';
      case 'boolean':
        return 'boolean';
      default:
        return 'text';
    }
  }
}
