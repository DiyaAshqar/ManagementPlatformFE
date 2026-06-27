/**
 * Hand-written mirror of the not-yet-deployed `AdvancesController` API.
 *
 * The backend DTOs (`AdvanceListItemDto`, `AdvanceDetailDto`, etc.) decorate
 * every property with `[JsonPropertyName("snake_case")]`, so the response
 * shapes below use snake_case to match the JSON the real API will send.
 * The command DTOs (`CreateAdvanceCommand`, etc.) have no such attributes,
 * so they follow this app's normal camelCase convention instead.
 *
 * Once the backend ships and `npm run generate-api` produces a real
 * `AdvanceClient`, these types — and AdvanceApiService's mock branch — go
 * away; the property names here were chosen to match the generated client
 * as closely as possible so call sites barely change.
 */

export interface ApiEnvelope<T> {
  succeeded: boolean;
  message?: string;
  errors?: string[];
  data?: T;
}

/** Mirrors `Dashboard.Domain.Entities.LookUp.AdvanceStatus` (string on the wire). */
export type AdvanceStatus = 'Open' | 'PartiallySettled' | 'Settled';

export interface AdvanceSummaryDto {
  total_advances: number;
  total_amount: number;
  total_remaining: number;
  open_count: number;
}

export interface AdvanceListItemDto {
  id: number;
  advance_no: string;
  project: string;
  engineer: string;
  amount: number;
  remaining_balance: number;
  status: AdvanceStatus;
  created_at: string;
}

export interface AdvanceListResponseDto {
  summary: AdvanceSummaryDto;
  data: AdvanceListItemDto[];
}

export interface AdvanceExpenseDto {
  id: number;
  expense_no: string;
  type: string;
  amount: number;
  date: string;
  status: string;
}

export interface AdvanceDetailDto extends AdvanceListItemDto {
  project_stage_id: number;
  engineer_id: number;
  advance_date: string;
  currency: string;
  payment_method?: number;
  notes?: string;
  reference?: string;
  expenses: AdvanceExpenseDto[];
}

export interface AvailableAdvanceExpensesDto {
  advance_no: string;
  remaining_balance: number;
  currency: string;
  expenses: AdvanceExpenseDto[];
}

/** Matches `CreateAdvanceCommand` — no `[JsonPropertyName]` overrides on the backend, so camelCase. */
export interface CreateAdvanceCommand {
  projectStageId: number;
  engineerId: number;
  advanceDate: Date;
  amount: number;
  currency: string;
  paymentMethod?: number;
  reference?: string;
  notes?: string;
}

/** Matches `UpdateAdvanceCommand`. */
export interface UpdateAdvanceCommand extends CreateAdvanceCommand {
  id: number;
}

/** Matches `SettleAdvanceCommand`. */
export interface SettleAdvanceCommand {
  id: number;
  expenseIds: number[];
}

/** Engineer lookup option. No backend lookup key exists for this yet — see mock-advances.data.ts. */
export interface EngineerLookupDto {
  id: number;
  name: string;
}
