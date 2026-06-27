import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectFilterEvent, SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AgreementWizardService } from '../../../../services/agreement-wizard.service';
import { MaterialSelectComponent } from '../../../../../../shared/components/material-select/material-select.component';
import {
  ContractorDutyDto,
  LookupDto,
  MainContractDto,
  Supplier,
  SupplierClient
} from '../../../../../../../nswag/api-client';

@Component({
  selector: 'app-contractor-duties-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    SelectModule,
    ProgressSpinnerModule,
    InputNumberModule,
    InputTextModule,
    CheckboxModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TableModule,
    TooltipModule,
    MaterialSelectComponent
  ],
  providers: [SupplierClient],
  templateUrl: './contractor-duties-dialog.component.html'
})
export class ContractorDutiesDialogComponent implements OnInit, OnDestroy {
  visible = input.required<boolean>();
  agreementId = input.required<number>();
  mainContractId = input.required<number>();
  existingContractorDuties = input<ContractorDutyDto[]>([]);
  isViewMode = input<boolean>(false);
  allowEmpty = input<boolean>(false);

  closeDialog = output<void>();
  contractorDutyData = output<ContractorDutyDto[]>();

  contractorDutyForm!: FormGroup;
  units = signal<LookupDto[]>([]);
  dutyTypes = signal<LookupDto[]>([]);
  dutyResponsibilities = signal<LookupDto[]>([]);
  contractorDuties = signal<ContractorDutyDto[]>([]);
  suppliers = signal<{ label: string; value: number }[]>([]);
  isLoading = signal(false);
  isLoadingSuppliers = signal(false);

  editingIndex = signal<number | null>(null);

