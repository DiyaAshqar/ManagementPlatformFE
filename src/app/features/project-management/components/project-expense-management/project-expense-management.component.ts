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
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import {
  AttachmentType,
  CreateExpenseCommand,
  CreateExpenseDetailModel,
  CurrencyClient,
  CurrencyDto,
  GetExpenseDto,
  IExpenseDetailDto,
  LookupClient,
  LookupDto,
  LookupType,
} from '../../../../../nswag/api-client';
import { DocumentsTableComponent } from '../../../../shared/components/documents-table/documents-table.component';
import { MaterialSelectComponent } from '../../../../shared/components/material-select/material-select.component';
import { ExpenseApiService } from '../../services/expense-api.service';

// The regenerated backend AttachmentType enum has no dedicated Expense value (was numeric 6,
// which is now SurveyingVisit) - using Milestone as the closest fit until backend adds one.
const EXPENSE_ATTACHMENT_TYPE = AttachmentType.Milestone;

let _rowSeq = 0;
const tempId = (): number => --_rowSeq; // negative IDs for unsaved rows

const createEmptyDetail = (): IExpenseDetailDto => ({ id: tempId(), currencyId: 1 });
const emptyDetails = (): IExpenseDetailDto[] => [createEmptyDetail()];

// -- Component -----------------------------------------------------------------

@Component({
  selector: 'app-project-expense-management',
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
    DocumentsTableComponent,
    MaterialSelectComponent,
  ],
  providers: [ConfirmationService, LookupClient],
  templateUrl: './project-expense-management.component.html',
  styleUrls: ['./project-expense-management.component.scss'],
})
export class ProjectExpenseManagementComponent implements OnInit {
  @Input() projectId!: string;
  @Input() projectStageId: number = 0;

  // -- View state --------------------------------------------------------------
  currentView = signal<'list' | 'form'>('list');
  editingExpenseId = signal<number | null>(null);

  // -- Master list -------------------------------------------------------------
  expenses = signal<GetExpenseDto[]>([]);
  isLoadingList = signal<boolean>(false);

  // -- Form state --------------------------------------------------------------
  formExpenseNo = signal<string>('');
  formExpenseDate = signal<Date>(new Date());
  formSupplierId = signal<number | null>(null);
  formNotes = signal<string>('');
  /** Plain array — NOT a signal. Using a signal caused p-inputNumber to lose focus
   *  on every keystroke because signal updates trigger full row re-creation. */
  formDetails: IExpenseDetailDto[] = emptyDetails();
  isSaving = signal<boolean>(false);

  // -- Lookups -----------------------------------------------------------------
  suppliers = signal<LookupDto[]>([]);
  isLoadingLookups = signal<boolean>(false);

  currencies = signal<CurrencyDto[]>([]);
  isLoadingCurrencies = signal<boolean>(false);

  readonly expenseAttachmentType = EXPENSE_ATTACHMENT_TYPE;
  selectedExpenseForAttachments: GetExpenseDto | null = null;

  // -- Computed -----------------------------------------------------------------
  formTitle = computed(() =>
    this.editingExpenseId()
      ? this.translate.instant('projectTabs.expenses.form.editTitle')
      : this.translate.instant('projectTabs.expenses.form.newTitle')
  );

  totalExpensesAmount = computed(() =>
    this.expenses().reduce((sum, e) => sum + (e.totalAmount ?? 0), 0)
  );

  constructor(
    private expenseService: ExpenseApiService,
    private lookupClient: LookupClient,
    private currencyClient: CurrencyClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadCurrencies();
    this.loadExpenses();
  }

  // -- Loaders -------------------------------------------------------------------

