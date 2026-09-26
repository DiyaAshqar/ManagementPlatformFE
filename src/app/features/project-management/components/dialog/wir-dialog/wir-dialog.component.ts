import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import {
  CreateProjectWirChecklistItemModel,
  CreateProjectWirCommand,
  GetProjectWirDto,
  WirChecklistItemStatus,
  WirStatus,
} from '../../../../../../nswag/api-client';
import { WirApiService } from '../../../services/wir-api.service';

export interface WirOption<T = number> {
  label: string;
  value: T;
}

/** Status → PrimeNG tag severity, shared with the WIR list. */
export const WIR_STATUS_SEVERITY: Record<WirStatus, 'secondary' | 'info' | 'success' | 'danger' | 'contrast'> = {
  [WirStatus.Draft]: 'secondary',
  [WirStatus.Submitted]: 'info',
  [WirStatus.Approved]: 'success',
  [WirStatus.Rejected]: 'danger',
  [WirStatus.Archived]: 'contrast',
};

export const WIR_ITEM_STATUS_SEVERITY: Record<WirChecklistItemStatus, 'success' | 'warn' | 'danger'> = {
  [WirChecklistItemStatus.Approved]: 'success',
  [WirChecklistItemStatus.ApprovedWithComment]: 'warn',
  [WirChecklistItemStatus.Rejected]: 'danger',
};

/**
 * Work Inspection Request — master/details form.
 * Master: WIR No, date, drawing ref, revision, final status, location…
 * Details: checklist item (catalog dropdown) + status + inspector comment.
 */
