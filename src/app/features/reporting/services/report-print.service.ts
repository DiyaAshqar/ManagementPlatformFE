import { inject, Injectable } from '@angular/core';

import { PrintService } from '../../../shared/services/print.service';
import { ReportExportModel } from '../models/report-export.model';

/**
 * Renders a report to a print-optimized HTML document and opens the browser
 * print dialog. Reuses the app's shared {@link PrintService}.
 */
@Injectable({ providedIn: 'root' })
export class ReportPrintService {
  private readonly printService = inject(PrintService);

  async print(model: ReportExportModel): Promise<void> {
    const { buildReportHtml } = await import('../utilities/report-html.utils');
    const html = buildReportHtml(model, { pageNumbers: true });
    this.printService.openAndPrint(html);
  }
}
