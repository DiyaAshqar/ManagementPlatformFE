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
import { MessageService } from 'primeng/api';

interface Lookup {
  id: number;
  name: string;
}

interface SupplierServiceDto {
  id: number;
  representativeName: string;
  materialId: number;
  supplierId: number;
  agreementId: number;
  isDeleted?: boolean;
}

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
  materials = signal<Lookup[]>([]);
  suppliers = signal<Lookup[]>([]);
  isLoading = signal(false);
  
  // Editing state
  editingIndex = signal<number | null>(null);

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
    // TODO: Replace with your actual service calls
    // Mock data for now
    this.materials.set([
      { id: 1, name: 'Concrete' },
      { id: 2, name: 'Steel' },
      { id: 3, name: 'Bricks' },
      { id: 4, name: 'Cement' },
      { id: 5, name: 'Sand' },
      { id: 6, name: 'Gravel' }
    ]);
    
    this.suppliers.set([
      { id: 1, name: 'ABC Suppliers Ltd' },
      { id: 2, name: 'XYZ Materials Co' },
      { id: 3, name: 'Prime Building Supplies' },
      { id: 4, name: 'Elite Construction Materials' }
    ]);
  }

  onSubmit(): void {
    const activeEntries = this.getActiveEntries();
    
    if (activeEntries.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please add at least one supplier service entry',
        life: 5000
      });
      return;
    }

    const formValue = this.buildFormData();
    this.stepData.emit(formValue);
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
    
    const entryData: SupplierServiceDto = {
      id: formValue.id || 0,
      representativeName: formValue.representativeName,
      materialId: formValue.materialId,
      supplierId: formValue.supplierId,
      agreementId: this.agreementId(),
      isDeleted: false
    };

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
    return material ? material.name : 'Unknown';
  }

  getSupplierName(supplierId: number): string {
    const supplier = this.suppliers().find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown';
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
