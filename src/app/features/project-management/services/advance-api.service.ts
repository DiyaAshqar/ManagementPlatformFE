import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { delay, map, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdvanceListResponseDto,
  AdvanceDetailDto,
  ApiEnvelope,
  AvailableAdvanceExpensesDto,
  CreateAdvanceCommand,
  EngineerLookupDto,
  SettleAdvanceCommand,
  UpdateAdvanceCommand,
} from '../models/advance.model';
import { GetExpenseDto } from '../../../../nswag/api-client';
import { ExpenseApiService } from './expense-api.service';
import {
  MOCK_ENGINEERS,
  advanceStatusSeverity,
  deleteAdvance,
  getAdvanceDetail,
  getAdvancesForStage,
  getLockedExpenseIds,
  settleAdvance,
  summarizeAdvances,
  updateAdvance,
} from './mock-advances.data';

/**
 * The single seam between the application and the Advances backend.
 *
 * `AdvancesController` / `AdvanceClient` are written but not deployed yet, so
 * every method below branches on `environment.advances.useMock`. Once the
 * backend ships and `npm run generate-api` produces a real `AdvanceClient`,
 * wire it in the `// REAL API` blocks and flip the flag — components never
 * call the mock store or the generated client directly.
 */
@Injectable({ providedIn: 'root' })
export class AdvanceApiService {
  private readonly mockLatency = 300;

  constructor(
    private http: HttpClient,
    private expenseService: ExpenseApiService
  ) {}

  getByProjectStageId(projectStageId: number): Observable<ApiEnvelope<AdvanceListResponseDto>> {
    if (environment.advances.useMock) {
      const items = getAdvancesForStage(projectStageId);
      return of<ApiEnvelope<AdvanceListResponseDto>>({
        succeeded: true,
        data: { summary: summarizeAdvances(items), data: items },
      }).pipe(delay(this.mockLatency));
    }

    // REAL API — AdvancesController.GetAll has no stage filter yet; it needs
    // a `projectStageId` query param added before this can be wired in:
    //   return this.advanceClient.getAll(undefined, undefined, { projectStageId, ... });
    return this.notImplemented('getByProjectStageId');
  }

  getById(id: number): Observable<ApiEnvelope<AdvanceDetailDto>> {
    if (environment.advances.useMock) {
      const record = getAdvanceDetail(id);
      return of<ApiEnvelope<AdvanceDetailDto>>(
        record ? { succeeded: true, data: record } : { succeeded: false, message: 'Advance not found.' }
      ).pipe(delay(this.mockLatency));
    }

    // REAL API:
    //   return this.advanceClient.getById(id);
    return this.notImplemented('getById');
  }

  create(command: CreateAdvanceCommand): Observable<ApiEnvelope<boolean>> {
    return this.http.post<ApiEnvelope<boolean>>(`${environment.apiUrl}/advances`, command);
  }

  update(command: UpdateAdvanceCommand): Observable<ApiEnvelope<boolean>> {
    if (environment.advances.useMock) {
      const result = updateAdvance(command);
      return of<ApiEnvelope<boolean>>(
        result.ok ? { succeeded: true, data: true } : { succeeded: false, message: result.message }
      ).pipe(delay(this.mockLatency));
    }

    // REAL API:
    //   return this.advanceClient.update(command.id, new UpdateAdvanceCommand({ ... }));
    return this.notImplemented('update');
  }

  delete(id: number): Observable<ApiEnvelope<boolean>> {
    if (environment.advances.useMock) {
      const result = deleteAdvance(id);
      return of<ApiEnvelope<boolean>>(
        result.ok ? { succeeded: true, data: true } : { succeeded: false, message: result.message }
      ).pipe(delay(this.mockLatency));
    }

    // REAL API:
    //   return this.advanceClient.delete(id);
    return this.notImplemented('delete');
  }

