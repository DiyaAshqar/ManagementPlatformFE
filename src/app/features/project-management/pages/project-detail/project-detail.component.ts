import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { GetProjectDto, ProjectStageDto, ProjectStageType } from '../../../../../nswag/api-client';
import { DocumentsStageComponent } from '../../components/documents-stage/documents-stage.component';
import { ExcavationStageComponent } from '../../components/excavation-stage/excavation-stage.component';
import { MilestoneStageComponent } from '../../components/milestone-stage/milestone-stage.component';
import { PreparingStageComponent } from '../../components/preparing-stage/preparing-stage.component';
import { StageKanbanComponent } from '../../components/stage-kanban/stage-kanban.component';
import { Project, ProjectStatus, Stage, TaskStatus } from '../../models';
import { GetProjectTaskDto } from '../../../../../nswag/api-client';
import { ProjectService } from '../../services/project.service';

interface ReportType {
  label: string;
  value: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TabsModule,
    TagModule,
    ProgressBarModule,
    TooltipModule,
    SkeletonModule,
    DialogModule,
    SelectModule,
    PreparingStageComponent,
    ExcavationStageComponent,
    MilestoneStageComponent,
    StageKanbanComponent,
    DocumentsStageComponent,
    // StagingBoardComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  project = signal<Project | null>(null);
  projectData = signal<GetProjectDto | null>(null);
  isLoading = signal<boolean>(true);
  activeTabIndex = "0";
  showPrintDialog = false;
  selectedReportType = 'full';
  
  // Computed signals for stage IDs
  preparingStageId = computed(() => {
    const stages = this.projectData()?.projectStages;
    return stages?.find((s: ProjectStageDto) => s.stageType === ProjectStageType._1)?.id || 0;
  });

  excavationStageId = computed(() => {
    const stages = this.projectData()?.projectStages;
    return stages?.find((s: ProjectStageDto) => s.stageType === ProjectStageType._2)?.id || 0;
  });
  
  reportTypes: ReportType[] = [
    { label: 'Full Project Report', value: 'full' },
    { label: 'Executive Summary', value: 'summary' },
    { label: 'Progress Report', value: 'progress' },
    { label: 'Financial Report', value: 'financial' },
    { label: 'Custom Report', value: 'custom' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  loadProject(id: string): void {
    this.isLoading.set(true);

    this.projectService.getProjectById(id).subscribe({
      next: (project) => {
        if (project) {
          this.project.set(project);
          this.projectData.set(null); // no raw DTO when using mock
        } else {
          this.router.navigate(['/projects']);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.router.navigate(['/projects']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }

  openPrintDialog(): void {
    this.showPrintDialog = true;
  }

  printReport(): void {
    console.log('Printing report:', this.selectedReportType);
    window.print();
    this.showPrintDialog = false;
  }

  downloadReport(): void {
    console.log('Downloading report:', this.selectedReportType);
    // Implement PDF download logic
    this.showPrintDialog = false;
  }

  viewStageDetails(stage: Stage): void {
    // Navigate to stage details or open a dialog
    console.log('Viewing stage details:', stage);
  }

  getStatusLabel(status: ProjectStatus): string {
    const statusLabels: Record<ProjectStatus, string> = {
      [ProjectStatus.PLANNING]: 'Planning',
      [ProjectStatus.IN_PROGRESS]: 'In Progress',
      [ProjectStatus.ON_HOLD]: 'On Hold',
      [ProjectStatus.COMPLETED]: 'Completed',
      [ProjectStatus.CANCELLED]: 'Cancelled'
    };
    return statusLabels[status] || status;
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

  getStageProgressSeverity(progress: number): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (progress === 100) return 'success';
    if (progress >= 60) return 'info';
    if (progress >= 30) return 'warn';
    return 'secondary';
  }

  getTaskStatusLabel(status: TaskStatus): string {
    const statusLabels: Record<TaskStatus, string> = {
      [TaskStatus.TODO]: 'To Do',
      [TaskStatus.IN_PROGRESS]: 'In Progress',
      [TaskStatus.REVIEW]: 'Review',
      [TaskStatus.BLOCKED]: 'Blocked',
      [TaskStatus.COMPLETED]: 'Completed'
    };
    return statusLabels[status] || status;
  }

  getTaskStatusSeverity(status: TaskStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'success';
      case TaskStatus.IN_PROGRESS:
        return 'info';
      case TaskStatus.BLOCKED:
        return 'danger';
      case TaskStatus.REVIEW:
        return 'warn';
      default:
        return 'secondary';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTasksByStage(stage: Stage): GetProjectTaskDto[] {
    return stage.tasks || [];
  }
}
