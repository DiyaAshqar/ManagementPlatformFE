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
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import { 
  FullAgreementDto, 
  FourthStepDto, 
  MainContractDto,
  ContractorDutyDto,
  LookupDto 
} from '../../../../../../nswag/api-client';
import { ContractorDutiesDialogComponent } from './contractor-duties-dialog/contractor-duties-dialog.component';

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
    TooltipModule,
    ContractorDutiesDialogComponent
  ],
  templateUrl: './step4.component.html'
})
export class Step4Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  mainContractForm!: FormGroup;
  mainContractTypes = signal<LookupDto[]>([]);
  constructors = signal<LookupDto[]>([]);
  mainContracts = signal<MainContractDto[]>([]);
  isLoading = signal(false);
  isFormValid = signal(false);
  
  // Editing state
  editingIndex = signal<number | null>(null);
  
  // Dialog state
  showContractorDutiesDialog = signal(false);
  selectedMainContractId = signal<number>(0);
  
  // Date restrictions
  minEndDate = signal<Date | null>(null);
  maxStartDate = signal<Date | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private agreementWizardService: AgreementWizardService
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
        constructorId: [0, [Validators.required, Validators.min(1)]]
      },
      { validators: this.dateRangeValidator }
    );

    // Track form validity changes
    this.mainContractForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFormValid.set(this.mainContractForm.valid);
      });
    
    // Set initial validity
    this.isFormValid.set(this.mainContractForm.valid);
  }

  private loadLookups(): void {
    this.isLoading.set(true);
    
    this.agreementWizardService.getStep4Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lookups) => {
          this.mainContractTypes.set(lookups.mainContractTypes);
          this.constructors.set(lookups.constructors);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading lookups:', error);
          this.isLoading.set(false);
        }
      });
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

    // Since contracts are saved individually via API calls,
    // we just need to emit the current data
    this.stepData.emit(this.buildFormData());
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const contracts = this.mainContracts();
    
    // Create the FourthStepDto
    const fourthStepDto = new FourthStepDto();
    
    // Map MainContractDto array
    const mainContractDtos = contracts.map(contract => {
      const dto = new MainContractDto();
      dto.id = contract.id || 0;
      dto.total = contract.total || 0;
      dto.startDate = contract.startDate;
      dto.endDate = contract.endDate;
      dto.agreementId = this.agreementId() || 0;
      dto.typeId = contract.typeId || 0;
      dto.constructorId = contract.constructorId || 0;
      dto.isDeleted = contract.isDeleted || false;
      return dto;
    });
    
    fourthStepDto.mainContractDto = mainContractDtos;
    
    // Create the FullAgreementDto
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 4;
    fullAgreementDto.agreementId = this.agreementId() || 0;
    fullAgreementDto.fourthStepDto = fourthStepDto;
    
    return fullAgreementDto;
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
        isDeleted: contract.isDeleted
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

    this.isLoading.set(true);
    const formValue = this.mainContractForm.value;
    
    // Prepare contract data in the required format
    const contractData = new MainContractDto();
    contractData.id = formValue.id || 0;
    contractData.total = formValue.total;
    contractData.startDate = formValue.startDate;
    contractData.endDate = formValue.endDate;
    contractData.agreementId = this.agreementId();
    contractData.typeId = formValue.typeId;
    contractData.constructorId = formValue.constructorId;
    contractData.contractorDutyDto = []; // Initialize as empty array
    contractData.isDeleted = false;

    // Call API to create/update the contract
    this.agreementWizardService.createMainContract(this.agreementId(), contractData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data !== undefined && response.data !== null) {
            // Update the contract with the returned ID
            contractData.id = response.data;
            
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
                detail: 'Contract updated successfully',
                life: 3000
              });
            } else {
              // Add new contract
              this.mainContracts.set([...this.mainContracts(), contractData]);
              
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Contract added successfully',
                life: 3000
              });
            }

            this.clearForm();
            this.isLoading.set(false);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to save contract',
              life: 5000
            });
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving contract:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save contract. Please try again.',
            life: 5000
          });
          this.isLoading.set(false);
        }
      });
  }

  editContract(index: number): void {
    const contract = this.mainContracts()[index];
    
    this.editingIndex.set(index);
    this.mainContractForm.patchValue({
      id: contract.id,
      total: contract.total,
      startDate: contract.startDate || new Date(),
      endDate: contract.endDate || new Date(),
      agreementId: contract.agreementId,
      typeId: contract.typeId,
      constructorId: contract.constructorId
    });
  }

  deleteContract(index: number): void {
    const contracts = [...this.mainContracts()];
    contracts.splice(index, 1);
    this.mainContracts.set(contracts);
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
      constructorId: 0
    });
    this.editingIndex.set(null);
    this.minEndDate.set(null);
    this.maxStartDate.set(null);
  }

  // Helper methods
  getMainContractTypeName(typeId: number): string {
    const type = this.mainContractTypes().find(t => t.id === typeId);
    return type?.name || 'Unknown';
  }

  getConstructorName(constructorId: number): string {
    const constructor = this.constructors().find(c => c.id === constructorId);
    return constructor?.name || 'Unknown';
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateForApi(date: Date): string {
    if (!date) return '';
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

  showContractorDuties(index: number): void {
    const contract = this.mainContracts()[index];
    this.selectedMainContractId.set(contract.id || 0);
    this.showContractorDutiesDialog.set(true);
  }

  onContractorDutiesDialogClose(): void {
    this.showContractorDutiesDialog.set(false);
    this.selectedMainContractId.set(0);
  }

  onContractorDutyDataReceived(contractorDuties: ContractorDutyDto[]): void {
    const contractId = this.selectedMainContractId();
    const contractIndex = this.mainContracts().findIndex(c => c.id === contractId);
    
    if (contractIndex !== -1) {
      // Update the contract with new contractor duties
      const updatedContracts = [...this.mainContracts()];
      updatedContracts[contractIndex].contractorDutyDto = contractorDuties;
      this.mainContracts.set(updatedContracts);
      
      // Save to backend with the correct payload structure
      this.saveMainContractWithDuties(updatedContracts[contractIndex]);
    }
    
    this.showContractorDutiesDialog.set(false);
    this.selectedMainContractId.set(0);
  }

  private saveMainContractWithDuties(mainContract: MainContractDto): void {
    this.isLoading.set(true);
    
    // Prepare the FullAgreementDto payload as specified
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 4;
    fullAgreementDto.agreementId = this.agreementId();
    
    const fourthStepDto = new FourthStepDto();
    fourthStepDto.mainContractDto = [mainContract];
    fullAgreementDto.fourthStepDto = fourthStepDto;
    
    this.agreementWizardService.createAgreement(fullAgreementDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data !== undefined && response.data !== null) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Contractor duties saved successfully',
              life: 3000
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to save contractor duties',
              life: 5000
            });
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error saving contractor duties:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save contractor duties. Please try again.',
            life: 5000
          });
          this.isLoading.set(false);
        }
      });
  }

  getSelectedContractorDuties(): ContractorDutyDto[] {
    const contractId = this.selectedMainContractId();
    const contract = this.mainContracts().find(c => c.id === contractId);
    return contract?.contractorDutyDto || [];
  }
}
