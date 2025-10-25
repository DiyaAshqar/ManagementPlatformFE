# Step 4: Main Contracts Implementation

## Overview
Step 4 of the Agreement Wizard handles main contract management with contractors. It allows adding multiple contracts with validation, editing, deletion, and pagination. It follows the same pattern as previous steps using Angular 19 signals and reactive forms.

## Component Structure

### Files
- `step4.component.ts` - TypeScript component logic
- `step4.component.html` - Template with form and table

### Key Features
- ✅ Angular 19 signal-based inputs/outputs
- ✅ Reactive forms with validation
- ✅ Multiple contract management (add/edit/delete)
- ✅ Paginated table view
- ✅ Date range validation
- ✅ Currency formatting
- ✅ PrimeFlex responsive layout
- ✅ Internationalization ready (English & Arabic)

## Form Structure

### Main Contract (`MainContract`)
```typescript
{
  id: number;
  total: number;              // Required - Currency input (min 0.01)
  startDate: string;          // Required - Date picker
  endDate: string;            // Required - Date picker (must be after start)
  agreementId: number;        // Auto-filled
  typeId: number;             // Required - Dropdown
  constructorId: number;      // Required - Dropdown
  contractorDuties: string[]; // Array for future sub-step integration
}
```

### Lookup Data

**Main Contract Types:**
- Fixed Price Contract
- Time & Materials Contract
- Cost Plus Contract
- Unit Price Contract

**Contractors:**
- ABC Construction Company
- XYZ Builders Ltd
- Prime Contractors Inc
- Elite Building Group

## Component Implementation

### TypeScript (step4.component.ts)

#### Imports
```typescript
import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
```

#### Signals
```typescript
// Inputs
currentStep = input.required<number>();
agreementId = input.required<number>();

// Output
stepData = output<any>();

// State
mainContractTypes = signal<Lookup[]>([]);
constructors = signal<Lookup[]>([]);
mainContracts = signal<MainContract[]>([]);
isLoading = signal(false);

// Pagination
currentPage = signal(1);
itemsPerPage = 6;

// Editing
editingIndex = signal<number | null>(null);

// Date restrictions
minEndDate = signal<Date | null>(null);
maxStartDate = signal<Date | null>(null);
```

#### Form Initialization
```typescript
private initializeForm(): void {
  const today = new Date();
  this.mainContractForm = this.fb.group(
    {
      id: [0],
      total: [0, [Validators.required, Validators.min(0.01)]],
      startDate: [today, Validators.required],
      endDate: [today, Validators.required],
      agreementId: [this.agreementId()],
      typeId: [0, [Validators.required, Validators.min(1)]],
      constructorId: [0, [Validators.required, Validators.min(1)]],
      contractorDuties: [[]]
    },
    { validators: this.dateRangeValidator }
  );
}
```

## Key Features

### 1. Contract Management

#### Add Contract
```typescript
addContract(): void {
  if (this.mainContractForm.invalid) {
    this.mainContractForm.markAllAsTouched();
    this.messageService.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields correctly',
      life: 5000
    });
    return;
  }

  const formValue = this.mainContractForm.value;
  const contractData: MainContract = {
    id: formValue.id || 0,
    total: formValue.total,
    startDate: this.formatDate(formValue.startDate),
    endDate: this.formatDate(formValue.endDate),
    agreementId: this.agreementId(),
    typeId: formValue.typeId,
    constructorId: formValue.constructorId,
    contractorDuties: formValue.contractorDuties || []
  };

  const editIndex = this.editingIndex();
  if (editIndex !== null) {
    // Update existing
    const contracts = [...this.mainContracts()];
    contracts[editIndex] = contractData;
    this.mainContracts.set(contracts);
    this.editingIndex.set(null);
  } else {
    // Add new
    this.mainContracts.set([...this.mainContracts(), contractData]);
  }

  this.clearForm();
}
```

#### Edit Contract
```typescript
editContract(index: number): void {
  const actualIndex = (this.currentPage() - 1) * this.itemsPerPage + index;
  const contract = this.mainContracts()[actualIndex];
  
  this.editingIndex.set(actualIndex);
  this.mainContractForm.patchValue({
    id: contract.id,
    total: contract.total,
    startDate: new Date(contract.startDate),
    endDate: new Date(contract.endDate),
    agreementId: contract.agreementId,
    typeId: contract.typeId,
    constructorId: contract.constructorId,
    contractorDuties: contract.contractorDuties
  });
}
```

