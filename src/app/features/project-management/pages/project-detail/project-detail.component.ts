import { CommonModule } from '@angular/common';
import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

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
import { OwnerPaymentTabComponent } from '../../components/owner-payment-tab/owner-payment-tab.component';
import { PreparingStageComponent } from '../../components/preparing-stage/preparing-stage.component';
import { StageKanbanComponent } from '../../components/stage-kanban/stage-kanban.component';
import { TimeframeComponent } from '../../components/timeframe/timeframe.component';
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
    OwnerPaymentTabComponent,
    StageKanbanComponent,
    TimeframeComponent,
    DocumentsStageComponent,
    // StagingBoardComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project = signal<Project | null>(null);
  projectData = signal<GetProjectDto | null>(null);
  isLoading = signal<boolean>(true);
  activeTabIndex = "0";
  showPrintDialog = false;
  selectedReportType = 'full';
  private langSub!: Subscription;
  
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
  
  reportTypes: ReportType[] = [];

  private buildReportTypes(): void {
    this.reportTypes = [
      { label: this.translate.instant('projectDetail.printDialog.reportTypes.full'), value: 'full' },
      { label: this.translate.instant('projectDetail.printDialog.reportTypes.summary'), value: 'summary' },
      { label: this.translate.instant('projectDetail.printDialog.reportTypes.progress'), value: 'progress' },
      { label: this.translate.instant('projectDetail.printDialog.reportTypes.financial'), value: 'financial' },
      { label: this.translate.instant('projectDetail.printDialog.reportTypes.custom'), value: 'custom' }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.buildReportTypes();
    this.langSub = this.translate.onLangChange.subscribe(() => this.buildReportTypes());
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
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
