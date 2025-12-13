import { Component, Input, signal, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedStageBoardComponent, Column, TaskStatus as BoardTaskStatus, WorkItemType, WorkItem } from '../shared-stage-board/shared-stage-board.component';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TaskService } from '../../services/task.service';
import { ProjectService } from '../../services/project.service';
import { GetProjectTaskDto, StatusTask } from '../../../../../nswag/api-client';
import { Task, TaskPriority, TaskStatus } from '../../models';
import { AddTaskDialogComponent } from '../dialog/add-task-dialog/add-task-dialog.component';

@Component({
  selector: 'app-excavation-stage',
  standalone: true,
  imports: [
    CommonModule,
    SharedStageBoardComponent
  ],
  providers: [DialogService],
  templateUrl: './excavation-stage.component.html',
  styleUrls: ['./excavation-stage.component.scss']
})
export class ExcavationStageComponent implements OnInit {
  @Input() projectId!: string;
  @Input() projectStageId!: number; // The projectStageId for Excavation stage (stageType: 2)

  private tasks = signal<GetProjectTaskDto[]>([]);
  private isLoading = signal<boolean>(true);
  
  private dialogService = inject(DialogService);
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private dialogRef!: DynamicDialogRef;

  columns = computed<Column[]>(() => {
    const tasksList = this.tasks();
    return [
      {
        id: BoardTaskStatus.TODO,
        title: 'To Do',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 0)),
        wipLimit: 5
      },
      {
        id: BoardTaskStatus.IN_PROGRESS,
        title: 'In Progress',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 1)),
        wipLimit: 3
      },
      {
        id: BoardTaskStatus.REVIEW,
        title: 'Review',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 2)),
        wipLimit: 3
      },
      {
        id: BoardTaskStatus.DONE,
        title: 'Done',
        items: this.mapTasksToWorkItems(tasksList.filter(t => t.status === 3)),
        wipLimit: undefined
      }
    ];
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  /**
   * Handle task created event from shared stage board
   */
  onTaskCreated(): void {
    console.log('✅ Task created, reloading tasks...');
    this.loadTasks();
  }

  /**
   * Load tasks from API by projectStageId
   */
  private loadTasks(): void {
    this.isLoading.set(true);
    
    this.taskService.getTasksByStageId(this.projectStageId, 1, 100).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.tasks.set(response.data.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
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
      taskId: task.id, // Backend task ID
      projectStageId: task.projectStageId, // Stage ID for subtask creation
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
   * Map API status to TaskStatus enum used in shared-stage-board
   * API status: 0=To Do, 1=In Progress, 2=Review, 3=Completed
   */
  private mapStatus(status?: number): BoardTaskStatus {
    switch (status) {
      case 0: return BoardTaskStatus.TODO;
      case 1: return BoardTaskStatus.IN_PROGRESS;
      case 2: return BoardTaskStatus.REVIEW;
      case 3: return BoardTaskStatus.DONE;
      default: return BoardTaskStatus.TODO;
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
   * Map form priority string to TaskPriority enum
   */
  private mapFormPriorityToTaskPriority(priority: string): TaskPriority {
    switch (priority?.toLowerCase()) {
      case 'low': return TaskPriority.LOW;
      case 'medium': return TaskPriority.MEDIUM;
      case 'high': return TaskPriority.HIGH;
      case 'urgent':
      case 'critical': return TaskPriority.URGENT;
      default: return TaskPriority.MEDIUM;
    }
  }

  /**
   * Map columnId (BoardTaskStatus string) to TaskStatus enum
   * API expects: 0 = To Do, 1 = In Progress, 2 = Review, 3 = Done
   */
  private mapColumnIdToTaskStatus(columnId: BoardTaskStatus): TaskStatus {
    switch (columnId) {
      case BoardTaskStatus.TODO:
        return TaskStatus.TODO;
      case BoardTaskStatus.IN_PROGRESS:
        return TaskStatus.IN_PROGRESS;
      case BoardTaskStatus.REVIEW:
        return TaskStatus.REVIEW;
      case BoardTaskStatus.DONE:
        return TaskStatus.COMPLETED;
      default:
        return TaskStatus.TODO;
    }
  }

  /**
   * Open dialog to add a new task
   */
  openAddTaskDialog(): void {
    this.dialogRef = this.dialogService.open(AddTaskDialogComponent, {
      header: 'Add New Task',
      width: '800px',
      modal: true,
      data: {
        projectStageId: this.projectStageId,
        taskTypeId: 1
      }
    });

    this.dialogRef.onClose.subscribe((result) => {
      if (result && result.task) {
        // Call the API to create the task
        const numericProjectId = parseInt(this.projectId, 10);
        this.projectService.addTask(
          this.projectId,
          `stage-${this.projectStageId}`,
          result.task,
          result.projectStageId || this.projectStageId,
          result.taskTypeId || 1
        ).subscribe({
          next: () => {
            // Reload tasks to reflect the new one
            this.loadTasks();
          },
          error: (error) => {
            console.error('Error creating task:', error);
          }
        });
      }
    });
  }
}
