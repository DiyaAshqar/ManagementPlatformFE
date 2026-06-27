import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectFilterEvent, SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { MessageService } from 'primeng/api';
import { AttachmentType, CreateProjectPOCommand, IGetProjectPODto } from '../../../../../../nswag/api-client';
import { DocumentsTableComponent } from '../../../../../shared/components/documents-table/documents-table.component';

@Component({
    selector: 'app-add-po-dialog',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        InputNumberModule,
        SelectModule,
        FloatLabelModule,
        DocumentsTableComponent
    ],
    templateUrl: './add-po-dialog.component.html',
    styleUrls: ['./add-po-dialog.component.scss']
})
export class AddPoDialogComponent implements OnInit, OnChanges {
    @Input() visible = false;
    @Input() projectStageId!: number;
    /** When provided the dialog switches to edit mode */
    @Input() editItem: IGetProjectPODto | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<CreateProjectPOCommand>();
    @Output() supplierFilter = new EventEmitter<string>();

    poForm!: FormGroup;
    isSubmitting = signal(false);
    AttachmentType = AttachmentType;

    get statusOptions() {
        return [
            { label: this.translate.instant('projectTabs.po.statusApproved') || 'Approved', value: 1 },
            { label: this.translate.instant('projectTabs.po.statusPending') || 'Pending', value: 2 },
            { label: this.translate.instant('projectTabs.po.statusRejected') || 'Rejected', value: 3 }
        ];
    }

    get isEditMode(): boolean {
        return !!this.editItem;
    }

    get dialogHeader(): string {
        return this.isEditMode 
            ? this.translate.instant('dialogs.purchaseOrder.editTitle')
            : this.translate.instant('dialogs.purchaseOrder.addTitle');
    }

    get computedSubTotal(): number {
        const price = this.poForm?.get('price')?.value ?? 0;
        return price;
    }

    /** Dynamic lookup options received from the parent (purchase-orders-tab) */
    @Input() unitOptions: { label: string; value: number }[] = [];
    @Input() supplierOptions: { label: string; value: number }[] = [];
    @Input() supplierLoading = false;

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
        if (!this.poForm) {
            this.poForm = this.fb.group({
                poNumber: ['', Validators.required],
                supplierId: [null, Validators.required],
                description: ['', Validators.required],
                unitId: [null, Validators.required],
                price: [null, [Validators.required, Validators.min(0)]],
                status: [2, Validators.required] // Default to Pending
            });
        }

        if (this.isEditMode && this.editItem) {
            this.poForm.patchValue({
                poNumber: this.editItem.poNumber,
                supplierId: this.editItem.supplierId,
                description: this.editItem.description,
                unitId: this.editItem.unitId,
                price: this.editItem.price,
                status: this.editItem.status ?? 2
            });
        } else {
            this.poForm.reset({
                status: 2 // Default to Pending for new POs
            });
        }
    }

    onHide(): void {
        this.visibleChange.emit(false);
        this.poForm.reset({
            status: 2 // Reset to Pending
        });
        this.isSubmitting.set(false);
    }

    onSupplierFilter(event: SelectFilterEvent): void {
        this.supplierFilter.emit((event.filter || '').trim());
    }

    onSubmit(): void {
        if (this.poForm.invalid) {
            Object.keys(this.poForm.controls).forEach(key => {
                const control = this.poForm.get(key);
                control?.markAsTouched();
            });
            return;
        }

        const { poNumber, supplierId, description, unitId, price, status } = this.poForm.value;
        const subTotal = price;

        const command = new CreateProjectPOCommand({
            id: this.isEditMode ? this.editItem!.id : undefined,
            projectStageId: this.projectStageId,
            poNumber,
            supplierId,
            description,
            unitId,
            price,
            subTotal,
            status
        });

        this.isSubmitting.set(true);
        this.saved.emit(command);
    }

    finishSubmit(): void {
        this.isSubmitting.set(false);
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.poForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }
}
