import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  SubTaskClient, 
  CreateSubTaskCommand, 
  ProjectSubTaskDtoResponse,
  ProjectSubTaskDtoListResponse,
  BooleanResponse,
  DeleteSubTaskCommand
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class SubtaskApiService {

  constructor(private subTaskClient: SubTaskClient) { }

  /**
   * Create a new subtask via API
   * @param command The subtask command with all required fields
   * @returns Observable of boolean response indicating success
   */
  createSubTask(command: CreateSubTaskCommand): Observable<BooleanResponse> {
    return this.subTaskClient.createSubTask(command);
  }

  /**
   * Get a subtask by ID
   * @param id The subtask ID
   * @returns Observable of subtask response
   */
  getSubTask(id: number): Observable<ProjectSubTaskDtoResponse> {
    return this.subTaskClient.getSubTask(id);
  }

  /**
   * Get all subtasks for a specific task
   * @param taskId The task ID to get subtasks for
   * @returns Observable of subtask list response
   */
  getSubTasksByTaskId(taskId: number): Observable<ProjectSubTaskDtoListResponse> {
    return this.subTaskClient.getSubTaskByTaskId(taskId);
  }

  /**
   * Delete a subtask
   * @param id The subtask ID to delete
   * @returns Observable of boolean response indicating success
   */
  deleteSubTask(id: number): Observable<BooleanResponse> {
    const command = new DeleteSubTaskCommand({ id });
    return this.subTaskClient.deleteSubTask(command);
  }
}
