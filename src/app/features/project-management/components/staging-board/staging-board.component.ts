import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { WorkItemFormData } from './work-item-dialog/work-item-dialog.component';
import {  SubTaskFormData } from './subtask-dialog/subtask-dialog.component';
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
import { WorkItemDialogComponent } from '../shared-stage-board/dialog/work-item-dialog/work-item-dialog.component';
import { SubtaskDialogComponent } from '../shared-stage-board/dialog/subtask-dialog/subtask-dialog.component';
import { TaskService } from '../../services/task.service';
import { StatusTask } from '../../../../../nswag/api-client';

interface SubTask {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'in-progress' | 'pending';
  type: string;
  cost: string;
  quantity: string;
}

interface WorkItem {
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

enum WorkItemType {
  USER_STORY = 'User Story',
  BUG = 'Bug',
  TASK = 'Task',
  EPIC = 'Epic',
  FEATURE = 'Feature'
}

enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done'
}

interface Column {
  id: TaskStatus;
  title: string;
  items: WorkItem[];
  wipLimit?: number;
}

@Component({
  selector: 'app-staging-board',
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
  templateUrl: './staging-board.component.html',
  styleUrls: ['./staging-board.component.scss']
})
export class StagingBoardComponent {
  @Input() projectId!: string;
  
  private dialogService = inject(DialogService);
  private dialogRef: DynamicDialogRef | undefined;
  private taskService = inject(TaskService);

