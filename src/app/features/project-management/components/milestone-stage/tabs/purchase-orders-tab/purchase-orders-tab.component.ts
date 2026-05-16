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
  CreateProjectPOCommand,
  IGetProjectPODto,
  LookupClient,
  ProjectPOClient,
  SupplierClient
} from '../../../../../../../nswag/api-client';
import { AddPoDialogComponent } from '../../../dialog/add-po-dialog/add-po-dialog.component';

// PO Status enum matching the backend
export enum POStatus {
  Approved = 1,
  Pending = 2,
  Rejected = 3
}

@Component({
  selector: 'app-purchase-orders-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule,
    AddPoDialogComponent
  ],
  providers: [ProjectPOClient, LookupClient, SupplierClient],
  templateUrl: './purchase-orders-tab.component.html',
  styleUrls: ['./purchase-orders-tab.component.scss']
})
export class PurchaseOrdersTabComponent implements OnInit {
  @Input() projectStageId: number = 0;

  poItems = signal<IGetProjectPODto[]>([]);
  isLoading = signal(false);

  showPoDialog = signal(false);
  editPoItem = signal<IGetProjectPODto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  unitMap: Record<number, string> = {};
  supplierMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  unitOptions: { label: string; value: number }[] = [];
  supplierOptions: { label: string; value: number }[] = [];

  // Status enum for template access
  POStatus = POStatus;

  get totalPOValue(): number {
    return this.poItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
  }

  getAmount(item: IGetProjectPODto): number {
    return (item.price ?? 0);
  }

  constructor(
    private poClient: ProjectPOClient,
    private lookupClient: LookupClient,
    private supplierClient: SupplierClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadPOItems();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    forkJoin({
      lookups: this.lookupClient.getAllLookups(['unit']),
      suppliers: this.supplierClient.getAllSuppliers(1, 200, undefined)
    }).subscribe({
      next: ({ lookups, suppliers }) => {
        const data = lookups.data as any;

        if (data?.['unit']) {
          this.unitOptions = (data['unit'] as { id: number; name: string }[])
            .map(u => ({ label: u.name, value: u.id }));
          this.unitMap = Object.fromEntries(this.unitOptions.map(o => [o.value, o.label]));
        }

        const supplierData = suppliers.data?.data ?? [];
        this.supplierOptions = supplierData
          .filter(s => s.id != null && s.name)
          .map(s => ({ label: s.name!, value: s.id! }));
        this.supplierMap = Object.fromEntries(this.supplierOptions.map(o => [o.value, o.label]));
      }
    });
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  loadPOItems(): void {
    this.isLoading.set(true);

    this.poClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
      next: (res) => {
        if (res.succeeded && res.data?.data) {
          this.poItems.set(res.data.data);
        } else {
          this.poItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading PO items:', err);
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.editPoItem.set(null);
    this.showPoDialog.set(true);
  }

  openEditDialog(item: IGetProjectPODto): void {
    this.editPoItem.set(item);
    this.showPoDialog.set(true);
  }

  onDialogSaved(command: CreateProjectPOCommand): void {
    this.poClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadPOItems();
          this.showPoDialog.set(false);
        }
      },
      error: (err) => {
        console.error('Error saving PO item:', err);
      }
    });
  }

  confirmDelete(item: IGetProjectPODto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.po.confirmDelete.message', { name: item.poNumber }),
      header: this.translate.instant('projectTabs.po.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.poClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadPOItems();
            }
          },
          error: (err) => {
            console.error('Error deleting PO item:', err);
          }
        });
      }
    });
  }

  getStatusSeverity(status?: number): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case POStatus.Approved: return 'success';
      case POStatus.Pending: return 'warn';
      case POStatus.Rejected: return 'danger';
      default: return 'secondary';
    }
  }

  getStatusLabel(status?: number): string {
    switch (status) {
      case POStatus.Approved: return 'Approved';
      case POStatus.Pending: return 'Pending';
      case POStatus.Rejected: return 'Rejected';
      default: return 'Unknown';
    }
  }
}