@Component({
  selector: 'app-wir-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  templateUrl: './wir-dialog.component.html',
  styleUrls: ['./wir-dialog.component.scss'],
})
export class WirDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input({ required: true }) projectStageId!: number;
  /** WIR id to edit/view; null = create. */
  @Input() wirId: number | null = null;
  @Input() readonly = false;
  @Input() constructorOptions: WirOption[] = [];
  @Input() userOptions: WirOption[] = [];
  @Input() checklistOptions: WirOption[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<number>();

  private readonly fb = inject(FormBuilder);
  private readonly wirApi = inject(WirApiService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly revisionNo = signal(0);

  readonly statusOptions: WirOption<WirStatus>[] = Object.values(WirStatus).map((value) => ({
    label: `projectTabs.wir.status.${value}`,
    value,
  }));
  readonly itemStatusOptions: WirOption<WirChecklistItemStatus>[] = Object.values(WirChecklistItemStatus).map((value) => ({
    label: `projectTabs.wir.itemStatus.${value}`,
    value,
  }));
  itemSeverity(status: WirChecklistItemStatus): 'success' | 'warn' | 'danger' {
    return WIR_ITEM_STATUS_SEVERITY[status];
  }

  form: FormGroup = this.buildForm();

  get items(): FormArray<FormGroup> {
    return this.form.get('checklistItems') as FormArray<FormGroup>;
  }

  get headerKey(): string {
    if (this.readonly) return 'projectTabs.wir.viewTitle';
    return this.wirId ? 'projectTabs.wir.editTitle' : 'projectTabs.wir.addTitle';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['wirId']) && this.visible) {
      this.form = this.buildForm();
      this.revisionNo.set(0);
      if (this.wirId) {
        this.load(this.wirId);
      }
      this.readonly ? this.form.disable() : this.form.enable();
    }
  }

  // ── Details rows ───────────────────────────────────────────────────────────

  addItem(): void {
    this.items.push(this.buildItem());
  }

  /** Adds every catalog item that is not already on the WIR (quick start from the Excel checklist). */
  addAllCatalogItems(): void {
    const used = new Set(this.items.controls.map((c) => c.get('wirChecklistItemId')?.value));
    this.checklistOptions.filter((o) => !used.has(o.value)).forEach((o) => this.items.push(this.buildItem({ wirChecklistItemId: o.value })));
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  /** Hides catalog items already chosen on other rows. */
  availableChecklistOptions(rowIndex: number): WirOption[] {
    const used = new Set(
      this.items.controls.filter((_, i) => i !== rowIndex).map((c) => c.get('wirChecklistItemId')?.value)
    );
    return this.checklistOptions.filter((o) => !used.has(o.value));
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const status: WirStatus = v.status;
    const today = new Date();
    const command = new CreateProjectWirCommand({
      id: this.wirId ?? 0,
      projectStageId: this.projectStageId,
      wirNo: v.wirNo,
      title: v.title,
      description: v.description || undefined,
      constructorId: v.constructorId ?? undefined,
      disciplineCode: v.disciplineCode || undefined,
      drawingReference: v.drawingReference || undefined,
      levelName: v.levelName || undefined,
      zoneName: v.zoneName || undefined,
      gridReference: v.gridReference || undefined,
      x_AXIS: v.xAxis || undefined,
      y_AXIS: v.yAxis || undefined,
      requestedBy: v.requestedBy ?? undefined,
      assignedTo: v.assignedTo ?? undefined,
      inspectionDate: this.toUtcDate(v.inspectionDate),
      status,
      submittedDate: this.toUtcDate(v.submittedDate) ?? (status === WirStatus.Submitted ? this.toUtcDate(today) : undefined),
      approvedDate: this.toUtcDate(v.approvedDate) ?? (status === WirStatus.Approved ? this.toUtcDate(today) : undefined),
      rejectedDate: this.toUtcDate(v.rejectedDate) ?? (status === WirStatus.Rejected ? this.toUtcDate(today) : undefined),
      revisionNo: this.revisionNo(),
      checklistItems: v.checklistItems.map(
        (item: any, index: number) =>
          new CreateProjectWirChecklistItemModel({
            id: item.id || 0,
            wirChecklistItemId: item.wirChecklistItemId,
            checklistItem: this.checklistOptions.find((o) => o.value === item.wirChecklistItemId)?.label,
            displayOrder: index + 1,
            status: item.status,
            inspectorComment: item.inspectorComment || undefined,
          })
      ),
    });

    this.isSaving.set(true);
    this.wirApi.createOrUpdate(command).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.succeeded) {
          this.saved.emit(res.data ?? this.wirId ?? 0);
          this.close();
        }
      },
      error: () => this.isSaving.set(false),
    });
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private load(id: number): void {
    this.isLoading.set(true);
    this.wirApi.getById(id).subscribe({
      next: (res) => {
        if (res.succeeded && res.data) this.patch(res.data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private patch(dto: GetProjectWirDto): void {
    this.revisionNo.set(dto.revisionNo ?? 0);
    this.form.patchValue({
      wirNo: dto.wirNo ?? '',
      title: dto.title ?? '',
      description: dto.description ?? '',
      constructorId: dto.constructorId ?? null,
      disciplineCode: dto.disciplineCode ?? '',
      drawingReference: dto.drawingReference ?? '',
      levelName: dto.levelName ?? '',
      zoneName: dto.zoneName ?? '',
      gridReference: dto.gridReference ?? '',
      xAxis: dto.x_AXIS ?? '',
      yAxis: dto.y_AXIS ?? '',
      requestedBy: dto.requestedBy ?? null,
      assignedTo: dto.assignedTo ?? null,
      inspectionDate: this.toLocalDate(dto.inspectionDate),
      status: dto.status ?? WirStatus.Draft,
      submittedDate: this.toLocalDate(dto.submittedDate),
      approvedDate: this.toLocalDate(dto.approvedDate),
      rejectedDate: this.toLocalDate(dto.rejectedDate),
    });
    this.items.clear();
    [...(dto.checklistItems ?? [])]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .forEach((item) =>
        this.items.push(
          this.buildItem({
            id: item.id ?? 0,
            wirChecklistItemId: item.wirChecklistItemId ?? null,
            status: item.status ?? WirChecklistItemStatus.Approved,
            inspectorComment: item.inspectorComment ?? '',
          })
        )
      );
    if (this.readonly) this.form.disable();
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      wirNo: ['', [Validators.required, Validators.maxLength(50)]],
      title: ['', [Validators.required, Validators.maxLength(250)]],
      description: [''],
      constructorId: [null as number | null],
      disciplineCode: [''],
      drawingReference: [''],
      levelName: [''],
      zoneName: [''],
      gridReference: [''],
      xAxis: [''],
      yAxis: [''],
      requestedBy: [null as number | null],
      assignedTo: [null as number | null],
      inspectionDate: [new Date() as Date | null, Validators.required],
      status: [WirStatus.Draft as WirStatus, Validators.required],
      submittedDate: [null as Date | null],
      approvedDate: [null as Date | null],
      rejectedDate: [null as Date | null],
      checklistItems: this.fb.array<FormGroup>([]),
    });
  }

  private buildItem(value?: Partial<{ id: number; wirChecklistItemId: number | null; status: WirChecklistItemStatus; inspectorComment: string }>): FormGroup {
    return this.fb.group({
      id: [value?.id ?? 0],
      wirChecklistItemId: [value?.wirChecklistItemId ?? null, Validators.required],
      status: [value?.status ?? WirChecklistItemStatus.Approved, Validators.required],
      inspectorComment: [value?.inspectorComment ?? ''],
    });
  }

  /** Send the picked calendar day as UTC midnight so toISOString() does not shift it a day back. */
  private toUtcDate(value: Date | null | undefined): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  private toLocalDate(value: Date | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime()) || d.getUTCFullYear() < 1900) return null;
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
}