  columns = signal<Column[]>([
    {
      id: TaskStatus.TODO,
      title: 'To Do',
      items: [
        {
          id: 'item-3',
          title: 'Design Dashboard Layout',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Mike Wilson',
          assigneeAvatar: 'MW',
          taskPoints: '5',
          tags: ['design', 'dashboard'],
          description: 'Create wireframes and mockups for dashboard',
          status: TaskStatus.TODO,
          subtasks: [
            { id: 'sub-3-1', title: 'Create wireframes', startDate: '2024-02-03', endDate: '2024-02-05', status: 'in-progress', type: 'Design', cost: '$500', quantity: '1' },
            { id: 'sub-3-2', title: 'Design mockups', startDate: '2024-02-06', endDate: '2024-02-08', status: 'pending', type: 'Design', cost: '$800', quantity: '1' },
            { id: 'sub-3-3', title: 'Get stakeholder approval', startDate: '2024-02-09', endDate: '2024-02-10', status: 'pending', type: 'Review', cost: '$0', quantity: '1' }
          ],
          startDate: '2024-02-03',
          endDate: '2024-03-10',
          location: 'Dashboard Module',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-02-03'
        }
      ],
      wipLimit: 5
    },
    {
      id: TaskStatus.IN_PROGRESS,
      title: 'In Progress',
      items: [
        {
          id: 'item-4',
          title: 'API Integration for Reports',
          type: WorkItemType.FEATURE,
          priority: 'critical',
          assignTo: 'David Chen',
          assigneeAvatar: 'DC',
          taskPoints: '13',
          tags: ['api', 'backend', 'reports'],
          description: 'Integrate reporting API endpoints with frontend',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [
            { id: 'sub-4-1', title: 'Setup API client', startDate: '2024-02-02', endDate: '2024-02-03', status: 'completed', type: 'Development', cost: '$1,200', quantity: '1' },
            { id: 'sub-4-2', title: 'Implement data fetching', startDate: '2024-02-04', endDate: '2024-02-05', status: 'completed', type: 'Development', cost: '$1,500', quantity: '1' },
            { id: 'sub-4-3', title: 'Add error handling', startDate: '2024-02-06', endDate: '2024-02-07', status: 'in-progress', type: 'Development', cost: '$800', quantity: '1' },
            { id: 'sub-4-4', title: 'Write unit tests', startDate: '2024-02-07', endDate: '2024-02-08', status: 'pending', type: 'Testing', cost: '$600', quantity: '1' }
          ],
          startDate: '2024-02-02',
          endDate: '2024-03-08',
          location: 'API Module',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-02-02'
        },
        {
          id: 'item-5',
          title: 'Database Schema Migration',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Emily Brown',
          assigneeAvatar: 'EB',
          taskPoints: '8',
          tags: ['database', 'backend'],
          description: 'Migrate database schema to new version',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [
            { id: 'sub-5-1', title: 'Create migration scripts', startDate: '2024-02-04', endDate: '2024-02-06', status: 'completed', type: 'Development', cost: '$1,000', quantity: '1' },
            { id: 'sub-5-2', title: 'Test on staging', startDate: '2024-02-07', endDate: '2024-02-09', status: 'in-progress', type: 'Testing', cost: '$500', quantity: '1' }
          ],
          startDate: '2024-02-04',
          endDate: '2024-03-12',
          location: 'Database',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-02-04'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.REVIEW,
      title: 'Review',
      items: [
        {
          id: 'item-6',
          title: 'Implement Search Functionality',
          type: WorkItemType.FEATURE,
          priority: 'medium',
          assignTo: 'Alex Turner',
          assigneeAvatar: 'AT',
          taskPoints: '5',
          tags: ['search', 'frontend'],
          description: 'Add search functionality to the application',
          status: TaskStatus.REVIEW,
          subtasks: [
            { id: 'sub-6-1', title: 'Build search component', startDate: '2024-02-01', endDate: '2024-02-05', status: 'completed', type: 'Development', cost: '$1,200', quantity: '1' },
            { id: 'sub-6-2', title: 'Add search filters', startDate: '2024-02-06', endDate: '2024-02-10', status: 'completed', type: 'Development', cost: '$800', quantity: '1' },
            { id: 'sub-6-3', title: 'Optimize search performance', startDate: '2024-02-11', endDate: '2024-02-15', status: 'completed', type: 'Optimization', cost: '$600', quantity: '1' }
          ],
          startDate: '2024-02-01',
          endDate: '2024-02-15',
          location: 'Search Module',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-02-01'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.DONE,
      title: 'Done',
      items: [
        {
          id: 'item-7',
          title: 'Setup CI/CD Pipeline',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Chris Lee',
          assigneeAvatar: 'CL',
          taskPoints: '8',
          tags: ['devops', 'ci-cd'],
          description: 'Configure automated deployment pipeline',
          status: TaskStatus.DONE,
          subtasks: [
            { id: 'sub-7-1', title: 'Configure GitHub Actions', startDate: '2024-01-28', endDate: '2024-01-30', status: 'completed', type: 'DevOps', cost: '$500', quantity: '1' },
            { id: 'sub-7-2', title: 'Setup staging environment', startDate: '2024-01-31', endDate: '2024-02-02', status: 'completed', type: 'DevOps', cost: '$800', quantity: '1' },
            { id: 'sub-7-3', title: 'Add automated tests', startDate: '2024-02-03', endDate: '2024-02-05', status: 'completed', type: 'Testing', cost: '$700', quantity: '1' }
          ],
          startDate: '2024-01-28',
          endDate: '2024-02-05',
          location: 'DevOps',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-01-28'
        }
      ]
    }
  ]);

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
      // Check WIP limit
      if (targetColumn.wipLimit && event.container.data.length >= targetColumn.wipLimit) {
        console.warn(`WIP limit of ${targetColumn.wipLimit} reached for ${targetColumn.title}`);
        return;
      }

      // Update item status
      const item = event.previousContainer.data[event.previousIndex];
      item.status = targetColumn.id;

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update columns signal
      this.columns.update(cols => [...cols]);

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

    if (formData.id) {
      // Edit existing item
      this.columns.update(cols =>
        cols.map(col => ({
          ...col,
          items: col.items.map(item =>
            item.id === formData.id
              ? {
                  ...item,
                  title: formData.title,
                  type: formData.type as WorkItemType,
                  priority: formData.priority as any,
                  assignTo: formData.assignTo || 'Unassigned',
                  assigneeAvatar: formData.assignTo ? formData.assignTo.split(' ').map(n => n[0]).join('') : '?',
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
                  subtasks: formData.subtasks || item.subtasks
                }
              : item
          )
        }))
      );
    } else {
      // Add new item
      if (!this.selectedColumn()) return;

      const item: WorkItem = {
        id: `item-${Date.now()}`,
        title: formData.title,
        type: formData.type as WorkItemType,
        priority: formData.priority as any,
        assignTo: formData.assignTo || 'Unassigned',
        assigneeAvatar: formData.assignTo ? formData.assignTo.split(' ').map(n => n[0]).join('') : '?',
        taskPoints: formData.taskPoints,
        tags: formData.tags,
        description: formData.description,
        status: this.selectedColumn()!,
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

      this.columns.update(cols =>
        cols.map(col =>
          col.id === this.selectedColumn()
            ? { ...col, items: [...col.items, item] }
            : col
        )
      );
    }

    this.selectedColumn.set(null);
  }

  openAddSubtaskDialog(item: WorkItem): void {
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: `Add Subtask to "${item.title}"`,
      width: '500px',
      modal: true,
      maximizable: true,
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
        },
        parentTaskTitle: item.title
      }
    });

    dialogRef.onClose.subscribe((formData: SubTaskFormData) => {
      if (formData && formData.title) {
        const subtask: SubTask = {
          id: `sub-${Date.now()}`,
          ...formData
        };

        this.columns.update(cols =>
          cols.map(col => ({
            ...col,
            items: col.items.map(i =>
              i.id === item.id
                ? { ...i, subtasks: [...i.subtasks, subtask] }
                : i
            )
          }))
        );
      }
    });
  }

