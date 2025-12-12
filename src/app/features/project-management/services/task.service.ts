import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskClient, GetProjectTaskDtoListPagedResponseResponse } from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private taskClient: TaskClient) { }

  /**
   * Get all tasks with pagination and filtering
   * @param pageNumber Page number (default: 1)
   * @param pageSize Page size (default: 100)
   * @param filter Optional filter string
   * @returns Observable of paginated task response
   */
  getAllTasks(
    pageNumber: number = 1, 
    pageSize: number = 100, 
    filter?: string
  ): Observable<GetProjectTaskDtoListPagedResponseResponse> {
    return this.taskClient.getAllTasks(pageNumber, pageSize, filter);
  }

  /**
   * Get tasks filtered by project stage ID
   * @param stageId The project stage ID to filter by
   * @param pageNumber Page number (default: 1)
   * @param pageSize Page size (default: 100)
   * @returns Observable of paginated task response
   */
  getTasksByStageId(
    stageId: number,
    pageNumber: number = 1,
    pageSize: number = 100
  ): Observable<GetProjectTaskDtoListPagedResponseResponse> {
    return this.taskClient.getAllTasksByStageId(stageId, pageNumber, pageSize, undefined);
  }
}
