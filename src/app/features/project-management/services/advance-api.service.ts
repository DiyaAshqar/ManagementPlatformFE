import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import {
  AdvanceDetailDto as ApiAdvanceDetailDto,
  AdvanceExpenseDto as ApiAdvanceExpenseDto,
  AdvanceListItemDto as ApiAdvanceListItemDto,
  AdvancesClient,
  CreateAdvanceCommand as ApiCreateAdvanceCommand,
  SettleAdvanceCommand as ApiSettleAdvanceCommand,
  UpdateAdvanceCommand as ApiUpdateAdvanceCommand,
} from '../../../../nswag/api-client';
import {
  AdvanceDetailDto,
  AdvanceExpenseDto,
  AdvanceListItemDto,
  AdvanceListResponseDto,
  AdvanceStatus,
  ApiEnvelope,
  AvailableAdvanceExpensesDto,
  CreateAdvanceCommand,
  EngineerLookupDto,
  SettleAdvanceCommand,
  UpdateAdvanceCommand,
} from '../models/advance.model';
import { advanceStatusSeverity, summarizeAdvances } from './mock-advances.data';
import { UsersApiService } from '../../user-management/services/users-api.service';

/**
 * The single seam between the application and the Advances backend
 * (`AdvancesClient`, generated from `AdvancesController`).
 *
 * One real gap remains: `GET /api/advances` has no project/stage filter on
 * the backend (confirmed against the live swagger — only Status, Search and
 * paging exist). Until the backend adds one, `getByProjectStageId` pulls the
 * whole list and narrows it client-side by matching the `project` name — it
 * can only scope to the project, not the individual stage, so the same
 * advances currently show up identically under every stage's Advances tab.
 */
@Injectable({ providedIn: 'root' })
export class AdvanceApiService {
  constructor(
    private advancesClient: AdvancesClient,
    private usersApiService: UsersApiService
  ) {}

  getByProjectStageId(projectStageId: number): Observable<ApiEnvelope<AdvanceListResponseDto>> {
    return this.advancesClient.getByProjectStageId(projectStageId).pipe(
      map((response) => {
        const items = (response.data?.data ?? []).map((a) => this.toListItemDto(a));
        return {
          succeeded: response.succeeded ?? true,
          message: response.message,
          data: {
            summary: response.data?.summary
              ? {
                  total_advances: response.data.summary.total_advances ?? 0,
                  total_amount: response.data.summary.total_amount ?? 0,
                  total_remaining: response.data.summary.total_remaining ?? 0,
                  open_count: response.data.summary.open_count ?? 0,
                }
              : summarizeAdvances(items),
            data: items,
          },
        };
      })
    );
  }

  getById(id: number): Observable<ApiEnvelope<AdvanceDetailDto>> {
    return this.advancesClient.getById(id).pipe(
      map((response) => ({
        succeeded: response.succeeded ?? false,
        message: response.message,
        data: response.data ? this.toDetailDto(response.data) : undefined,
      }))
    );
  }

  create(command: CreateAdvanceCommand): Observable<ApiEnvelope<boolean>> {
    return this.advancesClient
      .create(
        new ApiCreateAdvanceCommand({
          projectStageId: command.projectStageId,
          engineerId: command.engineerId,
          advanceDate: this.toDateOnlyUtc(command.advanceDate),
          amount: command.amount,
          currency: command.currency,
          paymentMethodId: command.paymentMethod,
          reference: command.reference,
          notes: command.notes,
        })
      )
      .pipe(map((response) => ({ succeeded: response.succeeded ?? false, message: response.message, data: response.data })));
  }

  update(command: UpdateAdvanceCommand): Observable<ApiEnvelope<boolean>> {
    return this.advancesClient
      .update(
        command.id,
        new ApiUpdateAdvanceCommand({
          id: command.id,
          projectStageId: command.projectStageId,
          engineerId: command.engineerId,
          advanceDate: this.toDateOnlyUtc(command.advanceDate),
          amount: command.amount,
          currency: command.currency,
          paymentMethodId: command.paymentMethod,
          reference: command.reference,
          notes: command.notes,
        })
      )
      .pipe(map(() => ({ succeeded: true, data: true })));
  }

