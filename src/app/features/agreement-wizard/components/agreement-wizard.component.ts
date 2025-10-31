import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
export class AgreementWizardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  currentStep = signal(1);
  agreementId = signal(0);

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

  ngOnInit(): void {
    // Subscribe to both params and queryParams
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        const parsedId = parseInt(id, 10);
        if (!isNaN(parsedId)) {
          this.agreementId.set(parsedId);
        }
      } else {
        // Create mode
        this.agreementId.set(0);
      }
    });

    // Get the step from query parameters
    this.route.queryParams.subscribe(queryParams => {
      const step = queryParams['step'];
      if (step) {
        const parsedStep = parseInt(step, 10);
        if (!isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 7) {
          this.currentStep.set(parsedStep);
        } else {
          // Invalid step, default to step 1
          this.currentStep.set(1);
          this.updateUrlStep(1);
        }
      } else {
        // No step in URL, default to step 1
        this.currentStep.set(1);
        this.updateUrlStep(1);
      }
    });
  }

  onStep1Data(data: any) {
    this.step1Data.set(data);
    // Move to next step after successful submission
    this.goToStep(2);
  }

  onAgreementIdUpdate(newAgreementId: number) {
    this.agreementId.set(newAgreementId);
  }

  onStep2Data(data: any) {
    this.step2Data.set(data);
    // Move to next step after successful submission
    this.goToStep(3);
  }

  onStep3Data(data: any) {
    this.step3Data.set(data);
    // Move to next step after successful submission
    this.goToStep(4);
  }

  onStep4Data(data: any) {
    this.step4Data.set(data);
    // Move to next step after successful submission
    this.goToStep(5);
  }

  onStep5Data(data: any) {
    this.step5Data.set(data);
    // Move to next step after successful submission
    this.goToStep(6);
  }

  onStep6Data(data: any) {
    this.step6Data.set(data);
    // Move to next step after successful submission
    this.goToStep(7);
  }

  onStep7Data(data: any) {
    this.step7Data.set(data);
  }

  goToStep(step: number) {
    this.currentStep.set(step);
    this.updateUrlStep(step);
  }

  private updateUrlStep(step: number): void {
    // Update the URL with the current step without triggering a full navigation
    const currentUrl = this.router.url.split('?')[0];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { step },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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
    
    // Navigate to success page
    this.router.navigate(['/agreement-wizard/success']);
  }
}