  private destroy$ = new Subject<void>();
  private supplierFilter$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private agreementWizardService: AgreementWizardService,
    private supplierClient: SupplierClient
  ) {
    effect(() => {
      if (this.visible() && this.existingContractorDuties()) {
        this.loadExistingContractorDuties();
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookups();
    this.initializeSupplierSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.contractorDutyForm = this.fb.group({
      id: [0],
      subTotal: [0],
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0.01)]],
      unitId: [0, [Validators.required, Validators.min(1)]],
      dutyTypeId: [0, [Validators.required, Validators.min(1)]],
      dutyResponsibilityId: [0, [Validators.required, Validators.min(1)]],
      // TODO: add Validators.required once BE is ready
      materialId: [null],
      generateExpense: [false],
      supplierId: [null],
      expenseNo: [null],
      mainContractId: [this.mainContractId()],
      isDeleted: [false]
    });

    this.contractorDutyForm.get('quantity')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateSubTotal());

    this.contractorDutyForm.get('price')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateSubTotal());

    // Toggle required validators on supplierId / expenseNo when generateExpense changes
    this.contractorDutyForm.get('generateExpense')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((checked: boolean) => this.onGenerateExpenseChange(checked));
  }

  private onGenerateExpenseChange(checked: boolean): void {
    const supplierCtrl = this.contractorDutyForm.get('supplierId')!;
    const expenseNoCtrl = this.contractorDutyForm.get('expenseNo')!;

    if (checked) {
      supplierCtrl.setValidators([Validators.required]);
      expenseNoCtrl.setValidators([Validators.required]);
    } else {
      supplierCtrl.clearValidators();
      expenseNoCtrl.clearValidators();
    }

    supplierCtrl.updateValueAndValidity();
    expenseNoCtrl.updateValueAndValidity();
  }

  private loadLookups(): void {
    this.isLoading.set(true);

    this.agreementWizardService.getStep4Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lookups) => {
          this.units.set(lookups.units);
          this.dutyTypes.set(lookups.dutyTypes);
          this.dutyResponsibilities.set(lookups.dutyResponsibilities);
          this.isLoading.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load lookups', life: 5000 });
          this.isLoading.set(false);
        }
      });
  }

  private initializeSupplierSearch(): void {
    this.supplierFilter$
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(filter => {
          this.isLoadingSuppliers.set(true);
          return this.supplierClient.getAllSuppliers(1, 100, filter || undefined).pipe(
            catchError(error => {
              console.error('Error loading suppliers:', error);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(res => {
        const data: Supplier[] = res?.data?.data ?? [];
        this.suppliers.set(
          data.filter(s => s.id != null && s.name).map(s => ({ label: s.name!, value: s.id! }))
        );
        this.isLoadingSuppliers.set(false);
      });
  }

  onSupplierFilter(event: SelectFilterEvent): void {
    this.supplierFilter$.next((event.filter || '').trim());
  }

  private loadExistingContractorDuties(): void {
    const existing = this.existingContractorDuties();
    const duties = existing.map(duty => {
      const contractorDuty = new ContractorDutyDto();
      contractorDuty.id = duty.id ?? 0;
      contractorDuty.subTotal = duty.subTotal ?? 0;
      contractorDuty.quantity = duty.quantity ?? 0;
      contractorDuty.price = duty.price ?? 0;
      contractorDuty.unitId = duty.unitId ?? 0;
      contractorDuty.dutyTypeId = duty.dutyTypeId ?? 0;
      contractorDuty.dutyResponsibilityId = duty.dutyResponsibilityId ?? 0;
      // TODO: remove cast once BE adds materialId, supplierId, expenseNo, generateExpense to ContractorDutyDto
      (contractorDuty as any).materialId = (duty as any).materialId ?? null;
      (contractorDuty as any).generateExpense = (duty as any).generateExpense ?? false;
      (contractorDuty as any).supplierId = (duty as any).supplierId ?? null;
      (contractorDuty as any).expenseNo = (duty as any).expenseNo ?? null;
      contractorDuty.mainContractId = duty.mainContractId ?? this.mainContractId();
      contractorDuty.isDeleted = duty.isDeleted ?? false;
      return contractorDuty;
    });

    this.contractorDuties.set(duties);
  }

  calculateSubTotal(): void {
    const quantity = this.contractorDutyForm.get('quantity')?.value || 0;
    const price = this.contractorDutyForm.get('price')?.value || 0;
    this.contractorDutyForm.patchValue({ subTotal: quantity * price }, { emitEvent: false });
  }

  addContractorDuty(): void {
    if (this.contractorDutyForm.invalid) {
      this.contractorDutyForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
      return;
    }

    const formValue = this.contractorDutyForm.value;
    const dutyData = new ContractorDutyDto();
    dutyData.id = formValue.id || 0;
    dutyData.subTotal = formValue.subTotal;
    dutyData.quantity = formValue.quantity;
    dutyData.price = formValue.price;
    dutyData.unitId = formValue.unitId;
    dutyData.dutyTypeId = formValue.dutyTypeId;
    dutyData.dutyResponsibilityId = formValue.dutyResponsibilityId;
    // TODO: remove casts once BE adds these fields to ContractorDutyDto
    (dutyData as any).materialId = formValue.materialId ?? null;
    (dutyData as any).generateExpense = formValue.generateExpense ?? false;
    (dutyData as any).supplierId = formValue.generateExpense ? formValue.supplierId : null;
    (dutyData as any).expenseNo = formValue.generateExpense ? formValue.expenseNo : null;
    dutyData.mainContractId = this.mainContractId();
    dutyData.isDeleted = false;

    const editIndex = this.editingIndex();
    if (editIndex !== null) {
      const duties = [...this.contractorDuties()];
      duties[editIndex] = dutyData;
      this.contractorDuties.set(duties);
      this.editingIndex.set(null);
    } else {
      this.contractorDuties.set([...this.contractorDuties(), dutyData]);
    }

    this.clearForm();
  }

  editContractorDuty(index: number): void {
    const duty = this.contractorDuties()[index];
    const generateExpense = (duty as any).generateExpense ?? false;

    this.editingIndex.set(index);
    this.contractorDutyForm.patchValue({
      id: duty.id,
      subTotal: duty.subTotal,
      quantity: duty.quantity,
      price: duty.price,
      unitId: duty.unitId,
      dutyTypeId: duty.dutyTypeId,
      dutyResponsibilityId: duty.dutyResponsibilityId,
      materialId: (duty as any).materialId ?? null,
      generateExpense,
      supplierId: (duty as any).supplierId ?? null,
      expenseNo: (duty as any).expenseNo ?? null,
      mainContractId: duty.mainContractId,
      isDeleted: duty.isDeleted
    });
  }

  deleteContractorDuty(index: number): void {
    const duties = [...this.contractorDuties()];
    duties.splice(index, 1);
    this.contractorDuties.set(duties);

    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Contractor duty deleted successfully', life: 3000 });
  }

  clearForm(): void {
    this.contractorDutyForm.reset({
      id: 0,
      subTotal: 0,
      quantity: 0,
      price: 0,
      unitId: 0,
      dutyTypeId: 0,
      dutyResponsibilityId: 0,
      materialId: null,
      generateExpense: false,
      supplierId: null,
      expenseNo: null,
      mainContractId: this.mainContractId(),
      isDeleted: false
    });
    this.editingIndex.set(null);
  }

  saveAllContractorDuties(): void {
    if (this.contractorDuties().length === 0 && !this.allowEmpty()) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please add at least one contractor duty', life: 5000 });
      return;
    }
    this.contractorDutyData.emit(this.contractorDuties());
  }

  onVisibleChange(isVisible: boolean): void {
    if (!isVisible) {
      this.closeDialog.emit();
    }
  }

  closeContractorDutiesDialog(): void {
    this.closeDialog.emit();
  }

  getUnitName(unitId: number): string {
    return this.units().find(u => u.id === unitId)?.name || '-';
  }

  getDutyTypeName(dutyTypeId: number): string {
    return this.dutyTypes().find(dt => dt.id === dutyTypeId)?.name || '-';
  }

  getDutyResponsibilityName(dutyResponsibilityId: number): string {
    return this.dutyResponsibilities().find(dr => dr.id === dutyResponsibilityId)?.name || '-';
  }

  getSupplierName(supplierId: number | null): string {
    if (!supplierId) return '-';
    return this.suppliers().find(s => s.value === supplierId)?.label || '-';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contractorDutyForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  getFieldError(fieldName: string): string {
    const field = this.contractorDutyForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return 'Value must be greater than 0';
    }
    return '';
  }

  get generateExpenseChecked(): boolean {
    return !!this.contractorDutyForm.get('generateExpense')?.value;
  }
}
