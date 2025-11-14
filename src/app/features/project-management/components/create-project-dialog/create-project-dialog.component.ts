import { Component, EventEmitter, Input, Output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';

import { ProjectService } from '../../services/project.service';
import { CreateProjectDto, Project, ProjectPriority } from '../../models';
import { MessageService } from 'primeng/api';

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

  priorityOptions = [
    { label: 'Low', value: ProjectPriority.LOW },
    { label: 'Medium', value: ProjectPriority.MEDIUM },
    { label: 'High', value: ProjectPriority.HIGH },
    { label: 'Urgent', value: ProjectPriority.URGENT }
  ];

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      clientName: ['', Validators.required],
      projectManager: ['', Validators.required],
      startDate: [new Date(), Validators.required],
      endDate: [null, Validators.required],
      budget: [0, [Validators.required, Validators.min(1000)]],
      priority: [ProjectPriority.MEDIUM, Validators.required]
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
    const dto: CreateProjectDto = this.projectForm.value;

    this.projectService.createProject(dto).subscribe({
      next: (project) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Project created successfully',
          life: 3000
        });
        this.projectCreated.emit(project);
        this.isSubmitting.set(false);
        this.projectForm.reset();
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create project',
          life: 5000
        });
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

    if (field.errors['required']) return 'This field is required';
    if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;

    return 'Invalid field';
  }
}
