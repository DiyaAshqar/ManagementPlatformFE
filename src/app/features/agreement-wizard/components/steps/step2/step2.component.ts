import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import {
  FullAgreementDto,
  SecondStepDto,
  AgreementPaymentDto,
  AgreementServiceDto,
  MonthlyPaymentDto,
  LookupDto
} from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    ProgressSpinnerModule,
    InputNumberModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule
  ],
  templateUrl: './step2.component.html'
})
export class Step2Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  step2Form!: FormGroup;
  contractTypes = signal<LookupDto[]>([]);
  contractModels = signal<LookupDto[]>([]);
  paymentMethods = signal<LookupDto[]>([]);
  services = signal<LookupDto[]>([]);
  isLoading = signal(false);
  isFormValid = signal(false);

  // Store IDs for update mode
  private agreementPaymentId: number = 0;
  private monthlyPaymentId: number = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private agreementWizardService: AgreementWizardService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookups();
    this.loadAgreementData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.step2Form = this.fb.group({
      contractTypeId: [null, Validators.required],
      contractModelId: [null, Validators.required],
      paymentMethodId: [null, Validators.required],
      amount: [{ value: null, disabled: true }],
      selectedServices: this.fb.array([], Validators.required)
    });

    // Track form validity changes
    this.step2Form.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFormValid.set(this.step2Form.valid);
      });

    // Set initial validity
    this.isFormValid.set(this.step2Form.valid);
  }

  private loadLookups(): void {
    this.isLoading.set(true);

    this.agreementWizardService.getStep2Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lookups) => {
          this.contractTypes.set(lookups.contractTypes);
          this.contractModels.set(lookups.contractModels);
          this.paymentMethods.set(lookups.paymentMethods);
          this.services.set(lookups.services);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
        }
      });
  }

  private loadAgreementData(): void {
    // Only load data in edit mode (when agreementId > 0)
    if (this.agreementId() > 0) {
      this.isLoading.set(true);
      this.agreementWizardService.getAgreementById(this.agreementId(), 2)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.succeeded && response.data?.secondStepDto) {
              this.populateForm(response.data.secondStepDto);
            }
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error loading agreement data:', error);
            this.isLoading.set(false);
          }
        });
    }
  }

  private populateForm(data: SecondStepDto): void {
    if (data.agreementPaymentDto) {
      // Store the IDs for update mode
      this.agreementPaymentId = data.agreementPaymentDto.id || 0;
      this.monthlyPaymentId = data.agreementPaymentDto.monthlyPaymentDto?.id || 0;

      this.step2Form.patchValue({
        contractTypeId: data.agreementPaymentDto.contractTypeId,
        contractModelId: data.agreementPaymentDto.contractModelId,
        paymentMethodId: data.agreementPaymentDto.paymentMethodId,
        amount: data.agreementPaymentDto.monthlyPaymentDto?.amount
      });
      
      // Enable/disable amount field based on payment method
      if (data.agreementPaymentDto.paymentMethodId === 1) {
        this.step2Form.get('amount')?.enable();
      }
    }
    
    if (data.agreementServiceDto && Array.isArray(data.agreementServiceDto)) {
      // Clear existing services
      this.selectedServicesArray.clear();
      
      // Add selected services
      data.agreementServiceDto.forEach(service => {
        if (service.serviceId) {
          this.selectedServicesArray.push(this.fb.control(service.serviceId));
        }
      });
    }
  }

  get selectedServicesArray(): FormArray {
    return this.step2Form.get('selectedServices') as FormArray;
  }

  toggleService(serviceId?: number): void {
    if (serviceId === undefined || serviceId === null) return;
    const selectedServices = this.selectedServicesArray;
    const index = selectedServices.value.indexOf(serviceId);

    if (index > -1) {
      selectedServices.removeAt(index);
    } else {
      selectedServices.push(this.fb.control(serviceId));
    }
  }

  isServiceSelected(serviceId?: number): boolean {
    if (serviceId === undefined || serviceId === null) return false;
    return this.selectedServicesArray.value.includes(serviceId);
  }

  onSubmit(): void {
    if (this.step2Form.invalid) {
      this.step2Form.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix validation errors before submitting.',
        life: 5000
      });
      return;
    }

    this.isLoading.set(true);

    // Prepare the FullAgreementDto payload
    const fullAgreementDto = this.prepareFullAgreementDto();

    // Call the API
    this.agreementWizardService.createAgreement(fullAgreementDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data !== undefined && response.data !== null) {
            // Emit step data for parent component
            this.stepData.emit(this.step2Form.getRawValue());
            this.isLoading.set(false);
          } else {
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving step 2:', error);
          this.isLoading.set(false);
        }
      });
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const formValue = this.step2Form.getRawValue();

    // Create the SecondStepDto
    const secondStepDto = new SecondStepDto();

    // Map AgreementPaymentDto
    const agreementPaymentDto = new AgreementPaymentDto();
    // Use stored ID if in edit mode, otherwise 0 for create
    agreementPaymentDto.id = this.agreementPaymentId;
    agreementPaymentDto.contractTypeId = formValue.contractTypeId || 0;
    agreementPaymentDto.contractModelId = formValue.contractModelId || 0;
    agreementPaymentDto.paymentMethodId = formValue.paymentMethodId || 0;
    // Use stored monthly payment ID if in edit mode
    agreementPaymentDto.monthlyPaymentId = this.monthlyPaymentId;
    agreementPaymentDto.agreementId = this.agreementId() || 0;

    // Map MonthlyPaymentDto (only if amount is provided)
    const monthlyPaymentDto = new MonthlyPaymentDto();
    // Use stored ID if in edit mode, otherwise 0 for create
    monthlyPaymentDto.id = this.monthlyPaymentId;
    monthlyPaymentDto.amount = formValue.amount ? parseFloat(formValue.amount) : 0;
    agreementPaymentDto.monthlyPaymentDto = monthlyPaymentDto;

    // Map AgreementServiceDto array
    const agreementServiceDtos = this.selectedServicesArray.value.map((serviceId: number) => {
      const agreementServiceDto = new AgreementServiceDto();
      agreementServiceDto.agreementId = this.agreementId() || 0;
      agreementServiceDto.serviceId = serviceId;
      return agreementServiceDto;
    });

    secondStepDto.agreementPaymentDto = agreementPaymentDto;
    secondStepDto.agreementServiceDto = agreementServiceDtos;

    // Create the FullAgreementDto
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 2;
    fullAgreementDto.agreementId = this.agreementId() || 0;
    fullAgreementDto.secondStepDto = secondStepDto;

    return fullAgreementDto;
  }

  private buildFormData(): any {
    const formData = this.step2Form.value;

    return {
      agreementPaymentDto: {
        id: 0,
        contractTypeId: formData.contractTypeId || 0,
        contractModelId: formData.contractModelId || 0,
        paymentMethodId: formData.paymentMethodId || 0,
        monthlyPaymentId: 0,
        agreementId: this.agreementId(),
        monthlyPaymentDto: {
          id: 0,
          amount: formData.amount ? parseFloat(formData.amount) : 0
        }
      },
      agreementServiceDto: this.selectedServicesArray.value.map((serviceId: number) => ({
        id: 0,
        agreementId: this.agreementId(),
        serviceId: serviceId
      }))
    };
  }

  onPaymentMethodChange(): void {
    const method = this.step2Form.get('paymentMethodId')?.value;
    const amountControl = this.step2Form.get('amount');

    if (method === 1) { // Monthly Fees
      amountControl?.enable();
      amountControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      amountControl?.disable();
      amountControl?.clearValidators();
      amountControl?.reset();
    }
    amountControl?.updateValueAndValidity();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.step2Form.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  getFieldError(fieldName: string): string {
    const field = this.step2Form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return 'Value must be greater than or equal to 0';
    }
    return '';
  }
}
