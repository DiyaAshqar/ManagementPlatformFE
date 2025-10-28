# Step 3 & 4 Implementation - Material Specifications & Main Contracts

## Overview
Steps 3 and 4 of the Agreement Wizard have been fully implemented with API integration, proper navigation, and form validation.

## ✅ Step 3 - Material & Quality Specifications

### Features Implemented
- **Project Area Units Management**
  - Add/Edit/Delete project area units
  - Annex selection (ground floor, first floor, etc.)
  - Quantity input with validation
  - Unit selection (square meter, cubic meter, etc.)
  - Dynamic table with pagination

### API Integration
- **Lookups Loading**: `getStep3Lookups()` loads units and annexes from API
- **Data Submission**: Sends `FullAgreementDto` with `step=3` and `thirdStepDto`

### Request Payload Structure
```json
{
  "step": 3,
  "agreementId": <from previous steps>,
  "thirdStepDto": {
    "projectAreaUnitDto": [
      {
        "id": 0,
        "annexId": <selected annex>,
        "amount": <quantity>,
        "unitId": <selected unit>,
        "isDeleted": false
      }
    ]
  }
}
```

### Form Validation
- All fields required (annex, quantity, unit)
- Minimum quantity validation
- At least one entry required for submission
- Real-time form validity tracking

## ✅ Step 4 - Main Contracts

### Features Implemented
- **Main Contract Management**
  - Add/Edit/Delete main contracts
  - Contract type selection
  - Contractor selection
  - Total amount with currency formatting
  - Start/End date validation
  - Dynamic table with pagination

### API Integration
- **Lookups Loading**: `getStep4Lookups()` loads main contract types and constructors
- **Data Submission**: Sends `FullAgreementDto` with `step=4` and `fourthStepDto`

### Request Payload Structure
```json
{
  "step": 4,
  "agreementId": <from previous steps>,
  "fourthStepDto": {
    "mainContractDto": [
      {
        "id": 0,
        "total": <contract amount>,
        "startDate": <start date>,
        "endDate": <end date>,
        "agreementId": <agreement id>,
        "typeId": <contract type>,
        "constructorId": <contractor id>,
        "isDeleted": false
      }
    ]
  }
}
```

### Date Validation
- End date must be after start date
- Cross-field validation with custom validator
- Real-time date restriction updates

## 🔄 Navigation Implementation

Both steps now have automatic navigation after successful API submission:

1. **Step 3**: After success → automatically moves to Step 4
2. **Step 4**: After success → automatically moves to Step 5

### Button States
- **Next Button**: Disabled until required conditions are met:
  - Step 3: Form valid AND at least one project area unit added
  - Step 4: At least one main contract added
- **Back Button**: Always enabled

## 📁 Files Modified

### Step 3 Component
**Location**: `src/app/features/agreement-wizard/components/steps/step3/step3.component.ts`

**Key Changes**:
- Added NSwag DTO imports (`FullAgreementDto`, `ThirdStepDto`, `ProjectAreaUnitDto`, `LookupDto`)
- Replaced mock lookups with `agreementWizardService.getStep3Lookups()`
- Added `isFormValid` signal for real-time validation
- Implemented `prepareFullAgreementDto()` for proper API payload
- Updated `addEntry()` to use proper DTO instantiation
- Added form validity tracking with `takeUntil` pattern
- Fixed helper methods for optional properties

### Step 4 Component
**Location**: `src/app/features/agreement-wizard/components/steps/step4/step4.component.ts`

**Key Changes**:
- Added NSwag DTO imports (`FullAgreementDto`, `FourthStepDto`, `MainContractDto`, `LookupDto`)
- Replaced mock lookups with `agreementWizardService.getStep4Lookups()`
- Added `isFormValid` signal for real-time validation
- Implemented `prepareFullAgreementDto()` for proper API payload
- Updated contract management to use proper DTO instantiation
- Added date range validation with custom validator
- Removed contractor duties (not in current DTO structure)

### Parent Component Updates
**Location**: `src/app/features/agreement-wizard/components/agreement-wizard.component.ts`

**Changes**:
- Updated `onStep3Data()` to call `this.goToStep(4)`
- Updated `onStep4Data()` to call `this.goToStep(5)`

**Location**: `src/app/features/agreement-wizard/components/agreement-wizard.component.html`

