import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG Imports
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { CurrencyClient, CurrencyDto, LookupClient, LookupType } from '../../../../../nswag/api-client';
import { getLookupData } from '../../../../shared/utils/lookup.util';
import {
  AdvanceDetailDto,
  AdvanceExpenseDto,
  AdvanceListItemDto,
  AdvanceStatus,
  AdvanceSummaryDto,
  CreateAdvanceCommand,
  EngineerLookupDto,
  UpdateAdvanceCommand,
} from '../../models/advance.model';
import { AdvanceApiService } from '../../services/advance-api.service';
import { Permissions } from '../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../core/auth/directives/has-permission.directive';

const emptySummary = (): AdvanceSummaryDto => ({
  total_advances: 0,
  total_amount: 0,
  total_remaining: 0,
  open_count: 0,
});

@Component({
  selector: 'app-project-advance-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TableModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    TooltipModule,
    TextareaModule,
    TagModule,
    SkeletonModule,
    ConfirmDialogModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    HasPermissionDirective,
  ],
  templateUrl: './project-advance-management.component.html',
  styleUrls: ['./project-advance-management.component.scss'],
})
export class ProjectAdvanceManagementComponent implements OnInit {
  readonly permissions = Permissions;
  @Input() projectId!: string;
  @Input() projectStageId: number = 0;
  @Input() projectName: string = '';

  // -- View state --------------------------------------------------------------
  currentView = signal<'list' | 'form'>('list');
  editingAdvanceId = signal<number | null>(null);

  // -- Master list -------------------------------------------------------------
  advances = signal<AdvanceListItemDto[]>([]);
  summary = signal<AdvanceSummaryDto>(emptySummary());
  isLoadingList = signal<boolean>(false);

  statusFilter = signal<'All' | AdvanceStatus>('All');
  searchTerm = signal<string>('');

  // -- Form state --------------------------------------------------------------
  formAdvanceNo = signal<string>('');
  formEngineerId = signal<number | null>(null);
  formAdvanceDate = signal<Date>(new Date());
  formAmount = signal<number>(0);
  formCurrency = signal<string>('JOD');
  formPaymentMethodId = signal<number | null>(null);
  formReference = signal<string>('');
  formNotes = signal<string>('');
  isSaving = signal<boolean>(false);

  // -- Lookups -------------------------------------------------------------------
  engineers = signal<EngineerLookupDto[]>([]);
  isLoadingEngineers = signal<boolean>(false);

  currencies = signal<CurrencyDto[]>([]);
  isLoadingCurrencies = signal<boolean>(false);

  paymentMethods = signal<{ label: string; value: number }[]>([]);
  isLoadingPaymentMethods = signal<boolean>(false);

  // -- Settle dialog ---------------------------------------------------------
  settlingAdvance = signal<AdvanceDetailDto | null>(null);
  availableExpenses = signal<AdvanceExpenseDto[]>([]);
  selectedExpenses = signal<AdvanceExpenseDto[]>([]);
  isLoadingAvailableExpenses = signal<boolean>(false);
  isSettling = signal<boolean>(false);

  // -- Computed -----------------------------------------------------------------
  formTitle = computed(() =>
    this.editingAdvanceId()
      ? this.translate.instant('projectTabs.advances.form.editTitle')
      : this.translate.instant('projectTabs.advances.form.newTitle')
  );

  statusOptions = computed(() => [
    { label: this.translate.instant('projectTabs.advances.status.all'), value: 'All' as const },
    { label: this.translate.instant('projectTabs.advances.status.open'), value: 'Open' as const },
    { label: this.translate.instant('projectTabs.advances.status.partiallySettled'), value: 'PartiallySettled' as const },
    { label: this.translate.instant('projectTabs.advances.status.settled'), value: 'Settled' as const },
  ]);

  filteredAdvances = computed(() => {
    const status = this.statusFilter();
    const term = this.searchTerm().trim().toLowerCase();
    return this.advances().filter((a) => {
      const statusMatch = status === 'All' || a.status === status;
      const searchMatch =
        !term || a.advance_no.toLowerCase().includes(term) || a.engineer.toLowerCase().includes(term);
      return statusMatch && searchMatch;
    });
  });

