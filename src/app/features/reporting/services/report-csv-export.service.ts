import { inject, Injectable } from '@angular/core';

import { ReportExportModel, ReportExportRequest } from '../models/report-export.model';
import { buildFileName } from '../utilities/report-file-name.utils';
import { ReportFileService } from './report-file.service';

/** Builds and downloads CSV exports (UTF-8 BOM, injection-safe). */
@Injectable({ providedIn: 'root' })
export class ReportCsvExportService {
  private readonly fileService = inject(ReportFileService);

  async export(model: ReportExportModel, request: ReportExportRequest): Promise<void> {
    // Small module, but dynamic-imported to keep export code out of the
    // feature's eager path and consistent with the other exporters.
    const { buildCsv } = await import('../utilities/report-csv.utils');
    const csv = buildCsv(model, {
      delimiter: request.delimiter,
      includeSummaries: request.includeSummaries,
      bom: true,
    });
    const fileName = buildFileName(request.fileName, 'csv');
    this.fileService.downloadText(csv, fileName, 'text/csv;charset=utf-8');
  }
}
