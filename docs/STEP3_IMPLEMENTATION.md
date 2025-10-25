# Step 3: Material & Quality Specifications Implementation

## Overview
Step 3 of the Agreement Wizard handles material specifications, equipment details, and quality control information. It follows the same pattern as Step 1 and Step 2, using Angular 19 signals, reactive forms, and PrimeNG components.

## Component Structure

### Files
- `step3.component.ts` - TypeScript component logic
- `step3.component.html` - Template with form fields

### Key Features
- ✅ Angular 19 signal-based inputs/outputs
- ✅ Reactive forms with nested FormGroups
- ✅ Full validation with error messages
- ✅ PrimeFlex responsive layout
- ✅ Internationalization ready (English & Arabic)
- ✅ Consistent with Step 1 & Step 2 patterns

## Form Structure

The form consists of three main sections:

### 1. Material Specifications (`materialSpecificationDto`)
```typescript
{
  id: number;
  agreementId: number;
  materialTypeId: number;      // Required - Dropdown
  specifications: string;       // Required - Textarea (max 500 chars)
  estimatedQuantity: number;    // Required - Number input (min 0)
  unitOfMeasure: string;        // Required - Text input (max 50 chars)
  notes: string;                // Optional - Textarea (max 500 chars)
}
```

**Material Types (Lookup Data):**
- Concrete
- Steel
- Cement
- Aggregates
- Pipes

### 2. Equipment Details (`equipmentDto`)
```typescript
{
  id: number;
  agreementId: number;
  equipmentTypeId: number;      // Required - Dropdown
  description: string;          // Required - Textarea (max 500 chars)
  quantity: number;             // Required - Number input (min 1)
  rentalDuration: number;       // Optional - Number input (min 0, in days)
  remarks: string;              // Optional - Textarea (max 500 chars)
}
```

**Equipment Types (Lookup Data):**
- Excavator
- Bulldozer
- Crane
- Mixer
- Drilling Machine

### 3. Quality Control (`qualityControlDto`)
```typescript
{
  id: number;
  agreementId: number;
  qualityStandardId: number;    // Required - Dropdown
  inspectionFrequency: string;  // Required - Text input (max 100 chars)
  complianceRequirements: string; // Required - Textarea (max 500 chars)
  testingProcedures: string;    // Required - Textarea (max 500 chars)
}
```

**Quality Standards (Lookup Data):**
- ISO 9001
- ASTM Standards
- Local Building Code
- International Building Code
- Custom Standards

## Component Implementation

### TypeScript (step3.component.ts)

#### Imports
```typescript
import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
```

#### Signals
```typescript
// Inputs
currentStep = input.required<number>();
agreementId = input.required<number>();

// Output
stepData = output<any>();

// State
materialTypes = signal<Lookup[]>([]);
equipmentTypes = signal<Lookup[]>([]);
qualityStandards = signal<Lookup[]>([]);
isLoading = signal(false);
```

#### Form Initialization
```typescript
private initializeForm(): void {
  this.step3Form = this.fb.group({
    materialSpecificationDto: this.fb.group({
      id: [0],
      materialTypeId: [0, Validators.required],
      specifications: ['', [Validators.required, Validators.maxLength(500)]],
      estimatedQuantity: [0, [Validators.required, Validators.min(0)]],
      unitOfMeasure: ['', [Validators.required, Validators.maxLength(50)]],
      notes: ['', Validators.maxLength(500)]
    }),
    equipmentDto: this.fb.group({
      id: [0],
      equipmentTypeId: [0, Validators.required],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      quantity: [0, [Validators.required, Validators.min(1)]],
      rentalDuration: [0, [Validators.min(0)]],
      remarks: ['', Validators.maxLength(500)]
    }),
    qualityControlDto: this.fb.group({
      id: [0],
      qualityStandardId: [0, Validators.required],
      inspectionFrequency: ['', [Validators.required, Validators.maxLength(100)]],
      complianceRequirements: ['', [Validators.required, Validators.maxLength(500)]],
      testingProcedures: ['', [Validators.required, Validators.maxLength(500)]]
    })
  });
}
```

## Template Implementation

