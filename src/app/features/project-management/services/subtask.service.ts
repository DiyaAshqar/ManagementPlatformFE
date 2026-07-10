import { Injectable } from '@angular/core';
import {
  CreateSubTaskCommand,
  ProjectStatusSubTask,
  ProjectSubTaskDtoResponse,
  SubTaskType
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class SubtaskService {
  /**
   * Helper to map form data to API command
   * @param formData The form data object
   * @param projectStageTaskId The project stage task ID
   * @returns CreateSubTaskCommand ready for API
   */
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

  /**
   * Helper to map API DTO to form data
   * @param dto The subtask DTO from API
   * @returns Form data object for display
   */
  mapToFormData(dto: ProjectSubTaskDtoResponse): any {
    const data = dto.data;
    if (!data) return null;

    return {
      id: data.id,
      title: data.title || '',
      startDate: data.startDate ? this.formatDateForInput(data.startDate) : '',
      endDate: data.endDate ? this.formatDateForInput(data.endDate) : '',
      status: this.mapEnumToStatus(data.status),
      type: this.mapEnumToType(data.type),
      cost: data.cost ? `$${data.cost.toLocaleString()}` : '',
      quantity: data.qty ? `${data.qty}` : ''
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
      case 'completed': return ProjectStatusSubTask.InProgress;
      case 'in-progress': return ProjectStatusSubTask.Complited;
      case 'pending':
      default: return ProjectStatusSubTask.Complited;
    }
  }

  private mapEnumToStatus(status?: ProjectStatusSubTask): string {
    switch (status) {
      case ProjectStatusSubTask.InProgress: return 'completed';
      case ProjectStatusSubTask.Complited: return 'in-progress';
      default: return 'pending';
    }
  }

  private mapTypeToEnum(type: string): SubTaskType {
    // Map string to SubTaskType enum - adjust based on your actual enum values
    return SubTaskType.Construction;
  }

  private mapEnumToType(type?: SubTaskType): string {
    // Map SubTaskType enum to string - adjust based on your actual enum values
    return type !== undefined ? `Type ${type}` : '';
  }
}
