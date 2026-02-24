import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { MessageService } from 'primeng/api';
import { Project } from '../../../models';
import { ProjectApiService } from '../../../services/project-api.service';
import { AgreementWizardService } from '../../../../agreement-wizard/services/agreement-wizard.service';
import { CreateProjectCommand, GetAllAgreementDto, ProjectStatus } from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-create-project-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    DatePickerModule,
    SelectModule,
    FloatLabelModule
  ],
  templateUrl: './create-project-dialog.component.html',
  styleUrls: ['./create-project-dialog.component.scss']
})
export class CreateProjectDialogComponent implements OnInit {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() projectCreated = new EventEmitter<Project>();

  projectForm!: FormGroup;
  isSubmitting = signal<boolean>(false);
  isLoadingAgreements = signal<boolean>(false);
  agreements = signal<GetAllAgreementDto[]>([]);

  statusOptions = [
    { label: 'To Do', value: ProjectStatus._0 },
    { label: 'In Progress', value: ProjectStatus._1 },
    { label: 'Review', value: ProjectStatus._2 },
    { label: 'Completed', value: ProjectStatus._3 }
  ];

  agreementOptions = signal<{ label: string, value: number }[]>([]);

  constructor(
    private fb: FormBuilder,
    private projectApiService: ProjectApiService,
    private agreementWizardService: AgreementWizardService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAgreements();
  }

  initializeForm(): void {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      agreementId: [null, [Validators.required]],
      startDate: [new Date(), Validators.required],
      endDate: [null, Validators.required],
      status: [ProjectStatus._0],
      milestoneCount: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadAgreements(): void {
    this.isLoadingAgreements.set(true);
    this.agreementWizardService.getAllAgreements(1, 100).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.agreements.set(response.data.data);
          const options = response.data.data.map(agreement => ({
            label: `${agreement.projectNumber || agreement.id} - ${agreement.projectName}`,
            value: agreement.id!
          }));
          this.agreementOptions.set(options);
        }
        this.isLoadingAgreements.set(false);
      },
      error: (error) => {
        this.isLoadingAgreements.set(false);
      }
    });
  }

  onHide(): void {
    this.visibleChange.emit(false);
    this.projectForm.reset();
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched(this.projectForm);
      return;
    }

    this.isSubmitting.set(true);
    
    // Map form data to CreateProjectCommand
    const command = new CreateProjectCommand({
      title: this.projectForm.get('title')?.value,
      description: this.projectForm.get('description')?.value,
      agreementId: this.projectForm.get('agreementId')?.value || undefined,
      startDate: this.projectForm.get('startDate')?.value,
      endDate: this.projectForm.get('endDate')?.value,
      status: this.projectForm.get('status')?.value,
      milestoneCount: this.projectForm.get('milestoneCount')?.value
    });

    this.projectApiService.createProject(command).subscribe({
      next: (response) => {
        if (response.succeeded) {
          // Refresh the projects list
          this.projectApiService.getAllProjects(1, 100).subscribe({
            next: () => {
              // Emit event to close dialog
              this.visibleChange.emit(false);
              this.isSubmitting.set(false);
              this.projectForm.reset();
              this.projectCreated.emit();
            },
            error: (error) => {
              console.error('Error refreshing projects:', error);
              this.visibleChange.emit(false);
              this.isSubmitting.set(false);
              this.projectForm.reset();
            }
          });
        } else {
          this.isSubmitting.set(false);
        }
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.isSubmitting.set(false);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.projectForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.projectForm.get(fieldName);
    if (!field || !field.errors) return '';
    if (field.errors['required']) return this.translate.instant('validation.required') || 'This field is required';
    if (field.errors['minlength']) return this.translate.instant('validation.minlength', { requiredLength: field.errors['minlength'].requiredLength }) || `Minimum length is ${field.errors['minlength'].requiredLength}`;
    if (field.errors['min']) return this.translate.instant('validation.min', { min: field.errors['min'].min }) || `Minimum value is ${field.errors['min'].min}`;

    return this.translate.instant('validation.invalid') || 'Invalid field';
  }
}