  openEditSubtaskDialog(item: WorkItem, subtask: SubTask): void {
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Edit Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'edit',
        subtask: subtask,
        parentTaskTitle: item.title
      }
    });

    dialogRef.onClose.subscribe((formData: SubTaskFormData) => {
      if (formData) {
        this.columns.update(cols =>
          cols.map(col => ({
            ...col,
            items: col.items.map(i =>
              i.id === item.id
                ? {
                    ...i,
                    subtasks: i.subtasks.map(st =>
                      st.id === subtask.id
                        ? { ...st, ...formData }
                        : st
                    )
                  }
                : i
            )
          }))
        );
      }
    });
  }

  deleteSubtask(item: WorkItem, subtaskId: string): void {
    this.columns.update(cols =>
      cols.map(col => ({
        ...col,
        items: col.items.map(i =>
          i.id === item.id
            ? { ...i, subtasks: i.subtasks.filter(st => st.id !== subtaskId) }
            : i
        )
      }))
    );
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

  deleteWorkItem(item: WorkItem): void {
    this.columns.update(cols =>
      cols.map(col => ({
        ...col,
        items: col.items.filter(i => i.id !== item.id)
      }))
    );
    this.showItemDialog.set(false);
  }

  toggleExpanded(itemId: string): void {
    const expanded = new Set(this.expandedItems());
    if (expanded.has(itemId)) {
      expanded.delete(itemId);
    } else {
      expanded.add(itemId);
    }
    this.expandedItems.set(expanded);
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  getWorkItemIcon(type: WorkItemType): string {
    const icons: Record<WorkItemType, string> = {
      [WorkItemType.USER_STORY]: 'pi-book',
      [WorkItemType.BUG]: 'pi-exclamation-circle',
      [WorkItemType.TASK]: 'pi-check-square',
      [WorkItemType.EPIC]: 'pi-bolt',
      [WorkItemType.FEATURE]: 'pi-star'
    };
    return icons[type] || 'pi-circle';
  }

  getWorkItemColor(type: WorkItemType): string {
    const colors: Record<WorkItemType, string> = {
      [WorkItemType.USER_STORY]: 'bg-blue-500',
      [WorkItemType.BUG]: 'bg-red-500',
      [WorkItemType.TASK]: 'bg-green-500',
      [WorkItemType.EPIC]: 'bg-purple-500',
      [WorkItemType.FEATURE]: 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      'low': 'secondary',
      'medium': 'info',
      'high': 'warn',
      'critical': 'danger'
    };
    return severityMap[priority] || 'secondary';
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
}
