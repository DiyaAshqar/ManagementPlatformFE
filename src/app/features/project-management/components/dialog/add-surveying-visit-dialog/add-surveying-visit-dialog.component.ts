import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
  CreateProjectSurveyingVisitCommand,
  IGetProjectSurveyingVisitDto
} from '../../../../../../nswag/api-client';

export enum VisitStatus {
  InProgress = 0,
  Scheduled = 1,
  Completed = 2
}

@Component({
  selector: 'app-add-surveying-visit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    InputNumberModule,
    SelectModule,
    FloatLabelModule,
    DatePickerModule
  ],
  templateUrl: './add-surveying-visit-dialog.component.html',
  styleUrls: ['./add-surveying-visit-dialog.component.scss']
})
export class AddSurveyingVisitDialogComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() projectStageId!: number;
  @Input() editItem: IGetProjectSurveyingVisitDto | null = null;
  @Input() unitOptions: { label: string; value: number }[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<CreateProjectSurveyingVisitCommand>();

  visitForm!: FormGroup;
  isSubmitting = signal(false);

  readonly statusOptions = [
    { label: 'In Progress', value: VisitStatus.InProgress },
    { label: 'Scheduled', value: VisitStatus.Scheduled },
    { label: 'Completed', value: VisitStatus.Completed }
  ];

  get isEditMode(): boolean { return !!this.editItem; }
  get dialogHeader(): string { return this.isEditMode ? 'Edit Surveying Visit' : 'Schedule Visit'; }

  get computedSubTotal(): number {
    const price = this.visitForm?.get('price')?.value ?? 0;
    const quantity = this.visitForm?.get('quantity')?.value ?? 0;
    return price * quantity;
  }

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void { this.initForm(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initForm();
    }
  }

  private initForm(): void {
    if (!this.visitForm) {
      this.visitForm = this.fb.group({
        visitDate: [null, Validators.required],
        surveyor: ['', Validators.required],
        purpose: ['', Validators.required],
        unitId: [null, Validators.required],
        quantity: [null, [Validators.required, Validators.min(0)]],
        price: [null, [Validators.required, Validators.min(0)]],
        status: [VisitStatus.Scheduled, Validators.required]
      });
    }

    if (this.isEditMode && this.editItem) {
      this.visitForm.patchValue({
        visitDate: this.editItem.visitDate ? new Date(this.editItem.visitDate) : null,
        surveyor: this.editItem.surveyor,
        purpose: this.editItem.purpose,
        unitId: this.editItem.unitId,
        quantity: this.editItem.quantity,
        price: this.editItem.price,
        status: this.editItem.status ?? VisitStatus.Scheduled
      });
    } else {
      this.visitForm.reset({ status: VisitStatus.Scheduled });
    }
  }

  onHide(): void {
    this.visibleChange.emit(false);
    this.visitForm.reset({ status: VisitStatus.Scheduled });
    this.isSubmitting.set(false);
  }

  onSubmit(): void {
    if (this.visitForm.invalid) {
      Object.keys(this.visitForm.controls).forEach(key =>
        this.visitForm.get(key)?.markAsTouched()
      );
      return;
    }

    const { visitDate, surveyor, purpose, unitId, quantity, price, status } = this.visitForm.value;
    const subTotal = price * quantity;

    const command = new CreateProjectSurveyingVisitCommand({
      id: this.isEditMode ? this.editItem!.id : undefined,
      projectStageId: this.projectStageId,
      visitDate,
      surveyor,
      purpose,
      unitId,
      quantity,
      price,
      subTotal,
      status
    });

    this.isSubmitting.set(true);
    this.saved.emit(command);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.visitForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
