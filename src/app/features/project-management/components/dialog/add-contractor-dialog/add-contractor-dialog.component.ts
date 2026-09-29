import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';

import {
  ClassificationProjectMainContractor,
  ConstructorClient,
  CreateProjectMainContractorCommand,
  IGetProjectMainContractorDto
} from '../../../../../../nswag/api-client';
import { NumberInputComponent } from '../../../../../shared/components/number-input/number-input.component';

@Component({
  selector: 'app-add-contractor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    SelectModule,
    FloatLabelModule,
    CalendarModule,
    NumberInputComponent
  ],
  providers: [ConstructorClient],
  templateUrl: './add-contractor-dialog.component.html',
  styleUrls: ['./add-contractor-dialog.component.scss']
})
export class AddContractorDialogComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() projectStageId!: number;
  @Input() editItem: IGetProjectMainContractorDto | null = null;
  @Input() contractorTypeOptions: { label: string; value: number }[] = [];

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<CreateProjectMainContractorCommand>();

  contractorForm!: FormGroup;
  isSubmitting = signal(false);
  isLoadingContractors = signal(false);
  contractorOptions: { label: string; value: number }[] = [];

  get classificationOptions(): { label: string; value: ClassificationProjectMainContractor | 0 }[] {
    const options: { label: string; value: ClassificationProjectMainContractor | 0 }[] = [
      {
        label: this.translate.instant('dialogs.contractor.classificationMain'),
        value: ClassificationProjectMainContractor.MainContractor
      },
      {
        label: this.translate.instant('dialogs.contractor.classificationSub'),
        value: ClassificationProjectMainContractor.SubContractor
      }
    ];

    // Older records can contain the enum's default value (0). Keep it visible
    // while editing, without offering it when a new contractor is created.
    if (Number(this.editItem?.classification) === 0) {
      options.unshift({
        label: this.translate.instant('dialogs.contractor.classificationUnclassified'),
        value: 0
      });
    }

    return options;
  }

  private destroy$ = new Subject<void>();

  get isEditMode(): boolean {
    return !!this.editItem;
  }

  get dialogHeader(): string {
    return this.isEditMode
      ? this.translate.instant('dialogs.contractor.editTitle')
      : this.translate.instant('dialogs.contractor.addTitle');
  }

  constructor(
    private fb: FormBuilder,
    private constructorClient: ConstructorClient,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // On the first render, ngOnChanges runs before ngOnInit. Let ngOnInit do
    // that initial setup so the edit lookups are requested only once.
    if (changes['visible'] && this.visible && this.contractorForm) {
      this.initForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.destroy$.next();
    this.contractorOptions = [];

    if (!this.contractorForm) {
      this.contractorForm = this.fb.group({
        mainContractorTypeId: [null, Validators.required],
        constructorId: [null, Validators.required],
        classification: [null, Validators.required],
        amount: [null, [Validators.required, Validators.min(0)]],
        startDate: [null, Validators.required],
        endDate: [null, Validators.required]
      });
    }

    this.contractorForm.get('mainContractorTypeId')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(typeId => {
        this.contractorOptions = [];
        this.contractorForm.get('constructorId')!.reset(null);
        if (typeId) {
          this.loadContractorsByType(typeId);
        }
      });

    if (this.isEditMode && this.editItem) {
      this.contractorForm.patchValue({
        amount: this.editItem.amount,
        classification: this.editItem.classification ?? null,
        startDate: this.editItem.startDate ? new Date(this.editItem.startDate) : null,
        endDate: this.editItem.endDate ? new Date(this.editItem.endDate) : null
      });
      // Resolve the type from the constructor, then load its peers
      if (this.editItem.constructorId) {
        this.isLoadingContractors.set(true);
        this.constructorClient.getById(this.editItem.constructorId).subscribe({
          next: (res) => {
            const typeId = res.data?.mainContractorTypeId ?? null;
            this.contractorForm.get('mainContractorTypeId')!.setValue(typeId, { emitEvent: false });
            if (typeId) {
              this.loadContractorsByType(typeId, this.editItem!.constructorId);
            } else {
              this.isLoadingContractors.set(false);
            }
          },
          error: () => this.isLoadingContractors.set(false)
        });
      }
    } else {
      this.contractorForm.reset();
    }
  }

  private loadContractorsByType(typeId: number, preselectId?: number): void {
    this.isLoadingContractors.set(true);
    this.constructorClient.getByTypeId(typeId, 1, 1000, undefined).subscribe({
      next: (res) => {
        const data = res.data?.data ?? [];
        this.contractorOptions = data
          .filter(c => c.id != null && c.name)
          .map(c => ({ label: c.name!, value: c.id! }));
        if (preselectId) {
          this.contractorForm.get('constructorId')!.setValue(preselectId, { emitEvent: false });
        }
        this.isLoadingContractors.set(false);
      },
      error: () => this.isLoadingContractors.set(false)
    });
  }

  onHide(): void {
    this.visibleChange.emit(false);
    this.contractorForm.reset();
    this.contractorOptions = [];
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

    const { mainContractorTypeId, constructorId, classification, amount, startDate, endDate } = this.contractorForm.value;

    const command = new CreateProjectMainContractorCommand({
      id: this.isEditMode ? this.editItem!.id : undefined,
      projectStageId: this.projectStageId,
      constructorId,
      contractorTypeId: mainContractorTypeId,
      amount,
      totalPayments: this.isEditMode ? this.editItem!.totalPayments : undefined,
      startDate,
      endDate,
      classification
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
