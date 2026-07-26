import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { LanguageService } from '../../../../core/services/language.service';
import { ReportConfig } from '../../models/report-config.model';
import { ReportQuery, ReportResult } from '../../models/report-data-source.model';
import { ReportExportRequest } from '../../models/report-export.model';
import { ReportRow } from '../../models/report-common.model';
import { ReportViewerComponent } from '../../components/report-viewer/report-viewer.component';
import { ReportPersistenceService } from '../../services/report-persistence.service';
import { aggregate } from '../../utilities/report-calculation.utils';
import { applyFilters, applySearch, applySort, paginate } from '../../utilities/report-filter.utils';
import { resolvePath } from '../../utilities/report-value.utils';
import {
  buildInvoiceReportConfig,
  DEFAULT_DEMO_OPTIONS,
  DemoReportOptions,
} from '../demo-report-config';
import { DEMO_INVOICES, InvoiceReportRow } from '../demo-report-data';

interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * Interactive demo/playground for the reporting module. Every reusable feature
 * is exercised here and can be toggled live from the control panel, including a
 * simulated server-side data source.
 */
@Component({
  selector: 'app-reporting-demo-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    SelectModule,
    ToggleSwitchModule,
    ReportViewerComponent,
  ],
  templateUrl: './reporting-demo-page.component.html',
  styleUrls: ['./reporting-demo-page.component.scss'],
})
export class ReportingDemoPageComponent implements OnDestroy {
  private readonly language = inject(LanguageService);
  private readonly persistence = inject(ReportPersistenceService);

  readonly options = signal<DemoReportOptions>({ ...DEFAULT_DEMO_OPTIONS });
  readonly simulateLoading = signal(false);
  readonly simulateEmpty = signal(false);
  readonly simulateError = signal(false);
  private readonly rebuildNonce = signal(0);

  // Server-mode state, populated by the simulated data source.
  private readonly serverData = signal<InvoiceReportRow[]>([]);
  readonly serverTotal = signal(0);
  readonly serverSummaries = signal<Record<string, number>>({});
  private readonly serverLoading = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly config = computed<ReportConfig>(() => {
    this.rebuildNonce();
    return buildInvoiceReportConfig(this.options());
  });

  readonly data = computed<readonly ReportRow[]>(() => {
    if (this.options().dataMode === 'server') {
      return this.serverData() as unknown as ReportRow[];
    }
    return (this.simulateEmpty() ? [] : DEMO_INVOICES) as unknown as ReportRow[];
  });

  readonly loading = computed(
    () => this.simulateLoading() || (this.options().dataMode === 'server' && this.serverLoading())
  );
  readonly error = computed(() => this.simulateError());

  readonly currencyOptions: SelectOption<string>[] = [
    { label: 'JOD', value: 'JOD' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
  ];
  readonly pageSizeOptions: SelectOption<number>[] = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
  ];
  readonly modeOptions: SelectOption<'client' | 'server'>[] = [
    { label: 'reporting.demo.controls.client', value: 'client' },
    { label: 'reporting.demo.controls.server', value: 'server' },
  ];
  readonly orientationOptions: SelectOption<'portrait' | 'landscape'>[] = [
    { label: 'reporting.export.orientation.portrait', value: 'portrait' },
    { label: 'reporting.export.orientation.landscape', value: 'landscape' },
  ];

  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  setOption<K extends keyof DemoReportOptions>(key: K, value: DemoReportOptions[K]): void {
    this.options.update((current) => ({ ...current, [key]: value }));
  }

  get isArabic(): boolean {
    return this.language.getCurrentLanguage() === 'ar';
  }

  setLanguage(lang: 'en' | 'ar'): void {
    this.language.setLanguage(lang);
  }

  // ---- simulated server-side data source ---------------------------------
  loadReport(query: ReportQuery): void {
    if (this.options().dataMode !== 'server') {
      return;
    }
    this.serverLoading.set(true);
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      if (this.simulateError()) {
        this.serverLoading.set(false);
        return;
      }
      const result = this.querySampleData(query);
      this.serverData.set(result.items);
      this.serverTotal.set(result.totalCount);
      this.serverSummaries.set(result.summaries ?? {});
      this.serverLoading.set(false);
    }, 600);
  }

  /** Mimics a backend by running the query against the in-memory dataset. */
  private querySampleData(query: ReportQuery): ReportResult<InvoiceReportRow> {
    const source = (this.simulateEmpty() ? [] : DEMO_INVOICES) as unknown as ReportRow[];
    const config = this.config();
    const resolver = (row: ReportRow, field: string): unknown => resolvePath(row, field);

    let rows = applyFilters(source, config.filters ?? [], query.filters ?? {}, resolver);
    rows = applySearch(rows, query.search ?? '', ['invoiceNumber', 'customerName', 'notes'], resolver);
    rows = applySort(rows, query.sort ?? [], resolver, this.language.getCurrentLanguage());

    const summaries: Record<string, number> = {};
    for (const summary of config.summaries ?? []) {
      const values = summary.field ? rows.map((row) => resolvePath(row, summary.field as string)) : rows;
      summaries[summary.key] = aggregate(summary.calculation, values, summary.decimals ?? 2);
    }

    const page = paginate(rows, query.page, query.pageSize);
    return {
      items: page as unknown as InvoiceReportRow[],
      totalCount: rows.length,
      page: query.page,
      pageSize: query.pageSize,
      summaries,
    };
  }

  handleExport(request: ReportExportRequest): void {
    // The viewer performs the export itself; this hook is where a real app would
    // route "all filtered" server exports to a backend endpoint instead.
    // eslint-disable-next-line no-console
    console.log('[ReportingDemo] export requested', request);
  }

  clearSavedPreferences(): void {
    this.persistence.clear(this.config());
    this.rebuildNonce.update((value) => value + 1);
  }
}
