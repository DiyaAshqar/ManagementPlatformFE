import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { ReportColumn, ReportColumnState } from '../../models/report-column.model';
import {
  ReportAlignment,
  ReportColumnType,
  ReportRow,
  ReportSortConfig,
} from '../../models/report-common.model';
import {
  ReportConfig,
  ReportFeaturesConfig,
  ReportGroupConfig,
  ReportPermissionAction,
} from '../../models/report-config.model';
import { ReportQuery } from '../../models/report-data-source.model';
import {
  ReportExportCell,
  ReportExportColumn,
  ReportExportFormat,
  ReportExportGroup,
  ReportExportLabelValue,
  ReportExportModel,
  ReportExportRequest,
} from '../../models/report-export.model';
import { ReportFilterConfig, ReportFilterValues } from '../../models/report-filter.model';
import { ComputedSummary, ReportSummaryConfig, SummaryDisplay } from '../../models/report-summary.model';
import { ColumnToggle, ReportGroupView, SummaryScope } from '../../models/report-view.model';
import { ReportExportService } from '../../services/report-export.service';
import { ReportFormattingService } from '../../services/report-formatting.service';
import { PersistedReportState, ReportPersistenceService } from '../../services/report-persistence.service';
import { aggregate } from '../../utilities/report-calculation.utils';
import { applyFilters, applySearch, applySort, isBlankFilterValue, paginate } from '../../utilities/report-filter.utils';
import { getColumnValue, resolvePath } from '../../utilities/report-value.utils';
import { ExportColumnOption, ReportExportDialogComponent } from '../report-export-dialog/report-export-dialog.component';
import { ReportFilterPanelComponent } from '../report-filter-panel/report-filter-panel.component';
import { ReportSummaryComponent } from '../report-summary/report-summary.component';
import { ReportLazyEvent, ReportTableComponent } from '../report-table/report-table.component';
import { ToolbarExportFlags, ReportToolbarComponent } from '../report-toolbar/report-toolbar.component';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';

/**
 * The single public entry point of the reporting module. Orchestrates the
 * toolbar, filter panel, summaries, table and export dialog, and performs all
 * client-side data processing (filter/search/sort/paginate/group/aggregate).
 * In server mode it emits a {@link ReportQuery} and consumes externally-loaded
 * data + summaries instead.
 */
