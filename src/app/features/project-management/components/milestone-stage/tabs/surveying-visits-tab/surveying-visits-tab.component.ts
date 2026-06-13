import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { ConfirmationService } from 'primeng/api';
import {
  CreateProjectSurveyingVisitCommand,
  GetProjectSurveyingVisitDto,
  LookupClient,
  ProjectSurveyingVisitClient
} from '../../../../../../../nswag/api-client';
import { AddSurveyingVisitDialogComponent } from '../../../dialog/add-surveying-visit-dialog/add-surveying-visit-dialog.component';

export enum VisitStatus {
  InProgress = 0,
  Scheduled  = 1,
  Completed  = 2
}

@Component({
  selector: 'app-surveying-visits-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule,
    AddSurveyingVisitDialogComponent
  ],
  providers: [ProjectSurveyingVisitClient, LookupClient],
  templateUrl: './surveying-visits-tab.component.html',
  styleUrls: ['./surveying-visits-tab.component.scss']
})
export class SurveyingVisitsTabComponent implements OnInit {
  @Input() projectStageId: number = 0;

  visitItems  = signal<GetProjectSurveyingVisitDto[]>([]);
  isLoading   = signal(false);

  showDialog  = signal(false);
  editItem    = signal<GetProjectSurveyingVisitDto | null>(null);

  // Lookup maps (display)
  unitMap: Record<number, string> = {};

  // Option arrays (for dialog)
  unitOptions: { label: string; value: number }[] = [];

  VisitStatus = VisitStatus;

  get totalSurveyValue(): number {
    return this.visitItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
  }

  getAmount(item: GetProjectSurveyingVisitDto): number {
    return (item.price ?? 0) * (item.quantity ?? 0);
  }

  constructor(
    private svClient: ProjectSurveyingVisitClient,
    private lookupClient: LookupClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadItems();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    this.lookupClient.getAllLookups(['unit']).subscribe({
      next: (lookups) => {
        const data = lookups.data as any;
        if (data?.['unit']) {
          this.unitOptions = (data['unit'] as { id: number; name: string }[])
            .map(u => ({ label: u.name, value: u.id }));
          this.unitMap = Object.fromEntries(this.unitOptions.map(o => [o.value, o.label]));
        }
      }
    });
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  loadItems(): void {
    this.isLoading.set(true);
    this.svClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
      next: (res) => {
        if (res.succeeded && res.data?.data) {
          this.visitItems.set(res.data.data);
        } else {
          this.visitItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading surveying visits:', err);
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.editItem.set(null);
    this.showDialog.set(true);
  }

  openEditDialog(item: GetProjectSurveyingVisitDto): void {
    this.editItem.set(item);
    this.showDialog.set(true);
  }

  onDialogSaved(command: CreateProjectSurveyingVisitCommand): void {
    this.svClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadItems();
          this.showDialog.set(false);
        }
      },
      error: () => {
      }
    });
  }

  confirmDelete(item: GetProjectSurveyingVisitDto): void {
    const visitDate = item.visitDate ? new Date(item.visitDate).toLocaleDateString() : 'this visit';
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.surveyingVisit.confirmDelete.message', { name: visitDate }),
      header: this.translate.instant('projectTabs.surveyingVisit.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.svClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadItems();
            }
          },
          error: () => {
          }
        });
      }
    });
  }

  getStatusSeverity(status?: number): 'success' | 'warn' | 'secondary' {
    switch (status) {
      case VisitStatus.Completed:  return 'success';
      case VisitStatus.InProgress: return 'warn';
      case VisitStatus.Scheduled:  return 'secondary';
      default:                      return 'secondary';
    }
  }

  getStatusLabel(status?: number): string {
    switch (status) {
      case VisitStatus.InProgress: return 'In Progress';
      case VisitStatus.Scheduled:  return 'Scheduled';
      case VisitStatus.Completed:  return 'Completed';
      default:                      return 'Unknown';
    }
  }
}
