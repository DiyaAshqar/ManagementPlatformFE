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

import { ConfirmationService } from 'primeng/api';
import {
  ClassificationProjectMainContractor,
  ContractorDutyDto,
  ConstructorClient,
  CreateProjectMainContractorCommand,
  CreateProjectMainContractorDutyCommand,
  GetProjectMainContractorDutyDto,
  IGetProjectMainContractorDto,
  LookupClient,
  LookupType,
  ProjectMainContractorClient,
  ProjectMainContractorDutyClient
} from '../../../../../../../nswag/api-client';
import { getLookupData } from '../../../../../../shared/utils/lookup.util';
import { AddContractorDialogComponent } from '../../../dialog/add-contractor-dialog/add-contractor-dialog.component';
import { ContractorDutiesDialogComponent } from '../../../../../agreement-wizard/components/steps/step4/contractor-duties-dialog/contractor-duties-dialog.component';
import { ProjectMainContractorPaymentsComponent } from '../../../../components/project-main-contractor/project-main-contractor-payments/project-main-contractor-payments.component';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';
import { AppNumberPipe } from '../../../../../../shared/pipes/app-number.pipe';

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
    ProjectMainContractorPaymentsComponent,
    HasPermissionDirective,
    AppNumberPipe
  ],
  providers: [ProjectMainContractorClient, ProjectMainContractorDutyClient, ConstructorClient, LookupClient],
  templateUrl: './project-main-contractor-tab.component.html',
  styleUrl: './project-main-contractor-tab.component.scss'
})
export class ProjectMainContractorTabComponent implements OnInit {
  readonly permissions = Permissions;
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

  // ─── Contractor types passed to dialog ─────────────────────────────────────
  contractorTypeOptions: { label: string; value: number }[] = [];

  get totalContractValue(): number {
    return this.contractorItems().reduce((sum, item) => sum + (item.amount ?? 0), 0);
  }

