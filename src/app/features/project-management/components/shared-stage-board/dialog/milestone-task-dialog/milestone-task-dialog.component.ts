import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectFilterEvent, SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { catchError, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { AttachmentType, ConstructorClient, ICreateTaskCommand, LookupClient, LookupType, SupplierClient } from '../../../../../../../nswag/api-client';
import { DocumentsTableComponent } from '../../../../../../shared/components/documents-table/documents-table.component';
import { TaskService } from '../../../../services/task.service';

export interface MilestoneTaskFormData extends ICreateTaskCommand {
  type?: string;
  backendTaskId?: number;
  dutyResponsibilityId?: number;
  constructorId?: number;
  supplierId?: number;
}

@Component({
  selector: 'app-milestone-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ButtonModule,
    DatePickerModule,
    DocumentsTableComponent
  ],
  templateUrl: './milestone-task-dialog.component.html',
  styleUrls: ['./milestone-task-dialog.component.scss']
})
export class MilestoneTaskDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private taskService = inject(TaskService);
  private lookupClient = inject(LookupClient);
  private constructorClient = inject(ConstructorClient);
  private supplierClient = inject(SupplierClient);

  readonly taskAttachmentType = AttachmentType.Task;

  isLoadingTaskTypes = signal(false);
  isLoadingSuppliers = signal(false);

  // Excavation fields are only relevant for the Excavation stage
  shouldShowExcavationFields = signal(false);

  formData = signal<MilestoneTaskFormData>({
    title: '',
    type: 'Task',
    backendTaskId: undefined,
    taskTypeId: undefined,
    priority: undefined,
    assignTo: undefined,
    taskPoint: undefined,
    description: '',
    startDate: undefined,
    endDate: undefined,
    excavationLocation: '',
    excavationDepth: undefined,
    excavationVolume: undefined,
    excavationSoilType: '',
    excavationEquipment: '',
    status: undefined,
    projectStageId: undefined,
    dutyResponsibilityId: undefined,
    constructorId: undefined,
    supplierId: undefined
  });

  workItemTypes: { label: string; value: string }[] = [];
  responsibilityOptions: { label: string; value: number }[] = [];
  mainContractorOptions: { label: string; value: number }[] = [];
  supplierOptions: { label: string; value: number }[] = [];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  private taskTypeMap = new Map<string, number>();
  private supplierFilter$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    const data = this.config.data;

    if (data?.projectStageId !== undefined) {
      this.updateFormField('projectStageId', data.projectStageId);
    }

    this.shouldShowExcavationFields.set(!!data?.showExcavationFields);

    this.loadTaskTypes();
    this.loadResponsibilities();
    this.loadMainContractors();
    this.initializeSupplierSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get currentFormData(): MilestoneTaskFormData {
    return this.formData();
  }

  updateFormField(field: string, value: any): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  private loadTaskTypes(): void {
    this.isLoadingTaskTypes.set(true);

    this.taskService.getTaskTypes(1, 100).subscribe({
      next: (response) => {
        if (response.succeeded && response.data?.data) {
          this.taskTypeMap.clear();

          this.workItemTypes = response.data.data.map(type => {
            const name = type.name || '';
            const id = type.id || 0;
            this.taskTypeMap.set(name, id);
            return { label: name, value: name };
          });

          if (this.workItemTypes.length > 0) {
            const defaultType = this.workItemTypes[0].value;
            this.updateFormField('type', defaultType);
            this.updateFormField('taskTypeId', this.taskTypeMap.get(defaultType));
          }
        }
        this.isLoadingTaskTypes.set(false);
      },
      error: () => this.isLoadingTaskTypes.set(false)
    });
  }

  private loadResponsibilities(): void {
    this.lookupClient.getAllLookups([LookupType.DutyResponsibility]).subscribe({
      next: (response) => {
        const data = response.data?.[LookupType.DutyResponsibility] ?? [];
        this.responsibilityOptions = data
          .filter(item => item.id != null && item.name)
          .map(item => ({ label: item.name!, value: item.id! }));
      }
    });
  }

  private loadMainContractors(): void {
    this.constructorClient.getAll(1, 200, undefined).subscribe({
      next: (response) => {
        const data = response.data?.data ?? [];
        this.mainContractorOptions = data
          .filter(item => item.id != null && item.name)
          .map(item => ({ label: item.name!, value: item.id! }));
      }
    });
  }

  private initializeSupplierSearch(): void {
    this.supplierFilter$
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(filter => {
          this.isLoadingSuppliers.set(true);
          return this.supplierClient.getAllSuppliers(1, 100, filter || undefined).pipe(
            catchError(error => {
              console.error('Error loading suppliers:', error);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        const data = response?.data?.data ?? [];
        this.supplierOptions = data
          .filter(item => item.id != null && item.name)
          .map(item => ({ label: item.name!, value: item.id! }));
        this.isLoadingSuppliers.set(false);
      });
  }

  onSupplierFilter(event: SelectFilterEvent): void {
    this.supplierFilter$.next((event.filter || '').trim());
  }

  onTaskTypeChange(typeName: string): void {
    this.updateFormField('type', typeName);
    this.updateFormField('taskTypeId', this.taskTypeMap.get(typeName));
  }

  onSave(): void {
    const data = this.formData();

    if (!data.title) {
      return;
    }

    const dataToSave = {
      ...data,
      startDate: this.formatDateForApi(data.startDate),
      endDate: this.formatDateForApi(data.endDate)
    };

    this.dialogRef.close(dataToSave);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Format date for API using date-fns.
   * Formats date as ISO string without timezone conversion.
   */
  private formatDateForApi(date: any): string | undefined {
    if (!date) return undefined;

    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return undefined;

      return format(d, "yyyy-MM-dd'T'HH:mm:ss");
    } catch (error) {
      return undefined;
    }
  }
}
