# Step 2 Implementation - Contract & Payment Details

## Overview
Step 2 of the Agreement Wizard handles contract types, payment methods, and service selection. This implementation integrates with the backend API and uses proper DTOs from the NSwag-generated client.

## Features Implemented

### 1. **Form Structure**
- **Contract Details**
  - Contract Type (dropdown - required)
  - Contract Model (dropdown - required)

- **Payment Details**
  - Payment Method (dropdown - required)
  - Monthly Payment Amount (input number - conditionally required)
    - Only enabled when "Monthly Fees" payment method is selected

- **Services**
  - Multi-selection of services with visual feedback
  - Click-to-toggle interface with styled cards
  - At least one service must be selected

### 2. **API Integration**

#### Lookups Loading
The component loads all required lookup data from the API on initialization:
```typescript
getStep2Lookups(): Observable<{
  contractTypes: LookupDto[],
  contractModels: LookupDto[],
  paymentMethods: LookupDto[],
  services: LookupDto[]
}>
```

#### Data Submission
When the form is submitted, it sends a `FullAgreementDto` with:
```json
{
  "step": 2,
  "agreementId": <from step 1 response>,
  "secondStepDto": {
    "agreementPaymentDto": {
      "id": 0,
      "contractTypeId": <selected value>,
      "contractModelId": <selected value>,
      "paymentMethodId": <selected value>,
      "monthlyPaymentId": 0,
      "agreementId": <from step 1>,
      "monthlyPaymentDto": {
        "id": 0,
        "amount": <monthly payment value>
      }
    },
    "agreementServiceDto": [
      {
        "agreementId": <from step 1>,
        "serviceId": <selected service id>
      }
    ]
  }
}
```

### 3. **Form Validation**
- All dropdown fields are required
- Monthly payment amount is conditionally required based on payment method
- At least one service must be selected
- Form validity is tracked via `isFormValid` signal
- "Next" button is disabled until form is valid

### 4. **User Experience**

#### Loading States
- Progress spinner shown during:
  - Initial lookup data loading
  - Form submission

#### Toast Notifications
- **Success**: When step 2 data is saved successfully
- **Error**: 
  - When lookup data fails to load
  - When form validation fails
  - When API submission fails

#### Visual Feedback
- Services are displayed as interactive cards
- Selected services show:
  - Primary border color
  - Light primary background
  - Check circle icon
  - Bold text
- Unselected services show:
  - Gray border
  - Circle icon
  - Normal text weight

### 5. **Navigation**
- **Back Button**: Returns to Step 1 (always enabled)
- **Next Button**: 
  - Disabled when form is invalid
  - Submits data to API
  - Automatically navigates to Step 3 on success

## Files Modified

### 1. **step2.component.ts**
**Location**: `src/app/features/agreement-wizard/components/steps/step2/step2.component.ts`

**Key Changes**:
- Added imports for NSwag DTOs (`FullAgreementDto`, `SecondStepDto`, `AgreementPaymentDto`, `AgreementServiceDto`, `MonthlyPaymentDto`, `LookupDto`)
- Added `AgreementWizardService` and `MessageService` dependencies
- Replaced mock lookup data with API calls
- Added `isFormValid` signal for form validation tracking
- Implemented `prepareFullAgreementDto()` method to build proper DTO structure
- Updated `onSubmit()` to call the API and handle responses
- Added proper error handling and toast notifications

### 2. **step2.component.html**
**Location**: `src/app/features/agreement-wizard/components/steps/step2/step2.component.html`

**Key Features**:
- Progress spinner during loading
- Float labels for all inputs
- Conditional enabling of monthly payment field
- Interactive service selection cards
- Validation error messages

### 3. **agreement-wizard.component.html**
**Location**: `src/app/features/agreement-wizard/components/agreement-wizard.component.html`

**Changes**:
- Updated Step 2 panel comment to "Payment & Services"
- Added `[disabled]="!step2Component.isFormValid()"` to Next button
- Simplified Next button click handler to only call `step2Component.onSubmit()`

### 4. **agreement-wizard.component.ts**
**Location**: `src/app/features/agreement-wizard/components/agreement-wizard.component.ts`

**Changes**:
- Updated `onStep2Data()` to automatically navigate to Step 3 after successful submission

### 5. **agreement-wizard.service.ts**
**Location**: `src/app/features/agreement-wizard/services/agreement-wizard.service.ts`

**Already Implemented**:
- `getStep2Lookups()` method that fetches all required lookups
- Proper mapping of lookup responses to typed arrays

## Data Flow