  loadExpenses(): void {
    this.isLoadingList.set(true);
    this.expenseService.getByProjectStageId(this.projectStageId, Number(this.projectId)).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.expenses.set(response.data.data);
        }
        this.isLoadingList.set(false);
      },
      error: () => this.isLoadingList.set(false),
    });
  }

  private loadLookups(): void {
    this.isLoadingLookups.set(true);
    this.lookupClient.getAllLookups([LookupType.Supplier]).subscribe({
      next: (response) => {
        const data = response.data as Record<string, LookupDto[]>;
        this.suppliers.set(data?.[LookupType.Supplier] ?? []);
        this.isLoadingLookups.set(false);
      },
      error: () => this.isLoadingLookups.set(false),
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

  // -- Navigation ----------------------------------------------------------------

  openNewForm(): void {
    this.editingExpenseId.set(null);
    this.resetForm();
    this.currentView.set('form');
  }

  openEditForm(expense: GetExpenseDto): void {
    if (expense.autoPost) {
      return;
    }
    this.editingExpenseId.set(expense.id ?? null);
    this.formExpenseNo.set(expense.expenseNo ?? '');
    this.formExpenseDate.set(expense.expenseDate ? new Date(expense.expenseDate) : new Date());
    this.formSupplierId.set(expense.supplierId ?? null);
    this.formNotes.set(expense.notes ?? '');
    this.formDetails = expense.expenseDetails?.length
      ? expense.expenseDetails.map(d => ({ ...d }))   // shallow-copy each row
      : emptyDetails();
    this.currentView.set('form');
  }

  backToList(): void {
    this.currentView.set('list');
    this.editingExpenseId.set(null);
    this.resetForm();
  }

  openAttachments(expense: GetExpenseDto): void {
    if ((expense.id ?? 0) > 0) {
      this.selectedExpenseForAttachments = expense;
    }
  }

  closeAttachmentsDialog(): void {
    this.selectedExpenseForAttachments = null;
  }

  // -- Form helpers --------------------------------------------------------------

  private resetForm(): void {
    this.formExpenseNo.set('');
    this.formExpenseDate.set(new Date());
    this.formSupplierId.set(null);
    this.formNotes.set('');
    this.formDetails = emptyDetails();
  }

  calculateSubTotal(detail: IExpenseDetailDto): number {
    return (detail.qty ?? 0) * (detail.unitPrice ?? 0);
  }

  calculateFormTotal(): number {
    return this.formDetails.reduce((sum, d) => sum + this.calculateSubTotal(d), 0);
  }

  addRow(): void {
    const newRow = createEmptyDetail();
    this.formDetails = [...this.formDetails, newRow];
  }

  removeRow(id: number | undefined): void {
    if (this.formDetails.length > 1) {
      this.formDetails = this.formDetails.filter((d) => d.id !== id);
    }
  }

  /** Called only for p-select fields (itemId, currencyId).
   *  p-inputNumber fields use [(ngModel)] direct binding — no method needed. */
  updateSelectField(detail: IExpenseDetailDto, field: 'itemId' | 'currencyId', value: number | undefined): void {
    (detail as any)[field] = value;
  }

  getSupplierName(supplierId: number | null): string {
    if (!supplierId) return '—';
    return this.suppliers().find((s) => s.id === supplierId)?.name ?? '—';
  }

  // -- Save / Delete -------------------------------------------------------------

  handleSave(): void {
    this.isSaving.set(true);

    const details: CreateExpenseDetailModel[] = [];
    for (const d of this.formDetails) {
      if (d.itemId != null) {
        details.push(new CreateExpenseDetailModel({
          id: d.id && d.id > 0 ? d.id : undefined,
          itemId: d.itemId,
          qty: d.qty ?? 0,
          unitPrice: d.unitPrice ?? 0,
          subTotal: this.calculateSubTotal(d),
          currencyId: d.currencyId ?? undefined,
        }));
      }
    }

    const command = new CreateExpenseCommand({
      id: this.editingExpenseId() ?? undefined,
      expenseDate: this.formExpenseDate(),
      expenseNo: this.formExpenseNo(),
      totalAmount: this.calculateFormTotal(),
      notes: this.formNotes(),
      supplierId: this.formSupplierId() ?? undefined,
      projectStageId: this.projectStageId,
      expenseDetails: details,
    });

    this.expenseService.createOrUpdate(command).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (response.succeeded) {
          this.backToList();
          this.loadExpenses();
        }
      },
      error: () => this.isSaving.set(false),
    });
  }

  confirmDelete(expense: GetExpenseDto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.expenses.confirmDelete.message', {
        name: expense.expenseNo || expense.id,
      }),
      header: this.translate.instant('projectTabs.expenses.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: this.translate.instant('common.delete') },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: this.translate.instant('common.cancel') },
      accept: () => {
        this.expenseService.delete(expense.id!).subscribe({
          next: () => {
            this.expenses.update((prev) => prev.filter((e) => e.id !== expense.id));
          },
        });
      },
    });
  }

  formatAmount(value: number): string {
    return value.toFixed(2);
  }
}
