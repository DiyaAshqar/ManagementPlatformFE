import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { finalize, Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';

interface Lookup {
  id: number;
  name: string;
}

interface ProjectAreaUnitDto {
  id?: number;
  annexId: number;
  amount: number;
  unitId: number;
  isDeleted?: boolean;
}

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
  units = signal<Lookup[]>([]);
  annexes = signal<Lookup[]>([]);
  isLoading = signal(false);
  editingIndex = signal<number | null>(null);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
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
  }

  private loadLookups(): void {
    // TODO: Replace with actual lookup service call
    // Mock data for now
    this.isLoading.set(true);
    
    setTimeout(() => {
      this.units.set([
        { id: 1, name: 'Square Meter' },
        { id: 2, name: 'Cubic Meter' },
        { id: 3, name: 'Linear Meter' },
        { id: 4, name: 'Unit' },
        { id: 5, name: 'Piece' }
      ]);
      
      this.annexes.set([
        { id: 1, name: 'Ground Floor' },
        { id: 2, name: 'First Floor' },
        { id: 3, name: 'Second Floor' },
        { id: 4, name: 'Basement' },
        { id: 5, name: 'Roof' }
      ]);
      
      this.isLoading.set(false);
    }, 500);
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

    const formData = {
      projectAreaUnitDto: entries
    };

    this.stepData.emit(formData);
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
      currentEntries[currentEditingIndex] = {
        id: currentEntries[currentEditingIndex].id,
        annexId: formValue.annexId,
        amount: formValue.amount,
        unitId: formValue.unitId,
        isDeleted: currentEntries[currentEditingIndex].isDeleted ?? false
      };
      this.projectAreaUnits.set(currentEntries);
      this.showSuccess('Entry updated successfully');
      this.editingIndex.set(null);
    } else {
      // Add new entry
      currentEntries.push({
        id: 0,
        annexId: formValue.annexId,
        amount: formValue.amount,
        unitId: formValue.unitId,
        isDeleted: false
      });
      this.projectAreaUnits.set(currentEntries);
      this.showSuccess('Entry added successfully');
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
      this.showSuccess('Entry marked for deletion');
    } else {
      // Hard delete: remove from array (not yet in DB)
      currentEntries.splice(actualIndex, 1);
      this.showSuccess('Entry deleted successfully');
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
    return annex ? annex.name : 'Unknown';
  }

  getUnitName(unitId: number): string {
    const unit = this.units().find(u => u.id === unitId);
    return unit ? unit.name : 'Unknown';
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

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
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
