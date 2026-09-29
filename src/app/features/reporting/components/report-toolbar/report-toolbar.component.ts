import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';

import { ReportFeaturesConfig } from '../../models/report-config.model';
import { ReportExportFormat } from '../../models/report-export.model';
import { ColumnToggle } from '../../models/report-view.model';
import { ReportColumnSelectorComponent } from '../report-column-selector/report-column-selector.component';

/** Export capabilities the toolbar should surface (already permission-checked). */
export interface ToolbarExportFlags {
  excel: boolean;
  csv: boolean;
  pdf: boolean;
  print: boolean;
}

/**
 * Responsive report toolbar: title/description, live search, filter toggle
 * (with active count), column selector, export menu, print, refresh, reset and
 * fullscreen. All actions are emitted; the toolbar holds no report state.
 */
@Component({
  selector: 'app-report-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    TranslateModule,
    ButtonModule,
    MenuModule,
    BadgeModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
    ReportColumnSelectorComponent,
  ],
  templateUrl: './report-toolbar.component.html',
  styleUrls: ['./report-toolbar.component.scss'],
})
export class ReportToolbarComponent {
  private readonly translate = inject(TranslateService);

  @Input() title = '';
  @Input() description = '';
  @Input() lastUpdated: Date | null = null;
  @Input() totalRecords = 0;
  @Input() searchTerm = '';
  @Input() features: ReportFeaturesConfig = {};
  @Input() exportFlags: ToolbarExportFlags = { excel: false, csv: false, pdf: false, print: false };
  @Input() activeFilterCount = 0;
  @Input() filtersVisible = false;
  @Input() columnToggles: ColumnToggle[] = [];
  @Input() isFullscreen = false;
  @Input() locale = 'en';

  @Output() searchChange = new EventEmitter<string>();
  @Output() toggleFilters = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Output() exportRequested = new EventEmitter<ReportExportFormat>();
  @Output() print = new EventEmitter<void>();
  @Output() resetSettings = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() columnsChange = new EventEmitter<ColumnToggle[]>();
  @Output() columnsReset = new EventEmitter<void>();

  get hasExportMenu(): boolean {
    return this.exportFlags.excel || this.exportFlags.csv || this.exportFlags.pdf;
  }

  get exportMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    if (this.exportFlags.excel) {
      items.push({
        label: this.translate.instant('reporting.export.format.excel'),
        icon: 'pi pi-file-excel',
        command: () => this.exportRequested.emit('excel'),
      });
    }
    if (this.exportFlags.csv) {
      items.push({
        label: this.translate.instant('reporting.export.format.csv'),
        icon: 'pi pi-file',
        command: () => this.exportRequested.emit('csv'),
      });
    }
    if (this.exportFlags.pdf) {
      items.push({
        label: this.translate.instant('reporting.export.format.pdf'),
        icon: 'pi pi-file-pdf',
        command: () => this.exportRequested.emit('pdf'),
      });
    }
    return items;
  }

  onSearch(value: string): void {
    this.searchChange.emit(value);
  }
}