  /**
   * Expenses for this advance's project stage that aren't yet linked to any
   * advance. The real `GetAdvanceAvailableExpensesQuery` handler resolves the
   * stage/engineer scope from the Advance entity server-side; the mock does
   * the same by reading `project_stage_id` off the mock record, then reusing
   * the *real, already-deployed* Expense API as the source of candidates.
   */
  getAvailableExpenses(advanceId: number, projectId: number): Observable<ApiEnvelope<AvailableAdvanceExpensesDto>> {
    if (environment.advances.useMock) {
      const record = getAdvanceDetail(advanceId);
      if (!record) {
        return of<ApiEnvelope<AvailableAdvanceExpensesDto>>({
          succeeded: false,
          message: 'Advance not found.',
        }).pipe(delay(this.mockLatency));
      }

      const locked = getLockedExpenseIds();
      return this.expenseService.getByProjectStageId(record.project_stage_id, projectId).pipe(
        map((res) => {
          const all = res.succeeded && res.data?.data ? res.data.data : [];
          const available = all.filter((e) => (e.id ?? 0) > 0 && !locked.has(e.id!));
          return {
            succeeded: true,
            data: {
              advance_no: record.advance_no,
              remaining_balance: record.remaining_balance,
              currency: record.currency,
              expenses: available.map((e) => this.toAdvanceExpenseDto(e)),
            },
          } as ApiEnvelope<AvailableAdvanceExpensesDto>;
        })
      );
    }

    // REAL API:
    //   return this.advanceClient.getAvailableExpenses(advanceId);
    return this.notImplemented('getAvailableExpenses');
  }

  /**
   * `selectedExpenses` is only consumed by the mock (to compute totals and
   * lock the right ids). The real endpoint only needs `command.expenseIds` —
   * the server already knows each expense's amount.
   */
  settle(
    command: SettleAdvanceCommand,
    selectedExpenses: { id: number; expenseNo: string; amount: number; date: string }[]
  ): Observable<ApiEnvelope<boolean>> {
    if (environment.advances.useMock) {
      const result = settleAdvance(command.id, selectedExpenses);
      return of<ApiEnvelope<boolean>>(
        result.ok ? { succeeded: true, data: true } : { succeeded: false, message: result.message }
      ).pipe(delay(this.mockLatency));
    }

    // REAL API:
    //   return this.advanceClient.settle(command.id, new SettleAdvanceCommand({ expenseIds: command.expenseIds }));
    return this.notImplemented('settle');
  }

  getEngineers(): Observable<ApiEnvelope<EngineerLookupDto[]>> {
    if (environment.advances.useMock) {
      return of<ApiEnvelope<EngineerLookupDto[]>>({ succeeded: true, data: MOCK_ENGINEERS }).pipe(
        delay(this.mockLatency)
      );
    }

    // REAL API — try the generic lookup endpoint first, matching every other
    // dropdown in this app:
    //   return this.lookupClient.getAllLookups(['engineer']).pipe(map(...));
    return this.notImplemented('getEngineers');
  }

  /** Whether an expense is locked because it has been settled against an advance. */
  isExpenseLocked(expenseId: number | undefined | null): boolean {
    if (!expenseId) return false;
    return getLockedExpenseIds().has(expenseId);
  }

  statusSeverity(status: AdvanceDetailDto['status']) {
    return advanceStatusSeverity(status);
  }

  private toAdvanceExpenseDto(e: GetExpenseDto) {
    return {
      id: e.id!,
      expense_no: e.expenseNo ?? '—',
      // The live Expense entity has no "type" field; supplier name is the
      // closest available classification until the backend defines one.
      type: e.supplierName ?? '—',
      amount: e.totalAmount ?? 0,
      date: e.expenseDate ? new Date(e.expenseDate).toISOString() : new Date().toISOString(),
      status: 'Available',
    };
  }

  private notImplemented<T>(operation: string): Observable<ApiEnvelope<T>> {
    return throwError(
      () =>
        new Error(
          `AdvanceApiService.${operation}: real backend not wired yet. ` +
            `Set environment.advances.useMock = true or implement the REAL API block.`
        )
    );
  }
}
