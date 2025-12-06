import { Component, Input, inject, signal } from '@angular/core';
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

import { WorkItemFormData } from '../staging-board/work-item-dialog/work-item-dialog.component';
import { WorkItemDialogComponent } from './dialog/work-item-dialog/work-item-dialog.component';
import { SubtaskDialogComponent } from './dialog/subtask-dialog/subtask-dialog.component';

export interface SubTask {
  id: string;
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
export class SharedStageBoardComponent {
  @Input() projectId!: string;
  @Input() stageTitle: string = 'Stage Board';
  @Input() stageDescription: string = 'Manage tasks and activities';
  @Input({ required: true }) columns!: ReturnType<typeof signal<Column[]>>;
  
  private dialogService = inject(DialogService);
  private dialogRef: DynamicDialogRef | undefined;

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
    }
  }

  openItemDialog(item: WorkItem): void {
    this.selectedItem.set(item);
    
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
    
    this.dialogRef.onClose.subscribe((formData: WorkItemFormData) => {
      if (formData) {
        this.saveWorkItem(formData);
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
          equipment: ''
        }
      }
    });
    
    this.dialogRef.onClose.subscribe((formData: WorkItemFormData) => {
      if (formData) {
        this.saveWorkItem(formData);
      }
    });
  }

  saveWorkItem(formData: WorkItemFormData): void {
    if (!formData.title) return;

    this.columns.update(cols => {
      return cols.map(col => {
        if (formData.id) {
          // Editing existing item
          const itemIndex = col.items.findIndex(item => item.id === formData.id);
          if (itemIndex !== -1) {
            const updatedItem: WorkItem = {
              ...col.items[itemIndex],
              title: formData.title,
              type: formData.type as WorkItemType,
              priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
              assignTo: formData.assignTo,
              taskPoints: formData.taskPoints,
              tags: formData.tags,
              description: formData.description,
              startDate: formData.startDate,
              endDate: formData.endDate,
              location: formData.location,
              depth: formData.depth,
              volume: formData.volume,
              soilType: formData.soilType,
              equipment: formData.equipment,
              status: (formData.status || col.items[itemIndex].status) as TaskStatus,
              subtasks: formData.subtasks || []
            };

            const newItems = [...col.items];
            newItems[itemIndex] = updatedItem;
            return { ...col, items: newItems };
          }
        } else if (col.id === this.selectedColumn()) {
          // Adding new item
          const newItem: WorkItem = {
            id: `item-${Date.now()}`,
            title: formData.title,
            type: formData.type as WorkItemType,
            priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
            assignTo: formData.assignTo,
            assigneeAvatar: formData.assignTo.split(' ').map(n => n[0]).join(''),
            taskPoints: formData.taskPoints,
            tags: formData.tags,
            description: formData.description,
            status: col.id,
            subtasks: formData.subtasks || [],
            startDate: formData.startDate,
            endDate: formData.endDate,
            location: formData.location,
            depth: formData.depth,
            volume: formData.volume,
            soilType: formData.soilType,
            equipment: formData.equipment,
            createdDate: new Date().toISOString().split('T')[0]
          };

          return { ...col, items: [...col.items, newItem] };
        }
        return col;
      });
    });

    this.showItemDialog.set(false);
    this.selectedItem.set(null);
  }

  openAddSubtaskDialog(item: WorkItem): void {
    this.dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Add Subtask',
      width: '600px',
      modal: true,
      data: {
        mode: 'add',
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
      if (result) {
        this.columns.update(cols => {
          return cols.map(col => ({
            ...col,
            items: col.items.map(workItem => {
              if (workItem.id === item.id) {
                const newSubtask: SubTask = {
                  id: `sub-${Date.now()}`,
                  title: result.title,
                  startDate: result.startDate,
                  endDate: result.endDate,
                  status: result.status,
                  type: result.type,
                  cost: result.cost,
                  quantity: result.quantity
                };
                return {
                  ...workItem,
                  subtasks: [...workItem.subtasks, newSubtask]
                };
              }
              return workItem;
            })
          }));
        });
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
        subtask: { ...subtask }
      }
    });

    this.dialogRef.onClose.subscribe((result: any) => {
      if (result) {
        this.columns.update(cols => {
          return cols.map(col => ({
            ...col,
            items: col.items.map(workItem => {
              if (workItem.id === item.id) {
                return {
                  ...workItem,
                  subtasks: workItem.subtasks.map(st =>
                    st.id === subtask.id ? { ...st, ...result } : st
                  )
                };
              }
              return workItem;
            })
          }));
        });
      }
    });
  }

  deleteSubtask(item: WorkItem, subtaskId: string): void {
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
}