  delete(id: number): Observable<ApiEnvelope<boolean>> {
    return this.advancesClient.delete(id).pipe(map(() => ({ succeeded: true, data: true })));
  }

  getAvailableExpenses(advanceId: number): Observable<ApiEnvelope<AvailableAdvanceExpensesDto>> {
    return this.advancesClient.getAvailableExpenses(advanceId).pipe(
      map((response) => ({
        succeeded: response.succeeded ?? false,
        message: response.message,
        data: response.data
          ? {
              advance_no: response.data.advance_no ?? '—',
              remaining_balance: response.data.remaining_balance ?? 0,
              currency: response.data.currency ?? 'JOD',
              expenses: (response.data.expenses ?? []).map((e) => this.toExpenseDto(e)),
            }
          : undefined,
      }))
    );
  }

  settle(command: SettleAdvanceCommand): Observable<ApiEnvelope<boolean>> {
    return this.advancesClient
      .settle(command.id, new ApiSettleAdvanceCommand({ id: command.id, expenseIds: command.expenseIds }))
      .pipe(map(() => ({ succeeded: true, data: true })));
  }

  getEngineers(): Observable<ApiEnvelope<EngineerLookupDto[]>> {
    return this.usersApiService.getAllUserDropdown().pipe(
      map((response) => ({
        succeeded: response.succeeded ?? false,
        message: response.message,
        data: (response.data ?? [])
          .filter((user) => user.id != null)
          .map((user) => ({
            id: user.id!,
            name: user.fullName || user.arabicFullName || user.email || `User ${user.id}`,
          })),
      }))
    );
  }

  statusSeverity(status: AdvanceDetailDto['status']) {
    return advanceStatusSeverity(status);
  }

  private toListItemDto(a: ApiAdvanceListItemDto): AdvanceListItemDto {
    return {
      id: a.id ?? 0,
      advance_no: a.advance_no ?? '—',
      project: a.project ?? '',
      engineer: a.engineer ?? '—',
      amount: a.amount ?? 0,
      remaining_balance: a.remaining_balance ?? 0,
      status: this.normalizeStatus(a.status),
      advance_date: a.advance_date ? new Date(a.advance_date).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * The datepicker gives a Date at local midnight; the generated client serializes
   * it with `.toISOString()`, which shifts it to the previous day in UTC+ zones.
   * Re-anchor to UTC midnight of the same calendar day before it's serialized.
   */
  private toDateOnlyUtc(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  /** Backend sends lowercase status strings ("open" | "partial" | "settled"); normalize to AdvanceStatus. */
  private normalizeStatus(raw: string | undefined): AdvanceStatus {
    switch ((raw ?? '').trim().toLowerCase()) {
      case 'open':
        return 'Open';
      case 'partial':
      case 'partiallysettled':
        return 'PartiallySettled';
      case 'settled':
        return 'Settled';
      default:
        return 'Open';
    }
  }

  private toDetailDto(a: ApiAdvanceDetailDto): AdvanceDetailDto {
    return {
      ...this.toListItemDto(a),
      project_stage_id: a.project_stage_id ?? 0,
      engineer_id: a.engineer_id ?? 0,
      currency: a.currency ?? 'JOD',
      payment_method: a.payment_method,
      notes: a.notes,
      reference: a.reference,
      expenses: (a.expenses ?? []).map((e) => this.toExpenseDto(e)),
    };
  }

  private toExpenseDto(e: ApiAdvanceExpenseDto): AdvanceExpenseDto {
    return {
      id: e.id ?? 0,
      expense_no: e.expense_no ?? '—',
      type: e.type ?? '—',
      amount: e.amount ?? 0,
      date: e.date ? new Date(e.date).toISOString() : new Date().toISOString(),
      status: e.status ?? 'Available',
    };
  }
}