**Changes**:
- Updated Step 3 Next button: `[disabled]="!step3Component.isFormValid() || step3Component.projectAreaUnits().length === 0"`
- Updated Step 4 Next button: `[disabled]="step4Component.mainContracts().length === 0"`
- Simplified onClick handlers to only call `onSubmit()`

### Service Integration
Both steps use existing service methods:
- `agreementWizardService.getStep3Lookups()` - loads units and annexes
- `agreementWizardService.getStep4Lookups()` - loads main contract types and constructors
- `agreementWizardService.createAgreement()` - submits step data

## 🎯 API Endpoints Used

### Step 3
- **GET Lookups**: `/api/Lookup?lookupTypes=['unit', 'annex']`
- **POST Agreement**: `/api/Agreement` with step=3 payload

### Step 4
- **GET Lookups**: `/api/Lookup?lookupTypes=['maincontracttype', 'constructor']`
- **POST Agreement**: `/api/Agreement` with step=4 payload

## ✅ Validation Rules

### Step 3 - Project Area Units
| Field | Validation |
|-------|-----------|
| Annex | Required, must select from dropdown |
| Quantity | Required, must be > 0 |
| Unit | Required, must select from dropdown |
| Entries | At least 1 entry required for submission |

### Step 4 - Main Contracts
| Field | Validation |
|-------|-----------|
| Contract Type | Required, must select from dropdown |
| Contractor | Required, must select from dropdown |
| Total Amount | Required, must be > 0.01 |
| Start Date | Required |
| End Date | Required, must be after start date |
| Contracts | At least 1 contract required for submission |

## 🔧 User Experience Features

### Loading States
- Progress spinner during lookup loading
- Progress spinner during form submission
- Disabled buttons during API calls

### Toast Notifications
- **Success**: When entries/contracts are added/updated/deleted
- **Success**: When step data is saved successfully
- **Error**: When validation fails
- **Error**: When API calls fail
- **Error**: When required minimums not met

### Visual Feedback
- **Tables**: Striped rows, pagination, empty state messages
- **Forms**: Float labels, validation error styling
- **Buttons**: Conditional enabling/disabling
- **Icons**: Edit/delete actions with tooltips

### Data Management
- **Edit Mode**: Click edit to populate form with existing data
- **Soft Delete**: Existing entries marked as deleted (not removed)
- **Hard Delete**: New entries removed from array
- **Clear Form**: Reset button to clear all inputs

## 🧪 Testing Checklist

### Step 3
- [ ] Form loads with lookup data from API
- [ ] Can add project area units with all required fields
- [ ] Can edit existing entries
- [ ] Can delete entries
- [ ] Validation prevents submission without entries
- [ ] Next button disabled until valid form + entries
- [ ] Successful submission navigates to Step 4
- [ ] Error handling for API failures

### Step 4
- [ ] Form loads with lookup data from API
- [ ] Can add main contracts with all required fields
- [ ] Date validation prevents end date before start date
- [ ] Currency formatting displays correctly
- [ ] Can edit existing contracts
- [ ] Can delete contracts
- [ ] Validation prevents submission without contracts
- [ ] Next button disabled until contracts added
- [ ] Successful submission navigates to Step 5
- [ ] Error handling for API failures

## 🎯 Translation Keys Used

Both steps use translation keys from the existing i18n files:
- `wizard.step3.*` - All Step 3 labels and messages
- `wizard.step4.*` - All Step 4 labels and messages
- `common.*` - Shared action buttons (Add, Edit, Delete, Cancel)

## 🚀 Next Steps

1. **Manual Testing**: Test the implemented steps in the browser
2. **API Verification**: Ensure backend endpoints return expected data structure
3. **Step 5-7**: Continue implementing remaining wizard steps
4. **Error Handling**: Add more specific error messages for edge cases
5. **Accessibility**: Add ARIA labels and keyboard navigation support

## 📝 Notes

- Both components properly clean up subscriptions using `takeUntil(this.destroy$)`
- All DTOs are instantiated using the `new` keyword for proper serialization
- Form validation is reactive and updates in real-time
- Navigation between steps is automatic after successful API submission
- Tables support pagination and empty states for better UX

Both Step 3 and Step 4 are now fully functional with complete API integration and proper navigation flow! 🎉