#### Delete Contract
```typescript
deleteContract(index: number): void {
  const actualIndex = (this.currentPage() - 1) * this.itemsPerPage + index;
  const contracts = [...this.mainContracts()];
  contracts.splice(actualIndex, 1);
  this.mainContracts.set(contracts);
  
  // Adjust page if needed
  const totalPages = this.totalPages;
  if (this.currentPage() > totalPages && totalPages > 0) {
    this.currentPage.set(totalPages);
  }
}
```

### 2. Pagination

```typescript
get totalPages(): number {
  return Math.ceil(this.mainContracts().length / this.itemsPerPage) || 1;
}

getPaginatedContracts(): MainContract[] {
  const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
  const endIndex = startIndex + this.itemsPerPage;
  return this.mainContracts().slice(startIndex, endIndex);
}

getCurrentPageRange(): string {
  if (this.mainContracts().length === 0) {
    return '0-0 of 0';
  }
  const start = (this.currentPage() - 1) * this.itemsPerPage + 1;
  const end = Math.min(this.currentPage() * this.itemsPerPage, this.mainContracts().length);
  return `${start}-${end} of ${this.mainContracts().length}`;
}
```

### 3. Date Validation

```typescript
onStartDateChange(event: any): void {
  const startDate = event.value;
  if (startDate) {
    const minEndDate = new Date(startDate);
    minEndDate.setDate(minEndDate.getDate() + 1);
    this.minEndDate.set(minEndDate);
    this.mainContractForm.updateValueAndValidity();
  }
}

onEndDateChange(event: any): void {
  const endDate = event.value;
  if (endDate) {
    const maxStartDate = new Date(endDate);
    maxStartDate.setDate(maxStartDate.getDate() - 1);
    this.maxStartDate.set(maxStartDate);
    this.mainContractForm.updateValueAndValidity();
  }
}

private dateRangeValidator(group: any) {
  const startDate = group.get('startDate')?.value;
  const endDate = group.get('endDate')?.value;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return { dateRange: true };
    }
  }
  return null;
}
```

## Template Implementation

### Form Section
- Float label inputs for all fields
- Dropdown selects for contract type and contractor
- Currency input for total amount
- Date pickers with min/max restrictions
- Add/Edit mode with dynamic button text
- Cancel button to clear form

### Table Section
- Responsive grid layout
- Header row with column titles
- Data rows with contract information
- Action buttons (Edit, Delete)
- Pagination controls
- Empty state when no contracts

### Key Template Features

1. **Currency Display**
```html
<div class="col-2">{{ contract.total | currency:'USD':'symbol':'1.2-2' }}</div>
```

2. **Conditional Button Text**
```html
<p-button 
  [label]="editingIndex() !== null ? ('common.edit' | translate) : ('common.add' | translate)"
  icon="pi pi-check" 
  (onClick)="addContract()"
  [disabled]="mainContractForm.invalid"
></p-button>
```

3. **Empty State**
```html
@else {
  <div class="border-2 border-dashed border-surface-200 border-round p-6 text-center">
    <i class="pi pi-inbox text-4xl text-color-secondary mb-3"></i>
    <p class="text-color-secondary m-0">{{ 'wizard.step4.noContracts' | translate }}</p>
  </div>
}
```

## Translation Keys

### English (en.json)
```json
{
  "wizard": {
    "step4": {
      "title": "Main Contracts",
      "contractType": "Main Contract Type",
      "contractor": "Contractor",
      "totalAmount": "Total Amount",
      "startDate": "Expected Start Date",
      "endDate": "Expected End Date",
      "contractsList": "Main Contracts List",
      "noContracts": "No contracts added yet. Add your first main contract above."
    }
  }
}
```

### Arabic (ar.json)
```json
{
  "wizard": {
    "step4": {
      "title": "العقود الرئيسية",
      "contractType": "نوع العقد الرئيسي",
      "contractor": "المقاول",
      "totalAmount": "المبلغ الإجمالي",
      "startDate": "تاريخ البداية المتوقع",
      "endDate": "تاريخ النهاية المتوقع",
      "contractsList": "قائمة العقود الرئيسية",
      "noContracts": "لم تتم إضافة أي عقود بعد. أضف أول عقد رئيسي أعلاه."
    }
  }
}
```