  constructor(
    private contractorClient: ProjectMainContractorClient,
    private contractorDutyClient: ProjectMainContractorDutyClient,
    private constructorClient: ConstructorClient,
    private lookupClient: LookupClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadContractorData();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    // Load all constructors just to build the display map for the table
    this.constructorClient.getAll(1, 1000, undefined).subscribe({
      next: (res) => {
        const data = res.data?.data ?? [];
        this.contractorMap = Object.fromEntries(
          data.filter(c => c.id != null && c.name).map(c => [c.id!, c.name!])
        );
      }
    });

    // Load contractor types from the lookup API
    this.lookupClient.getAllLookups([LookupType.MainContractType]).subscribe({
      next: (res) => {
        const types = getLookupData(res.data, LookupType.MainContractType) ?? [];
        this.contractorTypeOptions = types
          .filter((t: any) => t.id != null && t.name)
          .map((t: any) => ({ label: t.name, value: t.id }));
      }
    });
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  loadContractorData(): void {
    this.isLoading.set(true);

    this.contractorClient.getByStageId(this.projectStageId, undefined, undefined, 1, 100, undefined).subscribe({
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
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    if (!this.canManage()) return;
    this.editContractorItem.set(null);
    this.showContractorDialog.set(true);
  }

  selectContractorForPayments(item: IGetProjectMainContractorDto): void {
    if (!this.canManage()) return;
    this.selectedContractor.set(item);
  }

  closePaymentsDialog(): void {
    this.selectedContractor.set(null);
  }

  getContractorName(item: IGetProjectMainContractorDto): string {
    return this.contractorMap[item.constructorId ?? 0] || '—';
  }

  getClassificationLabel(classification: ClassificationProjectMainContractor | 0 | undefined): string {
    switch (classification) {
      case ClassificationProjectMainContractor.MainContractor:
        return this.translate.instant('dialogs.contractor.classificationMain');
      case ClassificationProjectMainContractor.SubContractor:
        return this.translate.instant('dialogs.contractor.classificationSub');
      case 0:
        return this.translate.instant('dialogs.contractor.classificationUnclassified');
      default:
        return '—';
    }
  }

  openEditDialog(item: IGetProjectMainContractorDto): void {
    if (!this.canManage()) return;
    this.editContractorItem.set(item);
    this.showContractorDialog.set(true);
  }

  openContractorDutiesDialog(item: IGetProjectMainContractorDto): void {
    if (!this.canManage()) return;
    if (!item.id) {
      return;
    }

    this.isLoading.set(true);

    this.contractorDutyClient.getByContractorId(item.id, 1, 1000, undefined).subscribe({
      next: (res) => {
        const duties = res.data?.data ?? [];
        this.selectedContractorDuties.set(this.mapContractorDuties(duties));
        this.selectedMainContractId.set(item.id!);
        this.showContractorDutiesDialog.set(true);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading contractor duties:', err);
        this.isLoading.set(false);
      }
    });
  }

  onDialogSaved(command: CreateProjectMainContractorCommand): void {
    if (!this.canManage()) return;
    this.contractorClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadContractorData();
          this.showContractorDialog.set(false);
        }
      },
      error: (err) => {
        console.error('Error saving contractor item:', err);
      }
    });
  }

  onContractorDutiesDialogClose(): void {
    this.showContractorDutiesDialog.set(false);
    this.selectedMainContractId.set(0);
    this.selectedContractorDuties.set([]);
  }

  onContractorDutiesChanged(): void {
    const contractId = this.selectedMainContractId();
    if (!contractId) return;

    this.contractorDutyClient.getByContractorId(contractId, 1, 1000, undefined).subscribe({
      next: (response) => {
        this.selectedContractorDuties.set(this.mapContractorDuties(response.data?.data ?? []));
      },
      error: (error) => console.error('Error refreshing contractor duties:', error)
    });
  }

  onContractorDutyDataReceived(contractorDuties: ContractorDutyDto[]): void {
    if (!this.canManage()) return;
    const contractId = this.selectedMainContractId();

    if (!contractId) {
      this.onContractorDutiesDialogClose();
      return;
    }

    const retainedIds = new Set(
      contractorDuties
        .map(duty => duty.id ?? 0)
        .filter(id => id > 0)
    );
    const deletedIds = this.selectedContractorDuties()
      .map(duty => duty.id ?? 0)
      .filter(id => id > 0 && !retainedIds.has(id));

    const requests = [
      ...contractorDuties.map(duty => this.contractorDutyClient.createOrUpdate(
        new CreateProjectMainContractorDutyCommand({
          id: duty.id && duty.id > 0 ? duty.id : undefined,
          subTotal: duty.subTotal,
          quantity: duty.quantity,
          price: duty.price,
          unitId: duty.unitId,
          dutyTypeId: duty.dutyTypeId,
          dutyResponsibilityId: duty.dutyResponsibilityId,
          projectMainContractorId: contractId,
          supplierId: duty.supplierId,
          materialId: duty.materialId,
          autoPost: (duty as any).generateExpense ?? false,
          expenseNumber: (duty as any).expenseNo ?? undefined
        })
      )),
      ...deletedIds.map(id => this.contractorDutyClient.delete(id))
    ];

    if (requests.length === 0) {
      this.onContractorDutiesDialogClose();
      return;
    }

    this.isLoading.set(true);
    forkJoin(requests).subscribe({
      next: (responses) => {
        if (responses.every(response => response?.succeeded)) {
          this.onContractorDutiesDialogClose();
          this.loadContractorData();
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error saving contractor duties:', err);
        this.isLoading.set(false);
      }
    });
  }

  private mapContractorDuties(duties: GetProjectMainContractorDutyDto[]): ContractorDutyDto[] {
    if (!Array.isArray(duties)) {
      return [];
    }

    return duties.map((duty) => {
      const mapped = new ContractorDutyDto({
        id: duty.id,
        subTotal: duty.subTotal,
        quantity: duty.quantity,
        price: duty.price,
        unitId: duty.unitId,
        dutyTypeId: duty.dutyTypeId,
        dutyResponsibilityId: duty.dutyResponsibilityId,
        supplierId: duty.supplierId,
        materialId: duty.materialId,
        mainContractId: duty.projectMainContractorId,
        isDeleted: false
      });

      (mapped as any).generateExpense = duty.autoPost ?? false;
      (mapped as any).expenseNo = duty.expenseNumber ?? null;
      return mapped;
    });
  }

  confirmDelete(item: IGetProjectMainContractorDto): void {
    if (!this.canManage()) return;
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
            }
          },
          error: (err) => {
            console.error('Error deleting contractor item:', err);
          }
        });
      }
    });
  }

  canManage(): boolean {
    return this.authService.hasPermission(Permissions.MainContractor.Manage);
  }
}
