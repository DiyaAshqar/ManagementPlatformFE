import { inject, Injectable } from '@angular/core';

import { PrintService } from '../../../shared/services/print.service';
import { ReportExportModel } from '../models/report-export.model';

/**
 * PDF export via the browser print pipeline ("Save as PDF").
 *
 * This deliberately avoids a client-side PDF library so Arabic/RTL text renders
 * through the browser's own font stack — no embedded font asset is required.
 * The service is a thin, swappable seam: replacing the body with a `jsPDF` +
 * `jspdf-autotable` implementation (and an embedded Arabic font) is the
 * documented upgrade path (see the module README).
 */
@Injectable({ providedIn: 'root' })
export class ReportPdfExportService {
  private readonly printService = inject(PrintService);

  async export(model: ReportExportModel): Promise<void> {
    const { buildReportHtml } = await import('../utilities/report-html.utils');
    const html = buildReportHtml(model, { pageNumbers: true });
    this.printService.openAndPrint(html);
  }
}
