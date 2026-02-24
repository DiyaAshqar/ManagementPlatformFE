import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { MessageService } from 'primeng/api';
import { CreateProjectBOQCommand, IGetProjectBOQDto } from '../../../../../../nswag/api-client';

@Component({
    selector: 'app-add-boq-dialog',
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
        FloatLabelModule
    ],
    templateUrl: './add-boq-dialog.component.html',
    styleUrls: ['./add-boq-dialog.component.scss']
})
export class AddBoqDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Input() projectStageId!: number;
    /** When provided the dialog switches to edit mode */
    @Input() editItem: IGetProjectBOQDto | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<CreateProjectBOQCommand>();

    boqForm!: FormGroup;
    isSubmitting = signal(false);

    get isEditMode(): boolean {
        return !!this.editItem;
    }

    get dialogHeader(): string {
        return this.isEditMode ? 'Edit BoQ Item' : 'Add BoQ Item';
    }

    get computedSubTotal(): number {
        const qty = this.boqForm?.get('actualQuantity')?.value ?? 0;
        const price = this.boqForm?.get('price')?.value ?? 0;
        return qty * price;
    }

    /** Dynamic lookup options received from the parent (boq-tab) */
    @Input() unitOptions: { label: string; value: number }[] = [];
    @Input() materialOptions: { label: string; value: number }[] = [];
    @Input() constructorOptions: { label: string; value: number }[] = [];

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
        if (!this.boqForm) {
            this.boqForm = this.fb.group({
                materialId: [null, Validators.required],
                description: ['', Validators.required],
                unitId: [null, Validators.required],
                constructorId: [null, Validators.required],
                actualQuantity: [null, [Validators.required, Validators.min(0.01)]],
                price: [null, [Validators.required, Validators.min(0)]]
            });
        }

        if (this.isEditMode && this.editItem) {
            this.boqForm.patchValue({
                materialId: this.editItem.materialId,
                description: this.editItem.description,
                unitId: this.editItem.unitId,
                constructorId: this.editItem.constructorId,
                actualQuantity: this.editItem.actualQuantity,
                price: this.editItem.price
            });
        } else {
            this.boqForm.reset();
        }
    }

    onHide(): void {
        this.visibleChange.emit(false);
        this.boqForm.reset();
        this.isSubmitting.set(false);
    }

    onSubmit(): void {
        if (this.boqForm.invalid) {
            Object.keys(this.boqForm.controls).forEach(key => {
                const control = this.boqForm.get(key);
                control?.markAsTouched();
            });
            return;
        }

        const { materialId, description, unitId, constructorId, actualQuantity, price } = this.boqForm.value;
        const subTotal = actualQuantity * price;

        const command = new CreateProjectBOQCommand({
            id: this.isEditMode ? this.editItem!.id : undefined,
            projectStageId: this.projectStageId,
            materialId,
            unitId,
            constructorId,
            price,
            actualQuantity,
            description,
            subTotal
        });

        this.isSubmitting.set(true);
        this.saved.emit(command);
    }

    finishSubmit(): void {
        this.isSubmitting.set(false);
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.boqForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }
}
