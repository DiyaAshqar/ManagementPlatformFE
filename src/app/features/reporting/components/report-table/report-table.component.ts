import { NgClass, NgStyle, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ReportColumn } from '../../models/report-column.model';
import { ReportAlignment, ReportRow, ReportSeverity, ReportSortConfig } from '../../models/report-common.model';
import { ReportFeaturesConfig } from '../../models/report-config.model';
import { ReportGroupView } from '../../models/report-view.model';
import { ReportFormattingService } from '../../services/report-formatting.service';
import { getColumnValue } from '../../utilities/report-value.utils';
import { ReportEmptyStateComponent } from '../report-empty-state/report-empty-state.component';

/** Payload emitted when p-table requests a (lazy) page/sort in flat mode. */
export interface ReportLazyEvent {
  first: number;
  rows: number;
  sort: ReportSortConfig[];
}

/**
 * Presentational data table. Two render paths share one row template:
 *  - **flat**: PrimeNG `p-table` (lazy) → external pagination + sorting;
 *  - **grouped**: a styled grid with collapsible group headers/footers.
 * Selection, formatting and cell templates are identical in both paths.
 */
@Component({
  selector: 'app-report-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    NgStyle,
    NgTemplateOutlet,
    FormsModule,
    TranslateModule,
    TableModule,
    TagModule,
    CheckboxModule,
    SkeletonModule,
    ReportEmptyStateComponent,
  ],
  templateUrl: './report-table.component.html',
  styleUrls: ['./report-table.component.scss'],
})
export class ReportTableComponent {
  private readonly formatting = inject(ReportFormattingService);

  @Input() columns: ReportColumn[] = [];
  @Input() rows: ReportRow[] = [];
  @Input() groups: ReportGroupView[] | null = null;
  @Input() grouped = false;

  @Input() loading = false;
  @Input() error = false;
  @Input() errorMessage = 'reporting.empty.error';
  @Input() emptyMessage = 'reporting.empty.noData';

  @Input() totalRecords = 0;
  @Input() first = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Input() paginator = true;

  @Input() sortState: ReportSortConfig[] = [];
  @Input() features: ReportFeaturesConfig = {};
  @Input() selectionEnabled = false;
  @Input() selectedIds = new Set<string | number>();
  @Input() allPageSelected = false;

  @Input() locale = 'en';
  @Input() currencyCode?: string;
  @Input() columnFooters: Record<string, string> = {};
  @Input() cellTemplates: Record<string, TemplateRef<unknown>> = {};
  @Input() rowActionsTemplate: TemplateRef<unknown> | null = null;
  @Input() rowId: (row: ReportRow) => string | number = (row) =>
    (row['id'] as string | number) ?? JSON.stringify(row);

  @Output() lazyLoad = new EventEmitter<ReportLazyEvent>();
  @Output() sortChange = new EventEmitter<ReportSortConfig[]>();
  @Output() selectionToggle = new EventEmitter<{ id: string | number; row: ReportRow; selected: boolean }>();
  @Output() selectAllToggle = new EventEmitter<boolean>();
  @Output() retry = new EventEmitter<void>();

  private readonly collapsedGroups = new Set<string>();

  // ---- layout helpers -----------------------------------------------------

  get colspan(): number {
    let count = this.columns.length;
    if (this.features.rowNumbers) {
      count++;
    }
    if (this.selectionEnabled) {
      count++;
    }
    if (this.rowActionsTemplate) {
      count++;
    }
    return count;
  }

  get sortMode(): 'single' | 'multiple' {
    return this.features.multiSort ? 'multiple' : 'single';
  }

  get singleSortField(): string | undefined {
    return this.sortState[0]?.field;
  }

  get singleSortOrder(): number {
    return this.sortState[0]?.direction === 'desc' ? -1 : 1;
  }

  get multiSortMeta(): { field: string; order: number }[] {
    return this.sortState.map((sort) => ({
      field: sort.field,
      order: sort.direction === 'desc' ? -1 : 1,
    }));
  }

  header(column: ReportColumn): string {
    return this.formatting.columnHeader(column);
  }

  alignment(column: ReportColumn): ReportAlignment {
    if (column.alignment) {
      return column.alignment;
    }
    switch (column.type) {
      case 'number':
      case 'currency':
      case 'percentage':
        return 'end';
      case 'boolean':
        return 'center';
      default:
        return 'start';
    }
  }

  // ---- cell rendering -----------------------------------------------------

  rawValue(row: ReportRow, column: ReportColumn): unknown {
    return getColumnValue(row, column);
  }

