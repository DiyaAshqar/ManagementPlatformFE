import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import { LookupDto, SupplierServiceDto, FifthStepDto, FullAgreementDto } from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-step5',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    ProgressSpinnerModule,
    InputTextModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './step5.component.html'
})
export class Step5Component implements OnInit, OnDestroy {
  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  step5Form!: FormGroup;
  supplierServices = signal<SupplierServiceDto[]>([]);
  materials = signal<LookupDto[]>([]);
  suppliers = signal<LookupDto[]>([]);
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.step5Form = this.fb.group({
      supplierServiceDto: this.fb.group({
        id: [0],
        representativeName: ['', [Validators.required, Validators.maxLength(100)]],
        materialId: [null, [Validators.required, Validators.min(1)]],
        supplierId: [null, [Validators.required, Validators.min(1)]],
        agreementId: [this.agreementId()]
      })
    });
  }

  private loadLookups(): void {
    this.isLoading.set(true);
    
    this.agreementWizardService.getStep5Lookups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.materials.set(response.materials || []);
          this.suppliers.set(response.suppliers || []);
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
      this.agreementWizardService.getAgreementById(this.agreementId(), 5)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.succeeded && response.data?.fifthStepDto) {
              this.populateForm(response.data.fifthStepDto);
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

  private populateForm(data: FifthStepDto): void {
    if (data.supplierServiceDto && Array.isArray(data.supplierServiceDto)) {
      // Map the existing DTO objects directly since they already have the correct structure
      this.supplierServices.set([...data.supplierServiceDto]);
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
            console.error('Failed to save step 5 data:', response);
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving step 5:', error);
          this.isLoading.set(false);
        }
      });
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 5;
    fullAgreementDto.agreementId = this.agreementId();
    
    const fifthStepDto = new FifthStepDto();
    // Map to match the expected payload structure (SupplierServiceDto with capital S)
    fifthStepDto.supplierServiceDto = this.supplierServices().map(entry => {
      const dto = new SupplierServiceDto();
      dto.id = entry.id || 0;
      dto.representativeName = entry.representativeName;
      dto.materialId = entry.materialId;
      dto.supplierId = entry.supplierId;
      dto.agreementId = this.agreementId();
      dto.isDeleted = entry.isDeleted || false;
      return dto;
    });
    
    fullAgreementDto.fifthStepDto = fifthStepDto;
    
    return fullAgreementDto;
  }

  private buildFormData(): any {
    return {
      supplierServiceDto: this.supplierServices().map(entry => ({
        id: entry.id,
        representativeName: entry.representativeName,
        materialId: entry.materialId,
        supplierId: entry.supplierId,
        agreementId: this.agreementId(),
        isDeleted: entry.isDeleted || false
      }))
    };
  }

  addEntry(): void {
    if (this.step5Form.get('supplierServiceDto')?.invalid) {
      this.step5Form.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
      return;
    }

    const formValue = this.step5Form.get('supplierServiceDto')?.value;
    const editIndex = this.editingIndex();
    
    const entryData = new SupplierServiceDto();
    entryData.id = formValue.id || 0;
    entryData.representativeName = formValue.representativeName;
    entryData.materialId = formValue.materialId;
    entryData.supplierId = formValue.supplierId;
    entryData.agreementId = this.agreementId();
    entryData.isDeleted = false;

    if (editIndex !== null) {
      // Update existing entry
      const entries = [...this.supplierServices()];
      entries[editIndex] = entryData;
      this.supplierServices.set(entries);
      this.editingIndex.set(null);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Supplier service updated successfully',
        life: 3000
      });
    } else {
      // Add new entry
      this.supplierServices.set([...this.supplierServices(), entryData]);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Supplier service added successfully',
        life: 3000
      });
    }

    this.clearForm();
  }

  editEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    
    // Find the actual index in the full array
    const actualIndex = this.supplierServices().findIndex(e => 
      e.id === entry.id && 
      e.representativeName === entry.representativeName &&
      e.materialId === entry.materialId && 
      e.supplierId === entry.supplierId
    );
    
    this.editingIndex.set(actualIndex);
    this.step5Form.patchValue({
      supplierServiceDto: {
        id: entry.id,
        representativeName: entry.representativeName,
        materialId: entry.materialId,
        supplierId: entry.supplierId,
        agreementId: entry.agreementId
      }
    });
  }

  deleteEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    const entries = [...this.supplierServices()];
    
    // Find the actual index in the full array
    const actualIndex = entries.findIndex(e => 
      e.id === entry.id && 
      e.representativeName === entry.representativeName &&
      e.materialId === entry.materialId && 
      e.supplierId === entry.supplierId
    );

    if (actualIndex === -1) return;

    // Check if entry has an id (exists in DB)
    if (entry.id && entry.id > 0) {
      // Soft delete: mark as deleted
      entries[actualIndex].isDeleted = true;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Supplier service marked for deletion',
        life: 3000
      });
    } else {
      // Hard delete: remove from array (not yet in DB)
      entries.splice(actualIndex, 1);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Supplier service deleted successfully',
        life: 3000
      });
    }

    this.supplierServices.set(entries);
  }

  clearForm(): void {
    this.step5Form.reset({
      supplierServiceDto: {
        id: 0,
        representativeName: '',
        materialId: null,
        supplierId: null,
        agreementId: this.agreementId()
      }
    });
    this.editingIndex.set(null);
  }

  // Helper methods to get active entries
  getActiveEntries(): SupplierServiceDto[] {
    return this.supplierServices().filter(entry => !entry.isDeleted);
  }

  // Helper methods to get names
  getMaterialName(materialId: number): string {
    const material = this.materials().find(m => m.id === materialId);
    return material ? (material.name || 'Unknown') : 'Unknown';
  }

  getSupplierName(supplierId: number): string {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    return supplier ? (supplier.name || 'Unknown') : 'Unknown';
  }

  // Validation methods
  isFieldInvalid(fieldName: string): boolean {
    const field = this.step5Form.get('supplierServiceDto')?.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.step5Form.get('supplierServiceDto')?.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['min']) return 'Value must be greater than 0';
      if (field.errors['maxLength']) return 'Value is too long';
    }
    return '';
  }
}