1. **Initialization**:
   - Component loads → calls `loadLookups()`
   - Service fetches lookup data from API
   - Dropdowns and service list populate

2. **User Interaction**:
   - User selects contract type, model, and payment method
   - If "Monthly Fees" is selected, amount field becomes enabled and required
   - User clicks on services to select/deselect them
   - Form validity updates in real-time
   - Next button enables when form is valid

3. **Submission**:
   - User clicks Next button
   - `onSubmit()` validates form
   - `prepareFullAgreementDto()` builds DTO with step=2 and agreementId from step 1
   - Service calls `createAgreement()` API endpoint
   - On success:
     - Success toast shown
     - Data emitted to parent
     - Parent navigates to Step 3
   - On error:
     - Error toast shown
     - User remains on Step 2

## API Endpoints Used

### GET Lookups
- **Endpoint**: `/api/Lookup`
- **Query Params**: `lookupTypes=['contracttype', 'contractmodel', 'paymentmethod', 'service']`
- **Response**: Dictionary of lookup arrays

### POST Agreement
- **Endpoint**: `/api/Agreement`
- **Method**: POST
- **Body**: `FullAgreementDto` with `step=2` and `secondStepDto`
- **Response**: 
  ```json
  {
    "succeeded": true,
    "message": "Agreement updated successfully",
    "data": <agreementId>
  }
  ```

## Validation Rules

| Field | Validation |
|-------|-----------|
| Contract Type | Required |
| Contract Model | Required |
| Payment Method | Required |
| Monthly Payment | Required if Payment Method = "Monthly Fees", Min value = 0 |
| Services | At least one must be selected |

## Payment Method Logic

The Monthly Payment amount field has conditional validation:
- When Payment Method ID = 1 (Monthly Fees):
  - Field is **enabled**
  - Field is **required**
  - Must be ≥ 0
- For all other payment methods:
  - Field is **disabled**
  - Validation is cleared
  - Value is reset to null

This is implemented in the `onPaymentMethodChange()` method.

## Translation Keys Used

All text in Step 2 uses translation keys from the `wizard.step2` namespace:
- `wizard.step2.title` - "Contract & Payment Details"
- `wizard.step2.contractDetails` - "Contract Information"
- `wizard.step2.paymentDetails` - "Payment Information"
- `wizard.step2.services` - "Services"
- `wizard.step2.contractType` - "Contract Type"
- `wizard.step2.contractModel` - "Type of Contracting"
- `wizard.step2.paymentMethod` - "Payment Method"
- `wizard.step2.monthlyPayment` - "Monthly Payment Value"
- `wizard.step2.monthlyPaymentHint` - "Only activated when Monthly Fees payment method is selected"
- `wizard.step2.selectServices` - "Select Services"

## Testing Checklist

- [ ] Form loads with all lookups from API
- [ ] All dropdowns populate correctly
- [ ] Services display as clickable cards
- [ ] Clicking a service toggles selection
- [ ] Selected services show visual feedback
- [ ] Next button is disabled when form is invalid
- [ ] Monthly payment field enables/disables based on payment method
- [ ] Validation errors show for required fields
- [ ] Form submits with correct DTO structure
- [ ] Success toast shows on successful submission
- [ ] Error toast shows on failed submission
- [ ] Navigation to Step 3 works after success
- [ ] Back button returns to Step 1
- [ ] Loading spinner shows during API calls
- [ ] agreementId from Step 1 is used correctly

## Future Enhancements

1. **Dynamic Payment Method Logic**
   - Currently hardcoded to ID=1 for Monthly Fees
   - Could be improved by checking the name or a property in the lookup

2. **Service Descriptions**
   - Add tooltips or descriptions for each service

3. **Form Pre-filling**
   - When editing an existing agreement, pre-populate form with existing data

4. **Validation Messages**
   - Add more specific validation messages for each field

5. **Service Categories**
   - Group services by category if the number grows large

## Dependencies

### Angular
- `@angular/common`
- `@angular/core`
- `@angular/forms`

### PrimeNG
- `primeng/select`
- `primeng/inputnumber`
- `primeng/button`
- `primeng/floatlabel`
- `primeng/progressspinner`
- `primeng/api` (MessageService)

### NGX-Translate
- `@ngx-translate/core`

### RxJS
- `rxjs`
- `rxjs/operators` (takeUntil)

### Services
- `AgreementWizardService`
- `MessageService`

## Known Issues
None at this time.

## Notes
- The `buildFormData()` method is kept for backward compatibility but is not used in the current implementation
- All DTOs are properly instantiated using the `new` keyword to ensure proper serialization
- The component properly cleans up subscriptions using the `destroy$` Subject
