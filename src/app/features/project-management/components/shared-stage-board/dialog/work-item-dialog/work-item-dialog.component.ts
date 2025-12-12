import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig, DialogService } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { SubtaskDialogComponent, SubTaskFormData } from '../subtask-dialog/subtask-dialog.component';
import { TaskService } from '../../../../services/task.service';

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
  title: string;
  type: string;
  taskTypeId?: number;
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

  subtasks = signal<SubTask[]>([]);
  isLoadingTaskTypes = signal(false);

  formData = signal<WorkItemFormData>({
    title: '',
    type: 'Task',
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
      this.formData.set({ ...data.workItem });
      this.subtasks.set(data.workItem.subtasks || []);
    }
    
    // Load task types from API
    this.loadTaskTypes();
  }

  /**
   * Store task type mapping (name -> id)
   */
  private taskTypeMap = new Map<string, number>();

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
          this.workItemTypes = response.data.data.map(type => {
            const name = type.name || '';
            const id = type.id || 0;
            this.taskTypeMap.set(name, id);
            return {
              label: name,
              value: name
            };
          });
          
          // Set default task type if available and not already set
          if (this.workItemTypes.length > 0 && !this.formData().type) {
            const defaultType = this.workItemTypes[0].value;
            this.updateFormField('type', defaultType);
            this.updateFormField('taskTypeId', this.taskTypeMap.get(defaultType));
          }
        }
        this.isLoadingTaskTypes.set(false);
      },
      error: (error) => {
        console.error('Error loading task types:', error);
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
    
    const dataWithSubtasks = {
      ...data,
      subtasks: this.subtasks()
    };
    
    this.dialogRef.close(dataWithSubtasks);
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
    console.log('🔍 Work Item Dialog - openAddSubtaskDialog - Full form data:', currentFormData);
    console.log('🔍 Work Item Dialog - openAddSubtaskDialog - projectStageId:', currentFormData.projectStageId);
    console.log('🔍 Work Item Dialog - openAddSubtaskDialog - taskTypeId:', currentFormData.taskTypeId);
    console.log('🔍 Work Item Dialog - openAddSubtaskDialog - id:', currentFormData.id);
    
    // Use projectStageId (the correct field for subtask creation)
    // Fallback to taskTypeId, then to parsed task ID if needed
    const stageTaskId = currentFormData.projectStageId || currentFormData.taskTypeId || (currentFormData.id ? parseInt(currentFormData.id) : undefined);
    console.log('✅ Work Item Dialog - Resolved projectStageTaskId (Stage ID):', stageTaskId);
    
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Add Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'add',
        projectStageTaskId: stageTaskId,
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
        // Subtask created successfully via API
        // Parent component will handle refresh
      }
    });
  }

  openEditSubtaskDialog(subtask: SubTask): void {
    const currentFormData = this.formData();
    const stageTaskId = currentFormData.projectStageId || currentFormData.taskTypeId || (currentFormData.id ? parseInt(currentFormData.id) : undefined);
    console.log('✅ Work Item Dialog - openEditSubtaskDialog - Resolved projectStageTaskId (Stage ID):', stageTaskId);
    
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Edit Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'edit',
        projectStageTaskId: stageTaskId,
        subtask: subtask,
        parentTaskTitle: currentFormData.title
      }
    });

    dialogRef.onClose.subscribe((result: any) => {
      if (result && result.success) {
        // Subtask updated successfully via API
        // Parent component will handle refresh
      }
    });
  }

  deleteSubtask(subtaskId: string): void {
    this.subtasks.update(subtasks => subtasks.filter(st => st.id !== subtaskId));
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
