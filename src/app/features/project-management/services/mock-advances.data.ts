// ─────────────────────────────────────────────────────────────────────────────
// What's left here has no real backend equivalent yet:
//  - MOCK_ENGINEERS: no "engineer" LookupType exists on the backend LookupClient.
//  - advanceStatusSeverity / summarizeAdvances: pure client-side helpers, not
//    fake data — kept because the real GET /api/advances list endpoint has no
//    project/stage filter yet, so AdvanceApiService recomputes the summary
//    client-side after narrowing results by project name (see
//    advance-api.service.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { AdvanceListItemDto, AdvanceStatus, AdvanceSummaryDto, EngineerLookupDto } from '../models/advance.model';

/**
 * No backend lookup key exists for "engineer" yet (the generic `LookupClient`
 * doesn't expose one). Seeded here until the backend decides how resident
 * engineers are surfaced (new lookup key vs. dedicated endpoint).
 */
export const MOCK_ENGINEERS: EngineerLookupDto[] = [
  { id: 1, name: 'م. أحمد الخطيب' },
  { id: 2, name: 'م. محمد العمري' },
  { id: 3, name: 'م. سارة الحسن' },
  { id: 4, name: 'م. ليلى المصري' },
];

export function summarizeAdvances(items: AdvanceListItemDto[]): AdvanceSummaryDto {
  return {
    total_advances: items.length,
    total_amount: items.reduce((sum, a) => sum + a.amount, 0),
    total_remaining: items.reduce((sum, a) => sum + a.remaining_balance, 0),
    open_count: items.filter((a) => a.status !== 'Settled').length,
  };
}

export function advanceStatusSeverity(status: AdvanceStatus): 'info' | 'warn' | 'success' {
  switch (status) {
    case 'Open':
      return 'info';
    case 'PartiallySettled':
      return 'warn';
    case 'Settled':
      return 'success';
  }
}
