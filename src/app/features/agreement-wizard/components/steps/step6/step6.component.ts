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
import { MessageService } from 'primeng/api';

interface Lookup {
  id: number;
  name: string;
}

interface QuantityBillDto {
  id: number;
  materialId: number;
  unitId: number;
  mileStoneId: number;
  amount: number;
  price: number;
  agreementId: number;
  isDeleted?: boolean;
}

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
  stepData = output<any>();

  step6Form!: FormGroup;
  quantityBills = signal<QuantityBillDto[]>([]);
  materials = signal<Lookup[]>([]);
  units = signal<Lookup[]>([]);
  milestones = signal<Lookup[]>([]);
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
    this.step6Form = this.fb.group({
      quantityBillDto: this.fb.group({
        id: [0],
        materialId: [null, [Validators.required, Validators.min(1)]],
        unitId: [null, [Validators.required, Validators.min(1)]],
        mileStoneId: [null, [Validators.required, Validators.min(1)]],
        amount: [null, [Validators.required, Validators.min(0)]],
        price: [null, [Validators.required, Validators.min(0)]],
        agreementId: [this.agreementId()]
      })
    });
  }

  private loadLookups(): void {
    // TODO: Replace with your actual service calls
    // Mock data for now
    this.materials.set([
      { id: 1, name: 'Concrete' },
      { id: 2, name: 'Steel Bars' },
      { id: 3, name: 'Bricks' },
      { id: 4, name: 'Cement' },
      { id: 5, name: 'Sand' },
      { id: 6, name: 'Gravel' }
    ]);
    
    this.units.set([
      { id: 1, name: 'Cubic Meter (m³)' },
      { id: 2, name: 'Square Meter (m²)' },
      { id: 3, name: 'Ton' },
      { id: 4, name: 'Piece' },
      { id: 5, name: 'Kilogram (kg)' }
    ]);

    this.milestones.set([
      { id: 1, name: 'Foundation' },
      { id: 2, name: 'Structure' },
      { id: 3, name: 'Walls' },
      { id: 4, name: 'Roofing' },
      { id: 5, name: 'Finishing' }
    ]);
  }

  onSubmit(): void {
    const activeEntries = this.getActiveEntries();
    
    if (activeEntries.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please add at least one quantity bill entry',
        life: 5000
      });
      return;
    }

    const formValue = this.buildFormData();
    this.stepData.emit(formValue);
  }

  private buildFormData(): any {
    return {
      quantityBillDto: this.quantityBills().map(entry => ({
        id: entry.id,
        materialId: entry.materialId,
        unitId: entry.unitId,
        mileStoneId: entry.mileStoneId,
        amount: entry.amount,
        price: entry.price,
        agreementId: this.agreementId(),
        isDeleted: entry.isDeleted || false
      }))
    };
  }

  addEntry(): void {
    if (this.step6Form.get('quantityBillDto')?.invalid) {
      this.step6Form.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
      return;
    }

    const formValue = this.step6Form.get('quantityBillDto')?.value;
    const editIndex = this.editingIndex();
    
    const entryData: QuantityBillDto = {
      id: formValue.id || 0,
      materialId: formValue.materialId,
      unitId: formValue.unitId,
      mileStoneId: formValue.mileStoneId,
      amount: formValue.amount,
      price: formValue.price,
      agreementId: this.agreementId(),
      isDeleted: false
    };

    if (editIndex !== null) {
      // Update existing entry
      const entries = [...this.quantityBills()];
      entries[editIndex] = entryData;
      this.quantityBills.set(entries);
      this.editingIndex.set(null);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Quantity bill updated successfully',
        life: 3000
      });
    } else {
      // Add new entry
      this.quantityBills.set([...this.quantityBills(), entryData]);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Quantity bill added successfully',
        life: 3000
      });
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
      e.amount === entry.amount &&
      e.price === entry.price
    );
    
    this.editingIndex.set(actualIndex);
    this.step6Form.patchValue({
      quantityBillDto: {
        id: entry.id,
        materialId: entry.materialId,
        unitId: entry.unitId,
        mileStoneId: entry.mileStoneId,
        amount: entry.amount,
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
      e.amount === entry.amount &&
      e.price === entry.price
    );

    if (actualIndex === -1) return;

    // Check if entry has an id (exists in DB)
    if (entry.id && entry.id > 0) {
      // Soft delete: mark as deleted
      entries[actualIndex].isDeleted = true;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Quantity bill marked for deletion',
        life: 3000
      });
    } else {
      // Hard delete: remove from array (not yet in DB)
      entries.splice(actualIndex, 1);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Quantity bill deleted successfully',
        life: 3000
      });
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
        amount: null,
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
    return entry.amount * entry.price;
  }

  // Helper methods to get names
  getMaterialName(materialId: number): string {
    const material = this.materials().find(m => m.id === materialId);
    return material ? material.name : 'Unknown';
  }

  getUnitName(unitId: number): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit ? unit.name : 'Unknown';
  }

  getMilestoneName(milestoneId: number): string {
    const milestone = this.milestones().find(m => m.id === milestoneId);
    return milestone ? milestone.name : 'Unknown';
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
