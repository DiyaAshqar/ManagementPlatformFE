import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  SubTaskClient, 
  CreateSubTaskCommand, 
  ProjectSubTaskDto,
  ProjectSubTaskDtoResponse,
  BooleanResponse,
  DeleteSubTaskCommand,
  ProjectStatusSubTask,
  SubTaskType
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class SubtaskService {
  private subTaskClient = inject(SubTaskClient);

  createSubTask(command: CreateSubTaskCommand): Observable<boolean> {
    return this.subTaskClient.createSubTask(command).pipe(
      map((response: BooleanResponse) => response.data ?? false)
    );
  }

  getSubTask(id: number): Observable<ProjectSubTaskDto | undefined> {
    return this.subTaskClient.getSubTask(id).pipe(
      map((response: ProjectSubTaskDtoResponse) => response.data)
    );
  }

  deleteSubTask(id: number): Observable<boolean> {
    const command = new DeleteSubTaskCommand({ id });
    return this.subTaskClient.deleteSubTask(command).pipe(
      map((response: BooleanResponse) => response.data ?? false)
    );
  }

  // Helper to map form data to API command
  mapToCreateCommand(formData: any, projectStageTaskId: number): CreateSubTaskCommand {
    return new CreateSubTaskCommand({
      id: formData.id,
      title: formData.title,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      status: this.mapStatusToEnum(formData.status),
      type: this.mapTypeToEnum(formData.type),
      cost: formData.cost ? parseFloat(formData.cost.replace(/[^0-9.-]/g, '')) : undefined,
      qty: formData.quantity ? parseFloat(formData.quantity.replace(/[^0-9.-]/g, '')) : undefined,
      projectStageTaskId
    });
  }

  // Helper to map API DTO to form data
  mapToFormData(dto: ProjectSubTaskDto): any {
    return {
      id: dto.id,
      title: dto.title || '',
      startDate: dto.startDate ? this.formatDateForInput(dto.startDate) : '',
      endDate: dto.endDate ? this.formatDateForInput(dto.endDate) : '',
      status: this.mapEnumToStatus(dto.status),
      type: this.mapEnumToType(dto.type),
      cost: dto.cost ? `$${dto.cost.toLocaleString()}` : '',
      quantity: dto.qty ? `${dto.qty}` : ''
    };
  }

  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapStatusToEnum(status: string): ProjectStatusSubTask {
    switch (status) {
      case 'completed': return ProjectStatusSubTask._1;
      case 'in-progress': return ProjectStatusSubTask._0;
      case 'pending':
      default: return ProjectStatusSubTask._0;
    }
  }

  private mapEnumToStatus(status?: ProjectStatusSubTask): string {
    switch (status) {
      case ProjectStatusSubTask._1: return 'completed';
      case ProjectStatusSubTask._0: return 'in-progress';
      default: return 'pending';
    }
  }

  private mapTypeToEnum(type: string): SubTaskType {
    // Map string to SubTaskType enum - adjust based on your actual enum values
    return SubTaskType._0;
  }

  private mapEnumToType(type?: SubTaskType): string {
    // Map SubTaskType enum to string - adjust based on your actual enum values
    return type !== undefined ? `Type ${type}` : '';
  }
}