  selectedTotal = computed(() => this.selectedExpenses().reduce((sum, e) => sum + e.amount, 0));

  isOverRemainingBalance = computed(() => this.selectedTotal() > (this.settlingAdvance()?.remaining_balance ?? 0));

  constructor(
    private advanceService: AdvanceApiService,
    private lookupClient: LookupClient,
    private currencyClient: CurrencyClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadEngineers();
    this.loadCurrencies();
    this.loadPaymentMethods();
    this.loadAdvances();
  }

  // -- Loaders -------------------------------------------------------------------

  loadAdvances(): void {
    this.isLoadingList.set(true);
    this.advanceService.getByProjectStageId(this.projectStageId, this.projectName).subscribe({
      next: (response) => {
        if (response.succeeded && response.data) {
          this.advances.set(response.data.data);
          this.summary.set(response.data.summary);
        }
        this.isLoadingList.set(false);
      },
      error: () => this.isLoadingList.set(false),
    });
  }

  private loadEngineers(): void {
    this.isLoadingEngineers.set(true);
    this.advanceService.getEngineers().subscribe({
      next: (response) => {
        this.engineers.set(response.succeeded && response.data ? response.data : []);
        this.isLoadingEngineers.set(false);
      },
      error: () => this.isLoadingEngineers.set(false),
    });
  }

