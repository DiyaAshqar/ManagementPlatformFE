import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { Subject } from 'rxjs';

interface Lookup {
  id: number;
  name: string;
}

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    SelectModule,
    ProgressSpinnerModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule
  ],
  templateUrl: './step1.component.html'
})
export class Step1Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  step1Form!: FormGroup;
  countries = signal<Lookup[]>([]);
  cities = signal<Lookup[]>([]);
  agreementTypes = signal<Lookup[]>([]);
  isLoading = signal(false);
  
  minEndDate = signal<Date | null>(null);
  maxStartDate = signal<Date | null>(null);

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private messageService: MessageService) {}

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
    this.step1Form = this.fb.group({
      agreementDto: this.fb.group(
        {
          id: [0],
          projectNumber: [{ value: 'Auto Generated', disabled: true }],
          agreementDate: [{ value: today, disabled: true }],
          projectName: ['', [Validators.required, Validators.maxLength(200)]],
          businessSector: ['', [Validators.required, Validators.maxLength(100)]],
          estimatedStartDate: [today, Validators.required],
          estimatedEndDate: [today, Validators.required],
          countryId: [0, Validators.required],
          cityId: [0, Validators.required],
          projectArea: [0, [Validators.required, Validators.min(0)]],
          drillingQuantity: [0, [Validators.required, Validators.min(0)]],
          agreementTypeId: [0, [Validators.required, Validators.min(0)]]
        },
        { validators: this.dateRangeValidator }
      ),
      clientDto: this.fb.group({
        id: [0],
        contactPerson: ['', [Validators.required, Validators.maxLength(100)]],
        contactPersonNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
        representerName: ['', [Validators.required, Validators.maxLength(100)]],
        representerNameNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
      }),
      landInformationDto: this.fb.group({
        id: [0],
        basinName: ['', [Validators.required, Validators.maxLength(100)]],
        village: ['', [Validators.required, Validators.maxLength(100)]],
        directorate: ['', [Validators.required, Validators.maxLength(100)]],
        plotNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
        basinNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
        floorNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]]
      })
    });
  }

  private loadLookups(): void {
    // TODO: Replace with your actual service calls
    // Mock data for now
    this.countries.set([
      { id: 1, name: 'Country 1' },
      { id: 2, name: 'Country 2' }
    ]);
    this.cities.set([
      { id: 1, name: 'City 1' },
      { id: 2, name: 'City 2' }
    ]);
    this.agreementTypes.set([
      { id: 1, name: 'Type 1' },
      { id: 2, name: 'Type 2' }
    ]);
  }

  onSubmit(): void {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      // show toast for validation errors
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fix validation errors before submitting.',
        life: 5000
      });
      return;
    }

    const formValue = this.convertDatesToStrings(this.step1Form.value);
    this.stepData.emit(formValue);
  }

  private convertDatesToStrings(formValue: any): any {
    const converted = { ...formValue };

    if (converted.agreementDto) {
      converted.agreementDto = { ...converted.agreementDto };
      converted.agreementDto.projectNumber = this.step1Form.get('agreementDto.projectNumber')?.value || '';

      if (converted.agreementDto.agreementDate instanceof Date) {
        converted.agreementDto.agreementDate = this.formatDate(converted.agreementDto.agreementDate);
      }
      if (converted.agreementDto.estimatedStartDate instanceof Date) {
        converted.agreementDto.estimatedStartDate = this.formatDate(converted.agreementDto.estimatedStartDate);
      }
      if (converted.agreementDto.estimatedEndDate instanceof Date) {
        converted.agreementDto.estimatedEndDate = this.formatDate(converted.agreementDto.estimatedEndDate);
      }
    }
    return converted;
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
      
      // Validate the form after date change
      this.step1Form.get('agreementDto')?.updateValueAndValidity();
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
      
      // Validate the form after date change
      this.step1Form.get('agreementDto')?.updateValueAndValidity();
    } else {
      this.maxStartDate.set(null);
    }
  }

  private dateRangeValidator(group: any) {
    const startDate = group.get('estimatedStartDate')?.value;
    const endDate = group.get('estimatedEndDate')?.value;

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
    const field = this.step1Form.get(fieldName);
    return !!(field && field.invalid && (field.touched || field.dirty));
  }

  getFieldError(fieldName: string): string {
    const field = this.step1Form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['pattern']) return 'Invalid format';
      if (field.errors['min']) return 'Value must be greater than 0';
      if (field.errors['maxLength']) return 'Value is too long';
    }

    const agreementGroup = this.step1Form.get('agreementDto');
    if (agreementGroup?.errors?.['dateRange'] &&
      (fieldName === 'agreementDto.estimatedStartDate' || fieldName === 'agreementDto.estimatedEndDate')) {
      return 'End date must be after start date';
    }

    return '';
  }
}
