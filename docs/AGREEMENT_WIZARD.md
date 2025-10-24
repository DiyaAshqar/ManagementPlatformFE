# Agreement Creation Wizard

## Overview
The Agreement Creation Wizard is a multi-step form component built with Angular 19 and PrimeNG that guides users through creating a comprehensive agreement with 7 steps.

## Features

### ✨ Modern Angular 19 Features
- **Signal-based Inputs/Outputs**: Uses the new `input()` and `output()` APIs
- **Standalone Components**: Fully standalone architecture
- **Control Flow Syntax**: Uses `@if`, `@for` instead of structural directives

### 🎨 UI/UX
- **PrimeFlex Layout**: Uses PrimeFlex utility classes (no custom SCSS)
- **Linear Stepper**: Users must complete steps in order
- **Responsive Design**: Works on desktop, tablet, and mobile
- **RTL Support**: Ready for Arabic and English languages

### 🌍 Internationalization
- Full i18n support with ngx-translate
- English and Arabic translations included
- All labels and messages are translatable

## Structure

```
features/agreement-wizard/
├── agreement-wizard.component.ts    # Main wizard container
├── agreement-wizard.component.html  # Stepper layout
└── steps/
    ├── step1/                       # Agreement Details (Implemented)
    │   ├── step1.component.ts
    │   └── step1.component.html
    ├── step2/                       # Placeholder (To be implemented)
    │   └── step2.component.ts
    ├── step3/                       # Placeholder (To be implemented)
    │   └── step3.component.ts
    ├── step4/                       # Placeholder (To be implemented)
    │   └── step4.component.ts
    ├── step5/                       # Placeholder (To be implemented)
    │   └── step5.component.ts
    ├── step6/                       # Placeholder (To be implemented)
    │   └── step6.component.ts
    └── step7/                       # Placeholder (To be implemented)
        └── step7.component.ts
```

## Step 1: Agreement Details

The first step collects comprehensive information about the agreement:

### 📋 Agreement Information
- Project Number (auto-generated)
- Creation Date
- Project Name
- Business Sector
- Estimated Start/End Dates (with validation)
- Country & City
- Agreement Type
- Project Area
- Excavation Quantity

### 👤 Client Information
- Contact Person
- Contact Person Number
- Representative Name
- Representative Phone Number

### 🏗️ Land Information
- Basin Name
- Village
- Directorate
- Plot Number
- Basin Number
- Floor Number

### Validation
- All fields are required
- Date range validation (end date must be after start date)
- Number format validation for phone numbers and IDs
- Min/Max length validation

## Usage

### Routing
Access the wizard at: `/agreement-wizard`

```typescript
// Route is already configured in app.routes.ts
{
  path: 'agreement-wizard',
  loadComponent: () => import('./features/agreement-wizard/agreement-wizard.component')
    .then(m => m.AgreementWizardComponent)
}
```

### Navigation
Add a link to your sidebar or navigation menu:

```html
<a routerLink="/agreement-wizard">Create Agreement</a>
```

## Development Guide

### Adding New Steps

To implement steps 2-7, follow this pattern:

1. **Create the Component**
```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-stepX',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, /* PrimeNG modules */],
  templateUrl: './stepX.component.html'
})
export class StepXComponent {
  // Angular 19 signal inputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  
  // Signal output
  stepData = output<any>();

  onSubmit(): void {
    // Validate and emit data
    this.stepData.emit({ /* your data */ });
  }
}
```

2. **Create the Template**
Use PrimeFlex utility classes:
```html
<div class="card p-4">
  <h3 class="text-xl font-semibold mb-4">{{ 'wizard.stepX.title' | translate }}</h3>
  
  <form [formGroup]="form" class="flex flex-col gap-4">
    <div class="grid">
      <div class="col-12 md:col-6">
        <!-- Your form fields -->
      </div>
    </div>
  </form>
</div>
```

3. **Add Translations**
Update `src/assets/i18n/en.json` and `ar.json`:
```json
{
  "wizard": {
    "stepX": {
      "title": "Step X Title",
      "fieldName": "Field Label"
    }
  }
}
```

### Data Flow

1. Each step component validates its data
2. On successful validation, emit data via `stepData` output
3. Parent wizard stores data in signals
4. Submit button collects all step data and sends to backend

```typescript
// In agreement-wizard.component.ts
onStepXData(data: any) {
  this.stepXData.set(data);
}

submitWizard() {
  const completeData = {
    step1: this.step1Data(),
    step2: this.step2Data(),
    // ... etc
  };
  // Send to backend
}
```

## Styling Guidelines

### Use PrimeFlex Only
❌ Don't create custom SCSS:
```scss
.my-custom-class {
  padding: 20px;
}
```

✅ Use PrimeFlex utilities:
```html
<div class="p-4"></div>
```

### Common PrimeFlex Classes
- **Spacing**: `p-4`, `m-2`, `gap-4`, `pt-4`, `mb-2`
- **Layout**: `flex`, `grid`, `col-12`, `col-md-6`
- **Text**: `text-xl`, `font-semibold`, `text-center`
- **Width**: `w-full`, `w-auto`
- **Colors**: `text-red-500`, `bg-surface-50`

## Translation Keys

All wizard translation keys are under `wizard.*`:

```json
{
  "wizard": {
    "next": "Next",
    "back": "Back",
    "submit": "Submit",
    "step1": { /* Step 1 translations */ },
    "step2": { /* Step 2 translations */ },
    // ...
  }
}
```

## Testing

Navigate to `/agreement-wizard` to test the wizard:

1. **Step 1**: Fill out all required fields
2. **Validation**: Try submitting with empty/invalid fields
3. **Navigation**: Use Next/Back buttons
4. **Language Toggle**: Switch between English and Arabic
5. **Responsive**: Test on different screen sizes

## Next Steps

To complete the wizard:

1. Implement Step 2-7 components with actual business logic
2. Connect to backend API services
3. Add loading states and error handling
4. Implement save draft functionality
5. Add summary/review step before final submission
6. Add success/error notifications

## API Integration

When ready to connect to backend:

```typescript
// In agreement-wizard.component.ts
import { AgreementService } from '@/services/agreement.service';

submitWizard() {
  const completeData = {
    step1: this.step1Data(),
    // ... all steps
  };
  
  this.agreementService.createAgreement(completeData)
    .subscribe({
      next: (response) => {
        // Show success message
        // Navigate to agreement detail
      },
      error: (error) => {
        // Show error message
      }
    });
}
```

## Notes

- The wizard maintains state using Angular signals
- Linear mode prevents skipping steps
- Each step validates independently
- Form data persists when navigating between steps
- Date picker uses PrimeNG's DatePicker component
- All number inputs use PrimeNG's InputNumber for proper formatting
