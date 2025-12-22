import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ICreateTaskCommand, ProjectStatusSubTask, ProjectSubTaskDto } from '../../../../../../../nswag/api-client';
import { SubtaskApiService } from '../../../../services/subtask-api.service';
import { TaskService } from '../../../../services/task.service';
import { SubtaskDialogComponent } from '../subtask-dialog/subtask-dialog.component';

@Component({
  selector: 'app-work-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    DatePickerModule
  ],
  templateUrl: './work-item-dialog.component.html',
  styleUrls: ['./work-item-dialog.component.scss']
})
export class WorkItemDialogComponent implements OnInit {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private dialogService = inject(DialogService);
  private taskService = inject(TaskService);
  private subtaskApiService = inject(SubtaskApiService);
  private messageService = inject(MessageService);

  subtasks = signal<ProjectSubTaskDto[]>([]);
  isLoadingTaskTypes = signal(false);
  isLoadingSubtasks = signal(false);
  projectStageId = signal<number | undefined>(undefined);
  
  // Computed signal to determine if excavation fields should be shown
  // Excavation fields are only shown for Excavation stage (stageType 2)
  // Hidden for Preparing stage (stageType 1) and other stages
  shouldShowExcavationFields = signal(true);

  // Using ICreateTaskCommand from API with UI extensions
  formData = signal<ICreateTaskCommand & { backendTaskId?: number; type?: string; tags?: string[]; subtasks?: ProjectSubTaskDto[] }>({
    title: '',
    type: 'Task',
    backendTaskId: undefined,
    taskTypeId: undefined,
    priority: undefined,
    assignTo: undefined,
    taskPoint: undefined,
    tags: [],
    description: '',
    startDate: undefined,
    endDate: undefined,
    excavationLocation: '',
    excavationDepth: undefined,
    excavationVolume: undefined,
    excavationSoilType: '',
    excavationEquipment: '',
    status: undefined,
    projectStageId: undefined,
    subtasks: []
  });

  workItemTypes: { label: string; value: string }[] = [];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  ngOnInit(): void {
    const data = this.config.data;
    if (data && data.workItem) {
      // Convert date strings to Date objects for p-datepicker
      const workItemData = { ...data.workItem };
      if (workItemData.startDate && typeof workItemData.startDate === 'string') {
        workItemData.startDate = new Date(workItemData.startDate);
      }
      if (workItemData.endDate && typeof workItemData.endDate === 'string') {
        workItemData.endDate = new Date(workItemData.endDate);
      }
      
      // Map taskPoints (plural from WorkItem) to taskPoint (singular for ICreateTaskCommand)
      if (workItemData.taskPoints !== undefined) {
        workItemData.taskPoint = workItemData.taskPoints;
      }
      
      this.formData.set(workItemData);
      
      // Load subtasks from API if in edit mode and backendTaskId is available
      if (data.mode === 'edit' && workItemData.backendTaskId) {
        this.loadSubtasks(workItemData.backendTaskId);
      } else {
        this.subtasks.set(data.workItem.subtasks || []);
      }
    }
    
    // Get projectStageId from config data
    if (data && data.projectStageId !== undefined) {
      this.projectStageId.set(data.projectStageId);
    }
    
    // Get showExcavationFields flag from config data
    if (data && data.showExcavationFields !== undefined) {
      this.shouldShowExcavationFields.set(data.showExcavationFields);
    } else {
      // Default to false (hide excavation fields) if not specified
      this.shouldShowExcavationFields.set(false);
    }
    
    // Load task types from API
    this.loadTaskTypes();
  }

  /**
   * Store task type mapping (name -> id)
   */
  private taskTypeMap = new Map<string, number>();

