import { Component, Input, Output, EventEmitter, inject, signal, Signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';

import { WorkItemDialogComponent } from './dialog/work-item-dialog/work-item-dialog.component';
import { SubtaskDialogComponent } from './dialog/subtask-dialog/subtask-dialog.component';
import { TaskService } from '../../services/task.service';
import { StatusTask, CreateTaskCommand } from '../../../../../nswag/api-client';

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
    ProgressBarModule
  ],
  templateUrl: './shared-stage-board.component.html',
  styleUrls: ['./shared-stage-board.component.scss']
})
export class SharedStageBoardComponent implements OnInit {
  @Input() projectId!: string;
  @Input() projectStageId!: number;
  @Input() stageTitle: string = 'Stage Board';
  @Input() stageDescription: string = 'Manage tasks and activities';
  @Input({ required: true }) columnsInput!: Signal<Column[]>;
  @Output() taskCreated = new EventEmitter<void>();
  
  
  // Internal writable signal for columns (so we can mutate them for drag-drop)
  columns = signal<Column[]>([]);
  
  private dialogService = inject(DialogService);
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
      const updatedItem = { ...item, status: targetColumn.id };
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      event.container.data[event.currentIndex] = updatedItem;
      
      this.columns.update(cols => {
        return cols.map(col => {
          if (col.id === targetColumn.id) {
            return { ...col, items: [...event.container.data] };
          }
          return col;
        });
      });

      // Call API to update task status
      const taskId = parseInt(item.id);
      if (!isNaN(taskId)) {
        const apiStatus = this.mapTaskStatusToApiStatus(targetColumn.id);
        this.taskService.updateTaskStatus(taskId, apiStatus).subscribe({
          next: (response) => {
            if (response.succeeded) {
              console.log('Task status updated successfully');
            } else {
              console.error('Failed to update task status:', response.message);
              // Optionally revert the UI change here if API fails
            }
          },
          error: (error) => {
            console.error('Error updating task status:', error);
            // Optionally revert the UI change here if API fails
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
        workItem: {
          id: item.id,
          taskTypeId: item.taskId, // Pass the backend task ID
          projectStageId: item.projectStageId, // Pass the stage ID
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
        // Update the work item in the UI
        // Note: For edit mode, we typically would call an update API
        // For now, just update the local state
        this.columns.update(cols => {
          return cols.map(col => ({
            ...col,
            items: col.items.map(workItem => {
              if (workItem.id === item.id) {
                return {
                  ...workItem,
                  ...result,
                  id: item.id,
                  taskId: item.taskId,
                  projectStageId: item.projectStageId
                };
              }
              return workItem;
            })
          }));
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
          startDate: result.startDate ? new Date(result.startDate) : undefined,
          endDate: result.endDate ? new Date(result.endDate) : undefined,
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
    this.columns.update(cols => {
      return cols.map(col => ({
        ...col,
        items: col.items.map(workItem => {
          if (workItem.id === item.id) {
            return {
              ...workItem,
              subtasks: workItem.subtasks.filter(st => st.id !== subtaskId)
            };
          }
          return workItem;
        })
      }));
    });
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
    this.columns.update(cols => {
      return cols.map(col => ({
        ...col,
        items: col.items.filter(workItem => workItem.id !== item.id)
      }));
    });
    this.showItemDialog.set(false);
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
   * Get the project stage ID for API calls
   */
  private getStageIdFromProjectId(): number {
    return this.projectStageId;
  }
}