### Layout Pattern
Each section follows this structure:
```html
<div class="col-12">
  <h3 class="text-xl font-semibold mb-4">{{ 'wizard.step3.sectionTitle' | translate }}</h3>
  
  <div formGroupName="sectionDto">
    <div class="grid">
      <div class="col-12 md:col-6 mb-3">
        <div class="field">
          <p-floatlabel variant="in">
            <!-- Input component -->
            <label for="fieldId">{{ 'wizard.step3.fieldLabel' | translate }}</label>
          </p-floatlabel>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Input Types Used

1. **Dropdown (p-select)**
```html
<p-select 
  inputId="materialTypeId" 
  formControlName="materialTypeId"
  [options]="materialTypes()" 
  optionLabel="name" 
  optionValue="id"
  [class]="isFieldInvalid('materialSpecificationDto.materialTypeId') ? 'ng-dirty ng-invalid w-full md:w-56' : 'w-full md:w-56'"
></p-select>
```

2. **Number Input (p-inputNumber)**
```html
<p-inputNumber 
  inputId="estimatedQuantity" 
  formControlName="estimatedQuantity" 
  [min]="0"
  [showButtons]="true" 
  [ngClass]="{'ng-invalid': isFieldInvalid('materialSpecificationDto.estimatedQuantity')}"
  inputStyleClass="w-full"
></p-inputNumber>
```

3. **Text Input (input pInputText)**
```html
<input 
  pInputText 
  id="unitOfMeasure" 
  formControlName="unitOfMeasure"
  [class]="isFieldInvalid('materialSpecificationDto.unitOfMeasure') ? 'ng-invalid w-full' : 'w-full'"
/>
```

4. **Text Area (textarea pInputTextarea)**
```html
<textarea 
  pInputTextarea 
  id="specifications" 
  formControlName="specifications" 
  rows="3"
  [class]="isFieldInvalid('materialSpecificationDto.specifications') ? 'ng-invalid w-full' : 'w-full'"
></textarea>
```

## Translation Keys

### English (en.json)
```json
{
  "wizard": {
    "step3": {
      "title": "Material & Quality Specifications",
      "materialSpecifications": "Material Specifications",
      "equipmentDetails": "Equipment Details",
      "qualityControl": "Quality Control",
      "materialType": "Material Type",
      "specifications": "Specifications",
      "estimatedQuantity": "Estimated Quantity",
      "unitOfMeasure": "Unit of Measure",
      "notes": "Notes",
      "equipmentType": "Equipment Type",
      "equipmentDescription": "Equipment Description",
      "quantity": "Quantity",
      "rentalDuration": "Rental Duration (Days)",
      "rentalDurationHint": "Number of days the equipment will be rented",
      "remarks": "Remarks",
      "qualityStandard": "Quality Standard",
      "inspectionFrequency": "Inspection Frequency",
      "complianceRequirements": "Compliance Requirements",
      "testingProcedures": "Testing Procedures"
    }
  }
}
```

### Arabic (ar.json)
```json
{
  "wizard": {
    "step3": {
      "title": "مواصفات المواد والجودة",
      "materialSpecifications": "مواصفات المواد",
      "equipmentDetails": "تفاصيل المعدات",
      "qualityControl": "مراقبة الجودة",
      "materialType": "نوع المادة",
      "specifications": "المواصفات",
      "estimatedQuantity": "الكمية المتوقعة",
      "unitOfMeasure": "وحدة القياس",
      "notes": "ملاحظات",
      "equipmentType": "نوع المعدات",
      "equipmentDescription": "وصف المعدات",
      "quantity": "الكمية",
      "rentalDuration": "مدة الإيجار (أيام)",
      "rentalDurationHint": "عدد الأيام التي سيتم فيها استئجار المعدات",
      "remarks": "ملاحظات",
      "qualityStandard": "معيار الجودة",
      "inspectionFrequency": "تكرار التفتيش",
      "complianceRequirements": "متطلبات الامتثال",
      "testingProcedures": "إجراءات الاختبار"
    }
  }
}
```

## Validation

### Validation Rules
- Material Type: Required
- Specifications: Required, max 500 characters
- Estimated Quantity: Required, min 0
- Unit of Measure: Required, max 50 characters
- Notes: Optional, max 500 characters
- Equipment Type: Required
- Equipment Description: Required, max 500 characters
- Equipment Quantity: Required, min 1
- Rental Duration: Optional, min 0
- Remarks: Optional, max 500 characters
- Quality Standard: Required
- Inspection Frequency: Required, max 100 characters
- Compliance Requirements: Required, max 500 characters
- Testing Procedures: Required, max 500 characters

### Helper Methods
```typescript
isFieldInvalid(fieldName: string): boolean {
  const field = this.step3Form.get(fieldName);
  return !!(field && field.invalid && (field.touched || field.dirty));
}

