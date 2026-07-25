import { Injectable } from '@angular/core';

import { ReportColumnState } from '../models/report-column.model';
import { ReportSortConfig } from '../models/report-common.model';
import { ReportConfig } from '../models/report-config.model';
import { ReportFilterConfig, ReportFilterValues } from '../models/report-filter.model';

/** Bump when the persisted shape changes so stale blobs are safely ignored. */
const STATE_VERSION = 1;
const KEY_PREFIX = 'report-state';

/** The subset of report state that can be persisted. */
export interface PersistedReportState {
  version: number;
  columns?: ReportColumnState[];
  sort?: ReportSortConfig[];
  pageSize?: number;
  filters?: ReportFilterValues;
  groups?: string[];
}

/**
 * Persists per-report user preferences (columns, sort, page size, filters,
 * grouping) to local/session storage. All reads are defensive: corrupted or
 * outdated blobs are dropped rather than thrown.
 */
@Injectable({ providedIn: 'root' })
export class ReportPersistenceService {
  private storage(config: ReportConfig): Storage | null {
    try {
      return config.persistence?.storage === 'sessionStorage'
        ? window.sessionStorage
        : window.localStorage;
    } catch {
      return null;
    }
  }

  storageKey(config: ReportConfig): string {
    const base = config.persistence?.key ?? config.id;
    const user = config.persistence?.userId ? `:${config.persistence.userId}` : '';
    return `${KEY_PREFIX}:${base}${user}`;
  }

  load(config: ReportConfig): PersistedReportState | null {
    if (!config.persistence?.enabled) {
      return null;
    }
    const storage = this.storage(config);
    if (!storage) {
      return null;
    }
    try {
      const raw = storage.getItem(this.storageKey(config));
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as PersistedReportState;
      if (!parsed || parsed.version !== STATE_VERSION) {
        return null;
      }
      return parsed;
    } catch (error) {
      // Corrupted preferences must never break the report.
      console.warn('[Reporting] failed to read persisted state', error);
      return null;
    }
  }

  save(config: ReportConfig, state: Omit<PersistedReportState, 'version'>): void {
    if (!config.persistence?.enabled) {
      return;
    }
    const storage = this.storage(config);
    if (!storage) {
      return;
    }
    const persistence = config.persistence;
    const payload: PersistedReportState = { version: STATE_VERSION };
    if (persistence.includeColumns !== false) {
      payload.columns = state.columns;
    }
    if (persistence.includeSorting !== false) {
      payload.sort = state.sort;
    }
    if (persistence.includePageSize !== false) {
      payload.pageSize = state.pageSize;
    }
    if (persistence.includeFilters) {
      payload.filters = state.filters;
    }
    if (persistence.includeGrouping) {
      payload.groups = state.groups;
    }
    try {
      storage.setItem(this.storageKey(config), JSON.stringify(payload));
    } catch (error) {
      console.warn('[Reporting] failed to persist state', error);
    }
  }

  clear(config: ReportConfig): void {
    const storage = this.storage(config);
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(this.storageKey(config));
    } catch (error) {
      console.warn('[Reporting] failed to clear persisted state', error);
    }
  }

  /**
   * Revive persisted filter values: `date`/`dateRange` filters are stored as
   * ISO strings by `JSON.stringify` and must be turned back into `Date`s for
   * the pickers.
   */
  reviveFilterValues(
    values: ReportFilterValues,
    filters: readonly ReportFilterConfig[]
  ): ReportFilterValues {
    const revived: ReportFilterValues = { ...values };
    for (const filter of filters) {
      const value = revived[filter.key];
      if (value == null) {
        continue;
      }
      if (filter.type === 'date') {
        revived[filter.key] = this.toDateSafe(value);
      } else if (filter.type === 'dateRange') {
        revived[filter.key] = this.reviveRange(value);
      }
    }
    return revived;
  }

  private toDateSafe(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private reviveRange(value: unknown): { from: Date | null; to: Date | null } {
    if (Array.isArray(value)) {
      return { from: this.toDateSafe(value[0]), to: this.toDateSafe(value[1]) };
    }
    const range = (value ?? {}) as { from?: unknown; to?: unknown };
    return { from: this.toDateSafe(range.from), to: this.toDateSafe(range.to) };
  }
}
