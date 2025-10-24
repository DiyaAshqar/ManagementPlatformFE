import { Component, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-step5',
  standalone: true,
  imports: [CommonModule, ButtonModule, TranslateModule],
  template: `
    <div class="card p-4">
      <h3 class="text-xl font-semibold mb-4">{{ 'wizard.step5.title' | translate }}</h3>
      <div class="flex flex-col gap-4">
        <p>{{ 'wizard.step5.description' | translate }}</p>
        <div class="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded bg-surface-50 dark:bg-surface-950 p-6 text-center">
          <p class="text-color-secondary">{{ 'wizard.step5.placeholder' | translate }}</p>
        </div>
        <p-button 
          [label]="'wizard.step5.validate' | translate" 
          (onClick)="validateStep()"
          class="w-auto"
        />
      </div>
    </div>
  `
})
export class Step5Component {
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  validateStep(): void {
    this.stepData.emit({ step5: 'placeholder data' });
  }
}
