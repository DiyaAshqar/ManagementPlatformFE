import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  CreateProjectMainContractorCommand,
  IGetProjectMainContractorDto,
  ProjectMainContractorClient,
  SupplierClient
} from '../../../../../../../nswag/api-client';
import { AddContractorDialogComponent } from '../../../dialog/add-contractor-dialog/add-contractor-dialog.component';

@Component({
  selector: 'app-project-main-contractor-tab',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ConfirmDialogModule,
    SkeletonModule,
    TableModule,
    ToastModule,
    TooltipModule,
    BadgeModule,
    AddContractorDialogComponent
  ],
  providers: [MessageService, ConfirmationService, ProjectMainContractorClient, SupplierClient],
  templateUrl: './project-main-contractor-tab.component.html',
  styleUrl: './project-main-contractor-tab.component.scss'
})
export class ProjectMainContractorTabComponent implements OnInit {
  @Input() projectStageId!: number;

  contractorItems = signal<IGetProjectMainContractorDto[]>([]);
  isLoading = signal(false);

  showContractorDialog = signal(false);
  editContractorItem = signal<IGetProjectMainContractorDto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  contractorMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  contractorOptions: { label: string; value: number }[] = [];

  get totalContractValue(): number {
    return this.contractorItems().reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }

  constructor(
    private contractorClient: ProjectMainContractorClient,
    private supplierClient: SupplierClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadContractorData();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    this.supplierClient.getAllSuppliers(1, 200, undefined).subscribe({
      next: (suppliers) => {
        const supplierData = suppliers.data?.data ?? [];
        this.contractorOptions = supplierData
          .filter(s => s.id != null && s.name)
          .map(s => ({ label: s.name!, value: s.id! }));
        this.contractorMap = Object.fromEntries(this.contractorOptions.map(o => [o.value, o.label]));
      }
    });
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  loadContractorData(): void {
    this.isLoading.set(true);

    this.contractorClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
      next: (res) => {
        if (res.succeeded && res.data?.data) {
          this.contractorItems.set(res.data.data);
        } else {
          this.contractorItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading contractor items:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load Main Contractors.'
        });
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.editContractorItem.set(null);
    this.showContractorDialog.set(true);
  }

  openEditDialog(item: IGetProjectMainContractorDto): void {
    this.editContractorItem.set(item);
    this.showContractorDialog.set(true);
  }

  onDialogSaved(command: CreateProjectMainContractorCommand): void {
    this.contractorClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadContractorData();
          this.showContractorDialog.set(false);
          this.messageService.add({
            severity: 'success',
            summary: command.id ? 'Updated' : 'Added',
            detail: command.id ? 'Main Contractor updated successfully.' : 'Main Contractor added successfully.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'Failed to save Main Contractor.'
          });
        }
      },
      error: (err) => {
        console.error('Error saving contractor item:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save Main Contractor.'
        });
      }
    });
  }

  confirmDelete(item: IGetProjectMainContractorDto): void {
    const contractorName = this.contractorMap[item.constructorId ?? 0] || 'this contractor';
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${contractorName}"?`,
      header: 'Delete Main Contractor',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.contractorClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadContractorData();
              this.messageService.add({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Main Contractor removed successfully.'
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: res.message || 'Failed to delete Main Contractor.'
              });
            }
          },
          error: (err) => {
            console.error('Error deleting contractor item:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete Main Contractor.'
            });
          }
        });
      }
    });
  }
}
