import { CommonModule } from '@angular/common';
import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AgreementWizardService } from '../../../services/agreement-wizard.service';
import {
  FullAgreementDto,
  MileStonesDto,
  MileStonesStepDto
} from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-step-milestones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProgressSpinnerModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    TranslateModule,
    FloatLabelModule,
    TooltipModule,
    TableModule
  ],
  templateUrl: './step-milestones.component.html'
})
export class StepMilestonesComponent implements OnInit, OnDestroy {
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  isViewMode = input<boolean>(false);
  stepData = output<any>();

  milestoneForm!: FormGroup;
  milestones = signal<MileStonesDto[]>([]);
  isLoading = signal(false);
  editingIndex = signal<number | null>(null);

  private pristineSnapshot: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private agreementWizardService: AgreementWizardService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAgreementData();

    if (this.isViewMode()) {
      this.milestoneForm.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.milestoneForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      order: [{ value: 1, disabled: true }, [Validators.required, Validators.min(1)]],
      description: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  private loadAgreementData(): void {
    if (this.agreementId() > 0) {
      this.isLoading.set(true);
      this.agreementWizardService.getAgreementById(this.agreementId(), 3)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.succeeded && response.data?.mileStonesStepDto?.mileStonesDto) {
              this.milestones.set([...response.data.mileStonesStepDto.mileStonesDto]);
              this.pristineSnapshot = JSON.stringify(response.data.mileStonesStepDto.mileStonesDto);
            }
            this.setNextOrder();
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error loading milestone data:', error);
            this.isLoading.set(false);
          }
        });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.milestoneForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(field: string): string {
    const control = this.milestoneForm.get(field);
    if (control?.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
      if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    }
    return '';
  }

  addEntry(): void {
    if (this.milestoneForm.invalid) {
      this.milestoneForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
      return;
    }

    const formValue = this.milestoneForm.getRawValue();
    const currentEntries = [...this.milestones()];
    const currentEditingIndex = this.editingIndex();

    if (currentEditingIndex !== null) {
      const updated = new MileStonesDto();
      updated.id = currentEntries[currentEditingIndex].id;
      updated.name = formValue.name;
      updated.order = formValue.order;
      updated.description = formValue.description;
      updated.isDeleted = currentEntries[currentEditingIndex].isDeleted ?? false;
      currentEntries[currentEditingIndex] = updated;
      this.milestones.set(currentEntries);
      this.editingIndex.set(null);
    } else {
      const newDto = new MileStonesDto();
      newDto.id = 0;
      newDto.name = formValue.name;
      newDto.order = formValue.order;
      newDto.description = formValue.description;
      newDto.isDeleted = false;
      currentEntries.push(newDto);
      this.milestones.set(currentEntries);
    }

    this.clearForm();
  }

  editEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    const allEntries = this.milestones();
    const allIndex = allEntries.indexOf(entry);

    this.editingIndex.set(allIndex);
    this.milestoneForm.patchValue({
      id: entry.id,
      name: entry.name,
      order: entry.order,
      description: entry.description
    });
  }

  deleteEntry(index: number): void {
    const activeEntries = this.getActiveEntries();
    const entry = activeEntries[index];
    const allEntries = [...this.milestones()];
    const allIndex = allEntries.indexOf(entry);

    if (allEntries[allIndex].id && allEntries[allIndex].id! > 0) {
      allEntries[allIndex].isDeleted = true;
    } else {
      allEntries.splice(allIndex, 1);
    }
    this.milestones.set(allEntries);
    this.setNextOrder();
  }

  clearForm(): void {
    this.milestoneForm.reset({ id: 0, name: '', order: this.getNextOrder(), description: '' });
    this.editingIndex.set(null);
  }

  getActiveEntries(): MileStonesDto[] {
    return this.milestones().filter(e => !e.isDeleted);
  }

  private setNextOrder(): void {
    if (this.editingIndex() !== null) return;
    this.milestoneForm.patchValue({ order: this.getNextOrder() });
  }

  private getNextOrder(): number {
    const maxOrder = this.getActiveEntries().reduce((max, entry) => Math.max(max, entry.order || 0), 0);
    return maxOrder + 1;
  }

  onSubmit(): void {
    const entries = this.milestones();

    if (!entries.length) {
      this.milestoneForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please add at least one milestone',
        life: 5000
      });
      return;
    }

    // Edit mode with no changes — skip API and go to next step
    if (this.agreementId() > 0 && this.pristineSnapshot && JSON.stringify(entries) === this.pristineSnapshot) {
      this.stepData.emit({ mileStonesDto: entries });
      return;
    }

    this.isLoading.set(true);

    const fullAgreementDto = this.prepareFullAgreementDto();

    this.agreementWizardService.createAgreement(fullAgreementDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data !== undefined && response.data !== null) {
            this.stepData.emit({ mileStonesDto: this.milestones() });
            this.isLoading.set(false);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to save milestones',
              life: 5000
            });
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error saving milestones:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save milestones. Please try again.',
            life: 5000
          });
          this.isLoading.set(false);
        }
      });
  }

  private prepareFullAgreementDto(): FullAgreementDto {
    const mileStonesStepDto = new MileStonesStepDto();
    mileStonesStepDto.mileStonesDto = this.milestones().map(entry => {
      const dto = new MileStonesDto();
      dto.id = entry.id || 0;
      dto.name = entry.name;
      dto.order = entry.order;
      dto.description = entry.description;
      dto.isDeleted = entry.isDeleted || false;
      return dto;
    });

    const fullAgreementDto = new FullAgreementDto();
    fullAgreementDto.step = 3;
    fullAgreementDto.agreementId = this.agreementId() || 0;
    fullAgreementDto.mileStonesStepDto = mileStonesStepDto;

    return fullAgreementDto;
  }
}
