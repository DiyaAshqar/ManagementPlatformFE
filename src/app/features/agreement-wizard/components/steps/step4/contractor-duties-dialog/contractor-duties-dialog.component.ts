import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AgreementWizardService } from '../../../../services/agreement-wizard.service';
import { 
  ContractorDutyDto,
  LookupDto,
  MainContractDto
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
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './contractor-duties-dialog.component.html'
})
export class ContractorDutiesDialogComponent implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  visible = input.required<boolean>();
  agreementId = input.required<number>();
  mainContractId = input.required<number>();
  existingContractorDuties = input<ContractorDutyDto[]>([]);
  isViewMode = input<boolean>(false);
  
  closeDialog = output<void>();
  contractorDutyData = output<ContractorDutyDto[]>();

  contractorDutyForm!: FormGroup;
  units = signal<LookupDto[]>([]);
  dutyTypes = signal<LookupDto[]>([]);
  dutyResponsibilities = signal<LookupDto[]>([]);
  contractorDuties = signal<ContractorDutyDto[]>([]);
  isLoading = signal(false);
  
  // Editing state
  editingIndex = signal<number | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private agreementWizardService: AgreementWizardService
  ) {
    // Watch for changes in existingContractorDuties and reload when dialog opens
    effect(() => {
      if (this.visible() && this.existingContractorDuties()) {
        this.loadExistingContractorDuties();
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.contractorDutyForm = this.fb.group({
      id: [0],
      subTotal: [0], // Calculated field
      quantity: [0, [Validators.required, Validators.min(0.01)]],
      price: [0, [Validators.required, Validators.min(0.01)]],
      unitId: [0, [Validators.required, Validators.min(1)]],
      dutyTypeId: [0, [Validators.required, Validators.min(1)]],
      dutyResponsibilityId: [0, [Validators.required, Validators.min(1)]],
      mainContractId: [this.mainContractId()],
      isDeleted: [false]
    });

    // Auto-calculate subtotal when quantity or price changes
    this.contractorDutyForm.get('quantity')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateSubTotal());
    
    this.contractorDutyForm.get('price')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calculateSubTotal());
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
        error: (error) => {
          console.error('Error loading lookups:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load lookups',
            life: 5000
          });
          this.isLoading.set(false);
        }
      });
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
      contractorDuty.mainContractId = duty.mainContractId ?? this.mainContractId();
      contractorDuty.isDeleted = duty.isDeleted ?? false;
      return contractorDuty;
    });
    
    this.contractorDuties.set(duties);
  }

  calculateSubTotal(): void {
    const quantity = this.contractorDutyForm.get('quantity')?.value || 0;
    const price = this.contractorDutyForm.get('price')?.value || 0;
    const subTotal = quantity * price;
    
    this.contractorDutyForm.patchValue({ subTotal }, { emitEvent: false });
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
    dutyData.mainContractId = this.mainContractId();
    dutyData.isDeleted = false;

    const editIndex = this.editingIndex();
    if (editIndex !== null) {
      // Update existing duty
      const duties = [...this.contractorDuties()];
      duties[editIndex] = dutyData;
      this.contractorDuties.set(duties);
      this.editingIndex.set(null);
      
    } else {
      // Add new duty
      this.contractorDuties.set([...this.contractorDuties(), dutyData]);
      
    }

    this.clearForm();
  }

  editContractorDuty(index: number): void {
    const duty = this.contractorDuties()[index];
    
    this.editingIndex.set(index);
    this.contractorDutyForm.patchValue({
      id: duty.id,
      subTotal: duty.subTotal,
      quantity: duty.quantity,
      price: duty.price,
      unitId: duty.unitId,
      dutyTypeId: duty.dutyTypeId,
      dutyResponsibilityId: duty.dutyResponsibilityId,
      mainContractId: duty.mainContractId,
      isDeleted: duty.isDeleted
    });
  }

  deleteContractorDuty(index: number): void {
    const duties = [...this.contractorDuties()];
    duties.splice(index, 1);
    this.contractorDuties.set(duties);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Contractor duty deleted successfully',
      life: 3000
    });
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
      mainContractId: this.mainContractId(),
      isDeleted: false
    });
    this.editingIndex.set(null);
  }

  saveAllContractorDuties(): void {
    if (this.contractorDuties().length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please add at least one contractor duty',
        life: 5000
      });
      return;
    }

    // Emit the contractor duties to parent component
    this.contractorDutyData.emit(this.contractorDuties());
  }

  onDialogHide(): void {
    this.closeDialog.emit();
  }

  // Helper methods
  getUnitName(unitId: number): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit?.name || 'Unknown';
  }

  getDutyTypeName(dutyTypeId: number): string {
    const dutyType = this.dutyTypes().find(dt => dt.id === dutyTypeId);
    return dutyType?.name || 'Unknown';
  }

  getDutyResponsibilityName(dutyResponsibilityId: number): string {
    const dutyResponsibility = this.dutyResponsibilities().find(dr => dr.id === dutyResponsibilityId);
    return dutyResponsibility?.name || 'Unknown';
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
}