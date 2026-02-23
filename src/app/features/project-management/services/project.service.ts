import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { MOCK_PROJECTS } from './mock-projects.data';
import { environment } from '../../../../environments/environment';
import {
  ProjectStatus as ApiProjectStatus,
  CreateTaskCommand,
  GetProjectDto,
  GetProjectDtoListPagedResponseResponse,
  ProjectStageDto,
  ProjectStageType
} from '../../../../nswag/api-client';
import {
  Project,
  ProjectFilters,
  ProjectPriority,
  ProjectStats,
  ProjectStatus,
  Stage,
  StageStatus
} from '../models';
import { TaskService } from './task.service';

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

  private get mockProjects(): Project[] { return MOCK_PROJECTS; }

  // TODO: remove mockProjects getter and mock-projects.data.ts once the API is stable

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
      catchError(() => of({ succeeded: false, data: null } as unknown as GetProjectDtoListPagedResponseResponse)),
      map((response: GetProjectDtoListPagedResponseResponse) => {
        if (!response.succeeded || !response.data || !response.data.data || response.data.data.length === 0) {
          // ── Fallback to mock data when API is unavailable ──
          this.updateStats(this.mockProjects);
          this.projects.set(this.mockProjects);
          return this.mockProjects;
        }

        const projects = response.data.data.map((apiProject: GetProjectDto, index: number) => 
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

  // Get a single project by ID — falls back to mock data if API fails
  getProjectById(id: string): Observable<Project | null> {
    const numericId = parseInt(id, 10);
    return this.http.get<any>(`${this.apiUrl}/Project/${numericId}`).pipe(
      catchError(() => of(null)),
      map(response => {
        if (response && response.succeeded && response.data) {
          return this.mapApiProjectToProject(response.data, 0);
        }
        // Fallback: find in mock data
        return this.mockProjects.find(p => p.id === id) ?? null;
      })
    );
  }

  // Add task to stage via API
  addTask(projectId: string, stageId: string, task: Partial<CreateTaskCommand>, projectStageId: number, taskTypeId: number = 1): Observable<boolean> {
    // Task is already in the correct format (CreateTaskCommand), just ensure required fields
    const createTaskCommand = new CreateTaskCommand({
      ...task,
      projectStageId: projectStageId,
      taskTypeId: taskTypeId
    });

    // Call API to create task
    return this.taskService.createTask(createTaskCommand).pipe(
      map((response) => {
        if (response.succeeded && response.data) {
          return response.data;
        } else {
          throw new Error('Failed to create task');
        }
      })
    );
  }
}