  cellText(row: ReportRow, column: ReportColumn): string {
    return this.formatting.formatColumnValue(row, column, {
      locale: this.locale,
      currencyCode: this.currencyCode,
    });
  }

  boolValue(row: ReportRow, column: ReportColumn): boolean {
    return Boolean(this.rawValue(row, column));
  }

  statusLabel(row: ReportRow, column: ReportColumn): string {
    return this.formatting.resolveStatus(column, this.rawValue(row, column)).label ?? '';
  }

  statusSeverity(row: ReportRow, column: ReportColumn): ReportSeverity {
    return this.formatting.resolveStatus(column, this.rawValue(row, column)).severity;
  }

  statusIcon(row: ReportRow, column: ReportColumn): string | undefined {
    return this.formatting.resolveStatus(column, this.rawValue(row, column)).icon;
  }

  cellClass(row: ReportRow, column: ReportColumn): string | string[] | null {
    return column.cellClass ? column.cellClass(this.rawValue(row, column), row) : null;
  }

  cellStyle(row: ReportRow, column: ReportColumn): Record<string, string> | null {
    return column.cellStyle ? column.cellStyle(this.rawValue(row, column), row) : null;
  }

  cellTemplate(column: ReportColumn): TemplateRef<unknown> | null {
    return column.templateName ? this.cellTemplates[column.templateName] ?? null : null;
  }

  cellContext(row: ReportRow, column: ReportColumn): Record<string, unknown> {
    return { $implicit: this.rawValue(row, column), row, column };
  }

  // ---- sorting (grouped mode) --------------------------------------------

  isSortable(column: ReportColumn): boolean {
    return (this.features.sorting ?? true) && (column.sortable ?? false);
  }

  sortDirection(column: ReportColumn): 'asc' | 'desc' | null {
    return this.sortState.find((sort) => sort.field === column.key)?.direction ?? null;
  }

  sortIcon(column: ReportColumn): string {
    const direction = this.sortDirection(column);
    if (direction === 'asc') {
      return 'pi-sort-amount-up-alt';
    }
    if (direction === 'desc') {
      return 'pi-sort-amount-down';
    }
    return 'pi-sort-alt';
  }

  ariaSort(column: ReportColumn): 'ascending' | 'descending' | 'none' {
    const direction = this.sortDirection(column);
    return direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none';
  }

  onGroupedHeaderSort(column: ReportColumn): void {
    if (!this.isSortable(column)) {
      return;
    }
    const current = this.sortDirection(column);
    const next: ReportSortConfig[] =
      current === 'asc'
        ? [{ field: column.key, direction: 'desc' }]
        : current === 'desc'
          ? []
          : [{ field: column.key, direction: 'asc' }];
    this.sortChange.emit(next);
  }

  // ---- pagination + native sort (flat mode) ------------------------------

  onLazy(event: TableLazyLoadEvent): void {
    const sort: ReportSortConfig[] = [];
    if (this.features.multiSort && event.multiSortMeta && event.multiSortMeta.length > 0) {
      for (const meta of event.multiSortMeta) {
        sort.push({ field: meta.field, direction: meta.order === -1 ? 'desc' : 'asc' });
      }
    } else if (event.sortField) {
      const field = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
      sort.push({ field, direction: event.sortOrder === -1 ? 'desc' : 'asc' });
    }
    this.lazyLoad.emit({
      first: event.first ?? 0,
      rows: event.rows ?? this.pageSize,
      sort,
    });
  }

  // ---- selection ----------------------------------------------------------

  isSelected(row: ReportRow): boolean {
    return this.selectedIds.has(this.rowId(row));
  }

  toggleRow(row: ReportRow, selected: boolean): void {
    this.selectionToggle.emit({ id: this.rowId(row), row, selected });
  }

  onSelectAll(selected: boolean): void {
    this.selectAllToggle.emit(selected);
  }

  // ---- grouping -----------------------------------------------------------

  toggleGroup(key: string): void {
    if (this.collapsedGroups.has(key)) {
      this.collapsedGroups.delete(key);
    } else {
      this.collapsedGroups.add(key);
    }
  }

  isCollapsed(key: string): boolean {
    return this.collapsedGroups.has(key);
  }

  skeletonRows(): number[] {
    return Array.from({ length: 6 }, (_, index) => index);
  }

  footerFor(column: ReportColumn): string {
    return this.columnFooters[column.key] ?? '';
  }

  get hasFooter(): boolean {
    return Object.keys(this.columnFooters).length > 0;
  }
}
