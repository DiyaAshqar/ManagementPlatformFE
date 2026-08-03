import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { LanguageService } from '../../../core/services/language.service';
import { ReportColumn, ReportStatusOption } from '../models/report-column.model';
import { ReportSeverity } from '../models/report-common.model';
import { getColumnValue, isEmptyValue, toDate, toNumber } from '../utilities/report-value.utils';

/** Per-call formatting overrides. */
export interface FormatOptions {
  locale?: string;
  currencyCode?: string;
  decimals?: number;
  emptyText?: string;
}

const DEFAULT_EMPTY_TEXT = '—';

/**
 * Locale-aware value formatting for the reporting module. Wraps `Intl` and the
 * app's `LanguageService`/`TranslateService` so components never hardcode
 * locale, currency or labels.
 */
@Injectable({ providedIn: 'root' })
export class ReportFormattingService {
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  /** Resolve the active BCP-47 locale (explicit override wins). */
  locale(override?: string): string {
    return override ?? this.language.getCurrentLanguage() ?? 'en';
  }

  isRtl(): boolean {
    return this.language.isRightToLeft();
  }

  formatNumber(value: unknown, options: FormatOptions = {}): string {
    const num = toNumber(value);
    if (num === null) {
      return options.emptyText ?? DEFAULT_EMPTY_TEXT;
    }
    const fraction =
      options.decimals != null
        ? { minimumFractionDigits: options.decimals, maximumFractionDigits: options.decimals }
        : { maximumFractionDigits: 2 };
    return new Intl.NumberFormat(this.locale(options.locale), fraction).format(num);
  }

  formatCurrency(value: unknown, options: FormatOptions = {}): string {
    const num = toNumber(value);
    if (num === null) {
      return options.emptyText ?? DEFAULT_EMPTY_TEXT;
    }
    const currency = options.currencyCode ?? 'USD';
    const decimals = options.decimals ?? 2;
    try {
      return new Intl.NumberFormat(this.locale(options.locale), {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    } catch {
      // Unknown ISO currency code — fall back to number + suffix.
      return `${this.formatNumber(num, { ...options, decimals })} ${currency}`;
    }
  }

  formatPercent(value: unknown, options: FormatOptions = {}): string {
    const num = toNumber(value);
    if (num === null) {
      return options.emptyText ?? DEFAULT_EMPTY_TEXT;
    }
    const formatted = new Intl.NumberFormat(this.locale(options.locale), {
      minimumFractionDigits: options.decimals ?? 0,
      maximumFractionDigits: options.decimals ?? 2,
    }).format(num);
    return `${formatted}%`;
  }

  formatDate(value: unknown, options: FormatOptions = {}, dateOptions?: Intl.DateTimeFormatOptions): string {
    const date = toDate(value);
    if (!date) {
      return options.emptyText ?? DEFAULT_EMPTY_TEXT;
    }
    return new Intl.DateTimeFormat(
      this.locale(options.locale),
      dateOptions ?? { year: 'numeric', month: 'short', day: '2-digit' }
    ).format(date);
  }

  formatDateTime(value: unknown, options: FormatOptions = {}, dateOptions?: Intl.DateTimeFormatOptions): string {
    return this.formatDate(
      value,
      options,
      dateOptions ?? {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  formatBoolean(value: unknown): string {
    if (isEmptyValue(value)) {
      return DEFAULT_EMPTY_TEXT;
    }
    return this.translate.instant(value ? 'reporting.common.yes' : 'reporting.common.no');
  }

  /** Resolve the status option (label/severity/icon) for a status value. */
  resolveStatus(column: ReportColumn, value: unknown): ReportStatusOption & { severity: ReportSeverity } {
    const match = column.statusMap?.find((option) => String(option.value) === String(value));
    const label = match?.labelKey
      ? this.translate.instant(match.labelKey)
      : match?.label ?? String(value ?? '');
    return {
      value: String(value ?? ''),
      label,
      labelKey: match?.labelKey,
      severity: match?.severity ?? 'secondary',
      icon: match?.icon,
    };
  }

  /** Translate the (possibly key-based) header for a column. */
  columnHeader(column: ReportColumn): string {
    return column.headerKey ? this.translate.instant(column.headerKey) : column.header;
  }

  /**
   * Produce the display string for a column's value, honouring custom
   * formatters/getters, type-based formatting and empty placeholders.
   */
  formatColumnValue<T>(row: T, column: ReportColumn<T>, options: FormatOptions = {}): string {
    const raw = getColumnValue(row, column);
    if (column.formatter) {
      return column.formatter(raw, row);
    }
    const emptyText = column.emptyText ?? options.emptyText ?? DEFAULT_EMPTY_TEXT;
    if (isEmptyValue(raw)) {
      return emptyText;
    }
    const merged: FormatOptions = {
      ...options,
      emptyText,
      currencyCode: column.currencyCode ?? options.currencyCode,
      decimals: column.decimals ?? options.decimals,
    };
    switch (column.type) {
      case 'number':
        return this.formatNumber(raw, merged);
      case 'currency':
        return this.formatCurrency(raw, merged);
      case 'percentage':
        return this.formatPercent(raw, merged);
      case 'date':
        return this.formatDate(raw, merged, column.dateFormat);
      case 'dateTime':
        return this.formatDateTime(raw, merged, column.dateFormat);
      case 'boolean':
        return this.formatBoolean(raw);
      case 'status':
        return this.resolveStatus(column as ReportColumn, raw).label ?? String(raw);
      case 'text':
      case 'custom':
      default:
        return String(raw);
    }
  }
}
