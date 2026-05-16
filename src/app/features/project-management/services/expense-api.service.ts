import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ExpenseClient,
  CreateExpenseCommand,
  GetExpenseDtoListPagedResponseResponse,
  GetExpenseDtoResponse,
  BooleanResponse,
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root',
})
export class ExpenseApiService {
  constructor(private expenseClient: ExpenseClient) {}

  createOrUpdate(command: CreateExpenseCommand): Observable<BooleanResponse> {
    return this.expenseClient.createOrUpdate(command);
  }

  delete(id: number): Observable<BooleanResponse> {
    return this.expenseClient.delete(id);
  }

  getByProjectStageId(
    projectStageId: number,
    pageNumber: number = 1,
    pageSize: number = 100
  ): Observable<GetExpenseDtoListPagedResponseResponse> {
    return this.expenseClient.getByProjectId(projectStageId, pageNumber, pageSize, undefined);
  }

  getById(id: number): Observable<GetExpenseDtoResponse> {
    return this.expenseClient.getById(id);
  }
}
