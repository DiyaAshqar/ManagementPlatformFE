import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import { 
  FullAgreementDto, 
  ThirdStepDto, 
  ProjectAreaUnitDto,
  LookupDto 
} from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-step3',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    ProgressSpinnerModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TooltipModule,
    TableModule
  ],
  templateUrl: './step3.component.html'
})
export class Step3Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  step3Form!: FormGroup;
  projectAreaUnits = signal<ProjectAreaUnitDto[]>([]);
  units = signal<LookupDto[]>([]);
  annexes = signal<LookupDto[]>([]);
  isLoading = signal(false);
  isFormValid = signal(false);
  editingIndex = signal<number | null>(null);

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.step3Form = this.fb.group({
      projectAreaUnitDto: this.fb.group({
        id: [0],
        annexId: [null, [Validators.required, Validators.min(1)]],
        amount: [null, [Validators.required, Validators.min(0)]],
        unitId: [null, [Validators.required, Validators.min(1)]]
      })
    });

    // Track form validity changes
    this.step3Form.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isFormValid.set(this.step3Form.valid);
      });
    
    // Set initial validity
    this.isFormValid.set(this.step3Form.valid);
  }

  private loadLookups(): void {
    this.isLoading.set(true);
    
    this.agreementWizardService.getStep3Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lookups) => {
          this.units.set(lookups.units);
          this.annexes.set(lookups.annexes);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading lookups:', error);
          this.isLoading.set(false);
        }
      });
  }

  private loadAgreementData(): void {
    if (this.agreementId() === 0) {
      return;
    }

    this.isLoading.set(true);
    
    // TODO: Replace with actual API call to load agreement data
    // Mock implementation
    setTimeout(() => {
      // Example: this.projectAreaUnits.set(response.data.projectAreaUnitDto || []);
      this.isLoading.set(false);
    }, 500);
  }

  onSubmit(): void {
    const entries = this.projectAreaUnits();
    
    if (!entries.length) {
      this.step3Form.markAllAsTouched();
      this.showError('Please add at least one entry to submit');
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
            this.stepData.emit(this.step3Form.getRawValue());
            this.isLoading.set(false);
          } else {
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving step 3:', error);
          this.isLoading.set(false);
        }
      });
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const entries = this.projectAreaUnits();
    
    // Create the ThirdStepDto
    const thirdStepDto = new ThirdStepDto();
    
    // Map ProjectAreaUnitDto array
    const projectAreaUnitDtos = entries.map(entry => {
      const dto = new ProjectAreaUnitDto();
      dto.id = entry.id || 0;
      dto.annexId = entry.annexId!;
      dto.amount = entry.amount!;
      dto.unitId = entry.unitId!;
      dto.isDeleted = entry.isDeleted || false;
      return dto;
    });
    
    thirdStepDto.projectAreaUnitDto = projectAreaUnitDtos;
    
    // Create the FullAgreementDto
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 3;
    fullAgreementDto.agreementId = this.agreementId() || 0;
    fullAgreementDto.thirdStepDto = thirdStepDto;
    
    return fullAgreementDto;
  }

  addEntry(): void {
    if (this.step3Form.invalid) {
      this.step3Form.markAllAsTouched();
      this.showError('Please fill in all required fields correctly');
      return;
    }

    const formValue = this.step3Form.get('projectAreaUnitDto')?.value;
    const currentEditingIndex = this.editingIndex();
    const currentEntries = [...this.projectAreaUnits()];

    if (currentEditingIndex !== null) {
      // Update existing entry
      const updatedDto = new ProjectAreaUnitDto();
      updatedDto.id = currentEntries[currentEditingIndex].id;
      updatedDto.annexId = formValue.annexId;
      updatedDto.amount = formValue.amount;
      updatedDto.unitId = formValue.unitId;
      updatedDto.isDeleted = currentEntries[currentEditingIndex].isDeleted ?? false;
      
      currentEntries[currentEditingIndex] = updatedDto;
      this.projectAreaUnits.set(currentEntries);
      this.editingIndex.set(null);
    } else {
      // Add new entry
      const newDto = new ProjectAreaUnitDto();
      newDto.id = 0;
      newDto.annexId = formValue.annexId;
      newDto.amount = formValue.amount;
      newDto.unitId = formValue.unitId;
      newDto.isDeleted = false;
      
      currentEntries.push(newDto);
      this.projectAreaUnits.set(currentEntries);
    }

    this.clearForm();
  }

  editEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    
    // Find the actual index in the full array
    const actualIndex = this.projectAreaUnits().findIndex(e => 
      e.id === entry.id && 
      e.annexId === entry.annexId && 
      e.amount === entry.amount && 
      e.unitId === entry.unitId
    );

    this.editingIndex.set(actualIndex);
    this.step3Form.patchValue({
      projectAreaUnitDto: {
        id: entry.id,
        annexId: entry.annexId,
        amount: entry.amount,
        unitId: entry.unitId
      }
    });
  }

  deleteEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    const currentEntries = [...this.projectAreaUnits()];
    
    // Find the actual index in the full array
    const actualIndex = currentEntries.findIndex(e => 
      e.id === entry.id && 
      e.annexId === entry.annexId && 
      e.amount === entry.amount && 
      e.unitId === entry.unitId
    );

    if (actualIndex === -1) return;

    // Check if entry has an id (exists in DB)
    if (entry.id && entry.id > 0) {
      // Soft delete: mark as deleted
      currentEntries[actualIndex].isDeleted = true;
    } else {
      // Hard delete: remove from array (not yet in DB)
      currentEntries.splice(actualIndex, 1);
    }

    this.projectAreaUnits.set(currentEntries);
  }

  clearForm(): void {
    this.step3Form.reset({
      projectAreaUnitDto: {
        id: 0,
        annexId: null,
        amount: null,
        unitId: null
      }
    });
    this.editingIndex.set(null);
  }

  // Helper methods to get active entries
  getActiveEntries(): ProjectAreaUnitDto[] {
    return this.projectAreaUnits().filter(entry => !entry.isDeleted);
  }

  // Helper methods to get names
  getAnnexName(annexId: number): string {
    const annex = this.annexes().find(a => a.id === annexId);
    return annex?.name || 'Unknown';
  }

  getUnitName(unitId: number): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit?.name || 'Unknown';
  }

  // Validation methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.step3Form.get('projectAreaUnitDto')?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.step3Form.get('projectAreaUnitDto')?.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return 'Value must be greater than 0';
      if (field.errors['maxLength']) return 'Value is too long';
    }
    return '';
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }
}
