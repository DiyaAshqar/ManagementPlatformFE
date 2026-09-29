import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { GetProjectDto, ProjectStageDto, ProjectStageType } from '../../../../../nswag/api-client';
import { DocumentsStageComponent } from '../../components/documents-stage/documents-stage.component';
import { ExcavationStageComponent } from '../../components/excavation-stage/excavation-stage.component';
import { MilestoneStageComponent } from '../../components/milestone-stage/milestone-stage.component';
import { OwnerPaymentTabComponent } from '../../components/owner-payment-tab/owner-payment-tab.component';
import { PreparingStageComponent } from '../../components/preparing-stage/preparing-stage.component';
import { ProjectReportDialogComponent } from '../../components/project-report/project-report-dialog/project-report-dialog.component';
import { StageKanbanComponent } from '../../components/stage-kanban/stage-kanban.component';
import { TimeframeComponent } from '../../components/timeframe/timeframe.component';
import { Project, ProjectStatus, Stage, TaskStatus } from '../../models';
import { GetProjectTaskDto } from '../../../../../nswag/api-client';
import { ProjectService } from '../../services/project.service';
import { Permissions } from '../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../core/auth/directives/has-permission.directive';

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
    PreparingStageComponent,
    ExcavationStageComponent,
    MilestoneStageComponent,
    OwnerPaymentTabComponent,
    ProjectReportDialogComponent,
    StageKanbanComponent,
    TimeframeComponent,
    DocumentsStageComponent,
    HasPermissionDirective,
    // StagingBoardComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  readonly permissions = Permissions;
  project = signal<Project | null>(null);
  projectData = signal<GetProjectDto | null>(null);
  isLoading = signal<boolean>(true);
  activeTabIndex = "0";
  showReportDialog = false;

  // Computed signals for stage IDs
  preparingStageId = computed(() => {
    const stages = this.projectData()?.projectStages;
    return stages?.find((s: ProjectStageDto) => s.stageType === ProjectStageType.Preparing)?.id || 0;
  });

  excavationStageId = computed(() => {
    const stages = this.projectData()?.projectStages;
    return stages?.find((s: ProjectStageDto) => s.stageType === ProjectStageType.Excavation)?.id || 0;
  });

  // Get all milestone stages (stageType = 3) for accordion
  milestoneStages = computed(() => {
    const stages = this.projectData()?.projectStages;
    return stages?.filter((s: ProjectStageDto) => s.stageType === ProjectStageType.Milestones) || [];
  });

  projectIdNumber = computed(() => Number(this.project()?.id ?? 0));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private translate: TranslateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.activeTabIndex = this.firstAccessibleTab();
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  canViewTab(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  private firstAccessibleTab(): string {
    const tabs = [
      ['0', Permissions.ProjectTabs.Overview],
      ['1', Permissions.ProjectTabs.Preparing],
      ['2', Permissions.ProjectTabs.Excavation],
      ['4', Permissions.ProjectTabs.Milestones],
      ['5', Permissions.ProjectTabs.Documents],
      ['6', Permissions.ProjectTabs.OwnerPayments],
      ['7', Permissions.ProjectTabs.Timeframe],
    ] as const;
    return tabs.find(([, permission]) => this.canViewTab(permission))?.[0] ?? '0';
  }

  loadProject(id: string): void {
    this.isLoading.set(true);

    this.projectService.getProjectById(id).subscribe({
      next: (response) => {
        if (response) {
          this.projectData.set(response.raw);
          this.project.set(response.project);
          this.isLoading.set(false);
        } else {
          this.isLoading.set(false);
          this.router.navigate(['/projects']);
        }
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

  viewStageDetails(stage: Stage): void {
    // Navigate to stage details or open a dialog
    console.log('Viewing stage details:', stage);
  }

  getStatusLabel(status: ProjectStatus): string {
    const statusKeys: Record<ProjectStatus, string> = {
      [ProjectStatus.PLANNING]: 'projects.status.planning',
      [ProjectStatus.IN_PROGRESS]: 'projects.status.in_progress',
      [ProjectStatus.ON_HOLD]: 'projects.status.on_hold',
      [ProjectStatus.COMPLETED]: 'projects.status.completed',
      [ProjectStatus.CANCELLED]: 'projects.status.cancelled'
    };
    return this.translate.instant(statusKeys[status] || status);
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
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
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
