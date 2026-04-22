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
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { Subject, takeUntil } from 'rxjs';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import { LookupDto, FullAgreementDto, FirstStepDto, AgreementDto, ClientDto, LandInformationDto } from '../../../../../../nswag/api-client';

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
    TextareaModule,
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
  isViewMode = input<boolean>(false);
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
    this.loadAgreementData();
    
    // Disable all fields if in view mode
    if (this.isViewMode()) {
      this.step1Form.disable();
    }
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
          description: ['', [Validators.maxLength(500)]],
          agreementTypeId: [null, [Validators.required, Validators.min(0)]]
        },
        { validators: this.dateRangeValidator }
      ),
      clientDto: this.fb.group({
        id: [0],
        contactPerson: ['', [Validators.required, Validators.maxLength(100)]],
        contactPersonNumber: ['', [Validators.required]],
        representerName: ['', [Validators.required, Validators.maxLength(100)]],
        representerNameNumber: ['', [Validators.required]]
      }),
      landInformationDto: this.fb.group({
        id: [0],
        basinName: ['', [Validators.maxLength(100)]],
        village: ['', [Validators.maxLength(100)]],
        directorate: ['', [Validators.maxLength(100)]],
        plotNumber: ['', [Validators.pattern(/^\d+$/)]],
        basinNumber: ['', [Validators.pattern(/^\d+$/)]],
        floorNumber: ['', [Validators.pattern(/^\d+$/)]]
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

  private loadAgreementData(): void {
    // Only load data in edit mode (when agreementId > 0)
    if (this.agreementId() > 0) {
      this.isLoading.set(true);
      this.agreementWizardService.getAgreementById(this.agreementId(), 1)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.succeeded && response.data?.firstStepDto) {
              this.populateForm(response.data.firstStepDto);
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

  private populateForm(data: FirstStepDto): void {
    if (data.agreementDto) {
      this.step1Form.patchValue({
        agreementDto: {
          id: data.agreementDto.id,
          projectNumber: data.agreementDto.projectNumber,
          agreementDate: data.agreementDto.agreementDate ? new Date(data.agreementDto.agreementDate) : new Date(),
          projectName: data.agreementDto.projectName,
          businessSector: data.agreementDto.businessSector,
          estimatedStartDate: data.agreementDto.estimatedStartDate ? new Date(data.agreementDto.estimatedStartDate) : new Date(),
          estimatedEndDate: data.agreementDto.estimatedEndDate ? new Date(data.agreementDto.estimatedEndDate) : new Date(),
          countryId: data.agreementDto.countryId,
          cityId: data.agreementDto.cityId,
          projectArea: data.agreementDto.projectArea,
          drillingQuantity: data.agreementDto.drillingQuantity,
          description: (data.agreementDto as any).description ?? '',
          agreementTypeId: data.agreementDto.agreementTypeId
        }
      });
    }
    
    if (data.clientDto) {
      this.step1Form.patchValue({
        clientDto: {
          id: data.clientDto.id,
          contactPerson: data.clientDto.contactPerson,
          contactPersonNumber: data.clientDto.contactPersonNumber?.toString(),
          representerName: data.clientDto.representerName,
          representerNameNumber: data.clientDto.representerNameNumber?.toString()
        }
      });
    }
    
    if (data.landInformationDto) {
      this.step1Form.patchValue({
        landInformationDto: {
          id: data.landInformationDto.id,
          basinName: data.landInformationDto.basinName,
          village: data.landInformationDto.village,
          directorate: data.landInformationDto.directorate,
          plotNumber: data.landInformationDto.plotNumber?.toString(),
          basinNumber: data.landInformationDto.basinNumber?.toString(),
          floorNumber: data.landInformationDto.floorNumber?.toString()
        }
      });
    }
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
            // First, update the agreementId in parent component
            this.agreementIdUpdate.emit(response.data);
            
            // Small delay to ensure URL is updated before emitting stepData and navigating
            setTimeout(() => {
              // Emit the form data for parent component (this will trigger navigation)
              const formValue = this.convertDatesToStrings(this.step1Form.value);
              this.stepData.emit(formValue);
            }, 100);
            
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
    const { agreementDto: a, clientDto: c, landInformationDto: l } = this.step1Form.getRawValue();
    const toDate = (v: any) => v ? new Date(v) : undefined;

    return new FullAgreementDto({
      step: 1,
      agreementId: this.agreementId() || 0,
      firstStepDto: new FirstStepDto({
        agreementDto: new AgreementDto({
          ...a,
          agreementDate: toDate(a.agreementDate),
          estimatedStartDate: toDate(a.estimatedStartDate),
          estimatedEndDate: toDate(a.estimatedEndDate),
          isSubmitted: true,
          isDeleted: false
        }),
        clientDto: new ClientDto({
          ...c,
          contactPersonNumber: parseInt(c.contactPersonNumber) || 0,
          representerNameNumber: parseInt(c.representerNameNumber) || 0
        }),
        landInformationDto: new LandInformationDto({
          ...l,
          plotNumber: parseInt(l.plotNumber) || 0,
          basinNumber: parseInt(l.basinNumber) || 0,
          floorNumber: parseInt(l.floorNumber) || 0,
          agreementId: this.agreementId() || 0
        })
      })
    });
  }

  private convertDatesToStrings(formValue: any): any {
    const a = formValue.agreementDto;
    return {
      ...formValue,
      agreementDto: {
        ...a,
        projectNumber: this.step1Form.get('agreementDto.projectNumber')?.value || '',
        agreementDate: a.agreementDate instanceof Date ? this.formatDate(a.agreementDate) : a.agreementDate,
        estimatedStartDate: a.estimatedStartDate instanceof Date ? this.formatDate(a.estimatedStartDate) : a.estimatedStartDate,
        estimatedEndDate: a.estimatedEndDate instanceof Date ? this.formatDate(a.estimatedEndDate) : a.estimatedEndDate
      }
    };
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onStartDateChange(event: any): void {
    const d = event.value ? new Date(event.value) : null;
    if (d) d.setDate(d.getDate() + 1);
    this.minEndDate.set(d);
    this.step1Form.get('agreementDto')?.updateValueAndValidity();
  }

  onEndDateChange(event: any): void {
    const d = event.value ? new Date(event.value) : null;
    if (d) d.setDate(d.getDate() - 1);
    this.maxStartDate.set(d);
    this.step1Form.get('agreementDto')?.updateValueAndValidity();
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
      if (field.errors['pattern']) {
        // Check if it's a phone number field
        if (fieldName.includes('contactPersonNumber') || fieldName.includes('representerNameNumber')) {
          return 'Must be exactly 10 digits';
        }
        return 'Invalid format';
      }
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
