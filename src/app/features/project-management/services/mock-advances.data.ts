// ─────────────────────────────────────────────────────────────────────────────
// Pure client-side helpers, not fake data — kept because the real
// GET /api/advances list endpoint has no project/stage filter yet, so
// AdvanceApiService recomputes the summary client-side after narrowing
// results by project name (see advance-api.service.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { AdvanceListItemDto, AdvanceStatus, AdvanceSummaryDto } from '../models/advance.model';

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
