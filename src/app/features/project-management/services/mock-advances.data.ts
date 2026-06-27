// ─────────────────────────────────────────────────────────────────────────────
// Temporary mock data — remove this file once AdvancesController is deployed
// and `npm run generate-api` produces a real AdvanceClient.
// ─────────────────────────────────────────────────────────────────────────────

import {
  AdvanceDetailDto,
  AdvanceListItemDto,
  AdvanceStatus,
  AdvanceSummaryDto,
  CreateAdvanceCommand,
  EngineerLookupDto,
  UpdateAdvanceCommand,
} from '../models/advance.model';

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

let _nextId = 1000;
let _nextSeq = 1;

function nextAdvanceNo(): string {
  const year = new Date().getFullYear();
  return `ADV-${year}-${String(_nextSeq++).padStart(3, '0')}`;
}

const _advances: AdvanceDetailDto[] = [
  {
    id: 1,
    advance_no: 'ADV-2026-001',
    project: '',
    engineer: 'م. أحمد الخطيب',
    amount: 5000,
    remaining_balance: 5000,
    status: 'Open',
    created_at: new Date('2026-01-15').toISOString(),
    project_stage_id: 1,
    engineer_id: 1,
    advance_date: new Date('2026-01-15').toISOString(),
    currency: 'JOD',
    payment_method: undefined,
    notes: '',
    reference: '',
    expenses: [],
  },
];

/** Expense IDs that have been linked to an advance via settlement — locked from further edits. */
const _lockedExpenseIds = new Set<number>();

export function getLockedExpenseIds(): Set<number> {
  return _lockedExpenseIds;
}

export function getAdvancesForStage(projectStageId: number): AdvanceListItemDto[] {
  return _advances
    .filter((a) => a.project_stage_id === projectStageId)
    .map(toListItem)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function summarizeAdvances(items: AdvanceListItemDto[]): AdvanceSummaryDto {
  return {
    total_advances: items.length,
    total_amount: items.reduce((sum, a) => sum + a.amount, 0),
    total_remaining: items.reduce((sum, a) => sum + a.remaining_balance, 0),
    open_count: items.filter((a) => a.status !== 'Settled').length,
  };
}

export function getAdvanceDetail(id: number): AdvanceDetailDto | undefined {
  return _advances.find((a) => a.id === id);
}

export function createAdvance(command: CreateAdvanceCommand): AdvanceDetailDto {
  const engineer = MOCK_ENGINEERS.find((e) => e.id === command.engineerId);
  const record: AdvanceDetailDto = {
    id: _nextId++,
    advance_no: nextAdvanceNo(),
    project: '',
    engineer: engineer?.name ?? '—',
    amount: command.amount,
    remaining_balance: command.amount,
    status: 'Open',
    created_at: new Date().toISOString(),
    project_stage_id: command.projectStageId,
    engineer_id: command.engineerId,
    advance_date: command.advanceDate.toISOString(),
    currency: command.currency,
    payment_method: command.paymentMethod,
    notes: command.notes ?? '',
    reference: command.reference ?? '',
    expenses: [],
  };
  _advances.push(record);
  return record;
}

export function updateAdvance(command: UpdateAdvanceCommand): { ok: boolean; message?: string } {
  const record = _advances.find((a) => a.id === command.id);
  if (!record) return { ok: false, message: 'Advance not found.' };
  if (record.status !== 'Open') {
    return { ok: false, message: 'Only open advances can be updated.' };
  }

  const engineer = MOCK_ENGINEERS.find((e) => e.id === command.engineerId);
  record.engineer = engineer?.name ?? '—';
  record.engineer_id = command.engineerId;
  record.amount = command.amount;
  record.remaining_balance = command.amount;
  record.project_stage_id = command.projectStageId;
  record.advance_date = command.advanceDate.toISOString();
  record.currency = command.currency;
  record.payment_method = command.paymentMethod;
  record.notes = command.notes ?? '';
  record.reference = command.reference ?? '';
  return { ok: true };
}

export function deleteAdvance(id: number): { ok: boolean; message?: string } {
  const record = _advances.find((a) => a.id === id);
  if (!record) return { ok: false, message: 'Advance not found.' };
  if (record.status !== 'Open') {
    return { ok: false, message: 'Only open advances can be deleted.' };
  }
  const idx = _advances.indexOf(record);
  _advances.splice(idx, 1);
  return { ok: true };
}

export function settleAdvance(
  id: number,
  expenses: { id: number; expenseNo: string; amount: number; date: string }[]
): { ok: boolean; message?: string } {
  const record = _advances.find((a) => a.id === id);
  if (!record) return { ok: false, message: 'Advance not found.' };
  if (record.status === 'Settled') {
    return { ok: false, message: 'This advance is already fully settled.' };
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  if (total > record.remaining_balance) {
    return { ok: false, message: 'Selected expenses exceed the remaining balance.' };
  }

  for (const e of expenses) {
    _lockedExpenseIds.add(e.id);
    record.expenses.push({
      id: e.id,
      expense_no: e.expenseNo,
      type: '—',
      amount: e.amount,
      date: e.date,
      status: 'Settled',
    });
  }

  record.remaining_balance = Math.round((record.remaining_balance - total) * 100) / 100;
  record.status = record.remaining_balance <= 0 ? 'Settled' : 'PartiallySettled';
  return { ok: true };
}

function toListItem(a: AdvanceDetailDto): AdvanceListItemDto {
  const { project_stage_id, engineer_id, advance_date, currency, payment_method, notes, reference, expenses, ...listItem } = a;
  return listItem;
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
