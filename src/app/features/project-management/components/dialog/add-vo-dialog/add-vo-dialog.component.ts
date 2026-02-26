import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { MessageService } from 'primeng/api';
import { CreateProjectVOCommand, IGetProjectVODto } from '../../../../../../nswag/api-client';

@Component({
    selector: 'app-add-vo-dialog',
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
        CheckboxModule,
        DatePickerModule
    ],
    templateUrl: './add-vo-dialog.component.html',
    styleUrls: ['./add-vo-dialog.component.scss']
})
export class AddVoDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Input() projectStageId!: number;
    /** When provided the dialog switches to edit mode */
    @Input() editItem: IGetProjectVODto | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<CreateProjectVOCommand>();

    voForm!: FormGroup;
    isSubmitting = signal(false);

    // Status options
    statusOptions = [
        { label: 'Approved', value: 'Approved' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Rejected', value: 'Rejected' }
    ];

    get isEditMode(): boolean {
        return !!this.editItem;
    }

    get dialogHeader(): string {
        return this.isEditMode ? 'Edit Voucher Order' : 'Create Voucher Order';
    }

    get computedSubTotal(): number {
        const price = this.voForm?.get('price')?.value ?? 0;
        const quantity = this.voForm?.get('quantity')?.value ?? 0;
        return price * quantity;
    }

    get isEffectedValue(): boolean {
        return this.voForm?.get('isEffected')?.value ?? false;
    }

    /** Dynamic lookup options received from the parent (voucher-orders-tab) */
    @Input() unitOptions: { label: string; value: number }[] = [];

    constructor(private fb: FormBuilder, private messageService: MessageService) { }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.initForm();
        }
    }

    private initForm(): void {
        if (!this.voForm) {
            this.voForm = this.fb.group({
                voNumber: ['', Validators.required],
                item: ['', Validators.required],
                description: ['', Validators.required],
                quantity: [null, [Validators.required, Validators.min(0)]],
                unitId: [null, Validators.required],
                price: [null, [Validators.required, Validators.min(0)]],
                isEffected: [false],
                effectedDateStart: [null],
                effectedDateEnd: [null],
                status: [2, Validators.required] // Default to Pending
            });
        }

        if (this.isEditMode && this.editItem) {
            this.voForm.patchValue({
                voNumber: this.editItem.voNumber,
                item: this.editItem.item,
                description: this.editItem.description,
                quantity: this.editItem.quantity,
                unitId: this.editItem.unitId,
                price: this.editItem.price,
                isEffected: this.editItem.isEffected,
                effectedDateStart: this.editItem.effectedDateStart,
                effectedDateEnd: this.editItem.effectedDateEnd,
                status: this.editItem.status ?? 'Pending'
            });
        } else {
            this.voForm.reset({
                isEffected: false,
                status: 'Pending' // Default to Pending for new VOs
            });
        }

        // Add validators for effected dates when isEffected is true
        this.voForm.get('isEffected')?.valueChanges.subscribe(isEffected => {
            const dateStartControl = this.voForm.get('effectedDateStart');
            const dateEndControl = this.voForm.get('effectedDateEnd');

            if (isEffected) {
                dateStartControl?.setValidators([Validators.required]);
                dateEndControl?.setValidators([Validators.required]);
            } else {
                dateStartControl?.clearValidators();
                dateEndControl?.clearValidators();
                dateStartControl?.setValue(null);
                dateEndControl?.setValue(null);
            }

            dateStartControl?.updateValueAndValidity();
            dateEndControl?.updateValueAndValidity();
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
        this.voForm.reset({
            isEffected: false,
            status: 'Pending' // Reset to Pending
        });
        this.isSubmitting.set(false);
    }

    onSubmit(): void {
        if (this.voForm.invalid) {
            Object.keys(this.voForm.controls).forEach(key => {
                const control = this.voForm.get(key);
                control?.markAsTouched();
            });
            return;
        }

        const { voNumber, item, description, quantity, unitId, price, isEffected, effectedDateStart, effectedDateEnd, status } = this.voForm.value;
        const subTotal = this.computedSubTotal;

        const command = new CreateProjectVOCommand({
            id: this.isEditMode ? this.editItem!.id : undefined,
            projectStageId: this.projectStageId,
            voNumber,
            item,
            description,
            quantity,
            unitId,
            price,
            subTotal,
            isEffected,
            effectedDateStart: isEffected ? effectedDateStart : undefined,
            effectedDateEnd: isEffected ? effectedDateEnd : undefined,
            status
        });

        this.isSubmitting.set(true);
        this.saved.emit(command);
    }

    finishSubmit(): void {
        this.isSubmitting.set(false);
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.voForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }
}
