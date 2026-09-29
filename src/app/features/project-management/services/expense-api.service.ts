import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ExpenseClient,
  CreateExpenseCommand,
  GetExpenseDtoListPagedResponseResponse,
  GetExpenseDtoResponse,
  BooleanResponse,
  SetExpensePaidCommand,
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root',
})
export class ExpenseApiService {
  constructor(private expenseClient: ExpenseClient) {}

  createOrUpdate(command: CreateExpenseCommand): Observable<BooleanResponse> {
    return this.expenseClient.createOrUpdate(command);
  }

  delete(id: number): Observable<void> {
    return this.expenseClient.delete(id, true);
  }

  getByProjectStageId(
    projectStageId: number,
    pageNumber: number = 1,
    pageSize: number = 100
  ): Observable<GetExpenseDtoListPagedResponseResponse> {
    return this.expenseClient.getByProjectId(projectStageId, undefined, pageNumber, pageSize, undefined);
  }

  /** PATCH /api/Expense/{id}/paid */
  setPaid(id: number, paid: boolean): Observable<void> {
    return this.expenseClient.setPaid(id, new SetExpensePaidCommand({ id, paid }));
  }

  getById(id: number): Observable<GetExpenseDtoResponse> {
    return this.expenseClient.getById(id);
  }
}
