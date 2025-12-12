import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TaskClient, GetProjectTaskDtoListPagedResponseResponse, CreateTaskCommand, BooleanResponse, ResultListPagedResponseResponse, StatusTask } from '../../../../nswag/api-client';

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

  /**
   * Create a new task via API
   * @param taskCommand The task command with all required fields
   * @returns Observable of boolean response indicating success
   */
  createTask(taskCommand: CreateTaskCommand): Observable<BooleanResponse> {
    return this.taskClient.createTask(taskCommand);
  }

  /**
   * Get all task types from API
   * @param pageNumber Page number (default: 1)
   * @param pageSize Page size (default: 100)
   * @param filter Optional filter string
   * @returns Observable of paginated task types response
   */
  getTaskTypes(
    pageNumber: number = 1,
    pageSize: number = 100,
    filter?: string
  ): Observable<ResultListPagedResponseResponse> {
    return this.taskClient.getTaskTypes(pageNumber, pageSize, filter);
  }

  /**
   * Update task status
   * @param taskId The ID of the task to update
   * @param status The new status for the task
   * @returns Observable of boolean response indicating success
   */
  updateTaskStatus(taskId: number, status: StatusTask): Observable<BooleanResponse> {
    return this.taskClient.updateStatus(taskId, status);
  }
}
