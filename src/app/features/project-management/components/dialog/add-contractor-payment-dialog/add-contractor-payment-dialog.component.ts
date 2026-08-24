import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
  CreateProjectMainContractorPaymentCommand,
  GetProjectMainContractorPaymentDto
} from '../../../../../../nswag/api-client';
import { NumberInputComponent } from '../../../../../shared/components/number-input/number-input.component';

@Component({
  selector: 'app-add-contractor-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FloatLabelModule,
    CalendarModule,
    TextareaModule,
    NumberInputComponent
  ],
  templateUrl: './add-contractor-payment-dialog.component.html',
  styleUrl: './add-contractor-payment-dialog.component.scss'
})
export class AddContractorPaymentDialogComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() projectMainContractorId!: number;
  @Input() editItem: GetProjectMainContractorPaymentDto | null = null;
  @Input() paymentMethodOptions: { label: string; value: number }[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<CreateProjectMainContractorPaymentCommand>();

  paymentForm!: FormGroup;
  isSubmitting = signal(false);

  get isEditMode(): boolean {
    return !!this.editItem;
  }

  get dialogHeader(): string {
    return this.isEditMode
      ? this.translate.instant('dialogs.contractorPayment.editTitle')
      : this.translate.instant('dialogs.contractorPayment.addTitle');
  }

  constructor(
    private fb: FormBuilder,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.initForm();
    if (this.editItem) {
      this.patchForm(this.editItem);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Skip first change — ngOnInit handles it
    if (changes['visible'] && this.visible && !changes['visible'].isFirstChange()) {
      this.initForm();
      if (this.editItem) {
        this.patchForm(this.editItem);
      }
    }
  }

  private initForm(): void {
    this.paymentForm = this.fb.group({
      paymentDate: [null, Validators.required],
      paidAmount: [null, [Validators.required, Validators.min(0.01)]],
      paymentMethod: [null, Validators.required],
      receiptNo: [null],
      chequeNo: [null],
      transferReferenceNumber: [null],
      notes: [null]
    });
  }

  private patchForm(item: GetProjectMainContractorPaymentDto): void {
    this.paymentForm.patchValue({
      paymentDate: item.paymentDate ? new Date(item.paymentDate) : null,
      paidAmount: item.paidAmount,
      paymentMethod: item.paymentMethod,
      receiptNo: item.receiptNo,
      chequeNo: item.chequeNo,
      transferReferenceNumber: item.transferReferenceNumber,
      notes: item.notes
    });
  }

  isFieldInvalid(field: string): boolean {
    const ctrl = this.paymentForm?.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onHide(): void {
    this.visibleChange.emit(false);
    this.paymentForm?.reset();
    this.isSubmitting.set(false);
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.paymentForm.value;

    const command = new CreateProjectMainContractorPaymentCommand({
      id: this.editItem?.id,
      projectMainContractorId: this.projectMainContractorId,
      paymentDate: v.paymentDate instanceof Date ? v.paymentDate : new Date(v.paymentDate),
      paidAmount: v.paidAmount,
      paymentMethod: v.paymentMethod,
      receiptNo: v.receiptNo || undefined,
      chequeNo: v.chequeNo || undefined,
      transferReferenceNumber: v.transferReferenceNumber || undefined,
      notes: v.notes || undefined
    });

    this.saved.emit(command);
    this.isSubmitting.set(false);
  }
}
