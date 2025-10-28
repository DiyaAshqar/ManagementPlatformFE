import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { Step1Component } from './steps/step1/step1.component';
import { Step2Component } from './steps/step2/step2.component';
import { Step3Component } from './steps/step3/step3.component';
import { Step4Component } from './steps/step4/step4.component';
import { Step5Component } from './steps/step5/step5.component';
import { Step6Component } from './steps/step6/step6.component';
import { Step7Component } from './steps/step7/step7.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-agreement-wizard',
  standalone: true,
  imports: [
    CommonModule,
    StepperModule,
    ButtonModule,
    TranslateModule,
    Step1Component,
    Step2Component,
    Step3Component,
    Step4Component,
    Step5Component,
    Step6Component,
    Step7Component
  ],
  templateUrl: './agreement-wizard.component.html'
})
export class AgreementWizardComponent {
  currentStep = signal(4); // Set to step 4 for debugging
  agreementId = signal(1); // Set to test agreement ID 1 for debugging
  
  // Store data from each step
  step1Data = signal<any>(null);
  step2Data = signal<any>(null);
  step3Data = signal<any>(null);
  step4Data = signal<any>(null);
  step5Data = signal<any>(null);
  step6Data = signal<any>(null);
  step7Data = signal<any>(null);

  // Computed property to check if we can proceed to next step
  canProceed = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 1:
        return this.step1Data() !== null;
      case 2:
        return this.step2Data() !== null;
      case 3:
        return this.step3Data() !== null;
      case 4:
        return this.step4Data() !== null;
      case 5:
        return this.step5Data() !== null;
      case 6:
        return this.step6Data() !== null;
      case 7:
        return this.step7Data() !== null;
      default:
        return false;
    }
  });

  stepLabels = [
    'wizard.step1.title',
    'wizard.step2.title',
    'wizard.step3.title',
    'wizard.step4.title',
    'wizard.step5.title',
    'wizard.step6.title',
    'wizard.step7.title'
  ];

  onStep1Data(data: any) {
    this.step1Data.set(data);
    console.log('Step 1 data received:', data);
    // Move to next step after successful submission
    this.goToStep(2);
  }

  onAgreementIdUpdate(newAgreementId: number) {
    this.agreementId.set(newAgreementId);
    console.log('Agreement ID updated to:', newAgreementId);
  }

  onStep2Data(data: any) {
    this.step2Data.set(data);
    console.log('Step 2 data received:', data);
    // Move to next step after successful submission
    this.goToStep(3);
  }

  onStep3Data(data: any) {
    this.step3Data.set(data);
    console.log('Step 3 data received:', data);
    // Move to next step after successful submission
    this.goToStep(4);
  }

  onStep4Data(data: any) {
    this.step4Data.set(data);
    console.log('Step 4 data received:', data);
    // Move to next step after successful submission
    this.goToStep(5);
  }

  onStep5Data(data: any) {
    this.step5Data.set(data);
    console.log('Step 5 data received:', data);
  }

  onStep6Data(data: any) {
    this.step6Data.set(data);
    console.log('Step 6 data received:', data);
  }

  onStep7Data(data: any) {
    this.step7Data.set(data);
    console.log('Step 7 data received:', data);
  }

  goToStep(step: number) {
    this.currentStep.set(step);
  }

  submitWizard() {
    const completeData = {
      step1: this.step1Data(),
      step2: this.step2Data(),
      step3: this.step3Data(),
      step4: this.step4Data(),
      step5: this.step5Data(),
      step6: this.step6Data(),
      step7: this.step7Data()
    };
    
    console.log('Complete wizard data:', completeData);
    // TODO: Submit to backend
  }
}
