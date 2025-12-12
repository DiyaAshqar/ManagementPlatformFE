import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { GetProjectTaskDto } from '../../../../../nswag/api-client';
import { TaskService } from '../../services/task.service';
import { Column, SharedStageBoardComponent, TaskStatus, WorkItem, WorkItemType } from '../shared-stage-board/shared-stage-board.component';

@Component({
  selector: 'app-preparing-stage',
  standalone: true,
  imports: [
    CommonModule,
    SharedStageBoardComponent
  ],
  providers: [DialogService],
  templateUrl: './preparing-stage.component.html',
  styleUrls: ['./preparing-stage.component.scss']
})
export class PreparingStageComponent implements OnInit {
  @Input() projectId!: string;
  @Input() projectStageId!: number; // The projectStageId for Preparing stage (stageType: 1)

  private tasks = signal<GetProjectTaskDto[]>([]);
  private isLoading = signal<boolean>(true);

  columns = computed<Column[]>(() => {
    const tasksList = this.tasks();
    return [
      {
        id: TaskStatus.TODO,
        title: 'To Do',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 0)),
        wipLimit: 5
      },
      {
        id: TaskStatus.IN_PROGRESS,
        title: 'In Progress',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 1)),
        wipLimit: 3
      },
      {
        id: TaskStatus.REVIEW,
        title: 'Review',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 2)),
        wipLimit: 3
      },
      {
        id: TaskStatus.DONE,
        title: 'Done',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 3)),
        wipLimit: undefined
      }
    ];
  });

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Load tasks from API by projectStageId
   */
  private loadTasks(): void {
    console.log('[PreparingStage] Loading tasks for projectStageId:', this.projectStageId);
    this.isLoading.set(true);
    
    this.taskService.getTasksByStageId(this.projectStageId, 1, 100).subscribe({
      next: (response) => {
        console.log('[PreparingStage] API Response:', response);
        if (response.succeeded && response.data?.data) {
          console.log('[PreparingStage] Tasks loaded:', response.data.data.length, response.data.data);
          this.tasks.set(response.data.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('[PreparingStage] Error loading tasks:', error);
        this.tasks.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Map API tasks to WorkItem interface
   */
  private mapTasksToWorkItems(tasks: GetProjectTaskDto[]): WorkItem[] {
    return tasks.map(task => ({
      id: task.id?.toString() || '',
      title: task.title || 'Untitled Task',
      type: WorkItemType.TASK,
      priority: this.mapPriority(task.priority),
      assignTo: task.assignTo?.toString() || 'Unassigned',
      assigneeAvatar: this.getInitials(task.assignTo?.toString()),
      taskPoints: task.taskPoint?.toString() || '0',
      tags: [],
      description: task.description || '',
      status: this.mapStatus(task.status),
      subtasks: [],
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      location: task.excavationLocation || '',
      depth: task.excavationDepth?.toString() || '',
      volume: task.excavationVolume?.toString() || '',
      soilType: task.excavationSoilType || '',
      equipment: task.excavationEquipment || '',
      createdDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''
    }));
  }

  /**
   * Map API priority to UI priority
   */
  private mapPriority(priority?: number): 'low' | 'medium' | 'high' | 'critical' {
    switch (priority) {
      case 0: return 'low';
      case 1: return 'medium';
      case 2: return 'high';
      case 3: return 'critical';
      default: return 'medium';
    }
  }

  /**
   * Map API status to TaskStatus enum
   * API status: 0=To Do, 1=In Progress, 2=Review, 3=Completed
   */
  private mapStatus(status?: number): TaskStatus {
    switch (status) {
      case 0: return TaskStatus.TODO;
      case 1: return TaskStatus.IN_PROGRESS;
      case 2: return TaskStatus.REVIEW;
      case 3: return TaskStatus.DONE;
      default: return TaskStatus.TODO;
    }
  }

  /**
   * Get initials from assignee name or ID
   */
  private getInitials(assignee?: string): string {
    if (!assignee) return 'NA';
    // If assignee is a number (ID), return placeholder
    if (!isNaN(Number(assignee))) return 'U' + assignee.slice(0, 1);
    // Extract initials from name
    const names = assignee.split(' ');
    return names.map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
  }
}
