// Project Management Models and Interfaces

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: Date;
  endDate: Date;
  progress: number;
  budget: number;
  spent: number;
  clientName: string;
  projectManager: string;
  agreementId?: number; // Add agreementId field
  team: TeamMember[];
  stages: Stage[];
  documents: ProjectDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Stage {
  id: string;
  name: string;
  projectId: string;
  order: number;
  status: StageStatus;
  tasks: any[]; // Using any[] to avoid circular dependency with GetProjectTaskDto
  startDate?: Date;
  endDate?: Date;
  progress: number;
}

export enum StageStatus {
  PREPARING = 'preparing',
  EXCAVATION = 'excavation',
  FOUNDATION = 'foundation',
  STRUCTURE = 'structure',
  FINISHING = 'finishing',
  MILESTONE = 'milestone',
  COMPLETED = 'completed'
}

// Task interface removed - use GetProjectTaskDto from api-client.ts instead

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  BLOCKED = 'blocked',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  type: DocumentType;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export enum DocumentType {
  DRAWING = 'drawing',
  SPECIFICATION = 'specification',
  CONTRACT = 'contract',
  REPORT = 'report',
  IMAGE = 'image',
  OTHER = 'other'
}

export interface CreateProjectDto {
  name: string;
  description: string;
  clientName: string;
  projectManager: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  priority: ProjectPriority;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  projectManager?: string;
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  startDate?: Date;
  endDate?: Date;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalBudget: number;
  totalSpent: number;
  averageProgress: number;
}
