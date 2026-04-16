import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG Imports
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import {
  AttachmentType,
  CreateExpenseCommand,
  CreateExpenseDetailModel,
  CurrencyClient,
  CurrencyDto,
} from '../../../../../nswag/api-client';
import { DocumentsTableComponent } from '../../../../shared/components/documents-table/documents-table.component';
import { SupplierService } from '../../../supplier/services/supplier.service';
import { ExpenseApiService } from '../../services/expense-api.service';

// Expense attachment type: backend uses 6 for Expense (expenseId FK on Attachment entity)
const EXPENSE_ATTACHMENT_TYPE = 6 as AttachmentType;

// -- Interfaces ----------------------------------------------------------------

interface SupplierOption {
  id: number;
  name: string;
}

interface ItemOption {
  id: number;
  name: string;
}

export interface ExpenseDetail {
  id: number | null;
  itemId: number | null;
  qty: number | null;
  unitPrice: number | null;
  currencyId: number | null;
}

export interface ExpenseRecord {
  id: number;
  expenseNo: string;
  expenseDate: Date;
  supplierId: number | null;
  supplierName: string;
  notes: string;
  totalAmount: number;
  details: ExpenseDetail[];
}

// -- Constants -----------------------------------------------------------------

const ITEMS: ItemOption[] = [
  { id: 1, name: 'Cable 2.5mm' },
  { id: 2, name: 'Switch 16A' },
  { id: 3, name: 'Socket Outlet' },
  { id: 4, name: 'Circuit Breaker 32A' },
  { id: 5, name: 'Conduit Pipe 20mm' },
];

let _rowSeq = 0;
const tempId = (): number => --_rowSeq; // negative IDs for unsaved rows

const createEmptyDetail = (): ExpenseDetail => ({
  id: tempId(),
  itemId: null,
  qty: null,
  unitPrice: null,
  currencyId: null,
});

const emptyDetails = (): ExpenseDetail[] => Array.from({ length: 5 }, createEmptyDetail);

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
    ToastModule,
    ConfirmDialogModule,
    DocumentsTableComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './project-expense-management.component.html',
  styleUrls: ['./project-expense-management.component.scss'],
})
export class ProjectExpenseManagementComponent implements OnInit {
  @Input() projectId!: string;

  // -- View state --------------------------------------------------------------
  currentView = signal<'list' | 'form'>('list');
  editingExpenseId = signal<number | null>(null);

  // -- Master list -------------------------------------------------------------
  expenses = signal<ExpenseRecord[]>([]);
  isLoadingList = signal<boolean>(false);

  // -- Form state --------------------------------------------------------------
  formExpenseNo = signal<string>('');
  formExpenseDate = signal<Date>(new Date());
  formSupplierId = signal<number | null>(null);
  formNotes = signal<string>('');
  formDetails = signal<ExpenseDetail[]>(emptyDetails());
  isSaving = signal<boolean>(false);

  // -- Lookups -----------------------------------------------------------------
  suppliers = signal<SupplierOption[]>([]);
  isLoadingSuppliers = signal<boolean>(false);

  currencies = signal<CurrencyDto[]>([]);
  isLoadingCurrencies = signal<boolean>(false);

  readonly items: ItemOption[] = ITEMS;
  readonly expenseAttachmentType = EXPENSE_ATTACHMENT_TYPE;

  // -- Computed -----------------------------------------------------------------
  formTitle = computed(() =>
    this.editingExpenseId()
      ? this.translate.instant('projectTabs.expenses.form.editTitle')
      : this.translate.instant('projectTabs.expenses.form.newTitle')
  );

  totalExpensesAmount = computed(() =>
    this.expenses().reduce((sum, e) => sum + e.totalAmount, 0)
  );

  constructor(
    private expenseService: ExpenseApiService,
    private supplierService: SupplierService,
    private currencyClient: CurrencyClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadSuppliers();
    this.loadCurrencies();
    this.loadExpenses();
  }

  // -- Loaders -------------------------------------------------------------------

