import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
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
import { LookupDto, QuantityBillDto, SixthStepDto, FullAgreementDto } from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-step6',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    ProgressSpinnerModule,
    InputNumberModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './step6.component.html'
})
export class Step6Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  isViewMode = input<boolean>(false);
  stepData = output<any>();

  step6Form!: FormGroup;
  quantityBills = signal<QuantityBillDto[]>([]);
  materials = signal<LookupDto[]>([]);
  units = signal<LookupDto[]>([]);
  milestones = signal<LookupDto[]>([]);
  isLoading = signal(false);
  
  // Editing state
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
    
    // Disable all fields if in view mode
    if (this.isViewMode()) {
      this.step6Form.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.step6Form = this.fb.group({
      quantityBillDto: this.fb.group({
        id: [0],
        materialId: [null, [Validators.required, Validators.min(1)]],
        unitId: [null, [Validators.required, Validators.min(1)]],
        mileStoneId: [null, [Validators.required, Validators.min(1)]],
        ammount: [null, [Validators.required, Validators.min(0)]],
        price: [null, [Validators.required, Validators.min(0)]],
        agreementId: [this.agreementId()]
      })
    });
  }

  private loadLookups(): void {
    this.isLoading.set(true);
    
    this.agreementWizardService.getStep6Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.materials.set(response.materials || []);
          this.units.set(response.units || []);
          this.milestones.set(response.milestones || []);
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
      this.agreementWizardService.getAgreementById(this.agreementId(), 6)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.succeeded && response.data?.sixthStepDto) {
              this.populateForm(response.data.sixthStepDto);
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

  private populateForm(data: SixthStepDto): void {
    if (data.quantityBillDto && Array.isArray(data.quantityBillDto)) {
      // Map the existing DTO objects directly since they already have the correct structure
      this.quantityBills.set([...data.quantityBillDto]);
    }
  }

  onSubmit(): void {
    const activeEntries = this.getActiveEntries();
    
    if (activeEntries.length === 0) {
      // No entries to submit
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
            this.stepData.emit(this.buildFormData());
            this.isLoading.set(false);
          } else {
            // Log and stop loading on non-success response
            console.error('Failed to save step 6 data:', response);
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving step 6:', error);
          this.isLoading.set(false);
        }
      });
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 6;
    fullAgreementDto.agreementId = this.agreementId();
    
    const sixthStepDto = new SixthStepDto();
    // Map to match the expected payload structure
    sixthStepDto.quantityBillDto = this.quantityBills().map(entry => {
      const dto = new QuantityBillDto();
      dto.id = entry.id || 0;
      dto.materialId = entry.materialId;
      dto.unitId = entry.unitId;
      dto.mileStoneId = entry.mileStoneId;
      dto.ammount = entry.ammount;
      dto.price = entry.price;
      dto.agreementId = this.agreementId();
      dto.isDeleted = entry.isDeleted || false;
      return dto;
    });
    
    fullAgreementDto.sixthStepDto = sixthStepDto;
    
    return fullAgreementDto;
  }

  private buildFormData(): any {
    return {
      quantityBillDto: this.quantityBills().map(entry => ({
        id: entry.id,
        materialId: entry.materialId,
        unitId: entry.unitId,
        mileStoneId: entry.mileStoneId,
        ammount: entry.ammount,
        price: entry.price,
        agreementId: this.agreementId(),
        isDeleted: entry.isDeleted || false
      }))
    };
  }

  addEntry(): void {
    if (this.step6Form.get('quantityBillDto')?.invalid) {
      this.step6Form.markAllAsTouched();
      return;
    }

    const formValue = this.step6Form.get('quantityBillDto')?.value;
    const editIndex = this.editingIndex();
    
    const entryData = new QuantityBillDto();
    entryData.id = formValue.id || 0;
    entryData.materialId = formValue.materialId;
    entryData.unitId = formValue.unitId;
    entryData.mileStoneId = formValue.mileStoneId;
    entryData.ammount = formValue.ammount;
    entryData.price = formValue.price;
    entryData.agreementId = this.agreementId();
    entryData.isDeleted = false;

    if (editIndex !== null) {
      // Update existing entry
      const entries = [...this.quantityBills()];
      entries[editIndex] = entryData;
      this.quantityBills.set(entries);
      this.editingIndex.set(null);
    } else {
      // Add new entry
      this.quantityBills.set([...this.quantityBills(), entryData]);
    }

    this.clearForm();
  }

  editEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    
    // Find the actual index in the full array
    const actualIndex = this.quantityBills().findIndex(e => 
      e.id === entry.id && 
      e.materialId === entry.materialId &&
      e.unitId === entry.unitId && 
      e.mileStoneId === entry.mileStoneId &&
      e.ammount === entry.ammount &&
      e.price === entry.price
    );
    
    this.editingIndex.set(actualIndex);
    this.step6Form.patchValue({
      quantityBillDto: {
        id: entry.id,
        materialId: entry.materialId,
        unitId: entry.unitId,
        mileStoneId: entry.mileStoneId,
        ammount: entry.ammount,
        price: entry.price,
        agreementId: entry.agreementId
      }
    });
  }

  deleteEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    const entries = [...this.quantityBills()];
    
    // Find the actual index in the full array
    const actualIndex = entries.findIndex(e => 
      e.id === entry.id && 
      e.materialId === entry.materialId &&
      e.unitId === entry.unitId && 
      e.mileStoneId === entry.mileStoneId &&
      e.ammount === entry.ammount &&
      e.price === entry.price
    );

    if (actualIndex === -1) return;

    // Check if entry has an id (exists in DB)
    if (entry.id && entry.id > 0) {
      // Soft delete: mark as deleted
      entries[actualIndex].isDeleted = true;
    } else {
      // Hard delete: remove from array (not yet in DB)
      entries.splice(actualIndex, 1);
    }

    this.quantityBills.set(entries);
  }

  clearForm(): void {
    this.step6Form.reset({
      quantityBillDto: {
        id: 0,
        materialId: null,
        unitId: null,
        mileStoneId: null,
        ammount: null,
        price: null,
        agreementId: this.agreementId()
      }
    });
    this.editingIndex.set(null);
  }

  // Helper methods to get active entries
  getActiveEntries(): QuantityBillDto[] {
    return this.quantityBills().filter(entry => !entry.isDeleted);
  }

  // Calculate total for display
  calculateTotal(entry: QuantityBillDto): number {
    return entry.ammount * entry.price;
  }

  // Helper methods to get names
  getMaterialName(materialId: number): string {
    const material = this.materials().find(m => m.id === materialId);
    return material ? (material.name || 'Unknown') : 'Unknown';
  }

  getUnitName(unitId: number): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit ? (unit.name || 'Unknown') : 'Unknown';
  }

  getMilestoneName(milestoneId: number): string {
    const milestone = this.milestones().find(m => m.id === milestoneId);
    return milestone ? (milestone.name || 'Unknown') : 'Unknown';
  }

  // Validation methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.step6Form.get('quantityBillDto')?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.step6Form.get('quantityBillDto')?.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) {
        if (fieldName === 'mileStoneId') return 'Please select a valid milestone';
        return 'Value must be greater than 0';
      }
    }
    return '';
  }
}
