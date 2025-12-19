import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, effect, EventEmitter, inject, Input, OnInit, Output, signal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { parseISO } from 'date-fns';
import { ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

// PrimeNG Imports
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { CreateTaskCommand, StatusTask } from '../../../../../nswag/api-client';
import { TaskService } from '../../services/task.service';
import { SubtaskDialogComponent } from './dialog/subtask-dialog/subtask-dialog.component';
import { WorkItemDialogComponent } from './dialog/work-item-dialog/work-item-dialog.component';

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

export interface WorkItem {
  id: string;
  taskId?: number; // Backend task ID for API operations
  projectStageId?: number; // Stage ID that this task belongs to (needed for subtask creation)
  taskTypeId?: number; // Task type ID from API
  title: string;
  type: WorkItemType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignTo: string;
  assigneeAvatar?: string;
  taskPoints: string;
  tags: string[];
  description: string;
  status: TaskStatus;
  subtasks: SubTask[];
  startDate: string;
  endDate: string;
  location: string;
  depth: string;
  volume: string;
  soilType: string;
  equipment: string;
  createdDate: string;
}

export enum WorkItemType {
  USER_STORY = 'User Story',
  BUG = 'Bug',
  TASK = 'Task',
  EPIC = 'Epic',
  FEATURE = 'Feature'
}

export enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done'
}

export interface Column {
  id: TaskStatus;
  title: string;
  items: WorkItem[];
  wipLimit?: number;
}

@Component({
  selector: 'app-shared-stage-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    TextareaModule,
    AvatarModule,
    AvatarGroupModule,
    ChipModule,
    ProgressBarModule,
    ConfirmDialogModule
  ],
  templateUrl: './shared-stage-board.component.html',
  styleUrls: ['./shared-stage-board.component.scss'],
  providers: [ConfirmationService]
})
export class SharedStageBoardComponent implements OnInit {
  @Input() projectId!: string;
  @Input() projectStageId!: number;
  @Input() stageTitle: string = 'Stage Board';
  @Input() stageDescription: string = 'Manage tasks and activities';
  @Input() showExcavationFields: boolean = false; // Controls visibility of excavation-specific fields
  @Input({ required: true }) columnsInput!: Signal<Column[]>;
  @Output() taskCreated = new EventEmitter<void>();
  @Output() taskUpdated = new EventEmitter<void>();
  @Output() taskDeleted = new EventEmitter<void>();
  
  
  // Internal writable signal for columns (so we can mutate them for drag-drop)
  columns = signal<Column[]>([]);
  
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private dialogRef: DynamicDialogRef | undefined;
  private taskService = inject(TaskService);

  constructor() {
    // Use effect to sync columnsInput to internal columns signal
    effect(() => {
      const inputColumns = this.columnsInput();
      this.columns.set(inputColumns);
    });
  }

