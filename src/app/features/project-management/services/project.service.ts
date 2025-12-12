import { Injectable, signal } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  GetProjectDto,
  GetProjectDtoListPagedResponseResponse,
  GetProjectDtoResponse,
  ProjectStatus as ApiProjectStatus,
  ProjectStageDto,
  ProjectStageType
} from '../../../../nswag/api-client';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  CreateProjectDto,
  UpdateProjectDto,
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
  selectedProject = signal<Project | null>(null);
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

  constructor(private http: HttpClient) {
    // Note: loadMockProjects() removed - using API data instead
  }

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
      return this.generateInitialStages();
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

  // Get project by ID from API
  getProjectById(id: string): Observable<Project | undefined> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return of(undefined);
    }

    return this.http.get<GetProjectDtoResponse>(`${this.apiUrl}/Project/${numericId}`).pipe(
      map(response => {
        if (!response.succeeded || !response.data) {
          return undefined;
        }
        return this.mapApiProjectToProject(response.data, 0);
      })
    );
  }

  // Create new project
  createProject(dto: CreateProjectDto): Observable<Project> {
    const newProject: Project = {
      id: this.generateId(),
      ...dto,
      status: ProjectStatus.PLANNING,
      progress: 0,
      spent: 0,
      team: [],
      stages: this.generateInitialStages(),
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projects.update(projects => [...projects, newProject]);
    this.updateStats(this.projects());
    return of(newProject).pipe(delay(500));
  }

  // Update existing project
  updateProject(id: string, dto: UpdateProjectDto): Observable<Project> {
    this.projects.update(projects => 
      projects.map(p => 
        p.id === id 
          ? { ...p, ...dto, updatedAt: new Date() }
          : p
      )
    );
    
    const updated = this.projects().find(p => p.id === id)!;
    this.updateStats(this.projects());
    return of(updated).pipe(delay(500));
  }

  // Delete project
  deleteProject(id: string): Observable<void> {
    this.projects.update(projects => projects.filter(p => p.id !== id));
    this.updateStats(this.projects());
    return of(void 0).pipe(delay(300));
  }

  // Get project statistics
  getProjectStats(): Observable<ProjectStats> {
    this.updateStats(this.projects());
    return of(this.stats()).pipe(delay(200));
  }

  // Update task status in a stage
  updateTaskStatus(projectId: string, stageId: string, taskId: string, status: TaskStatus): Observable<void> {
    this.projects.update(projects => 
      projects.map(project => {
        if (project.id === projectId) {
          const stages = project.stages.map(stage => {
            if (stage.id === stageId) {
              const tasks = stage.tasks.map(task => 
                task.id === taskId ? { ...task, status } : task
              );
              const progress = this.calculateStageProgress(tasks);
              return { ...stage, tasks, progress };
            }
            return stage;
          });
          const projectProgress = this.calculateProjectProgress(stages);
          return { ...project, stages, progress: projectProgress };
        }
        return project;
      })
    );
    return of(void 0).pipe(delay(200));
  }

  // Add task to stage
  addTask(projectId: string, stageId: string, task: Omit<Task, 'id'>): Observable<Task> {
    const newTask: Task = {
      ...task,
      id: this.generateId()
    };

    this.projects.update(projects => 
      projects.map(project => {
        if (project.id === projectId) {
          const stages = project.stages.map(stage => 
            stage.id === stageId 
              ? { ...stage, tasks: [...stage.tasks, newTask] }
              : stage
          );
          return { ...project, stages };
        }
        return project;
      })
    );

    return of(newTask).pipe(delay(300));
  }

  // Private helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInitialStages(): Stage[] {
    const stages: Stage[] = [
      {
        id: this.generateId(),
        name: 'Preparing',
        projectId: '',
        order: 1,
        status: StageStatus.PREPARING,
        tasks: [],
        progress: 0
      },
      {
        id: this.generateId(),
        name: 'Excavation',
        projectId: '',
        order: 2,
        status: StageStatus.EXCAVATION,
        tasks: [],
        progress: 0
      },
      {
        id: this.generateId(),
        name: 'Foundation',
        projectId: '',
        order: 3,
        status: StageStatus.FOUNDATION,
        tasks: [],
        progress: 0
      },
      {
        id: this.generateId(),
        name: 'Structure',
        projectId: '',
        order: 4,
        status: StageStatus.STRUCTURE,
        tasks: [],
        progress: 0
      },
      {
        id: this.generateId(),
        name: 'Finishing',
        projectId: '',
        order: 5,
        status: StageStatus.FINISHING,
        tasks: [],
        progress: 0
      },
      {
        id: this.generateId(),
        name: 'Milestone',
        projectId: '',
        order: 6,
        status: StageStatus.MILESTONE,
        tasks: [],
        progress: 0
      }
    ];

    return stages;
  }

  private calculateStageProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.round(totalProgress / tasks.length);
  }

  private calculateProjectProgress(stages: Stage[]): number {
    if (stages.length === 0) return 0;
    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
    return Math.round(totalProgress / stages.length);
  }
}