@Component({
  selector: 'app-report-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    SelectModule,
    ReportToolbarComponent,
    ReportFilterPanelComponent,
    ReportSummaryComponent,
    ReportTableComponent,
    ReportExportDialogComponent,
  ],
  templateUrl: './report-viewer.component.html',
  styleUrls: ['./report-viewer.component.scss'],
})
export class ReportViewerComponent implements OnInit {
  private readonly formatting = inject(ReportFormattingService);
  private readonly persistence = inject(ReportPersistenceService);
  private readonly exporter = inject(ReportExportService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  // ---- inputs -------------------------------------------------------------
  private _config!: ReportConfig;
  @Input({ required: true })
  set config(value: ReportConfig) {
    this._config = value;
    this.columnByKey.clear();
    for (const column of value.columns) {
      this.columnByKey.set(column.key, column);
    }
    if (this.initialized) {
      this.initializeState();
    }
  }
  get config(): ReportConfig {
    return this._config;
  }

  @Input() set data(value: readonly unknown[]) {
    this._data.set((value ?? []) as ReportRow[]);
    this.lastUpdated.set(new Date());
  }

  @Input() set loading(value: boolean) {
    this._loading.set(value);
  }
  @Input() set error(value: boolean) {
    this._error.set(value);
  }
  @Input() errorMessage = 'reporting.empty.error';
  @Input() set totalRecordsInput(value: number | undefined) {
    this._serverTotal.set(value);
  }
  @Input() set serverSummaries(value: Record<string, number> | undefined) {
    this._serverSummaries.set(value);
  }
  @Input() generatedBy?: string;
  @Input() permissionResolver?: (action: ReportPermissionAction) => boolean;
  @Input() cellTemplates: Record<string, TemplateRef<unknown>> = {};
  @Input() filterTemplates: Record<string, TemplateRef<unknown>> = {};
  @Input() rowActionsTemplate: TemplateRef<unknown> | null = null;

  // ---- outputs ------------------------------------------------------------
  @Output() filtersChanged = new EventEmitter<ReportQuery>();
  @Output() exportRequested = new EventEmitter<ReportExportRequest>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() selectionChange = new EventEmitter<ReportRow[]>();

  // ---- state --------------------------------------------------------------
  private readonly _data = signal<ReportRow[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal(false);
  private readonly _serverTotal = signal<number | undefined>(undefined);
  private readonly _serverSummaries = signal<Record<string, number> | undefined>(undefined);

  readonly searchTerm = signal('');
  readonly committedFilters = signal<ReportFilterValues>({});
  readonly sortState = signal<ReportSortConfig[]>([]);
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly activeGroups = signal<string[]>([]);
  readonly columnStates = signal<ReportColumnState[]>([]);
  readonly selectedIds = signal<Set<string | number>>(new Set());
  readonly filtersVisible = signal(false);
  readonly fullscreen = signal(false);
  readonly lastUpdated = signal<Date | null>(null);

  readonly exportDialogVisible = signal(false);
  readonly exportFormat = signal<ReportExportFormat>('excel');

  private readonly columnByKey = new Map<string, ReportColumn>();
  private readonly searchInput$ = new Subject<string>();
  private initialized = false;

  // ---- lifecycle ----------------------------------------------------------
  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(this.config.searchDebounceMs ?? 300), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.first.set(0);
        this.emitQueryIfServer();
      });
    this.initializeState();
    this.initialized = true;
    this.emitQueryIfServer();
  }

  private initializeState(): void {
    const config = this.config;
    this.pageSize.set(config.pagination?.pageSize ?? 10);
    this.sortState.set([...(config.defaultSort ?? [])]);
    this.activeGroups.set([...(config.defaultGroups ?? [])]);
    this.first.set(0);
    this.searchTerm.set('');

    const filterDefaults: ReportFilterValues = {};
    for (const filter of config.filters ?? []) {
      if (filter.defaultValue !== undefined) {
        filterDefaults[filter.key] = filter.defaultValue;
      }
    }
    this.committedFilters.set(filterDefaults);

    this.columnStates.set(
      config.columns.map((column, index) => ({
        key: column.key,
        visible: column.visible !== false,
        order: index,
        width: column.width,
      }))
    );

    this.applyPersistedState();
  }

  private applyPersistedState(): void {
    const persisted: PersistedReportState | null = this.persistence.load(this.config);
    if (!persisted) {
      return;
    }
    if (persisted.columns?.length) {
      this.columnStates.set(this.mergeColumnStates(persisted.columns));
    }
    if (persisted.sort) {
      this.sortState.set(persisted.sort);
    }
    if (persisted.pageSize) {
      this.pageSize.set(persisted.pageSize);
    }
    if (persisted.groups) {
      this.activeGroups.set(persisted.groups);
    }
    if (persisted.filters) {
      this.committedFilters.set(
        this.persistence.reviveFilterValues(persisted.filters, this.config.filters ?? [])
      );
    }
  }

  /** Keep only persisted columns that still exist; append any new ones. */
  private mergeColumnStates(persisted: ReportColumnState[]): ReportColumnState[] {
    const known = new Set(this.config.columns.map((column) => column.key));
    const kept = persisted.filter((state) => known.has(state.key));
    const keptKeys = new Set(kept.map((state) => state.key));
    const appended = this.config.columns
      .filter((column) => !keptKeys.has(column.key))
      .map((column, index) => ({
        key: column.key,
        visible: column.visible !== false,
        order: kept.length + index,
        width: column.width,
      }));
    return [...kept, ...appended].map((state, index) => ({ ...state, order: index }));
  }

  // ---- resolved config ----------------------------------------------------
  get dataMode(): 'client' | 'server' {
    return this.config.dataMode ?? 'client';
  }

  readonly feat = computed<Required<ReportFeaturesConfig>>(() => {
    const f = this.config.features ?? {};
    const hasFilters = (this.config.filters?.length ?? 0) > 0;
    const hasGroups = (this.config.groups?.length ?? 0) > 0;
    const hasSummaries = (this.config.summaries?.length ?? 0) > 0;
    return {
      search: f.search ?? true,
      filters: f.filters ?? hasFilters,
      pagination: f.pagination ?? true,
      sorting: f.sorting ?? true,
      multiSort: f.multiSort ?? false,
      columnSelection: f.columnSelection ?? true,
      columnReordering: f.columnReordering ?? true,
      columnResizing: f.columnResizing ?? false,
      rowSelection: f.rowSelection ?? false,
      rowNumbers: f.rowNumbers ?? false,
      grouping: f.grouping ?? hasGroups,
      summaries: f.summaries ?? hasSummaries,
      print: f.print ?? !!this.config.export?.print,
      refresh: f.refresh ?? true,
      fullscreen: f.fullscreen ?? true,
      stickyHeader: f.stickyHeader ?? true,
    };
  });

  can(action: ReportPermissionAction): boolean {
    if (this.permissionResolver) {
      return this.permissionResolver(action);
    }
    const permissions = this.config.permissions;
    return permissions ? permissions[action] ?? true : true;
  }

  readonly exportFlags = computed<ToolbarExportFlags>(() => ({
    excel: !!this.config.export?.excel && this.can('exportExcel'),
    csv: !!this.config.export?.csv && this.can('exportCsv'),
    pdf: !!this.config.export?.pdf && this.can('exportPdf'),
    print: this.feat().print && this.can('print'),
  }));

  get locale(): string {
    return this.config.locale ?? this.formatting.locale();
  }

  // ---- derived data -------------------------------------------------------
  readonly loadingState = computed(() => this._loading());
  readonly errorState = computed(() => this._error());

  private resolveField = (row: ReportRow, field: string): unknown => {
    const column = this.columnByKey.get(field);
    return column?.value ? column.value(row) : resolvePath(row, field);
  };

  readonly orderedColumns = computed<ReportColumn[]>(() =>
    [...this.columnStates()]
      .sort((a, b) => a.order - b.order)
      .map((state) => this.columnByKey.get(state.key))
      .filter((column): column is ReportColumn => !!column)
  );

  readonly visibleColumns = computed<ReportColumn[]>(() => {
    const visibleKeys = new Set(
      this.columnStates()
        .filter((state) => state.visible)
        .map((state) => state.key)
    );
    return this.orderedColumns().filter((column) => visibleKeys.has(column.key));
  });

  readonly columnToggles = computed<ColumnToggle[]>(() =>
    [...this.columnStates()]
      .sort((a, b) => a.order - b.order)
      .map((state) => {
        const column = this.columnByKey.get(state.key);
        return {
          key: state.key,
          header: column ? this.formatting.columnHeader(column) : state.key,
          visible: state.visible,
          mandatory: !!column?.mandatory,
        };
      })
  );

  private readonly searchFields = computed<string[]>(() =>
    this.config.columns.filter((column) => column.searchable !== false).map((column) => column.key)
  );

  /** Filtered + searched rows (client mode). */
  readonly filteredRows = computed<ReportRow[]>(() => {
    if (this.dataMode === 'server') {
      return this._data();
    }
    const filtered = applyFilters(
      this._data(),
      this.config.filters ?? [],
      this.committedFilters(),
      this.resolveField
    );
    return applySearch(filtered, this.searchTerm(), this.searchFields(), this.resolveField);
  });

  readonly sortedRows = computed<ReportRow[]>(() => {
    if (this.dataMode === 'server') {
      return this._data();
    }
    return applySort(this.filteredRows(), this.sortState(), this.resolveField, this.locale);
  });

  readonly totalRecords = computed<number>(() => {
    if (this.dataMode === 'server') {
      return this._serverTotal() ?? this._data().length;
    }
    return this.filteredRows().length;
  });

  readonly grouped = computed<boolean>(
    () => this.feat().grouping && this.activeGroups().length > 0 && this.dataMode === 'client'
  );

  readonly viewRows = computed<ReportRow[]>(() => {
    if (this.dataMode === 'server') {
      return this._data();
    }
    if (this.grouped()) {
      return this.sortedRows();
    }
    if (!this.feat().pagination) {
      return this.sortedRows();
    }
    return paginate(this.sortedRows(), this.first() / this.pageSize() + 1, this.pageSize());
  });

  // ---- summaries ----------------------------------------------------------
  private computeSummaries(rows: ReportRow[], summaries: ReportSummaryConfig[]): ComputedSummary[] {
    return summaries
      .filter((summary) => !summary.financial || this.can('viewFinancials'))
      .map((summary) => {
        const value = this.summaryValue(summary, rows);
        return {
          key: summary.key,
          label: summary.label,
          labelKey: summary.labelKey,
          icon: summary.icon,
          value,
          display: this.formatSummary(summary, value),
          financial: summary.financial,
        };
      });
  }

  private summaryValue(summary: ReportSummaryConfig, rows: ReportRow[]): number {
    if (this.dataMode === 'server') {
      const map = this._serverSummaries();
      const key = summary.serverKey ?? summary.key;
      if (map && map[key] !== undefined) {
        return map[key];
      }
    }
    if (summary.calculation === 'custom' && summary.compute) {
      return summary.compute(rows);
    }
    const values = summary.field
      ? rows.map((row) => this.resolveField(row, summary.field as string))
      : rows;
    return aggregate(summary.calculation, values, summary.decimals ?? 2);
  }

  private formatSummary(summary: ReportSummaryConfig, value: number): string {
    const options = { locale: this.locale, currencyCode: summary.currencyCode ?? this.config.currencyCode, decimals: summary.decimals };
    switch (summary.type) {
      case 'currency':
        return this.formatting.formatCurrency(value, options);
      case 'percentage':
        return this.formatting.formatPercent(value, options);
      case 'number':
        return this.formatting.formatNumber(value, options);
      default:
        return this.formatting.formatNumber(value, { ...options, decimals: summary.decimals ?? 0 });
    }
  }

  private summariesFor(display: SummaryDisplay, rows: ReportRow[]): ComputedSummary[] {
    const summaries = (this.config.summaries ?? []).filter((summary) =>
      (summary.display ?? ['cards', 'export']).includes(display)
    );
    return this.computeSummaries(rows, summaries);
  }

  readonly cardSummaries = computed<ComputedSummary[]>(() =>
    this.feat().summaries ? this.summariesFor('cards', this.filteredRows()) : []
  );

  readonly summaryScope = computed<SummaryScope>(() => (this.dataMode === 'server' ? 'all' : 'filtered'));

  readonly columnFooters = computed<Record<string, string>>(() => {
    const rows = this.filteredRows();
    const footers: Record<string, string> = {};
    for (const column of this.visibleColumns()) {
      if (column.summary) {
        const values = rows.map((row) => getColumnValue(row, column));
        const value = aggregate(column.summary, values, column.decimals ?? 2);
        footers[column.key] = this.formatByColumnType(value, column);
      }
    }
    return footers;
  });

  private formatByColumnType(value: number, column: ReportColumn): string {
    const options = { locale: this.locale, currencyCode: column.currencyCode ?? this.config.currencyCode, decimals: column.decimals };
    switch (column.type) {
      case 'currency':
        return this.formatting.formatCurrency(value, options);
      case 'percentage':
        return this.formatting.formatPercent(value, options);
      default:
        return this.formatting.formatNumber(value, options);
    }
  }

  // ---- grouping -----------------------------------------------------------
  readonly groupViews = computed<ReportGroupView[] | null>(() => {
    if (!this.grouped()) {
      return null;
    }
    const groupKey = this.activeGroups()[0];
    const group = (this.config.groups ?? []).find((candidate) => candidate.key === groupKey);
    if (!group) {
      return null;
    }
    return this.buildGroups(this.sortedRows(), group);
  });

  private buildGroups(rows: ReportRow[], group: ReportGroupConfig): ReportGroupView[] {
    const buckets = new Map<string, ReportRow[]>();
    for (const row of rows) {
      const raw = this.resolveField(row, group.field);
      const key = group.valueFormatter ? group.valueFormatter(raw, row) : String(raw ?? '—');
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        buckets.set(key, [row]);
      }
    }
    const groupLabel = group.labelKey ? this.translate.instant(group.labelKey) : group.label ?? '';
    const summaryConfigs = group.summaries ?? this.config.summaries ?? [];
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], this.locale))
      .map(([key, groupRows]) => ({
        key,
        title: groupLabel ? `${groupLabel}: ${key}` : key,
        count: groupRows.length,
        summaries: this.computeSummaries(groupRows, summaryConfigs).slice(0, 4),
        rows: groupRows,
      }));
  }

  // ---- selection ----------------------------------------------------------
  rowId = (row: ReportRow): string | number => {
    if (this.config.rowId) {
      return this.config.rowId(row);
    }
    const id = row['id'] ?? row['key'];
    return (id as string | number) ?? JSON.stringify(row);
  };

  readonly allPageSelected = computed<boolean>(() => {
    const rows = this.viewRows();
    if (rows.length === 0) {
      return false;
    }
    const selected = this.selectedIds();
    return rows.every((row) => selected.has(this.rowId(row)));
  });

  private selectedRows(): ReportRow[] {
    const ids = this.selectedIds();
    const source = this.dataMode === 'server' ? this._data() : this.sortedRows();
    return source.filter((row) => ids.has(this.rowId(row)));
  }

  // ---- handlers -----------------------------------------------------------
  onSearch(term: string): void {
    this.searchInput$.next(term);
  }

  onToggleFilters(): void {
    this.filtersVisible.update((value) => !value);
  }

  onApplyFilters(values: ReportFilterValues): void {
    this.committedFilters.set(values);
    this.first.set(0);
    this.saveState();
    this.emitQueryIfServer();
  }

  onResetFilters(): void {
    const defaults: ReportFilterValues = {};
    for (const filter of this.config.filters ?? []) {
      if (filter.defaultValue !== undefined) {
        defaults[filter.key] = filter.defaultValue;
      }
    }
    this.committedFilters.set(defaults);
    this.first.set(0);
    this.saveState();
    this.emitQueryIfServer();
  }

  onTableLazy(event: ReportLazyEvent): void {
    let changed = false;
    if (event.first !== this.first()) {
      this.first.set(event.first);
      changed = true;
    }
    if (event.rows !== this.pageSize()) {
      this.pageSize.set(event.rows);
      changed = true;
    }
    if (event.sort.length > 0 && !this.sameSort(event.sort, this.sortState())) {
      this.sortState.set(event.sort);
      changed = true;
    }
    if (changed) {
      this.saveState();
      this.emitQueryIfServer();
    }
  }

  private sameSort(a: ReportSortConfig[], b: ReportSortConfig[]): boolean {
    return (
      a.length === b.length &&
      a.every((sort, index) => sort.field === b[index].field && sort.direction === b[index].direction)
    );
  }

  onGroupedSort(sort: ReportSortConfig[]): void {
    this.sortState.set(sort);
    this.first.set(0);
    this.saveState();
    this.emitQueryIfServer();
  }

  onGroupByChange(groupKey: string | null): void {
    this.activeGroups.set(groupKey ? [groupKey] : []);
    this.first.set(0);
    this.saveState();
    this.emitQueryIfServer();
  }

  onColumnsChange(toggles: ColumnToggle[]): void {
    const widthByKey = new Map(this.columnStates().map((state) => [state.key, state.width]));
    this.columnStates.set(
      toggles.map((toggle, index) => ({
        key: toggle.key,
        visible: toggle.visible,
        order: index,
        width: widthByKey.get(toggle.key),
      }))
    );
    this.saveState();
    this.emitQueryIfServer();
  }

  onColumnsReset(): void {
    this.columnStates.set(
      this.config.columns.map((column, index) => ({
        key: column.key,
        visible: column.visible !== false,
        order: index,
        width: column.width,
      }))
    );
    this.saveState();
  }

  onSelectionToggle(payload: { id: string | number; selected: boolean }): void {
    const next = new Set(this.selectedIds());
    if (payload.selected) {
      next.add(payload.id);
    } else {
      next.delete(payload.id);
    }
    this.selectedIds.set(next);
    this.selectionChange.emit(this.selectedRows());
  }

  onSelectAll(selected: boolean): void {
    const next = new Set(this.selectedIds());
    for (const row of this.viewRows()) {
      const id = this.rowId(row);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    this.selectedIds.set(next);
    this.selectionChange.emit(this.selectedRows());
  }

  onRefresh(): void {
    this.lastUpdated.set(new Date());
    this.refreshRequested.emit();
    this.emitQueryIfServer();
  }

  onResetSettings(): void {
    this.persistence.clear(this.config);
    this.selectedIds.set(new Set());
    this.initializeState();
    this.emitQueryIfServer();
  }

  onToggleFullscreen(): void {
    this.fullscreen.update((value) => !value);
  }

  // ---- export -------------------------------------------------------------
  onExportRequested(format: ReportExportFormat): void {
    this.exportFormat.set(format);
    this.exportDialogVisible.set(true);
  }

  onPrint(): void {
    this.exportFormat.set('print');
    this.exportDialogVisible.set(true);
  }

  // Memoized so the reference is stable across change-detection cycles.
  // A getter returning a fresh array here would feed a new array into the
  // export dialog's <p-multiSelect> every CD and spin an infinite CD loop.
  readonly exportColumnOptions = computed<ExportColumnOption[]>(() => {
    const visibleKeys = new Set(this.visibleColumns().map((column) => column.key));
    return this.orderedColumns()
      .filter((column) => column.exportable !== false)
      .map((column) => ({
        key: column.key,
        header: this.formatting.columnHeader(column),
        visible: visibleKeys.has(column.key),
      }));
  });

  get exportFileNameBase(): string {
    const fileName = this.config.fileName;
    if (typeof fileName === 'function') {
      return fileName({
        reportId: this.config.id,
        title: this.reportTitle,
        locale: this.locale,
        rtl: this.formatting.isRtl(),
        now: new Date(),
        filters: this.committedFilters(),
        generatedBy: this.generatedBy,
      });
    }
    return fileName ?? this.config.export?.fileName ?? this.config.id;
  }

  hasSelection(): boolean {
    return this.selectedIds().size > 0;
  }

  onExportConfirm(request: ReportExportRequest): void {
    this.exportRequested.emit(request);
    const model = this.buildExportModel(request);
    void this.exporter.export(model, request);
  }

  private exportSourceRows(scope: ReportExportRequest['scope']): ReportRow[] {
    switch (scope) {
      case 'currentPage':
        return this.viewRows();
      case 'selected':
        return this.selectedRows();
      case 'filtered':
      default:
        return this.dataMode === 'server' ? this._data() : this.sortedRows();
    }
  }

  private buildExportModel(request: ReportExportRequest): ReportExportModel {
    const requested = new Set(request.columns);
    const columns = this.orderedColumns().filter(
      (column) => column.exportable !== false && requested.has(column.key)
    );
    const exportColumns: ReportExportColumn[] = columns.map((column) => ({
      key: column.key,
      header: this.formatting.columnHeader(column),
      type: (column.type ?? 'text') as ReportColumnType,
      alignment: this.alignmentOf(column),
      currencyCode: column.currencyCode ?? this.config.currencyCode,
      decimals: column.decimals,
    }));

    const toCells = (row: ReportRow): ReportExportCell[] =>
      columns.map((column) => ({
        raw: getColumnValue(row, column),
        text: this.formatting.formatColumnValue(row, column, {
          locale: this.locale,
          currencyCode: this.config.currencyCode,
        }),
      }));

    const rows = this.exportSourceRows(request.scope);
    const useGroups = this.grouped() && request.scope !== 'selected';
    const groups: ReportExportGroup[] | undefined =
      useGroups && this.groupViews()
        ? this.groupViews()!.map((group) => ({
            title: group.title,
            rows: group.rows.map(toCells),
            summaries: group.summaries.map((summary) => ({ label: this.summaryLabel(summary), value: summary.display })),
          }))
        : undefined;

    const summaries: ReportExportLabelValue[] = this.summariesFor('export', rows).map((summary) => ({
      label: this.summaryLabel(summary),
      value: summary.display,
      raw: summary.value,
    }));

    return {
      title: this.reportTitle,
      description: this.reportDescription,
      generatedAt: new Date(),
      generatedBy: this.generatedBy,
      locale: this.locale,
      rtl: this.formatting.isRtl(),
      orientation: request.orientation,
      company: this.config.export?.company,
      filtersSummary: this.buildFiltersSummary(),
      columns: exportColumns,
      // Always include flat rows (CSV/Excel writers use these); PDF/print prefer
      // `groups` when present. This keeps grouped Excel/CSV exports non-empty.
      rows: rows.map(toCells),
      groups,
      summaries,
      watermark: this.config.export?.watermark,
      footerText: this.config.export?.footerText,
      signature: this.config.export?.signature,
      includeCompanyHeader: request.includeCompanyHeader,
      includeGeneratedDate: request.includeGeneratedDate,
      includeFilters: request.includeFilters,
      includeSummaries: request.includeSummaries,
    };
  }

  private summaryLabel(summary: ComputedSummary): string {
    return summary.labelKey ? this.translate.instant(summary.labelKey) : summary.label;
  }

  private buildFiltersSummary(): ReportExportLabelValue[] {
    const values = this.committedFilters();
    const result: ReportExportLabelValue[] = [];
    for (const filter of this.config.filters ?? []) {
      const value = values[filter.key];
      if (isBlankFilterValue(value)) {
        continue;
      }
      result.push({
        label: filter.labelKey ? this.translate.instant(filter.labelKey) : filter.label,
        value: this.formatFilterValue(filter, value),
      });
    }
    if (this.searchTerm().trim()) {
      result.push({ label: this.translate.instant('reporting.toolbar.searchPlaceholder'), value: this.searchTerm() });
    }
    return result;
  }

  private formatFilterValue(filter: ReportFilterConfig, value: unknown): string {
    if (Array.isArray(value)) {
      if (filter.type === 'dateRange') {
        return value
          .map((entry) => this.formatting.formatDate(entry, { locale: this.locale }))
          .join(' – ');
      }
      return value.map((entry) => this.optionLabel(filter, entry)).join(', ');
    }
    if (value && typeof value === 'object') {
      const range = value as { from?: unknown; to?: unknown };
      return `${range.from ?? ''} – ${range.to ?? ''}`;
    }
    if (filter.type === 'date') {
      return this.formatting.formatDate(value, { locale: this.locale });
    }
    if (filter.type === 'boolean') {
      return this.formatting.formatBoolean(value);
    }
    return this.optionLabel(filter, value);
  }

  private optionLabel(filter: ReportFilterConfig, value: unknown): string {
    const option = filter.options?.find((candidate) => String(candidate.value) === String(value));
    if (option) {
      return option.labelKey ? this.translate.instant(option.labelKey) : option.label;
    }
    return String(value ?? '');
  }

  alignmentOf(column: ReportColumn): ReportAlignment {
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

  // ---- server query -------------------------------------------------------
  private emitQueryIfServer(): void {
    if (this.dataMode !== 'server' || !this.initialized) {
      return;
    }
    this.filtersChanged.emit(this.buildQuery());
  }

  private buildQuery(): ReportQuery {
    const filters: Record<string, unknown> = {};
    for (const filter of this.config.filters ?? []) {
      const value = this.committedFilters()[filter.key];
      if (!isBlankFilterValue(value)) {
        filters[filter.key] = filter.transform ? filter.transform(value) : value;
      }
    }
    return {
      page: this.first() / this.pageSize() + 1,
      pageSize: this.pageSize(),
      search: this.searchTerm().trim() || undefined,
      filters,
      sort: this.sortState(),
      groups: this.activeGroups(),
      visibleColumns: this.visibleColumns().map((column) => column.key),
    };
  }

  // ---- persistence --------------------------------------------------------
  private saveState(): void {
    this.persistence.save(this.config, {
      columns: this.columnStates(),
      sort: this.sortState(),
      pageSize: this.pageSize(),
      filters: this.committedFilters(),
      groups: this.activeGroups(),
    });
  }

  // ---- misc getters -------------------------------------------------------
  get reportTitle(): string {
    return this.config.titleKey ? this.translate.instant(this.config.titleKey) : this.config.title;
  }

  get reportDescription(): string {
    if (this.config.descriptionKey) {
      return this.translate.instant(this.config.descriptionKey);
    }
    return this.config.description ?? '';
  }

  // Memoized (stable reference) — bound to PrimeNG [options]/[rowsPerPageOptions],
  // so they must not allocate a new array on every change-detection pass.
  readonly pageSizeOptions = computed<number[]>(
    () => this.config.pagination?.pageSizeOptions ?? [10, 25, 50]
  );

  readonly groupOptions = computed<{ label: string; value: string | null }[]>(() => {
    const options: { label: string; value: string | null }[] = [
      { label: this.translate.instant('reporting.grouping.none'), value: null },
    ];
    for (const group of this.config.groups ?? []) {
      options.push({
        label: group.labelKey ? this.translate.instant(group.labelKey) : group.label ?? group.key,
        value: group.key,
      });
    }
    return options;
  });

  get activeGroup(): string | null {
    return this.activeGroups()[0] ?? null;
  }

  get emptyMessage(): string {
    return this.config.emptyStateMessageKey ?? this.config.emptyStateMessage ?? 'reporting.empty.noData';
  }

  get currencyCode(): string | undefined {
    return this.config.currencyCode;
  }

  get activeFilterCount(): number {
    const values = this.committedFilters();
    return (this.config.filters ?? []).filter((filter) => !isBlankFilterValue(values[filter.key])).length;
  }

  get showGroupBy(): boolean {
    return this.feat().grouping && (this.config.groups?.length ?? 0) > 0;
  }
}
