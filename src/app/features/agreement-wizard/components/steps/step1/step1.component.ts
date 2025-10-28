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
import { Subject, takeUntil } from 'rxjs';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import { LookupDto, FullAgreementDto, FirstStepDto, AgreementDto, ClientDto, LandInformationDto } from '../../../../../../nswag/api-client';

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
  agreementIdUpdate = output<number>();

  step1Form!: FormGroup;
  countries = signal<LookupDto[]>([]);
  cities = signal<LookupDto[]>([]);
  agreementTypes = signal<LookupDto[]>([]);
  isLoading = signal(false);
  isFormValid = signal(false);
  
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
    this.step1Form = this.fb.group({
      agreementDto: this.fb.group(
        {
          id: [0],
          projectNumber: [{ value: '', disabled: true }],
          agreementDate: [{ value: today, disabled: true }],
          projectName: ['', [Validators.required, Validators.maxLength(200)]],
          businessSector: ['', [Validators.required, Validators.maxLength(100)]],
          estimatedStartDate: [today, Validators.required],
          estimatedEndDate: [today, Validators.required],
          countryId: [null, Validators.required],
          cityId: [null, Validators.required],
          projectArea: [null, [Validators.required, Validators.min(0)]],
          drillingQuantity: [null, [Validators.required, Validators.min(0)]],
          agreementTypeId: [null, [Validators.required, Validators.min(0)]]
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

    // Track form validity changes
    this.step1Form.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFormValid.set(this.step1Form.valid);
      });
    
    // Set initial validity
    this.isFormValid.set(this.step1Form.valid);
  }

  private loadLookups(): void {
    this.isLoading.set(true);
    
    this.agreementWizardService.getStep1Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lookups) => {
          this.countries.set(lookups.countries);
          this.cities.set(lookups.cities);
          this.agreementTypes.set(lookups.agreementTypes);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading lookups:', error);
          this.isLoading.set(false);
        }
      });
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

    this.isLoading.set(true);
    
    // Prepare the FullAgreementDto payload
    const fullAgreementDto = this.prepareFullAgreementDto();
    
    // Call the API
    this.agreementWizardService.createAgreement(fullAgreementDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data !== undefined && response.data !== null) {
            // Update the agreementId with the response
            this.agreementIdUpdate.emit(response.data);
            
            // Emit the form data for parent component
            const formValue = this.convertDatesToStrings(this.step1Form.value);
            this.stepData.emit(formValue);
            
            this.isLoading.set(false);
          } else {
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving step 1:', error);
          this.isLoading.set(false);
        }
      });
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const formValue = this.step1Form.getRawValue();
    
    // Create the FirstStepDto
    const firstStepDto = new FirstStepDto();
    
    // Map AgreementDto
    const agreementDto = new AgreementDto();
    agreementDto.id = formValue.agreementDto.id || 0;
    agreementDto.projectNumber = formValue.agreementDto.projectNumber || '';
    agreementDto.agreementDate = this.formatDateToString(formValue.agreementDto.agreementDate);
    agreementDto.projectName = formValue.agreementDto.projectName;
    agreementDto.businessSector = formValue.agreementDto.businessSector;
    agreementDto.estimatedStartDate = this.formatDateToString(formValue.agreementDto.estimatedStartDate);
    agreementDto.estimatedEndDate = this.formatDateToString(formValue.agreementDto.estimatedEndDate);
    agreementDto.countryId = formValue.agreementDto.countryId;
    agreementDto.cityId = formValue.agreementDto.cityId;
    agreementDto.drillingQuantity = formValue.agreementDto.drillingQuantity;
    agreementDto.projectArea = formValue.agreementDto.projectArea;
    agreementDto.agreementTypeId = formValue.agreementDto.agreementTypeId;
    agreementDto.isSubmitted = true;
    agreementDto.isDeleted = false;
    
    // Map ClientDto
    const clientDto = new ClientDto();
    clientDto.id = formValue.clientDto.id || 0;
    clientDto.contactPerson = formValue.clientDto.contactPerson;
    clientDto.contactPersonNumber = parseInt(formValue.clientDto.contactPersonNumber) || 0;
    clientDto.representerName = formValue.clientDto.representerName;
    clientDto.representerNameNumber = parseInt(formValue.clientDto.representerNameNumber) || 0;
    
    // Map LandInformationDto
    const landInformationDto = new LandInformationDto();
    landInformationDto.id = formValue.landInformationDto.id || 0;
    landInformationDto.basinName = formValue.landInformationDto.basinName;
    landInformationDto.village = formValue.landInformationDto.village;
    landInformationDto.directorate = formValue.landInformationDto.directorate;
    landInformationDto.plotNumber = parseInt(formValue.landInformationDto.plotNumber) || 0;
    landInformationDto.basinNumber = parseInt(formValue.landInformationDto.basinNumber) || 0;
    landInformationDto.floorNumber = parseInt(formValue.landInformationDto.floorNumber) || 0;
    landInformationDto.agreementId = this.agreementId() || 0;
    
    firstStepDto.agreementDto = agreementDto;
    firstStepDto.clientDto = clientDto;
    firstStepDto.landInformationDto = landInformationDto;
    
    // Create the FullAgreementDto
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 1;
    fullAgreementDto.agreementId = this.agreementId() || 0;
    fullAgreementDto.firstStepDto = firstStepDto;
    
    return fullAgreementDto;
  }

  private formatDateToString(date: Date | string | undefined): Date | undefined {
    if (!date) return undefined;
    
    if (date instanceof Date) {
      return date;
    }
    
    return new Date(date);
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
