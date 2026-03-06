import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  CreateProjectVOCommand,
  IGetProjectVODto,
  LookupClient,
  ProjectVOClient
} from '../../../../../../../nswag/api-client';
import { AddVoDialogComponent } from '../../../dialog/add-vo-dialog/add-vo-dialog.component';

// VO Status enum matching the backend
export enum VOStatus {
  Approved = 1,
  Pending = 2,
  Rejected = 3
}

@Component({
  selector: 'app-voucher-orders-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    ToastModule,
    BadgeModule,
    AddVoDialogComponent
  ],
  providers: [MessageService, ProjectVOClient, LookupClient],
  templateUrl: './voucher-orders-tab.component.html',
  styleUrls: ['./voucher-orders-tab.component.scss']
})
export class VoucherOrdersTabComponent implements OnInit {
  @Input() projectStageId: number = 0;

  voItems = signal<IGetProjectVODto[]>([]);
  isLoading = signal(false);

  showVoDialog = signal(false);
  editVoItem = signal<IGetProjectVODto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  unitMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  unitOptions: { label: string; value: number }[] = [];

  // Status enum for template access
  VOStatus = VOStatus;

  get totalVOValue(): number {
    return this.voItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
  }

  constructor(
    private voClient: ProjectVOClient,
    private lookupClient: LookupClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadVOItems();
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

  loadVOItems(): void {
    this.isLoading.set(true);

    this.voClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
      next: (res) => {
        if (res.succeeded && res.data?.data) {
          this.voItems.set(res.data.data);
        } else {
          this.voItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading VO items:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load Voucher Orders.'
        });
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.editVoItem.set(null);
    this.showVoDialog.set(true);
  }

  openEditDialog(item: IGetProjectVODto): void {
    this.editVoItem.set(item);
    this.showVoDialog.set(true);
  }

  onDialogSaved(command: CreateProjectVOCommand): void {
    this.voClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadVOItems();
          this.showVoDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: command.id ? 'Updated' : 'Added',
            detail: command.id ? 'Voucher Order updated successfully.' : 'Voucher Order added successfully.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'Failed to save Voucher Order.'
          });
        }
      },
      error: (err) => {
        console.error('Error saving VO item:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save Voucher Order.'
        });
      }
    });
  }

  confirmDelete(item: IGetProjectVODto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.vo.confirmDelete.message', { name: item.voNumber }),
      header: this.translate.instant('projectTabs.vo.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.voClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadVOItems();
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('common.success'),
                detail: 'Voucher Order removed successfully.'
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail: res.message || 'Failed to delete Voucher Order.'
              });
            }
          },
          error: (err) => {
            console.error('Error deleting VO item:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete Voucher Order.'
            });
          }
        });
      }
    });
  }

  getStatusSeverity(status?: number): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 1: return 'success'; // Approved
      case 2: return 'warn';    // Pending
      case 3: return 'danger';  // Rejected
      default: return 'secondary';
    }
  }

  getStatusLabel(status?: number): string {
    switch (status) {
      case 1: return 'Approved';
      case 2: return 'Pending';
      case 3: return 'Rejected';
      default: return 'Unknown';
    }
  }

  formatDate(date?: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
