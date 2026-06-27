import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG Imports
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectFilterEvent, SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';

import {
  AttachmentType,
  CreateExpenseCommand,
  CreateExpenseDetailModel,
  CurrencyClient,
  CurrencyDto,
  GetExpenseDto,
  GetMaterialDto,
  IExpenseDetailDto,
  LookupClient,
  LookupDto,
  MaterialClient,
} from '../../../../../nswag/api-client';
import { DocumentsTableComponent } from '../../../../shared/components/documents-table/documents-table.component';
import { ExpenseApiService } from '../../services/expense-api.service';

// Expense attachment type: backend uses 6 for Expense (expenseId FK on Attachment entity)
const EXPENSE_ATTACHMENT_TYPE = 6 as AttachmentType;

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
    DocumentsTableComponent,
  ],
  providers: [ConfirmationService, LookupClient, MaterialClient],
  templateUrl: './project-expense-management.component.html',
  styleUrls: ['./project-expense-management.component.scss'],
})
export class ProjectExpenseManagementComponent implements OnInit, OnDestroy {
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

  materials = signal<GetMaterialDto[]>([]);
  materialGroups = computed(() => {
    const groups = new Map<string, { label: string; items: GetMaterialDto[] }>();

    for (const material of this.materials()) {
      const label = material.subCategoryName?.trim() || 'Uncategorized';
      const key = `${material.subCategoryId ?? 'none'}:${label}`;
      const group = groups.get(key) ?? { label, items: [] };

      group.items.push(material);
      groups.set(key, group);
    }

    return Array.from(groups.values());
  });
  isLoadingMaterials = signal<boolean>(false);
  materialTotalRecords = 0;
  materialCurrentPage = 0;

  currencies = signal<CurrencyDto[]>([]);
  isLoadingCurrencies = signal<boolean>(false);

  readonly expenseAttachmentType = EXPENSE_ATTACHMENT_TYPE;

  private destroy$ = new Subject<void>();
  private materialFilter$ = new Subject<string>();
  private readonly materialPageSize = 20;
  private activeMaterialFilter = '';
  private loadedMaterialPages = new Set<string>();
  private loadingMaterialPages = new Set<string>();

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
    private materialClient: MaterialClient,
    private currencyClient: CurrencyClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.initializeMaterialSearch();
    this.loadCurrencies();
    this.loadExpenses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -- Loaders -------------------------------------------------------------------

  loadExpenses(): void {
    this.isLoadingList.set(true);
    this.expenseService.getByProjectStageId(this.projectStageId).subscribe({
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
    this.lookupClient.getAllLookups(['supplier']).subscribe({
      next: (response) => {
        const data = response.data as Record<string, LookupDto[]>;
        this.suppliers.set(data?.['supplier'] ?? []);
        this.isLoadingLookups.set(false);
      },
      error: () => this.isLoadingLookups.set(false),
    });
  }

  private initializeMaterialSearch(): void {
    this.loadMaterialPage(1, '', false);

    this.materialFilter$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((filter) => {
        this.activeMaterialFilter = filter;
        this.materials.set([]);
        this.loadedMaterialPages.clear();
        this.loadingMaterialPages.clear();
        this.materialTotalRecords = 0;
        this.materialCurrentPage = 0;
        this.loadMaterialPage(1, filter, false);
      });
  }

  onMaterialFilter(event: SelectFilterEvent): void {
    this.materialFilter$.next((event.filter || '').trim());
  }

  loadMoreMaterials(event: Event): void {
    event.stopPropagation();
    this.loadMaterialPage(this.materialCurrentPage + 1, this.activeMaterialFilter, true);
  }

  get hasMoreMaterials(): boolean {
    return this.materials().length < this.materialTotalRecords;
  }

  private loadMaterialPage(page: number, filter: string, append: boolean): void {
    const requestKey = `${filter}\u0000${page}`;

    if (this.loadedMaterialPages.has(requestKey) || this.loadingMaterialPages.has(requestKey)) {
      return;
    }

    this.loadingMaterialPages.add(requestKey);
    this.isLoadingMaterials.set(true);

    this.materialClient
      .getAll(page, this.materialPageSize, filter || undefined, undefined)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.finishMaterialPageLoad(requestKey))
      )
      .subscribe({
        next: (response) => {
          if (filter !== this.activeMaterialFilter) {
            return;
          }

          const result = response?.succeeded && response.data?.succeeded ? response.data : undefined;
          const pageItems = result?.data ?? [];
          const existing = append ? this.materials() : [];
          const merged = [...existing, ...pageItems].filter(
            (material, index, items) => items.findIndex((item) => item.id === material.id) === index
          );

          this.materials.set(merged);
          this.materialTotalRecords = result?.totalRecords ?? merged.length;
          this.materialCurrentPage = result?.pageNumber ?? page;
          this.loadedMaterialPages.add(requestKey);
        },
        error: (error) => {
          if (filter === this.activeMaterialFilter) {
            console.error('Error loading materials:', error);
          }
        },
      });
  }

  private finishMaterialPageLoad(requestKey: string): void {
    this.loadingMaterialPages.delete(requestKey);
    this.isLoadingMaterials.set(this.loadingMaterialPages.size > 0);
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
          next: (response) => {
            if (response.succeeded) {
              this.expenses.update((prev) => prev.filter((e) => e.id !== expense.id));
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
