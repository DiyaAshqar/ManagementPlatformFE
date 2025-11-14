import { Injectable, signal } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
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

  constructor() {
    this.loadMockProjects();
  }

  // Get all projects with optional filters
  getProjects(filters?: ProjectFilters): Observable<Project[]> {
    return of(this.projects()).pipe(
      delay(500),
      map(projects => {
        if (!filters) return projects;

        return projects.filter(project => {
          // Search filter
          if (filters.search) {
            const search = filters.search.toLowerCase();
            const matchesSearch = 
              project.name.toLowerCase().includes(search) ||
              project.description.toLowerCase().includes(search) ||
              project.clientName.toLowerCase().includes(search);
            if (!matchesSearch) return false;
          }

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
      })
    );
  }

  // Get project by ID
  getProjectById(id: string): Observable<Project | undefined> {
    return of(this.projects().find(p => p.id === id)).pipe(delay(300));
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
    this.updateStats();
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
    this.updateStats();
    return of(updated).pipe(delay(500));
  }

  // Delete project
  deleteProject(id: string): Observable<void> {
    this.projects.update(projects => projects.filter(p => p.id !== id));
    this.updateStats();
    return of(void 0).pipe(delay(300));
  }

  // Get project statistics
  getProjectStats(): Observable<ProjectStats> {
    this.updateStats();
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

  private updateStats(): void {
    const projects = this.projects();
    const stats: ProjectStats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length,
      completedProjects: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
      onHoldProjects: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length,
      totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
      totalSpent: projects.reduce((sum, p) => sum + p.spent, 0),
      averageProgress: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
        : 0
    };
    this.stats.set(stats);
  }

  // Load mock data for demonstration
  private loadMockProjects(): void {
    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'Downtown Commercial Complex',
        description: 'Multi-story commercial building with retail and office spaces',
        status: ProjectStatus.IN_PROGRESS,
        priority: ProjectPriority.HIGH,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-12-31'),
        progress: 45,
        budget: 5000000,
        spent: 2250000,
        clientName: 'ABC Corporation',
        projectManager: 'John Smith',
        team: [
          { id: '1', name: 'John Smith', role: 'Project Manager', email: 'john@example.com' },
          { id: '2', name: 'Sarah Johnson', role: 'Site Engineer', email: 'sarah@example.com' },
          { id: '3', name: 'Mike Davis', role: 'Safety Officer', email: 'mike@example.com' }
        ],
        stages: this.generateMockStages('1'),
        documents: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Residential Tower Project',
        description: '30-floor residential tower with amenities',
        status: ProjectStatus.IN_PROGRESS,
        priority: ProjectPriority.MEDIUM,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2026-06-30'),
        progress: 25,
        budget: 8000000,
        spent: 2000000,
        clientName: 'Real Estate Developers Ltd',
        projectManager: 'Emily Brown',
        team: [
          { id: '4', name: 'Emily Brown', role: 'Project Manager', email: 'emily@example.com' },
          { id: '5', name: 'David Wilson', role: 'Structural Engineer', email: 'david@example.com' }
        ],
        stages: this.generateMockStages('2'),
        documents: [],
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Industrial Warehouse Expansion',
        description: 'Large-scale warehouse facility expansion',
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-08-31'),
        progress: 15,
        budget: 1200000,
        spent: 180000,
        clientName: 'LogiTech Industries',
        projectManager: 'Michael Chen',
        team: [
          { id: '7', name: 'Michael Chen', role: 'Project Manager', email: 'michael@example.com' }
        ],
        stages: this.generateMockStages('3'),
        documents: [],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date()
      },
      {
        id: '4',
        name: 'Shopping Mall Renovation',
        description: 'Complete interior renovation of shopping complex',
        status: ProjectStatus.COMPLETED,
        priority: ProjectPriority.LOW,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2024-10-31'),
        progress: 100,
        budget: 3500000,
        spent: 3400000,
        clientName: 'Retail Spaces Inc',
        projectManager: 'Jennifer White',
        team: [
          { id: '8', name: 'Jennifer White', role: 'Project Manager', email: 'jennifer@example.com' },
          { id: '9', name: 'Tom Anderson', role: 'Interior Designer', email: 'tom@example.com' }
        ],
        stages: this.generateMockStages('4'),
        documents: [],
        createdAt: new Date('2023-05-01'),
        updatedAt: new Date()
      }
    ];

    this.projects.set(mockProjects);
    this.updateStats();
  }

  private generateMockStages(projectId: string): Stage[] {
    const stages = this.generateInitialStages();
    stages.forEach(stage => {
      stage.projectId = projectId;
      // Add some mock tasks
      if (stage.order <= 2) {
        stage.tasks = [
          {
            id: this.generateId(),
            title: `${stage.name} Task 1`,
            description: `Complete ${stage.name} phase`,
            stageId: stage.id,
            assignedTo: 'Team Member',
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.HIGH,
            progress: 100,
            dependencies: [],
            attachments: []
          },
          {
            id: this.generateId(),
            title: `${stage.name} Task 2`,
            description: `Quality check for ${stage.name}`,
            stageId: stage.id,
            assignedTo: 'Team Member',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.MEDIUM,
            progress: 60,
            dependencies: [],
            attachments: []
          }
        ];
        stage.progress = this.calculateStageProgress(stage.tasks);
      }
    });
    return stages;
  }
}
