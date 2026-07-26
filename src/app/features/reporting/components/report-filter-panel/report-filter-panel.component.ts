import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

import { NumberRangeValue } from '../../models/report-common.model';
import { ReportFilterConfig, ReportFilterOption, ReportFilterValues } from '../../models/report-filter.model';
import { isBlankFilterValue } from '../../utilities/report-filter.utils';
import { toDate, toNumber } from '../../utilities/report-value.utils';

interface DisplayOption {
  label: string;
  value: unknown;
}

/**
 * Renders a dynamic filter form from {@link ReportFilterConfig}s. Holds a local
 * draft so the parent API is only called on Apply (never per keystroke) and
 * emits the committed values. Supports async options, visibility conditions,
 * advanced grouping, per-field clear and range validation.
 */
@Component({
  selector: 'app-report-filter-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    NgTemplateOutlet,
    FormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    MultiSelectModule,
  ],
  templateUrl: './report-filter-panel.component.html',
  styleUrls: ['./report-filter-panel.component.scss'],
})
export class ReportFilterPanelComponent implements OnChanges {
  private readonly translate = inject(TranslateService);

  @Input() filters: ReportFilterConfig[] = [];
  @Input() values: ReportFilterValues = {};
  /** Consumer templates for `custom` filters, keyed by `templateName`. */
  @Input() filterTemplates: Record<string, TemplateRef<unknown>> = {};

  @Output() apply = new EventEmitter<ReportFilterValues>();
  @Output() resetFilters = new EventEmitter<void>();