  selectedItem = signal<WorkItem | null>(null);
  showItemDialog = signal(false);
  expandedItems = signal<Set<string>>(new Set());
  selectedColumn = signal<TaskStatus | null>(null);

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' }
  ];

  workItemTypes = [
    { label: 'User Story', value: WorkItemType.USER_STORY },
    { label: 'Bug', value: WorkItemType.BUG },
    { label: 'Task', value: WorkItemType.TASK },
    { label: 'Epic', value: WorkItemType.EPIC },
    { label: 'Feature', value: WorkItemType.FEATURE }
  ];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  get totalItems(): number {
    return this.columns().reduce((sum, col) => sum + col.items.length, 0);
  }

  get inProgressCount(): number {
    return this.columns().find(c => c.id === TaskStatus.IN_PROGRESS)?.items.length || 0;
  }

  get completedCount(): number {
    return this.columns().find(c => c.id === TaskStatus.DONE)?.items.length || 0;
  }

  get completionRate(): number {
    if (this.totalItems === 0) return 0;
    return Math.round((this.completedCount / this.totalItems) * 100);
  }

  get connectedDropLists(): string[] {
    return this.columns().map(c => c.id);
  }

  ngOnInit(): void {
    // Component initialization if needed
    // The columnsInput setter will handle syncing the input signal
  }

  onDrop(event: CdkDragDrop<WorkItem[]>, targetColumn: Column): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const item = event.previousContainer.data[event.previousIndex];
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Call API to update task status only
      if (item.taskId) {
        const apiStatus = this.mapTaskStatusToApiStatus(targetColumn.id);
        this.taskService.updateTaskStatus(item.taskId, apiStatus).subscribe({
          next: (response) => {
            if (response.succeeded) {
              console.log('✅ Task status updated successfully');
              // Emit event for parent to reload all tasks
              this.taskUpdated.emit();
            } else {
              console.error('❌ Failed to update task status:', response.message);
            }
          },
          error: (error) => {
            console.error('❌ Error updating task status:', error);
          }
        });
      }
    }
  }

  openItemDialog(item: WorkItem): void {
    this.selectedItem.set(item);
    console.log('🔍 Opening Work Item Dialog - item.taskId:', item.taskId);
    console.log('🔍 Opening Work Item Dialog - item.projectStageId:', item.projectStageId);
    
    this.dialogRef = this.dialogService.open(WorkItemDialogComponent, {
      header: 'Edit Work Item',
      width: '900px',
      height: '900px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'edit',
        showExcavationFields: this.showExcavationFields,
        workItem: {
          id: item.id,
          backendTaskId: item.taskId, // Pass the backend task ID for updates
          projectStageId: item.projectStageId, // Pass the stage ID
          taskTypeId: item.taskTypeId, // Pass the task type ID
          title: item.title,
          type: item.type,
          priority: item.priority,
          assignTo: item.assignTo,
          taskPoints: item.taskPoints,
          tags: item.tags,
          description: item.description,
          startDate: item.startDate,
          endDate: item.endDate,
          location: item.location,
          depth: item.depth,
          volume: item.volume,
          soilType: item.soilType,
          equipment: item.equipment,
          status: item.status,
          subtasks: item.subtasks
        }
      }
    });
    
    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        console.log('💾 Edit dialog closed with data:', result);
        
        // Prepare the CreateTaskCommand for API with task ID for update
        const updateCommand = new CreateTaskCommand({
          id: result.backendTaskId || item.taskId, // Include the backend task ID for update
          title: result.title,
          description: result.description,
          assignTo: result.assignTo ? parseInt(result.assignTo) : 0,
          priority: this.mapPriorityToNumber(result.priority),
          taskPoint: result.taskPoints ? parseInt(result.taskPoints) : 0,
          startDate: result.startDate ? this.parseDateString(result.startDate) : undefined,
          endDate: result.endDate ? this.parseDateString(result.endDate) : undefined,
          excavationLocation: result.location || undefined,
          excavationDepth: result.depth ? parseFloat(result.depth) : undefined,
          excavationVolume: result.volume ? parseFloat(result.volume) : undefined,
          excavationSoilType: result.soilType || undefined,
          excavationEquipment: result.equipment || undefined,
          taskTypeId: result.taskTypeId || 1,
          projectStageId: item.projectStageId,
          status: this.mapTaskStatusToApiStatus(result.status || item.status)
        });
        
        console.log('📤 Sending update task command:', updateCommand);
        
        // Call the API to update the task
        this.taskService.updateTask(updateCommand).subscribe({
          next: (response) => {
            if (response.succeeded) {
              console.log('✅ Task updated successfully');
              // Emit event to notify parent component to reload tasks
              this.taskCreated.emit();
            } else {
              console.error('❌ Failed to update task:', response.message);
            }
          },
          error: (error) => {
            console.error('❌ Error updating task:', error);
          }
        });
      }
    });
  }

  openAddDialog(columnId: TaskStatus): void {
    this.selectedColumn.set(columnId);
    
    this.dialogRef = this.dialogService.open(WorkItemDialogComponent, {
      header: 'Add Work Item',
      width: '900px',
      height: '900px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'add',
        projectStageId: this.projectStageId,
        showExcavationFields: this.showExcavationFields,
        workItem: {
          title: '',
          type: WorkItemType.TASK,
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
          projectStageId: this.projectStageId
        }
      }
    });
    
    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        console.log('💾 Add dialog closed with data:', result);
        
        // Prepare the CreateTaskCommand for API using the proper constructor
        const createCommand = new CreateTaskCommand({
          title: result.title,
          description: result.description,
          assignTo: result.assignTo ? parseInt(result.assignTo) : 0,
          priority: this.mapPriorityToNumber(result.priority),
          taskPoint: result.taskPoints ? parseInt(result.taskPoints) : 0,
          startDate: result.startDate ? this.parseDateString(result.startDate) : undefined,
          endDate: result.endDate ? this.parseDateString(result.endDate) : undefined,
          excavationLocation: result.location || undefined,
          excavationDepth: result.depth ? parseFloat(result.depth) : undefined,
          excavationVolume: result.volume ? parseFloat(result.volume) : undefined,
          excavationSoilType: result.soilType || undefined,
          excavationEquipment: result.equipment || undefined,
          taskTypeId: result.taskTypeId || 1,
          projectStageId: this.getStageIdFromProjectId(),
          status: this.mapTaskStatusToApiStatus(columnId)
        });
        
        console.log('📤 Sending create task command:', createCommand);
        
        // Call the API to create the task
        this.taskService.createTask(createCommand).subscribe({
          next: (response) => {
            if (response.succeeded) {
              console.log('✅ Task created successfully');
              // Emit event to notify parent component to reload tasks
              this.taskCreated.emit();
            } else {
              console.error('❌ Failed to create task:', response.message);
            }
          },
          error: (error) => {
            console.error('❌ Error creating task:', error);
          }
        });
      }
    });
  }



  openAddSubtaskDialog(item: WorkItem): void {
    this.dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Add Subtask',
      width: '600px',
      modal: true,
      data: {
        mode: 'add',
        projectStageTaskId: item.taskId, // Pass the backend task ID
        subtask: {
          title: '',
          startDate: '',
          endDate: '',
          status: 'pending',
          type: '',
          cost: '',
          quantity: ''
        }
      }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result && result.success) {
        // Subtask created successfully via API
        // Parent component should refresh the data
      }
    });
  }

  openEditSubtaskDialog(item: WorkItem, subtask: SubTask): void {
    this.dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Edit Subtask',
      width: '600px',
      modal: true,
      data: {
        mode: 'edit',
        projectStageTaskId: item.taskId, // Pass the backend task ID
        subtask: { ...subtask }
      }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result && result.success) {
        // Subtask updated successfully via API
        // Parent component should refresh the data
      }
    });
  }

  deleteSubtask(item: WorkItem, subtaskId: string | number): void {
    // Subtask deletion is handled via API in the subtask dialog
    // Emit event for parent to reload all data
    this.taskUpdated.emit();
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return status;
    }
  }

  deleteWorkItem(item: WorkItem): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the task "${item.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (item.taskId) {
          // Call API to delete the task
          this.taskService.deleteTask(item.taskId).subscribe({
            next: (response) => {
              if (response.succeeded) {
                console.log('✅ Task deleted successfully');
                // Close dialog first
                this.showItemDialog.set(false);
                // Emit event for parent to reload all tasks
                this.taskDeleted.emit();
              } else {
                console.error('❌ Failed to delete task:', response.message);
              }
            },
            error: (error) => {
              console.error('❌ Error deleting task:', error);
            }
          });
        }
      }
    });
  }

  toggleExpanded(itemId: string): void {
    this.expandedItems.update(expanded => {
      const newExpanded = new Set(expanded);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      return newExpanded;
    });
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  getWorkItemIcon(type: WorkItemType): string {
    switch (type) {
      case WorkItemType.USER_STORY: return 'pi-book';
      case WorkItemType.BUG: return 'pi-bug';
      case WorkItemType.TASK: return 'pi-check-square';
      case WorkItemType.EPIC: return 'pi-bolt';
      case WorkItemType.FEATURE: return 'pi-star';
      default: return 'pi-circle';
    }
  }

  getWorkItemColor(type: WorkItemType): string {
    switch (type) {
      case WorkItemType.USER_STORY: return 'bg-blue-500';
      case WorkItemType.BUG: return 'bg-red-500';
      case WorkItemType.TASK: return 'bg-green-500';
      case WorkItemType.EPIC: return 'bg-purple-500';
      case WorkItemType.FEATURE: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  }

  getCompletedSubtasks(item: WorkItem): number {
    return item.subtasks.filter(st => st.status === 'completed').length;
  }

  getSubtaskProgress(item: WorkItem): number {
    if (item.subtasks.length === 0) return 0;
    return Math.round((this.getCompletedSubtasks(item) / item.subtasks.length) * 100);
  }

  /**
   * Map the UI TaskStatus to the API StatusTask enum
   * API enum values: 0 (TODO), 1 (In Progress), 2 (Review), 3 (Done)
   */
  private mapTaskStatusToApiStatus(status: TaskStatus): StatusTask {
    switch (status) {
      case TaskStatus.TODO:
      case TaskStatus.BACKLOG:
        return StatusTask._0; // TODO
      case TaskStatus.IN_PROGRESS:
        return StatusTask._1; // In Progress
      case TaskStatus.REVIEW:
        return StatusTask._2; // Review
      case TaskStatus.DONE:
        return StatusTask._3; // Done
      default:
        return StatusTask._0; // Default to TODO
    }
  }

  /**
   * Parse date string to Date object without timezone conversion
   * Handles both ISO strings and Date objects
   */
  private parseDateString(dateValue: any): Date | undefined {
    if (!dateValue) return undefined;
    
    try {
      // If it's already a Date object, return it
      if (dateValue instanceof Date) {
        return dateValue;
      }
      
      // If it's a string in format YYYY-MM-DDTHH:mm:ss (without timezone)
      if (typeof dateValue === 'string') {
        // Parse the date string as local time by using parseISO
        return parseISO(dateValue);
      }
      
      return undefined;
    } catch (error) {
      console.error('Error parsing date:', error);
      return undefined;
    }
  }

  /**
   * Map priority string to number for API
   * low = 0, medium = 1, high = 2, critical = 3
   */
  private mapPriorityToNumber(priority: string): number {
    switch (priority?.toLowerCase()) {
      case 'low': return 0;
      case 'medium': return 1;
      case 'high': return 2;
      case 'critical': return 3;
      default: return 1; // Default to medium
    }
  }

  /**
   * Get the project stage ID for API calls
   */
  private getStageIdFromProjectId(): number {
    return this.projectStageId;
  }
}
