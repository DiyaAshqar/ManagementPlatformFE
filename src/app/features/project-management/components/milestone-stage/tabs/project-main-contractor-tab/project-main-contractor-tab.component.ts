import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ContractorDutyDto,
  ConstructorClient,
  CreateProjectMainContractorCommand,
  IGetProjectMainContractorDto,
  ProjectMainContractorClient
} from '../../../../../../../nswag/api-client';
import { AddContractorDialogComponent } from '../../../dialog/add-contractor-dialog/add-contractor-dialog.component';
import { ContractorDutiesDialogComponent } from '../../../../../agreement-wizard/components/steps/step4/contractor-duties-dialog/contractor-duties-dialog.component';
import { ProjectMainContractorPaymentsComponent } from '../../../../components/project-main-contractor/project-main-contractor-payments/project-main-contractor-payments.component';

@Component({
  selector: 'app-project-main-contractor-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    DialogModule,
    SkeletonModule,
    TableModule,
    TooltipModule,
    BadgeModule,
    AddContractorDialogComponent,
    ContractorDutiesDialogComponent,
    ProjectMainContractorPaymentsComponent
  ],
  providers: [ProjectMainContractorClient, ConstructorClient],
  templateUrl: './project-main-contractor-tab.component.html',
  styleUrl: './project-main-contractor-tab.component.scss'
})
export class ProjectMainContractorTabComponent implements OnInit {
  @Input() projectStageId!: number;

  contractorItems = signal<IGetProjectMainContractorDto[]>([]);
  isLoading = signal(false);

  showContractorDialog = signal(false);
  editContractorItem = signal<IGetProjectMainContractorDto | null>(null);
  showContractorDutiesDialog = signal(false);
  selectedMainContractId = signal<number>(0);
  selectedContractorDuties = signal<ContractorDutyDto[]>([]);

  // Master-detail: selected contractor for payments view
  selectedContractor = signal<IGetProjectMainContractorDto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  contractorMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  contractorOptions: { label: string; value: number }[] = [];

  get totalContractValue(): number {
    return this.contractorItems().reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }

  constructor(
    private contractorClient: ProjectMainContractorClient,
    private constructorClient: ConstructorClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadContractorData();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    this.constructorClient.getAll(1, 10, undefined).subscribe({
      next: (res) => {
        const data = res.data?.data ?? [];
        this.contractorOptions = data
          .filter(c => c.id != null && c.name)
          .map(c => ({ label: c.name!, value: c.id! }));
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

  selectContractorForPayments(item: IGetProjectMainContractorDto): void {
    this.selectedContractor.set(item);
  }

  closePaymentsDialog(): void {
    this.selectedContractor.set(null);
  }

  getContractorName(item: IGetProjectMainContractorDto): string {
    return this.contractorMap[item.constructorId ?? 0] || '—';
  }

  openEditDialog(item: IGetProjectMainContractorDto): void {
    this.editContractorItem.set(item);
    this.showContractorDialog.set(true);
  }

  openContractorDutiesDialog(item: IGetProjectMainContractorDto): void {
    if (!item.id) {
      return;
    }

    this.isLoading.set(true);

    this.contractorClient.getById(item.id).subscribe({
      next: (res) => {
        const duties = (res.data as any)?.contractorDutyDto ?? (item as any)?.contractorDutyDto ?? [];
        this.selectedContractorDuties.set(this.mapContractorDuties(duties));
        this.selectedMainContractId.set(item.id!);
        this.showContractorDutiesDialog.set(true);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading contractor duties:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load Contractor Duties.'
        });
        this.isLoading.set(false);
      }
    });
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

  onContractorDutiesDialogClose(): void {
    this.showContractorDutiesDialog.set(false);
    this.selectedMainContractId.set(0);
    this.selectedContractorDuties.set([]);
  }

  onContractorDutyDataReceived(contractorDuties: ContractorDutyDto[]): void {
    const contractId = this.selectedMainContractId();
    const contractor = this.contractorItems().find(item => item.id === contractId);

    if (!contractor || !contractId) {
      this.onContractorDutiesDialogClose();
      return;
    }

    const payload: any = {
      id: contractor.id,
      projectStageId: contractor.projectStageId ?? this.projectStageId,
      constructorId: contractor.constructorId,
      amount: contractor.amount,
      startDate: contractor.startDate,
      endDate: contractor.endDate,
      contractorDutyDto: contractorDuties.map(duty => ({
        id: duty.id,
        subTotal: duty.subTotal,
        quantity: duty.quantity,
        price: duty.price,
        unitId: duty.unitId,
        dutyTypeId: duty.dutyTypeId,
        dutyResponsibilityId: duty.dutyResponsibilityId,
        mainContractId: contractId,
        isDeleted: duty.isDeleted ?? false
      }))
    };

    this.contractorClient.createOrUpdate(payload).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadContractorData();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Contractor Duties saved successfully.'
          });
          this.onContractorDutiesDialogClose();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: res.message || 'Failed to save Contractor Duties.'
          });
        }
      },
      error: (err) => {
        console.error('Error saving contractor duties:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save Contractor Duties.'
        });
      }
    });
  }

  private mapContractorDuties(duties: any[]): ContractorDutyDto[] {
    if (!Array.isArray(duties)) {
      return [];
    }

    return duties.map((duty) => new ContractorDutyDto({
      id: duty.id,
      subTotal: duty.subTotal,
      quantity: duty.quantity,
      price: duty.price,
      unitId: duty.unitId,
      dutyTypeId: duty.dutyTypeId,
      dutyResponsibilityId: duty.dutyResponsibilityId,
      mainContractId: duty.mainContractId,
      isDeleted: duty.isDeleted ?? false
    }));
  }

  confirmDelete(item: IGetProjectMainContractorDto): void {
    const contractorName = this.contractorMap[item.constructorId ?? 0] || 'this contractor';
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.mainContractor.confirmDelete.message', { name: contractorName }),
      header: this.translate.instant('projectTabs.mainContractor.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.contractorClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadContractorData();
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('common.success'),
                detail: 'Main Contractor removed successfully.'
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
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
