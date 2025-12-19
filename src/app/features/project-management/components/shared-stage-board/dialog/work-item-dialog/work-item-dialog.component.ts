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
import { SubtaskApiService } from '../../../../services/subtask-api.service';
import { TaskService } from '../../../../services/task.service';
import { SubtaskDialogComponent } from '../subtask-dialog/subtask-dialog.component';

export interface SubTask {
  id: string | number;
  title: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'in-progress' | 'pending';
  type: string;
  cost: string;
  quantity: string;
}

export interface WorkItemFormData {
  id?: string;
  backendTaskId?: number; // Backend task ID for updates
  title: string;
  type: string;
  taskTypeId?: number; // Task type reference ID
  projectStageId?: number; // Stage ID for subtask creation
  priority: string;
  assignTo: string;
  taskPoints: string;
  tags: string[];
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  depth: string;
  volume: string;
  soilType: string;
  equipment: string;
  status?: string;
  subtasks?: SubTask[];
}

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

  subtasks = signal<SubTask[]>([]);
  isLoadingTaskTypes = signal(false);
  isLoadingSubtasks = signal(false);
  projectStageId = signal<number | undefined>(undefined);
  
  // Computed signal to determine if excavation fields should be shown
  // Excavation fields are only shown for Excavation stage (stageType 2)
  // Hidden for Preparing stage (stageType 1) and other stages
  shouldShowExcavationFields = signal(true);

  formData = signal<WorkItemFormData>({
    title: '',
    type: 'Task',
    backendTaskId: undefined,
    taskTypeId: undefined,
    priority: 'medium',
    assignTo: '',
    taskPoints: '',
    tags: [],
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    depth: '',
    volume: '',
    soilType: '',
    equipment: '',
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
      console.log('🔧 Dialog initialized with data:', {
        mode: data.mode,
        type: workItemData.type,
        taskTypeId: workItemData.taskTypeId,
        startDate: workItemData.startDate,
        endDate: workItemData.endDate,
        backendTaskId: workItemData.backendTaskId
      });
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
    console.log('🔄 Loading subtasks for task ID:', taskId);
    this.isLoadingSubtasks.set(true);

    this.subtaskApiService.getSubTasksByTaskId(taskId).subscribe({
      next: (response) => {
        console.log('✅ Subtasks loaded:', response);
        if (response.succeeded && response.data) {
          // Map API response to SubTask interface
          const subtasks: SubTask[] = response.data.map(subtask => ({
            id: subtask.id || 0,
            title: subtask.title || '',
            startDate: subtask.startDate ? new Date(subtask.startDate).toISOString().split('T')[0] : '',
            endDate: subtask.endDate ? new Date(subtask.endDate).toISOString().split('T')[0] : '',
            status: this.mapApiStatusToSubtaskStatus(subtask.status),
            type: this.mapApiTypeToString(subtask.type),
            cost: subtask.cost ? `$${subtask.cost}` : '',
            quantity: subtask.qty ? `${subtask.qty}` : ''
          }));
          
          this.subtasks.set(subtasks);
          console.log('📋 Subtasks set:', subtasks);
        }
        this.isLoadingSubtasks.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load subtasks:', error);
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
   * Map API status enum to SubTask status
   */
  private mapApiStatusToSubtaskStatus(status: any): 'completed' | 'in-progress' | 'pending' {
    // Assuming: 0 = pending, 1 = in-progress, 2 = completed
    switch (status) {
      case 0:
        return 'pending';
      case 1:
        return 'in-progress';
      case 2:
        return 'completed';
      default:
        return 'pending';
    }
  }

  /**
   * Map API type enum to string
   */
  private mapApiTypeToString(type: any): string {
    // Assuming: 0 = Excavation, 1 = Preparation, etc.
    switch (type) {
      case 0:
        return 'Excavation';
      case 1:
        return 'Preparation';
      default:
        return `Type ${type}`;
    }
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
              console.log('🔍 Setting type from taskTypeId:', currentFormData.taskTypeId, '-> ', typeName);
              this.updateFormField('type', typeName);
            }
          }
          // Set default task type if available and not already set
          else if (this.workItemTypes.length > 0 && !currentFormData.type) {
            const defaultType = this.workItemTypes[0].value;
            const defaultTypeId = this.taskTypeMap.get(defaultType);
            console.log('🔍 Setting default type:', defaultType, 'ID:', defaultTypeId);
            this.updateFormField('type', defaultType);
            this.updateFormField('taskTypeId', defaultTypeId);
          }
        }
        this.isLoadingTaskTypes.set(false);
      },
      error: (error) => {
        console.error('❌ Failed to load task types:', error);
        // Fallback to default options
        this.workItemTypes = [
          { label: 'User Story', value: 'User Story' },
          { label: 'Bug', value: 'Bug' },
          { label: 'Task', value: 'Task' },
          { label: 'Epic', value: 'Epic' },
          { label: 'Feature', value: 'Feature' }
        ];
        this.taskTypeMap.set('Task', 1);
        this.taskTypeMap.set('Bug', 2);
        this.taskTypeMap.set('Feature', 3);
        
        // Set default if no type is set
        const currentFormData = this.formData();
        if (!currentFormData.type && this.workItemTypes.length > 0) {
          const defaultType = this.workItemTypes[2].value; // 'Task'
          console.log('🔧 Setting fallback default type:', defaultType);
          this.updateFormField('type', defaultType);
          this.updateFormField('taskTypeId', this.taskTypeMap.get(defaultType));
        }
        
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
    
    console.log('💾 Saving with local dates:', {
      startDate: dataToSave.startDate,
      endDate: dataToSave.endDate
    });
    
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
      console.error('Error formatting date:', error);
      return undefined;
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get currentFormData(): WorkItemFormData {
    return this.formData();
  }

  updateFormField(field: keyof WorkItemFormData, value: any): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  openAddSubtaskDialog(): void {
    const currentFormData = this.formData();

    // Use backendTaskId (the actual task ID from the backend) or parse the id field
    const taskId = currentFormData.backendTaskId || (currentFormData.id ? parseInt(currentFormData.id) : undefined);
    
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

  openEditSubtaskDialog(subtask: SubTask): void {
    const currentFormData = this.formData();
    const taskId = currentFormData.backendTaskId || (currentFormData.id ? parseInt(currentFormData.id) : undefined);
    
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
          console.log('✅ Subtask deleted:', numericId);
        }
      },
      error: (error) => {
        console.error('❌ Failed to delete subtask:', error);
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      'completed': 'success',
      'in-progress': 'info',
      'pending': 'warning'
    };
    return severityMap[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'completed': 'Completed',
      'in-progress': 'In Progress',
      'pending': 'Pending'
    };
    return labelMap[status] || status;
  }
}
