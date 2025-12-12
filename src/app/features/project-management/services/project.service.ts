import { Injectable, signal } from '@angular/core';
import { Observable, of, map, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  GetProjectDto,
  GetProjectDtoListPagedResponseResponse,
  ProjectStatus as ApiProjectStatus,
  ProjectStageDto,
  ProjectStageType,
  CreateTaskCommand,
  StatusTask
} from '../../../../nswag/api-client';
import { TaskService } from './task.service';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectFilters,
  ProjectStats,
  Stage,
  StageStatus,
  Task,
  TaskStatus,
  TaskPriority
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  // Signals for reactive state
  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(false);
  stats = signal<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    averageProgress: 0
  });

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private taskService: TaskService) {}

  // Mapper: Convert API DTO to Project model
  private mapApiProjectToProject(apiProject: GetProjectDto, index: number): Project {
    return {
      id: (apiProject.id || 0).toString(), // Use numeric ID from API
      name: apiProject.title || '',
      description: apiProject.description || '',
      status: this.mapApiStatusToProjectStatus(apiProject.status),
      priority: ProjectPriority.MEDIUM, // Default, as API doesn't provide priority
      startDate: apiProject.startDate ? new Date(apiProject.startDate) : new Date(),
      endDate: apiProject.endDate ? new Date(apiProject.endDate) : new Date(),
      progress: this.calculateProgress(apiProject),
      budget: apiProject.budget || 0,
      spent: 0, // API doesn't provide spent amount
      clientName: apiProject.clinet || '',
      projectManager: 'N/A', // API doesn't provide project manager
      team: [],
      stages: this.mapApiStagesToStages(apiProject.projectStages, (apiProject.id || 0).toString()),
      documents: [],
      createdAt: apiProject.startDate ? new Date(apiProject.startDate) : new Date(),
      updatedAt: new Date()
    };
  }

  // Map backend status enum to frontend status
  private mapApiStatusToProjectStatus(status: ApiProjectStatus | undefined): ProjectStatus {
    switch (status) {
      case ApiProjectStatus._0:
        return ProjectStatus.PLANNING;
      case ApiProjectStatus._1:
        return ProjectStatus.IN_PROGRESS;
      case ApiProjectStatus._2:
        return ProjectStatus.COMPLETED;
      default:
        return ProjectStatus.PLANNING;
    }
  }

  // Calculate overall progress from task counts
  private calculateProgress(apiProject: GetProjectDto): number {
    const total = (apiProject.countTodo || 0) + (apiProject.countInProgress || 0) + (apiProject.countCompleted || 0) + (apiProject.countReview || 0);
    if (total === 0) return 0;
    return Math.round(((apiProject.countCompleted || 0) / total) * 100);
  }

  // Map API stages to frontend stages
  private mapApiStagesToStages(apiStages: ProjectStageDto[] | undefined, projectId: string): Stage[] {
    if (!apiStages || apiStages.length === 0) {
      return [];
    }

    return apiStages.map((apiStage, index) => ({
      id: `stage-${apiStage.projectId || index}`,
      name: this.getStageNameByType(apiStage.stageType),
      projectId: projectId,
      order: index + 1,
      status: this.mapStageTypeToStageStatus(apiStage.stageType),
      tasks: [],
      progress: 0
    }));
  }

  // Get stage name from stage type
  private getStageNameByType(stageType: ProjectStageType | undefined): string {
    switch (stageType) {
      case ProjectStageType._1:
        return 'Preparing';
      case ProjectStageType._2:
        return 'Excavation';
      case ProjectStageType._3:
        return 'Foundation';
      default:
        return 'Unknown Stage';
    }
  }

  // Map stage type to stage status
  private mapStageTypeToStageStatus(stageType: ProjectStageType | undefined): StageStatus {
    switch (stageType) {
      case ProjectStageType._1:
        return StageStatus.PREPARING;
      case ProjectStageType._2:
        return StageStatus.EXCAVATION;
      case ProjectStageType._3:
        return StageStatus.FOUNDATION;
      default:
        return StageStatus.PREPARING;
    }
  }

  // Get all projects from API with optional filters
  getProjects(filters?: ProjectFilters): Observable<Project[]> {
    const pageNumber = 1;
    const pageSize = 100; // Get all projects
    const searchParam = filters?.search || '';

    return this.http.get<GetProjectDtoListPagedResponseResponse>(`${this.apiUrl}/Project`, {
      params: {
        pageNumber: pageNumber.toString(),
        pageSize: pageSize.toString(),
        ...(searchParam && { filterByTitle: searchParam })
      }
    }).pipe(
      map(response => {
        if (!response.succeeded || !response.data || !response.data.data) {
          return [];
        }

        const projects = response.data.data.map((apiProject, index) => 
          this.mapApiProjectToProject(apiProject, index)
        );

        // Apply client-side filters
        let filteredProjects = projects;

        if (filters) {
          filteredProjects = projects.filter(project => {
            // Status filter
            if (filters.status && filters.status.length > 0) {
              if (!filters.status.includes(project.status)) return false;
            }

            // Priority filter
            if (filters.priority && filters.priority.length > 0) {
              if (!filters.priority.includes(project.priority)) return false;
            }

            // Date range filter
            if (filters.startDate && project.startDate < filters.startDate) {
              return false;
            }
            if (filters.endDate && project.endDate > filters.endDate) {
              return false;
            }

            return true;
          });
        }

        // Update stats
        this.updateStats(projects);
        
        // Update signals
        this.projects.set(projects);

        return filteredProjects;
      })
    );
  }

  // Update statistics based on projects
  private updateStats(projects: Project[]): void {
    const stats: ProjectStats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length,
      completedProjects: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
      onHoldProjects: projects.filter(p => p.status === ProjectStatus.PLANNING).length,
      totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
      totalSpent: projects.reduce((sum, p) => sum + p.spent, 0),
      averageProgress: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
        : 0
    };
    
    this.stats.set(stats);
  }

  // Delete project (only removes from local state - no API call)
  deleteProject(id: string): Observable<void> {
    this.projects.update(projects => projects.filter(p => p.id !== id));
    this.updateStats(this.projects());
    return of(void 0);
  }

  // Add task to stage via API
  addTask(projectId: string, stageId: string, task: Omit<Task, 'id'>, projectStageId: number, taskTypeId: number = 1): Observable<Task> {
    // Convert frontend task model to backend CreateTaskCommand
    const createTaskCommand = new CreateTaskCommand({
      title: task.name,
      description: task.description || '',
      assignTo: task.assignedTo ? parseInt(task.assignedTo) : undefined,
      startDate: task.startDate ? new Date(task.startDate) : undefined,
      endDate: task.dueDate ? new Date(task.dueDate) : undefined,
      priority: task.priority ? this.mapTaskPriorityToNumber(task.priority) : 1,
      taskPoint: task.estimatedHours || 0,
      excavationLocation: task.location || '',
      excavationDepth: task.depth || undefined,
      excavationVolume: task.volume || undefined,
      excavationSoilType: task.soilType || '',
      excavationEquipment: task.equipment || '',
      status: task.status ? this.mapTaskStatusToStatusTask(task.status) : 0,
      projectStageId: projectStageId,
      taskTypeId: taskTypeId
    });

    // Call API to create task (don't update local state)
    return this.taskService.createTask(createTaskCommand).pipe(
      map((response) => {
        if (response.succeeded) {
          const newTask: Task = {
            ...task,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          return newTask;
        } else {
          throw new Error('Failed to create task');
        }
      })
    );
  }

  // Helper method to map frontend task priority to backend number
  private mapTaskPriorityToNumber(priority: TaskPriority): number {
    switch (priority) {
      case TaskPriority.LOW: return 0;
      case TaskPriority.MEDIUM: return 1;
      case TaskPriority.HIGH: return 2;
      default: return 1;
    }
  }

  // Helper method to map frontend task status to backend StatusTask enum
  // API status: 0 = To Do, 1 = In Progress, 2 = Review, 3 = Done/Completed
  private mapTaskStatusToStatusTask(status: TaskStatus): StatusTask {
    switch (status) {
      case TaskStatus.TODO: return StatusTask._0;
      case TaskStatus.IN_PROGRESS: return StatusTask._1;
      case TaskStatus.REVIEW: return StatusTask._2;
      case TaskStatus.COMPLETED: return StatusTask._3;
      default: return StatusTask._0;
    }
  }
}