  draft: ReportFilterValues = {};
  showAdvanced = false;
  booleanOpts: DisplayOption[] = [];
  private readonly optionsMap = new Map<string, ReportFilterOption[]>();
  private optionsCache = new Map<string, DisplayOption[]>();
  private readonly loadingKeys = new Set<string>();
  private static readonly EMPTY_OPTIONS: DisplayOption[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['values']) {
      this.syncDraft();
    }
    if (changes['filters']) {
      this.loadAsyncOptions();
      this.rebuildOptionCaches();
    }
    if (this.booleanOpts.length === 0) {
      this.booleanOpts = this.buildBooleanOptions();
    }
  }

  private syncDraft(): void {
    const next: ReportFilterValues = { ...this.values };
    for (const filter of this.filters) {
      if (filter.type === 'numberRange' && next[filter.key] == null) {
        next[filter.key] = { from: null, to: null } as NumberRangeValue;
      }
    }
    this.draft = next;
  }

  private loadAsyncOptions(): void {
    for (const filter of this.filters) {
      if (filter.optionsLoader && !this.optionsMap.has(filter.key) && !this.loadingKeys.has(filter.key)) {
        this.loadingKeys.add(filter.key);
        filter.optionsLoader().subscribe({
          next: (options) => {
            this.optionsMap.set(filter.key, options);
            this.loadingKeys.delete(filter.key);
            this.rebuildOptionCaches();
          },
          error: () => this.loadingKeys.delete(filter.key),
        });
      }
    }
  }

  /**
   * Rebuild the per-filter option caches. Options are memoized (stable
   * references) so the template never feeds a fresh array into PrimeNG
   * `[options]` on every change-detection pass — which would spin an infinite
   * change-detection loop and freeze the tab.
   */
  private rebuildOptionCaches(): void {
    const next = new Map<string, DisplayOption[]>();
    for (const filter of this.filters) {
      const source = this.optionsMap.get(filter.key) ?? filter.options ?? [];
      next.set(
        filter.key,
        source.map((option) => ({
          label: option.labelKey ? this.translate.instant(option.labelKey) : option.label,
          value: option.value,
        }))
      );
    }
    this.optionsCache = next;
  }

  private buildBooleanOptions(): DisplayOption[] {
    return [
      { label: this.translate.instant('reporting.filters.any'), value: null },
      { label: this.translate.instant('reporting.common.yes'), value: true },
      { label: this.translate.instant('reporting.common.no'), value: false },
    ];
  }

  // ---- visibility ---------------------------------------------------------

  get basicFilters(): ReportFilterConfig[] {
    return this.filters.filter((filter) => !filter.advanced && this.isVisible(filter));
  }

  get advancedFilters(): ReportFilterConfig[] {
    return this.filters.filter((filter) => filter.advanced && this.isVisible(filter));
  }

  isVisible(filter: ReportFilterConfig): boolean {
    return filter.visibleWhen ? filter.visibleWhen(this.draft) : true;
  }

  label(filter: ReportFilterConfig): string {
    return filter.labelKey ? this.translate.instant(filter.labelKey) : filter.label;
  }

  placeholder(filter: ReportFilterConfig): string {
    if (filter.placeholderKey) {
      return this.translate.instant(filter.placeholderKey);
    }
    return filter.placeholder ?? '';
  }

  // ---- value access -------------------------------------------------------

  value(key: string): unknown {
    return this.draft[key];
  }

  setValue(key: string, value: unknown): void {
    this.draft = { ...this.draft, [key]: value };
    // Reset dependent filters when a parent changes.
    for (const filter of this.filters) {
      if (filter.dependsOn === key) {
        this.draft = { ...this.draft, [filter.key]: filter.defaultValue ?? null };
      }
    }
  }

  range(key: string): NumberRangeValue {
    const value = this.draft[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as NumberRangeValue;
    }
    return { from: null, to: null };
  }

  setRangePart(key: string, part: 'from' | 'to', value: unknown): void {
    const current = this.range(key);
    const next: NumberRangeValue = { ...current, [part]: value == null ? null : Number(value) };
    this.draft = { ...this.draft, [key]: next };
  }

  /** Stable (memoized) options for a filter — see {@link rebuildOptionCaches}. */
  optionsFor(filter: ReportFilterConfig): DisplayOption[] {
    return this.optionsCache.get(filter.key) ?? ReportFilterPanelComponent.EMPTY_OPTIONS;
  }

  // ---- validation ---------------------------------------------------------

  rangeInvalid(filter: ReportFilterConfig): boolean {
    const value = this.draft[filter.key];
    if (filter.type === 'numberRange') {
      const range = this.range(filter.key);
      const from = toNumber(range.from);
      const to = toNumber(range.to);
      return from !== null && to !== null && from > to;
    }
    if (filter.type === 'dateRange' && Array.isArray(value)) {
      const from = toDate(value[0]);
      const to = toDate(value[1]);
      return from !== null && to !== null && from.getTime() > to.getTime();
    }
    return false;
  }

  requiredMissing(filter: ReportFilterConfig): boolean {
    return !!filter.required && isBlankFilterValue(this.draft[filter.key]);
  }

  get canApply(): boolean {
    return !this.filters.some(
      (filter) => this.isVisible(filter) && (this.rangeInvalid(filter) || this.requiredMissing(filter))
    );
  }

  get activeCount(): number {
    return this.filters.filter((filter) => !isBlankFilterValue(this.values[filter.key])).length;
  }

  // ---- actions ------------------------------------------------------------

  clearField(filter: ReportFilterConfig): void {
    const cleared =
      filter.type === 'numberRange' ? ({ from: null, to: null } as NumberRangeValue) : null;
    this.draft = { ...this.draft, [filter.key]: cleared };
  }

  onApply(): void {
    if (!this.canApply) {
      return;
    }
    this.apply.emit({ ...this.draft });
  }

  onReset(): void {
    this.resetFilters.emit();
  }

  toggleAdvanced(): void {
    this.showAdvanced = !this.showAdvanced;
  }

  hasTemplate(filter: ReportFilterConfig): boolean {
    return !!filter.templateName && !!this.filterTemplates[filter.templateName];
  }

  templateFor(filter: ReportFilterConfig): TemplateRef<unknown> | null {
    return filter.templateName ? this.filterTemplates[filter.templateName] ?? null : null;
  }
}
