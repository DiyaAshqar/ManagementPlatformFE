import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Task, TaskStatus, TaskPriority } from '../../models';

export interface AddTaskFormData {
  title: string;
  description: string;
  assignTo?: string;
  startDate?: Date;
  endDate?: Date;
  priority: string;
  taskPoints?: number;
  location?: string;
  depth?: number;
  volume?: number;
  soilType?: string;
  equipment?: string;
  projectStageId: number;
  taskTypeId: number;
}

@Component({
  selector: 'app-add-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ButtonModule,
    InputNumberModule,
    CalendarModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './add-task-dialog.component.html',
  styleUrls: ['./add-task-dialog.component.scss']
})
export class AddTaskDialogComponent implements OnInit {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  isLoadingTaskTypes = signal(false);

  formData: AddTaskFormData = {
    title: '',
    description: '',
    assignTo: '',
    priority: 'medium',
    taskPoints: 0,
    location: '',
    depth: 0,
    volume: 0,
    soilType: '',
    equipment: '',
    projectStageId: 0,
    taskTypeId: 1
  };

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  taskTypeOptions: { label: string; value: number }[] = [];

  soilTypeOptions = [
    { label: 'Clay', value: 'Clay' },
    { label: 'Sand', value: 'Sand' },
    { label: 'Rock', value: 'Rock' },
    { label: 'Soil', value: 'Soil' },
    { label: 'Mixed', value: 'Mixed' }
  ];

  ngOnInit(): void {
    if (this.config.data) {
      this.formData = {
        ...this.formData,
        ...this.config.data
      };
    }
    
    // Load task types from API
    this.loadTaskTypes();
  }

  /**
   * Load task types from API
   */
  private loadTaskTypes(): void {
    this.isLoadingTaskTypes.set(true);
    
    this.taskService.getTaskTypes(1, 100).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.taskTypeOptions = response.data.data.map(type => ({
            label: type.name || '',
            value: type.id || 0
          }));
          
          // Set default task type if available
          if (this.taskTypeOptions.length > 0 && !this.formData.taskTypeId) {
            this.formData.taskTypeId = this.taskTypeOptions[0].value;
          }
        }
        this.isLoadingTaskTypes.set(false);
      },
      error: (error) => {
        console.error('Error loading task types:', error);
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Failed to load task types from API'
        });
        // Fallback to default options
        this.taskTypeOptions = [
          { label: 'Task', value: 1 },
          { label: 'Bug', value: 2 },
          { label: 'Feature', value: 3 }
        ];
        this.isLoadingTaskTypes.set(false);
      }
    });
  }

  save(): void {
    if (!this.formData.title) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter a task title'
      });
      return;
    }

    if (!this.formData.projectStageId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a project stage'
      });
      return;
    }

    this.isLoading.set(true);

    // Create the task object to pass back
    const newTask: Omit<Task, 'id'> = {
      title: this.formData.title,
      name: this.formData.title,
      description: this.formData.description || '',
      stageId: `stage-${this.formData.projectStageId}`,
      assignedTo: this.formData.assignTo || '',
      status: TaskStatus.TODO,
      priority: (this.formData.priority as TaskPriority) || TaskPriority.MEDIUM,
      dueDate: this.formData.endDate,
      completedDate: undefined,
      progress: 0,
      estimatedHours: this.formData.taskPoints || 0,
      startDate: this.formData.startDate,
      location: this.formData.location,
      depth: this.formData.depth,
      volume: this.formData.volume,
      soilType: this.formData.soilType,
      equipment: this.formData.equipment,
      dependencies: [],
      attachments: []
    };

    // Close dialog and pass the data
    this.dialogRef.close({
      task: newTask,
      projectStageId: this.formData.projectStageId,
      taskTypeId: this.formData.taskTypeId
    });

    this.isLoading.set(false);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