  private loadCurrencies(): void {
    this.isLoadingCurrencies.set(true);
    this.currencyClient.getAll(1, 100, undefined).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.currencies.set(response.data.data);
        }
        this.isLoadingCurrencies.set(false);
      },
      error: () => this.isLoadingCurrencies.set(false),
    });
  }

  private loadPaymentMethods(): void {
    this.isLoadingPaymentMethods.set(true);
    this.lookupClient.getAllLookups([LookupType.PaymentMethod]).subscribe({
      next: (response) => {
        const methods = getLookupData(response.data as Record<string, { id: number; name: string }[]>, LookupType.PaymentMethod);
        this.paymentMethods.set((methods ?? []).map((method) => ({ label: method.name, value: method.id })));
        this.isLoadingPaymentMethods.set(false);
      },
      error: () => this.isLoadingPaymentMethods.set(false),
    });
  }

  // -- Navigation ----------------------------------------------------------------

  openNewForm(): void {
    if (!this.canCreate()) return;
    this.editingAdvanceId.set(null);
    this.resetForm();
    this.currentView.set('form');
    this.loadPaymentMethods();
  }

  openEditForm(advance: AdvanceListItemDto): void {
    if (!this.canEdit(advance)) {
      return;
    }
    this.loadPaymentMethods();
    this.advanceService.getById(advance.id).subscribe({
      next: (response) => {
        if (!response.succeeded || !response.data) return;
        const detail = response.data;
        this.editingAdvanceId.set(detail.id);
        this.formAdvanceNo.set(detail.advance_no);
        this.formEngineerId.set(detail.engineer_id);
        this.formAdvanceDate.set(new Date(detail.advance_date));
        this.formAmount.set(detail.amount);
        this.formCurrency.set(detail.currency);
        this.formPaymentMethodId.set(detail.payment_method ?? null);
        this.formReference.set(detail.reference ?? '');
        this.formNotes.set(detail.notes ?? '');
        this.currentView.set('form');
      },
    });
  }

  backToList(): void {
    this.currentView.set('list');
    this.editingAdvanceId.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.formAdvanceNo.set('');
    this.formEngineerId.set(null);
    this.formAdvanceDate.set(new Date());
    this.formAmount.set(0);
    this.formCurrency.set('JOD');
    this.formPaymentMethodId.set(null);
    this.formReference.set('');
    this.formNotes.set('');
  }

  // -- Save / Delete -------------------------------------------------------------

  handleSave(): void {
    const editingId = this.editingAdvanceId();
    if (editingId ? !this.canEditPermission() : !this.canCreate()) return;
    if (!this.formEngineerId() || !this.formAmount() || !this.formPaymentMethodId()) {
      return;
    }

    this.isSaving.set(true);

    const base: CreateAdvanceCommand = {
      projectStageId: this.projectStageId,
      engineerId: this.formEngineerId()!,
      advanceDate: this.formAdvanceDate(),
      amount: this.formAmount(),
      currency: this.formCurrency(),
      paymentMethod: this.formPaymentMethodId()!,
      reference: this.formReference() || undefined,
      notes: this.formNotes() || undefined,
    };

    const save$ = editingId
      ? this.advanceService.update({ ...base, id: editingId } as UpdateAdvanceCommand)
      : this.advanceService.create(base);

    save$.subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (response.succeeded) {
          this.backToList();
          this.loadAdvances();
        }
      },
      error: () => this.isSaving.set(false),
    });
  }

  confirmDelete(advance: AdvanceListItemDto): void {
    if (!this.canDelete(advance)) return;
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.advances.confirmDelete.message', {
        name: advance.advance_no,
      }),
      header: this.translate.instant('projectTabs.advances.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: this.translate.instant('common.delete') },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: this.translate.instant('common.cancel') },
      accept: () => {
        this.advanceService.delete(advance.id).subscribe({
          next: (response) => {
            if (response.succeeded) {
              this.advances.update((prev) => prev.filter((a) => a.id !== advance.id));
            }
          },
        });
      },
    });
  }

  // -- Settle dialog ---------------------------------------------------------

  openSettleDialog(advance: AdvanceListItemDto): void {
    if (!this.canSettle(advance)) return;

    this.selectedExpenses.set([]);
    this.isLoadingAvailableExpenses.set(true);

    this.advanceService.getById(advance.id).subscribe({
      next: (detailResponse) => {
        if (detailResponse.succeeded && detailResponse.data) {
          this.settlingAdvance.set(detailResponse.data);
        }
      },
    });

    this.advanceService.getAvailableExpenses(advance.id).subscribe({
      next: (response) => {
        this.availableExpenses.set(response.succeeded && response.data ? response.data.expenses : []);
        this.isLoadingAvailableExpenses.set(false);
      },
      error: () => this.isLoadingAvailableExpenses.set(false),
    });
  }

  closeSettleDialog(): void {
    this.settlingAdvance.set(null);
    this.availableExpenses.set([]);
    this.selectedExpenses.set([]);
  }

  confirmSettle(): void {
    if (!this.authService.hasPermission(Permissions.Advances.Settle)) return;
    const advance = this.settlingAdvance();
    const selected = this.selectedExpenses();
    if (!advance || selected.length === 0 || this.isOverRemainingBalance()) return;

    this.isSettling.set(true);
    this.advanceService
      .settle({ id: advance.id, expenseIds: selected.map((e) => e.id) })
      .subscribe({
        next: (response) => {
          this.isSettling.set(false);
          if (response.succeeded) {
            this.closeSettleDialog();
            this.loadAdvances();
          }
        },
        error: () => this.isSettling.set(false),
      });
  }

  // -- Display helpers -------------------------------------------------------

  formatAmount(value: number | undefined, currency?: string): string {
    return `${(value ?? 0).toFixed(2)}${currency ? ' ' + currency : ''}`;
  }

  statusSeverity(status: AdvanceStatus): 'info' | 'warn' | 'success' {
    return this.advanceService.statusSeverity(status);
  }

  statusLabel(status: AdvanceStatus): string {
    const key =
      status === 'Open' ? 'open' : status === 'PartiallySettled' ? 'partiallySettled' : 'settled';
    return this.translate.instant(`projectTabs.advances.status.${key}`);
  }

  canEdit(advance: AdvanceListItemDto): boolean {
    return this.canEditPermission() && advance.status === 'Open';
  }

  canSettle(advance: AdvanceListItemDto): boolean {
    return this.authService.hasPermission(Permissions.Advances.Settle) && advance.status !== 'Settled';
  }

  canCreate(): boolean {
    return this.authService.hasPermission(Permissions.Advances.Create);
  }

  canEditPermission(): boolean {
    return this.authService.hasPermission(Permissions.Advances.Edit);
  }

  canDelete(advance: AdvanceListItemDto): boolean {
    return this.authService.hasPermission(Permissions.Advances.Delete) && advance.status === 'Open';
  }
}
