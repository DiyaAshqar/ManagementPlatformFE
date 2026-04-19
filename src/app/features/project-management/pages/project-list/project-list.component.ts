import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { ProjectService } from '../../services/project.service';
import { Project, ProjectStatus, ProjectPriority, ProjectFilters } from '../../models';
import { CreateProjectDialogComponent } from '../../components/dialog/create-project-dialog/create-project-dialog.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    TagModule,
    ProgressBarModule,
    TooltipModule,
    CardModule,
    DropdownModule,
    MultiSelectModule,
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    MenuModule,
    CreateProjectDialogComponent
  ],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  projects = signal<Project[]>([]);
  filteredProjects = signal<Project[]>([]);
  isLoading = signal<boolean>(false);
  showCreateDialog = signal<boolean>(false);
  editingProject: Project | null = null;
  
  // Menu items for project actions
  projectMenuItems: MenuItem[] = [];
  selectedProject: Project | null = null;

  // Filters
  searchText: string = '';
  selectedStatuses = signal<ProjectStatus[]>([]);
  selectedPriorities = signal<ProjectPriority[]>([]);

  // Dropdown options
  statusOptions = [
    { label: 'Planning', value: ProjectStatus.PLANNING },
    { label: 'In Progress', value: ProjectStatus.IN_PROGRESS },
    { label: 'On Hold', value: ProjectStatus.ON_HOLD },
    { label: 'Completed', value: ProjectStatus.COMPLETED },
    { label: 'Cancelled', value: ProjectStatus.CANCELLED }
  ];

  priorityOptions = [
    { label: 'Low', value: ProjectPriority.LOW },
    { label: 'Medium', value: ProjectPriority.MEDIUM },
    { label: 'High', value: ProjectPriority.HIGH },
    { label: 'Urgent', value: ProjectPriority.URGENT }
  ];

  constructor(
    private projectService: ProjectService,
    private router: Router
  ) {}

  // Stats
  get stats() {
    return this.projectService.stats;
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    const filters: ProjectFilters = {
      search: this.searchText || undefined,
      status: this.selectedStatuses().length > 0 ? this.selectedStatuses() : undefined,
      priority: this.selectedPriorities().length > 0 ? this.selectedPriorities() : undefined
    };

    this.projectService.getProjects(filters).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.filteredProjects.set(projects);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.loadProjects();
  }

  onFilterChange(): void {
    this.loadProjects();
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedStatuses.set([]);
    this.selectedPriorities.set([]);
    this.loadProjects();
  }

  filterByStatus(status: string): void {
    const statusEnum = status as ProjectStatus;
    const currentStatuses = this.selectedStatuses();
    
    if (currentStatuses.includes(statusEnum)) {
      this.selectedStatuses.set([]);
    } else {
      this.selectedStatuses.set([statusEnum]);
    }
    
    this.loadProjects();
  }

  isStatusSelected(status: string): boolean {
    const statusEnum = status as ProjectStatus;
    return this.selectedStatuses().includes(statusEnum);
  }

  getTopStages(project: Project): any[] {
    return project.stages.slice(0, 3);
  }

  openCreateDialog(): void {
    this.editingProject = null;
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
    this.editingProject = null;
  }

  onProjectCreated(project: Project): void {
    this.closeCreateDialog();
    this.loadProjects();
  }

  viewProject(project: Project): void {
    this.router.navigate(['/projects', project.id]);
  }

  getProjectMenuItems(project: Project): MenuItem[] {
    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => this.viewProject(project)
      },
      {
        label: 'Edit Project',
        icon: 'pi pi-pencil',
        command: () => this.editProject(project)
      }
    ];
  }

  onMenuToggle(event: Event, menu: any, project: Project): void {
    event.stopPropagation();
    this.selectedProject = project;
    this.projectMenuItems = this.getProjectMenuItems(project);
    menu.toggle(event);
  }

  editProject(project: Project): void {
    this.editingProject = project;
    this.showCreateDialog.set(true);
  }

  deleteProject(project: Project): void {
    // TODO: Implement delete with confirmation
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      this.projectService.deleteProject(project.id).subscribe({
        next: () => {
          this.loadProjects();
        },
        error: (error) => {
          console.error('Error deleting project:', error);
        }
      });
    }
  }

  getStatusSeverity(status: ProjectStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case ProjectStatus.COMPLETED:
        return 'success';
      case ProjectStatus.IN_PROGRESS:
        return 'info';
      case ProjectStatus.ON_HOLD:
        return 'warn';
      case ProjectStatus.CANCELLED:
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getPrioritySeverity(priority: ProjectPriority): 'success' | 'info' | 'warn' | 'danger' {
    switch (priority) {
      case ProjectPriority.LOW:
        return 'success';
      case ProjectPriority.MEDIUM:
        return 'info';
      case ProjectPriority.HIGH:
        return 'warn';
      case ProjectPriority.URGENT:
        return 'danger';
      default:
        return 'info';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
