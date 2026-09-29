import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

import { ReportExportModel, ReportExportRequest } from '../models/report-export.model';
import { ReportCsvExportService } from './report-csv-export.service';
import { ReportExcelExportService } from './report-excel-export.service';
import { ReportPdfExportService } from './report-pdf-export.service';
import { ReportPrintService } from './report-print.service';

/**
 * Export orchestrator: routes a request to the right exporter, surfaces
 * success/error via the app's toast service, and guards against empty exports.
 * Kept separate from the writers so error/notification policy lives in one place.
 */
@Injectable({ providedIn: 'root' })
export class ReportExportService {
  private readonly csv = inject(ReportCsvExportService);
  private readonly excel = inject(ReportExcelExportService);
  private readonly pdf = inject(ReportPdfExportService);
  private readonly printer = inject(ReportPrintService);
  private readonly message = inject(MessageService);
  private readonly translate = inject(TranslateService);

  async export(model: ReportExportModel, request: ReportExportRequest): Promise<void> {
    const hasRows = model.rows.length > 0 || (model.groups?.length ?? 0) > 0;
    if (!hasRows) {
      this.message.add({
        severity: 'warn',
        summary: this.translate.instant('reporting.export.emptyTitle'),
        detail: this.translate.instant('reporting.export.emptyDetail'),
      });
      return;
    }

    try {
      switch (request.format) {
        case 'csv':
          await this.csv.export(model, request);
          this.notifySuccess('CSV');
          break;
        case 'excel':
          await this.excel.export(model, request);
          this.notifySuccess('XLSX');
          break;
        case 'pdf':
          await this.pdf.export(model);
          break;
        case 'print':
          await this.printer.print(model);
          break;
        default:
          break;
      }
    } catch (error) {
      // Log for developers; show a friendly, non-sensitive message to users.
      console.error('[Reporting] export failed', error);
      this.message.add({
        severity: 'error',
        summary: this.translate.instant('reporting.export.errorTitle'),
        detail: this.translate.instant('reporting.export.errorDetail'),
      });
    }
  }

  private notifySuccess(format: string): void {
    this.message.add({
      severity: 'success',
      summary: this.translate.instant('reporting.export.successTitle'),
      detail: this.translate.instant('reporting.export.successDetail', { format }),
    });
  }
}
