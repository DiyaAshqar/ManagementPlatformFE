import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

import { MessageService } from 'primeng/api';
import { CreateProjectMainContractorCommand, IGetProjectMainContractorDto } from '../../../../../../nswag/api-client';

@Component({
  selector: 'app-add-contractor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    FloatLabelModule,
    CalendarModule
  ],
  templateUrl: './add-contractor-dialog.component.html',
  styleUrls: ['./add-contractor-dialog.component.scss']
})
export class AddContractorDialogComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() projectStageId!: number;
  /** When provided the dialog switches to edit mode */
  @Input() editItem: IGetProjectMainContractorDto | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<CreateProjectMainContractorCommand>();

  contractorForm!: FormGroup;
  isSubmitting = signal(false);

  get isEditMode(): boolean {
    return !!this.editItem;
  }

  get dialogHeader(): string {
    return this.isEditMode 
      ? this.translate.instant('dialogs.contractor.editTitle')
      : this.translate.instant('dialogs.contractor.addTitle');
  }

  /** Dynamic contractor options received from the parent */
  @Input() contractorOptions: { label: string; value: number }[] = [];

  constructor(private fb: FormBuilder, private messageService: MessageService, private translate: TranslateService) { }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.initForm();
    }
  }

  private initForm(): void {
    if (!this.contractorForm) {
      this.contractorForm = this.fb.group({
        constructorId: [null, Validators.required],
        amount: [null, [Validators.required, Validators.min(0)]],
        startDate: [null, Validators.required],
        endDate: [null, Validators.required]
      });
    }

    if (this.isEditMode && this.editItem) {
      this.contractorForm.patchValue({
        constructorId: this.editItem.constructorId,
        amount: this.editItem.amount,
        startDate: this.editItem.startDate ? new Date(this.editItem.startDate) : null,
        endDate: this.editItem.endDate ? new Date(this.editItem.endDate) : null
      });
    } else {
      this.contractorForm.reset();
    }
  }

  onHide(): void {
    this.visibleChange.emit(false);
    this.contractorForm.reset();
    this.isSubmitting.set(false);
  }

  onSubmit(): void {
    if (this.contractorForm.invalid) {
      Object.keys(this.contractorForm.controls).forEach(key => {
        const control = this.contractorForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    const { constructorId, amount, startDate, endDate } = this.contractorForm.value;

    const command = new CreateProjectMainContractorCommand({
      id: this.isEditMode ? this.editItem!.id : undefined,
      projectStageId: this.projectStageId,
      constructorId,
      amount,
      startDate,
      endDate
    });

    this.isSubmitting.set(true);
    this.saved.emit(command);
  }

  finishSubmit(): void {
    this.isSubmitting.set(false);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.contractorForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }
}
