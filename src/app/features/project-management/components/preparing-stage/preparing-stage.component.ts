import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns';
import { DialogService } from 'primeng/dynamicdialog';
import { GetProjectTaskDto } from '../../../../../nswag/api-client';
import { TaskStatus as ModelTaskStatus, Task, TaskPriority } from '../../models/project.model';
import { ProjectService } from '../../services/project.service';
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
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 0))
      },
      {
        id: TaskStatus.IN_PROGRESS,
        title: 'In Progress',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 1))
      },
      {
        id: TaskStatus.REVIEW,
        title: 'Review',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 2))
      },
      {
        id: TaskStatus.DONE,
        title: 'Done',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 3))
      }
    ];
  });

  private projectService = inject(ProjectService);

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Handle when a work item is added through the shared stage board
   */
  onWorkItemAdded(event: {formData: any, columnId: any}): void {
    const { formData, columnId } = event;

    // Map the columnId to the task status based on where it's being added
    const taskStatus = this.mapColumnIdToTaskStatus(columnId);

    // Create the task object from form data
    const newTask: Omit<Task, 'id'> = {
      title: formData.title,
      name: formData.title,
      description: formData.description || '',
      stageId: `stage-${this.projectStageId}`,
      assignedTo: formData.assignTo || '',
      status: taskStatus,
      priority: this.mapFormPriorityToTaskPriority(formData.priority),
      dueDate: formData.endDate ? new Date(formData.endDate) : undefined,
      completedDate: undefined,
      progress: 0,
      estimatedHours: parseInt(formData.taskPoints, 10) || 0,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      location: formData.location,
      depth: parseFloat(formData.depth) || 0,
      volume: parseFloat(formData.volume) || 0,
      soilType: formData.soilType,
      equipment: formData.equipment,
      dependencies: [],
      attachments: []
    };

    // Get taskTypeId from formData, default to 1 if not provided
    const taskTypeId = formData.taskTypeId || 1;

    // Call the API to create the task
    this.projectService.addTask(
      this.projectId,
      `stage-${this.projectStageId}`,
      newTask,
      this.projectStageId,
      taskTypeId
    ).subscribe({
      next: () => {
        // Reload tasks to reflect the new one from API
        this.loadTasks();
      },
      error: (error) => {
        console.error('Error creating task:', error);
      }
    });
  }

  /**
   * Map form priority to TaskPriority enum
   */
  private mapFormPriorityToTaskPriority(priority: string): TaskPriority {
    switch (priority?.toLowerCase()) {
      case 'low': return TaskPriority.LOW;
      case 'medium': return TaskPriority.MEDIUM;
      case 'high': return TaskPriority.HIGH;
      case 'critical': return TaskPriority.HIGH;
      default: return TaskPriority.MEDIUM;
    }
  }

  /**
   * Map columnId (TaskStatus string) to ModelTaskStatus enum
   * API expects: 0 = To Do, 1 = In Progress, 2 = Review, 3 = Done
   */
  private mapColumnIdToTaskStatus(columnId: TaskStatus): ModelTaskStatus {
    switch (columnId) {
      case TaskStatus.TODO:
        return ModelTaskStatus.TODO;
      case TaskStatus.IN_PROGRESS:
        return ModelTaskStatus.IN_PROGRESS;
      case TaskStatus.REVIEW:
        return ModelTaskStatus.REVIEW;
      case TaskStatus.DONE:
        return ModelTaskStatus.COMPLETED;
      default:
        return ModelTaskStatus.TODO;
    }
  }

  /**
   * Handle task created event from shared stage board
   */
  onTaskCreated(): void {

    this.loadTasks();
  }

  /**
   * Handle task deleted event from shared stage board
   */
  onTaskDeleted(): void {

    this.loadTasks();
  }

  /**
   * Load tasks from API by projectStageId
   */
  private loadTasks(): void {
    this.isLoading.set(true);

    
    this.taskService.getTasksByStageId(this.projectStageId, 1, 100).subscribe({
      next: (response) => {
        console.log('📥 Tasks API response:', response);
        if (response.succeeded && response.data?.data) {
          console.log('✅ Setting tasks:', response.data.data.length, 'tasks');
          this.tasks.set(response.data.data);
          console.log('📊 Current tasks signal value:', this.tasks());
          console.log('📊 Computed columns:', this.columns());
        } else {
          console.warn('⚠️ No tasks data in response');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading tasks:', error);
        this.tasks.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Map API tasks to WorkItem interface
   */
  private mapTasksToWorkItems(tasks: GetProjectTaskDto[]): WorkItem[] {

    const workItems = tasks.map(task => ({
      id: task.id?.toString() || '',
      taskId: task.id, // Backend task ID
      projectStageId: task.projectStageId, // Stage ID for subtask creation
      taskTypeId: task.taskTypeId, // Task type ID from API
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
      startDate: task.startDate ? this.formatDateAsLocalString(task.startDate) : '',
      endDate: task.endDate ? this.formatDateAsLocalString(task.endDate) : '',
      location: task.excavationLocation || '',
      depth: task.excavationDepth?.toString() || '',
      volume: task.excavationVolume?.toString() || '',
      soilType: task.excavationSoilType || '',
      equipment: task.excavationEquipment || '',
      createdDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''
    }));
    return workItems;
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
   * Format date from API as local date string YYYY-MM-DD using date-fns
   * Treats the date string from API as local time, not UTC
   */
  private formatDateAsLocalString(dateString: string | Date): string {
    if (!dateString) return '';
    
    try {
      // Parse date string as local time (ignore timezone)
      const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
      // Extract just the date part without timezone conversion
      const datePart = dateStr.split('T')[0];
      // Parse as local date and format
      const date = new Date(datePart + 'T00:00:00');
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
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