## Validation

### Validation Rules
- Main Contract Type: Required
- Contractor: Required
- Total Amount: Required, minimum 0.01
- Start Date: Required
- End Date: Required, must be after start date
- At least one contract must be added before proceeding to next step

### Error Messages
```typescript
getFieldError(fieldName: string): string {
  const field = this.mainContractForm.get(fieldName);
  if (field?.errors) {
    if (field.errors['required']) return 'This field is required';
    if (field.errors['min']) return 'Value must be greater than 0';
  }

  if (this.mainContractForm.errors?.['dateRange'] &&
    (fieldName === 'startDate' || fieldName === 'endDate')) {
    return 'End date must be after start date';
  }

  return '';
}
```

## Data Output

When the form is submitted, it emits data in this structure:

```typescript
{
  mainContractDto: [
    {
      id: number,
      total: number,
      startDate: string,  // Format: "YYYY-MM-DD"
      endDate: string,    // Format: "YYYY-MM-DD"
      agreementId: number,
      typeId: number,
      constructorId: number,
      contractorDuties: string[]
    }
  ]
}
```

## Integration with Wizard

```html
<!-- In agreement-wizard.component.html -->
<p-step-panel [value]="4">
  <ng-template #content let-activateCallback="activateCallback">
    <div class="gap-4">
      <app-step4
        #step4Component
        [currentStep]="currentStep()"
        [agreementId]="agreementId()"
        (stepData)="onStep4Data($event)"
      ></app-step4>
      
      <div class="flex pt-4 justify-between gap-2">
        <p-button 
          [label]="'wizard.back' | translate" 
          severity="secondary" 
          icon="pi pi-arrow-left"
          (onClick)="activateCallback(3)"
        />
        <p-button 
          [label]="'wizard.next' | translate" 
          icon="pi pi-arrow-right" 
          iconPos="right"
          (onClick)="step4Component.onSubmit(); step4Data() && activateCallback(5)"
        />
      </div>
    </div>
  </ng-template>
</p-step-panel>
```

## Future Enhancements

### Connect to Backend API
```typescript
private loadLookups(): void {
  this.isLoading.set(true);
  
  forkJoin({
    contractTypes: this.lookupService.getMainContractTypes(),
    constructors: this.lookupService.getConstructors()
  }).pipe(
    takeUntil(this.destroy$)
  ).subscribe({
    next: (data) => {
      this.mainContractTypes.set(data.contractTypes);
      this.constructors.set(data.constructors);
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('Error loading lookups:', error);
      this.isLoading.set(false);
    }
  });
}
```

### Add Contractor Duties Sub-Step
- Create substep component for managing contractor duties
- Link to each main contract
- Modal or slide-in panel for duty management
- Save duties linked to contract ID

### Enhanced Features
- Bulk operations (delete multiple contracts)
- Export contracts to CSV/PDF
- Contract templates
- Duplicate contract feature
- Sort and filter contracts
- Search functionality

## Testing Checklist

- [ ] Form loads with empty values
- [ ] All dropdowns populate with lookup data
- [ ] Required field validation works
- [ ] Min value validation for amount works
- [ ] Date range validation prevents invalid dates
- [ ] Add contract works correctly
- [ ] Edit contract loads data into form
- [ ] Update contract saves changes
- [ ] Delete contract removes from list
- [ ] Pagination works correctly
- [ ] Page adjusts when deleting last item on page
- [ ] Currency formatting displays correctly
- [ ] Empty state shows when no contracts
- [ ] At least one contract required validation
- [ ] Language switching updates all labels
- [ ] Responsive layout on mobile/tablet
- [ ] RTL layout works correctly for Arabic

## Summary

Step 4 successfully implements:
- ✅ Main contract form with full validation
- ✅ Multiple contract management (add/edit/delete)
- ✅ Paginated table view
- ✅ Date range validation
- ✅ Currency formatting
- ✅ Responsive PrimeFlex layout
- ✅ English and Arabic translations
- ✅ Integration with wizard navigation
- ✅ Consistent with previous steps' patterns

The implementation provides a complete contract management interface with proper validation, user feedback, and data handling.
