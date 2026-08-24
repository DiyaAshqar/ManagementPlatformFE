import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { ConfirmationService } from 'primeng/api';
import {
  CreateProjectVOCommand,
  IGetProjectVODto,
  LookupClient,
  LookupType,
  ProjectVOClient
} from '../../../../../../../nswag/api-client';
import { AddVoDialogComponent } from '../../../dialog/add-vo-dialog/add-vo-dialog.component';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';
import { AppNumberPipe } from '../../../../../../shared/pipes/app-number.pipe';

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
    BadgeModule,
    AddVoDialogComponent,
    HasPermissionDirective,
    AppNumberPipe
  ],
  providers: [ProjectVOClient, LookupClient],
  templateUrl: './voucher-orders-tab.component.html',
  styleUrls: ['./voucher-orders-tab.component.scss']
})
export class VoucherOrdersTabComponent implements OnInit {
  readonly permissions = Permissions;
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
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadVOItems();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    this.lookupClient.getAllLookups([LookupType.Unit]).subscribe({
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
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    if (!this.canManage()) return;
    this.editVoItem.set(null);
    this.showVoDialog.set(true);
  }

  openEditDialog(item: IGetProjectVODto): void {
    if (!this.canManage()) return;
    this.editVoItem.set(item);
    this.showVoDialog.set(true);
  }

  onDialogSaved(command: CreateProjectVOCommand): void {
    if (!this.canManage()) return;
    this.voClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadVOItems();
          this.showVoDialog.set(false);
        }
      },
      error: (err) => {
        console.error('Error saving VO item:', err);
      }
    });
  }

  confirmDelete(item: IGetProjectVODto): void {
    if (!this.canManage()) return;
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.vo.confirmDelete.message', { name: item.voNumber }),
      header: this.translate.instant('projectTabs.vo.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.voClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadVOItems();
            }
          },
          error: (err) => {
            console.error('Error deleting VO item:', err);
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

  canManage(): boolean {
    return this.authService.hasPermission(Permissions.VoucherOrders.Manage);
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