  loadExpenses(): void {
    this.isLoadingList.set(true);
    this.expenseService.getByProjectId(+this.projectId).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.expenses.set(
            response.data.data.map((e) => ({
              id: e.id!,
              expenseNo: e.expenseNo ?? '',
              expenseDate: e.expenseDate ?? new Date(),
              supplierId: e.supplierId ?? null,
              supplierName: e.supplierName ?? '�',
              notes: e.notes ?? '',
              totalAmount: e.totalAmount ?? 0,
              details: (e.expenseDetails ?? []).map((d) => ({
                id: d.id ?? null,
                itemId: d.itemId ?? null,
                qty: d.qty ?? null,
                unitPrice: d.unitPrice ?? null,
                currencyId: d.currencyId ?? null,
              })),
            }))
          );
        }
        this.isLoadingList.set(false);
      },
      error: () => this.isLoadingList.set(false),
    });
  }

  private loadSuppliers(): void {
    this.isLoadingSuppliers.set(true);
    this.supplierService.getAllSuppliers(1, 100).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.suppliers.set(
            response.data.data
              .filter((s) => s.id != null && s.name != null)
              .map((s) => ({ id: s.id!, name: s.name! }))
          );
        }
        this.isLoadingSuppliers.set(false);
      },
      error: () => this.isLoadingSuppliers.set(false),
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

  openEditForm(expense: ExpenseRecord): void {
    this.editingExpenseId.set(expense.id);
    this.formExpenseNo.set(expense.expenseNo);
    this.formExpenseDate.set(new Date(expense.expenseDate));
    this.formSupplierId.set(expense.supplierId);
    this.formNotes.set(expense.notes);
    this.formDetails.set(
      expense.details.length > 0 ? [...expense.details] : emptyDetails()
    );
    this.currentView.set('form');
  }

  backToList(): void {
    this.currentView.set('list');
    this.editingExpenseId.set(null);
    this.resetForm();
  }

  // -- Form helpers --------------------------------------------------------------

  private resetForm(): void {
    this.formExpenseNo.set('');
    this.formExpenseDate.set(new Date());
    this.formSupplierId.set(null);
    this.formNotes.set('');
    this.formDetails.set(emptyDetails());
  }

  calculateSubTotal(detail: ExpenseDetail): number {
    return (detail.qty ?? 0) * (detail.unitPrice ?? 0);
  }

  calculateFormTotal(): number {
    return this.formDetails().reduce((sum, d) => sum + this.calculateSubTotal(d), 0);
  }

  addRow(): void {
    this.formDetails.update((prev) => [...prev, createEmptyDetail()]);
  }

  removeRow(id: number | null): void {
    if (this.formDetails().length > 1) {
      this.formDetails.update((prev) => prev.filter((d) => d.id !== id));
    }
  }

  updateDetail(id: number | null, field: keyof ExpenseDetail, value: number | null): void {
    this.formDetails.update((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }

  getSupplierName(supplierId: number | null): string {
    if (!supplierId) return '�';
    return this.suppliers().find((s) => s.id === supplierId)?.name ?? '�';
  }

  // -- Save / Delete -------------------------------------------------------------

  handleSave(): void {
    this.isSaving.set(true);

    const command = new CreateExpenseCommand({
      id: this.editingExpenseId() ?? undefined,
      expenseDate: this.formExpenseDate(),
      expenseNo: this.formExpenseNo(),
      totalAmount: this.calculateFormTotal(),
      notes: this.formNotes(),
      projectId: +this.projectId,
      supplierId: this.formSupplierId() ?? undefined,
      expenseDetails: this.formDetails()
        .filter((d) => d.itemId !== null)
        .map(
          (d) =>
            new CreateExpenseDetailModel({
              id: d.id !== null && d.id > 0 ? d.id : undefined,
              itemId: d.itemId!,
              qty: d.qty ?? 0,
              unitPrice: d.unitPrice ?? 0,
              subTotal: this.calculateSubTotal(d),
              currencyId: d.currencyId ?? undefined,
            })
        ),
    });

    this.expenseService.createOrUpdate(command).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (response.succeeded) {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('projectTabs.expenses.messages.saved'),
          });
          this.backToList();
          this.loadExpenses();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: response.message ?? this.translate.instant('common.errorOccurred'),
          });
        }
      },
      error: () => this.isSaving.set(false),
    });
  }

  confirmDelete(expense: ExpenseRecord): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.expenses.confirmDelete.message', {
        name: expense.expenseNo || expense.id,
      }),
      header: this.translate.instant('projectTabs.expenses.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: this.translate.instant('common.delete') },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: this.translate.instant('common.cancel') },
      accept: () => {
        this.expenseService.delete(expense.id).subscribe({
          next: (response) => {
            if (response.succeeded) {
              this.expenses.update((prev) => prev.filter((e) => e.id !== expense.id));
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('common.success'),
                detail: this.translate.instant('projectTabs.expenses.messages.deleted'),
              });
            }
          },
        });
      },
    });
  }

  formatAmount(value: number): string {
    return value.toFixed(2);
  }
}
