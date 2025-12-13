import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  SubTaskClient, 
  CreateSubTaskCommand, 
  ProjectSubTaskDtoResponse,
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
   * Delete a subtask
   * @param id The subtask ID to delete
   * @returns Observable of boolean response indicating success
   */
  deleteSubTask(id: number): Observable<BooleanResponse> {
    const command = new DeleteSubTaskCommand({ id });
    return this.subTaskClient.deleteSubTask(command);
  }
}
