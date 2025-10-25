import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';

interface Lookup {
  id: number;
  name: string;
}

interface MainContract {
  id: number;
  total: number;
  startDate: string;
  endDate: string;
  agreementId: number;
  typeId: number;
  constructorId: number;
  contractorDuties: string[];
}

@Component({
  selector: 'app-step4',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    ProgressSpinnerModule,
    InputNumberModule,
    DatePickerModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './step4.component.html'
})
export class Step4Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  mainContractForm!: FormGroup;
  mainContractTypes = signal<Lookup[]>([]);
  constructors = signal<Lookup[]>([]);
  mainContracts = signal<MainContract[]>([]);
  isLoading = signal(false);
  
  // Editing state
  editingIndex = signal<number | null>(null);
  
  // Date restrictions
  minEndDate = signal<Date | null>(null);
  maxStartDate = signal<Date | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const today = new Date();
    this.mainContractForm = this.fb.group(
      {
        id: [0],
        total: [0, [Validators.required, Validators.min(0.01)]],
        startDate: [today, Validators.required],
        endDate: [today, Validators.required],
        agreementId: [this.agreementId()],
        typeId: [0, [Validators.required, Validators.min(1)]],
        constructorId: [0, [Validators.required, Validators.min(1)]],
        contractorDuties: [[]]
      },
      { validators: this.dateRangeValidator }
    );
  }

  private loadLookups(): void {
    // TODO: Replace with your actual service calls
    // Mock data for now
    this.mainContractTypes.set([
      { id: 1, name: 'Fixed Price Contract' },
      { id: 2, name: 'Time & Materials Contract' },
      { id: 3, name: 'Cost Plus Contract' },
      { id: 4, name: 'Unit Price Contract' }
    ]);
    
    this.constructors.set([
      { id: 1, name: 'ABC Construction Company' },
      { id: 2, name: 'XYZ Builders Ltd' },
      { id: 3, name: 'Prime Contractors Inc' },
      { id: 4, name: 'Elite Building Group' }
    ]);
  }

  onSubmit(): void {
    if (this.mainContracts().length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please add at least one main contract',
        life: 5000
      });
      return;
    }

    const formValue = this.buildFormData();
    this.stepData.emit(formValue);
  }

  private buildFormData(): any {
    return {
      mainContractDto: this.mainContracts().map(contract => ({
        id: contract.id,
        total: contract.total,
        startDate: contract.startDate,
        endDate: contract.endDate,
        agreementId: this.agreementId(),
        typeId: contract.typeId,
        constructorId: contract.constructorId,
        contractorDuties: contract.contractorDuties
      }))
    };
  }

  addContract(): void {
    if (this.mainContractForm.invalid) {
      this.mainContractForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
      return;
    }

    const formValue = this.mainContractForm.value;
    const contractData: MainContract = {
      id: formValue.id || 0,
      total: formValue.total,
      startDate: this.formatDate(formValue.startDate),
      endDate: this.formatDate(formValue.endDate),
      agreementId: this.agreementId(),
      typeId: formValue.typeId,
      constructorId: formValue.constructorId,
      contractorDuties: formValue.contractorDuties || []
    };

    const editIndex = this.editingIndex();
    if (editIndex !== null) {
      // Update existing contract
      const contracts = [...this.mainContracts()];
      contracts[editIndex] = contractData;
      this.mainContracts.set(contracts);
      this.editingIndex.set(null);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Main contract updated successfully',
        life: 3000
      });
    } else {
      // Add new contract
      this.mainContracts.set([...this.mainContracts(), contractData]);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Main contract added successfully',
        life: 3000
      });
    }

    this.clearForm();
  }

  editContract(index: number): void {
    const contract = this.mainContracts()[index];
    
    this.editingIndex.set(index);
    this.mainContractForm.patchValue({
      id: contract.id,
      total: contract.total,
      startDate: new Date(contract.startDate),
      endDate: new Date(contract.endDate),
      agreementId: contract.agreementId,
      typeId: contract.typeId,
      constructorId: contract.constructorId,
      contractorDuties: contract.contractorDuties
    });
  }

  deleteContract(index: number): void {
    const contracts = [...this.mainContracts()];
    contracts.splice(index, 1);
    this.mainContracts.set(contracts);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Main contract deleted successfully',
      life: 3000
    });
  }

  clearForm(): void {
    const today = new Date();
    this.mainContractForm.reset({
      id: 0,
      total: 0,
      startDate: today,
      endDate: today,
      agreementId: this.agreementId(),
      typeId: 0,
      constructorId: 0,
      contractorDuties: []
    });
    this.editingIndex.set(null);
    this.minEndDate.set(null);
    this.maxStartDate.set(null);
  }

  // Helper methods
  getMainContractTypeName(typeId: number): string {
    const type = this.mainContractTypes().find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  }

  getConstructorName(constructorId: number): string {
    const constructor = this.constructors().find(c => c.id === constructorId);
    return constructor ? constructor.name : 'Unknown';
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onStartDateChange(event: any): void {
    const startDate = event.value;
    if (startDate) {
      const minEndDate = new Date(startDate);
      minEndDate.setDate(minEndDate.getDate() + 1);
      this.minEndDate.set(minEndDate);
      
      this.mainContractForm.updateValueAndValidity();
    } else {
      this.minEndDate.set(null);
    }
  }

  onEndDateChange(event: any): void {
    const endDate = event.value;
    if (endDate) {
      const maxStartDate = new Date(endDate);
      maxStartDate.setDate(maxStartDate.getDate() - 1);
      this.maxStartDate.set(maxStartDate);
      
      this.mainContractForm.updateValueAndValidity();
    } else {
      this.maxStartDate.set(null);
    }
  }

  private dateRangeValidator(group: any) {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return { dateRange: true };
      }
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.mainContractForm.get(fieldName);
    const isInvalid = !!(field && field.invalid && (field.touched || field.dirty));

    // Check for date range validation error
    const hasDateRangeError = this.mainContractForm.errors?.['dateRange'] &&
      (fieldName === 'startDate' || fieldName === 'endDate');

    return isInvalid || hasDateRangeError;
  }

  getFieldError(fieldName: string): string {
    const field = this.mainContractForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return 'Value must be greater than 0';
    }

    if (this.mainContractForm.errors?.['dateRange'] &&
      (fieldName === 'startDate' || fieldName === 'endDate')) {
      return 'End date must be after start date';
    }

    return '';
  }
}