getFieldError(fieldName: string): string {
  const field = this.step3Form.get(fieldName);
  if (field?.errors) {
    if (field.errors['required']) return 'This field is required';
    if (field.errors['min']) return 'Value must be greater than or equal to 0';
    if (field.errors['maxLength']) return 'Value is too long';
  }
  return '';
}
```

## Data Output

When the form is submitted, it emits data in this structure:

```typescript
{
  materialSpecificationDto: {
    id: 0,
    agreementId: number,
    materialTypeId: number,
    specifications: string,
    estimatedQuantity: number,
    unitOfMeasure: string,
    notes: string
  },
  equipmentDto: {
    id: 0,
    agreementId: number,
    equipmentTypeId: number,
    description: string,
    quantity: number,
    rentalDuration: number,
    remarks: string
  },
  qualityControlDto: {
    id: 0,
    agreementId: number,
    qualityStandardId: number,
    inspectionFrequency: string,
    complianceRequirements: string,
    testingProcedures: string
  }
}
```

## Integration with Wizard

The parent wizard component handles the step navigation:

```html
<!-- In agreement-wizard.component.html -->
<p-step-panel [value]="3">
  <ng-template #content let-activateCallback="activateCallback">
    <div class="gap-4">
      <app-step3
        #step3Component
        [currentStep]="currentStep()"
        [agreementId]="agreementId()"
        (stepData)="onStep3Data($event)"
      ></app-step3>
      
      <div class="flex pt-4 justify-between gap-2">
        <p-button 
          [label]="'wizard.back' | translate" 
          severity="secondary" 
          icon="pi pi-arrow-left"
          (onClick)="activateCallback(2)"
        />
        <p-button 
          [label]="'wizard.next' | translate" 
          icon="pi pi-arrow-right" 
          iconPos="right"
          (onClick)="step3Component.onSubmit(); step3Data() && activateCallback(4)"
        />
      </div>
    </div>
  </ng-template>
</p-step-panel>
```

## Future Enhancements

### Connect to Backend API
Replace mock data with actual service calls:

```typescript
private loadLookups(): void {
  this.isLoading.set(true);
  
  forkJoin({
    materials: this.lookupService.getMaterialTypes(),
    equipment: this.lookupService.getEquipmentTypes(),
    standards: this.lookupService.getQualityStandards()
  }).pipe(
    takeUntil(this.destroy$)
  ).subscribe({
    next: (data) => {
      this.materialTypes.set(data.materials);
      this.equipmentTypes.set(data.equipment);
      this.qualityStandards.set(data.standards);
      this.isLoading.set(false);
    },
    error: (error) => {
      console.error('Error loading lookups:', error);
      this.isLoading.set(false);
    }
  });
}
```

### Add Dynamic Fields
- Allow multiple material specifications
- Allow multiple equipment entries
- Add file upload for quality certificates

### Enhanced Validation
- Cross-field validation
- Conditional requirements based on material/equipment types
- Real-time availability checking for equipment

## Testing Checklist

- [ ] Form loads with empty values
- [ ] All dropdowns populate with lookup data
- [ ] Required field validation works
- [ ] Min/Max validation works
- [ ] Form submission with valid data
- [ ] Form submission with invalid data (blocked)
- [ ] Navigation between steps preserves data
- [ ] Language switching updates all labels
- [ ] Responsive layout on mobile/tablet
- [ ] RTL layout works correctly for Arabic

## Summary

Step 3 successfully implements:
- ✅ Material specifications form section
- ✅ Equipment details form section
- ✅ Quality control form section
- ✅ Full validation and error handling
- ✅ Responsive PrimeFlex layout
- ✅ English and Arabic translations
- ✅ Integration with wizard navigation
- ✅ Consistent with Step 1 & Step 2 patterns

The implementation follows Angular 19 best practices and maintains consistency with the existing wizard steps.
