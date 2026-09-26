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
      startDate: this.toUtcDate(formData.startDate),
      endDate: this.toUtcDate(formData.endDate),
      status: this.mapStatusToEnum(formData.status),
      type: this.mapTypeToEnum(formData.type),
      cost: this.toNumber(formData.cost),
      qty: this.toNumber(formData.quantity),
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
      startDate: data.startDate ? this.toLocalDate(data.startDate) : '',
      endDate: data.endDate ? this.toLocalDate(data.endDate) : '',
      status: this.mapEnumToStatus(data.status),
      type: this.mapEnumToType(data.type),
      cost: data.cost != null ? `${data.cost}` : '',
      quantity: data.qty != null ? `${data.qty}` : ''
    };
  }

  /**
   * The picker returns local midnight; the generated client serializes with toISOString(),
   * which shifts the day back in UTC+ time zones. Send the selected calendar day as UTC midnight.
   */
  private toUtcDate(value: string | Date | null | undefined): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (isNaN(d.getTime())) return undefined;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  /** Inverse of toUtcDate: rebuild the calendar day as a local Date the picker can display. */
  private toLocalDate(value: Date | string): Date {
    const d = new Date(value);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }

  private mapStatusToEnum(status: string): ProjectStatusSubTask {
    switch (status) {
      case 'completed': return ProjectStatusSubTask.Complited;
      // Backend only knows InProgress / Complited — anything not completed is in progress.
      case 'in-progress':
      case 'pending':
      default: return ProjectStatusSubTask.InProgress;
    }
  }

  private mapEnumToStatus(status?: ProjectStatusSubTask): string {
    switch (status) {
      case ProjectStatusSubTask.Complited: return 'completed';
      default: return 'in-progress';
    }
  }

  private mapTypeToEnum(type: string): SubTaskType {
    return (Object.values(SubTaskType) as string[]).includes(type) ? (type as SubTaskType) : SubTaskType.Construction;
  }

  private mapEnumToType(type?: SubTaskType): string {
    return type ?? SubTaskType.Construction;
  }
}
