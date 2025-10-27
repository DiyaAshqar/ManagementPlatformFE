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

interface Lookup {
  id: number;
  name: string;
}

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
  contractTypes = signal<Lookup[]>([]);
  contractModels = signal<Lookup[]>([]);
  paymentMethods = signal<Lookup[]>([]);
  services = signal<Lookup[]>([]);
  isLoading = signal(false);

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookups();
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
  }

  private loadLookups(): void {
    // TODO: Replace with your actual service calls
    // Mock data for now
    this.contractTypes.set([
      { id: 1, name: 'Fixed Price' },
      { id: 2, name: 'Time & Materials' },
      { id: 3, name: 'Cost Plus' }
    ]);
    
    this.contractModels.set([
      { id: 1, name: 'Lump Sum' },
      { id: 2, name: 'Unit Price' },
      { id: 3, name: 'Percentage' }
    ]);
    
    this.paymentMethods.set([
      { id: 1, name: 'Monthly Fees' },
      { id: 2, name: 'Milestone Based' },
      { id: 3, name: 'Upon Completion' }
    ]);
    
    this.services.set([
      { id: 1, name: 'Engineering Design' },
      { id: 2, name: 'Construction Management' },
      { id: 3, name: 'Quality Control' },
      { id: 4, name: 'Safety Management' },
      { id: 5, name: 'Equipment Rental' },
      { id: 6, name: 'Material Supply' }
    ]);
  }

  get selectedServicesArray(): FormArray {
    return this.step2Form.get('selectedServices') as FormArray;
  }

  toggleService(serviceId: number): void {
    const selectedServices = this.selectedServicesArray;
    const index = selectedServices.value.indexOf(serviceId);

    if (index > -1) {
      selectedServices.removeAt(index);
    } else {
      selectedServices.push(this.fb.control(serviceId));
    }
  }

  isServiceSelected(serviceId: number): boolean {
    return this.selectedServicesArray.value.includes(serviceId);
  }

  onSubmit(): void {
    if (this.step2Form.invalid) {
      this.step2Form.markAllAsTouched();
      return;
    }

    const formValue = this.buildFormData();
    this.stepData.emit(formValue);
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