  /**
   * Load subtasks for a specific task from API
   */
  private loadSubtasks(taskId: number): void {
    this.isLoadingSubtasks.set(true);

    this.subtaskApiService.getSubTasksByTaskId(taskId).subscribe({
      next: (response) => {
        if (response.succeeded && response.data) {
          // Use API response directly (ProjectSubTaskDto[])
          this.subtasks.set(response.data);
        }
        this.isLoadingSubtasks.set(false);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load subtasks'
        });
        this.isLoadingSubtasks.set(false);
      }
    });
  }

  /**
   * Load task types from API
   */
  private loadTaskTypes(): void {
    this.isLoadingTaskTypes.set(true);
    
    this.taskService.getTaskTypes(1, 100).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          // Build the task type map and options
          this.taskTypeMap.clear();
          const taskTypeIdToName = new Map<number, string>();
          
          this.workItemTypes = response.data.data.map(type => {
            const name = type.name || '';
            const id = type.id || 0;
            this.taskTypeMap.set(name, id);
            taskTypeIdToName.set(id, name);
            return {
              label: name,
              value: name
            };
          });
          
          // If in edit mode and taskTypeId is set, load the type name
          const currentFormData = this.formData();
          if (currentFormData.taskTypeId) {
            const typeName = taskTypeIdToName.get(currentFormData.taskTypeId);
            if (typeName) {
              this.updateFormField('type', typeName);
            }
          }
          // Set default task type if available and not already set
          else if (this.workItemTypes.length > 0 && !currentFormData.type) {
            const defaultType = this.workItemTypes[0].value;
            const defaultTypeId = this.taskTypeMap.get(defaultType);
            this.updateFormField('type', defaultType);
            this.updateFormField('taskTypeId', defaultTypeId);
          }
        }
        this.isLoadingTaskTypes.set(false);
      },
      error: (error) => {
        this.isLoadingTaskTypes.set(false);
      }
    });
  }

  /**
   * Handle task type change and update taskTypeId
   */
  onTaskTypeChange(typeName: string): void {
    this.updateFormField('type', typeName);
    this.updateFormField('taskTypeId', this.taskTypeMap.get(typeName));
  }

  onSave(): void {
    const data = this.formData();
    
    if (!data.title) {
      return;
    }
    
    // Convert dates to local timezone format using date-fns
    const dataToSave = {
      ...data,
      startDate: this.formatDateForApi(data.startDate),
      endDate: this.formatDateForApi(data.endDate),
      subtasks: this.subtasks()
    };
    
    this.dialogRef.close(dataToSave);
  }
  
  /**
   * Format date for API using date-fns
   * Formats date as ISO string without timezone conversion
   */
  private formatDateForApi(date: any): string | undefined {
    if (!date) return undefined;
    
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return undefined;
      
      // Format as ISO date-time without timezone (YYYY-MM-DDTHH:mm:ss)
      return format(d, "yyyy-MM-dd'T'HH:mm:ss");
    } catch (error) {
      return undefined;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get currentFormData(): ICreateTaskCommand & { backendTaskId?: number; type?: string; tags?: string[]; subtasks?: ProjectSubTaskDto[] } {
    return this.formData();
  }

  updateFormField(field: string, value: any): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  openAddSubtaskDialog(): void {
    const currentFormData = this.formData();

    // Use backendTaskId (the actual task ID from the backend) or use the id field directly
    const taskId = currentFormData.backendTaskId || currentFormData.id;
    
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Add Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'add',
        projectStageTaskId: taskId,
        subtask: {
          title: '',
          startDate: '',
          endDate: '',
          status: 'pending',
          type: '',
          cost: '',
          quantity: ''
        },
        parentTaskTitle: this.formData().title
      }
    });

    dialogRef.onClose.subscribe((result: any) => {
      if (result && result.success) {
        // Subtask created successfully via API, reload subtasks
        if (taskId) {
          this.loadSubtasks(taskId);
        }
      }
    });
  }

  openEditSubtaskDialog(subtask: ProjectSubTaskDto): void {
    const currentFormData = this.formData();
    const taskId = currentFormData.backendTaskId || currentFormData.id;
    
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Edit Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'edit',
        projectStageTaskId: taskId,
        subtask: subtask,
        parentTaskTitle: currentFormData.title
      }
    });

    dialogRef.onClose.subscribe((result: any) => {
      if (result && result.success) {
        // Subtask updated successfully via API, reload subtasks
        if (taskId) {
          this.loadSubtasks(taskId);
        }
      }
    });
  }

  deleteSubtask(subtaskId: string | number): void {
    const numericId = typeof subtaskId === 'string' ? parseInt(subtaskId, 10) : subtaskId;
    
    if (isNaN(numericId)) {
      return;
    }

    this.subtaskApiService.deleteSubTask(numericId).subscribe({
      next: (response) => {
        if (response.succeeded) {
          this.subtasks.update(subtasks => subtasks.filter(st => st.id !== subtaskId));
        }
      }
    });
  }

  getStatusSeverity(status: ProjectStatusSubTask | undefined): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    // 0 = pending, 1 = in-progress, 2 = completed
    switch (status) {
      case ProjectStatusSubTask._0:
        return 'warning';
      case ProjectStatusSubTask._1:
        return 'info';
      default:
        return 'secondary';
    }
  }

  getStatusLabel(status: ProjectStatusSubTask | undefined): string {
    // 0 = pending, 1 = in-progress, 2 = completed
    switch (status) {
      case ProjectStatusSubTask._0:
        return 'Pending';
      case ProjectStatusSubTask._1:
        return 'In Progress';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format subtask date for display
   * Handles both Date objects and date strings
   */
  formatSubtaskDate(dateValue: any): string {
    if (!dateValue) return '';
    
    try {
      let date: Date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) return '';
      
      // Format as DD/MM/YYYY HH:mm
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return '';
    }
  }
}
