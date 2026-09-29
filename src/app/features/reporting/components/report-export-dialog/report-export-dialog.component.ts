import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

import { ReportConfig } from '../../models/report-config.model';
import {
  ReportExportFormat,
  ReportExportRequest,
  ReportExportScope,
  ReportOrientation,
} from '../../models/report-export.model';

interface Option<V> {
  label: string;
  value: V;
}

/** A pickable exportable column. */
export interface ExportColumnOption {
  key: string;
  header: string;
  visible: boolean;
}

/**
 * Pre-export options dialog: format, scope, columns, file name, orientation and
 * the "include" toggles. Emits a fully-formed {@link ReportExportRequest}.
 */
@Component({
  selector: 'app-report-export-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    DialogModule,
    SelectModule,
    MultiSelectModule,
    InputTextModule,
    CheckboxModule,
    ButtonModule,
  ],
  templateUrl: './report-export-dialog.component.html',
  styles: [
    `
      .export-dialog {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding-top: 0.25rem;
      }
      .export-dialog .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .export-dialog .field label {
        font-size: 0.85rem;
        font-weight: 600;
      }
      .export-dialog__toggles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem 1rem;
      }
      .export-dialog__toggles .toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .export-dialog__toggles .toggle label {
        font-size: 0.85rem;
      }
    `,
  ],
})
export class ReportExportDialogComponent implements OnChanges {
  private readonly translate = inject(TranslateService);

  @Input() visible = false;
  @Input() config: ReportConfig | null = null;
  @Input() columns: ExportColumnOption[] = [];
  @Input() format: ReportExportFormat = 'excel';
  @Input() hasSelection = false;
  @Input() defaultFileName = 'report';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmExport = new EventEmitter<ReportExportRequest>();

  formatOptions: Option<ReportExportFormat>[] = [];
  scopeOptions: Option<ReportExportScope>[] = [];
  orientationOptions: Option<ReportOrientation>[] = [];

  selectedFormat: ReportExportFormat = 'excel';
  selectedScope: ReportExportScope = 'filtered';
  selectedColumns: string[] = [];
  fileName = 'report';
  orientation: ReportOrientation = 'portrait';
  includeFilters = true;
  includeSummaries = true;
  includeCompanyHeader = true;
  includeGeneratedDate = true;

  private wasVisible = false;

  ngOnChanges(): void {
    // Only (re)initialize when the dialog transitions to open. Guarding on the
    // visible transition avoids resetting the user's choices on unrelated input
    // changes during change detection.
    const opening = this.visible && !this.wasVisible;
    this.wasVisible = this.visible;
    if (!opening) {
      return;
    }
    this.buildOptions();
    this.selectedFormat = this.format;
    this.selectedScope = 'filtered';
    this.selectedColumns = this.columns.filter((column) => column.visible).map((column) => column.key);
    this.fileName = this.config?.export?.fileName ?? this.defaultFileName;
    this.orientation = this.config?.export?.orientation ?? 'portrait';
    this.includeFilters = this.config?.export?.includeFilters ?? true;
    this.includeSummaries = this.config?.export?.includeSummaries ?? true;
    this.includeCompanyHeader = this.config?.export?.includeCompanyHeader ?? true;
    this.includeGeneratedDate = this.config?.export?.includeGeneratedDate ?? true;
  }

  get showOrientation(): boolean {
    return this.selectedFormat === 'pdf' || this.selectedFormat === 'print';
  }

  private buildOptions(): void {
    const exportConfig = this.config?.export;
    const formats: ReportExportFormat[] = [];
    if (exportConfig?.excel) {
      formats.push('excel');
    }
    if (exportConfig?.csv) {
      formats.push('csv');
    }
    if (exportConfig?.pdf) {
      formats.push('pdf');
    }
    if (exportConfig?.print) {
      formats.push('print');
    }
    this.formatOptions = formats.map((value) => ({
      label: this.translate.instant(`reporting.export.format.${value}`),
      value,
    }));

    const scopes: ReportExportScope[] = ['currentPage', 'filtered'];
    if (this.hasSelection) {
      scopes.push('selected');
    }
    this.scopeOptions = scopes.map((value) => ({
      label: this.translate.instant(`reporting.export.scope.${value}`),
      value,
    }));

    this.orientationOptions = (['portrait', 'landscape'] as ReportOrientation[]).map((value) => ({
      label: this.translate.instant(`reporting.export.orientation.${value}`),
      value,
    }));
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    const request: ReportExportRequest = {
      format: this.selectedFormat,
      scope: this.selectedScope,
      fileName: this.fileName?.trim() || this.defaultFileName,
      columns: this.selectedColumns.length > 0 ? this.selectedColumns : this.columns.map((c) => c.key),
      orientation: this.orientation,
      delimiter: this.config?.export?.csvDelimiter ?? ',',
      includeFilters: this.includeFilters,
      includeSummaries: this.includeSummaries,
      includeCompanyHeader: this.includeCompanyHeader,
      includeGeneratedDate: this.includeGeneratedDate,
    };
    this.confirmExport.emit(request);
    this.close();
  }
}
