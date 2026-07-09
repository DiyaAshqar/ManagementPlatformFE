import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectFilterEvent, SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs/operators';
import {
  AttachmentType,
  ConstructorClient,
  ICreateTaskCommand,
  ProjectMainContractorClient,
  Responsibility,
  SupplierClient,
  UsersClient
} from '../../../../../../../nswag/api-client';
import { DocumentsTableComponent } from '../../../../../../shared/components/documents-table/documents-table.component';
import { TaskService } from '../../../../services/task.service';

export interface MilestoneTaskFormData extends ICreateTaskCommand {
  type?: string;
  backendTaskId?: number;
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
    InputNumberModule,
    DatePickerModule,
    DocumentsTableComponent
  ],
  providers: [ConstructorClient, ProjectMainContractorClient, SupplierClient, UsersClient],
  templateUrl: './milestone-task-dialog.component.html',
  styleUrls: ['./milestone-task-dialog.component.scss']
})
export class MilestoneTaskDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private taskService = inject(TaskService);
  private constructorClient = inject(ConstructorClient);
  private projectMainContractorClient = inject(ProjectMainContractorClient);
  private supplierClient = inject(SupplierClient);
  private usersClient = inject(UsersClient);

  readonly taskAttachmentType = AttachmentType.Task;

  isLoadingTaskTypes = signal(false);
  isLoadingUsers = signal(false);
  isLoadingMainContractors = signal(false);
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
    responsibility: undefined,
    projectMainContractorId: undefined,
    supplierId: undefined
  });

  workItemTypes: { label: string; value: string }[] = [];
  userOptions: { label: string; value: number }[] = [];
  responsibilityOptions: { label: string; value: Responsibility }[] = [
    { label: 'Internal', value: Responsibility.Internal },
    { label: 'Contractor', value: Responsibility.Contractor },
    { label: 'Supplier', value: Responsibility.Supplier },
    { label: 'Client', value: Responsibility.Client },
    { label: 'Consultant', value: Responsibility.Consultant }
  ];
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

    if (data?.workItem) {
      this.formData.update(current => ({
        ...current,
        ...data.workItem
      }));
    }

    if (data?.projectStageId !== undefined) {
      this.updateFormField('projectStageId', data.projectStageId);
    }

    this.shouldShowExcavationFields.set(!!data?.showExcavationFields);

    this.loadTaskTypes();
    this.loadUsers();
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
            const currentData = this.formData();
            const selectedType = response.data.data.find(type => type.id === currentData.taskTypeId);
            const typeName = selectedType?.name
              || (currentData.type && this.taskTypeMap.has(currentData.type) ? currentData.type : undefined)
              || this.workItemTypes[0].value;

            this.updateFormField('type', typeName);
            this.updateFormField('taskTypeId', selectedType?.id ?? this.taskTypeMap.get(typeName));
          }
        }
        this.isLoadingTaskTypes.set(false);
      },
      error: () => this.isLoadingTaskTypes.set(false)
    });
  }

  private loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.usersClient.getAllUsers().subscribe({
      next: (response) => {
        this.userOptions = (response.data ?? [])
          .filter(user => user.id != null)
          .map(user => ({
            label: user.fullName || user.arabicFullName || user.email || `User ${user.id}`,
            value: user.id!
          }));
        this.isLoadingUsers.set(false);
      },
      error: () => this.isLoadingUsers.set(false)
    });
  }

  private loadMainContractors(): void {
    const stageId = this.formData().projectStageId;
    if (stageId == null) return;

    this.isLoadingMainContractors.set(true);
    forkJoin({
      projectContractors: this.projectMainContractorClient.getByStageId(stageId, 1, 200, undefined),
      constructors: this.constructorClient.getAll(1, 1000, undefined)
    }).subscribe({
      next: ({ projectContractors, constructors }) => {
        const constructorNames = new Map(
          (constructors.data?.data ?? [])
            .filter(item => item.id != null)
            .map(item => [item.id!, item.name || `Contractor ${item.id}`])
        );

        this.mainContractorOptions = (projectContractors.data?.data ?? [])
          .filter(item => item.id != null)
          .map(item => ({
            label: constructorNames.get(item.constructorId ?? 0) || `Contractor ${item.id}`,
            value: item.id!
          }));
        this.isLoadingMainContractors.set(false);
      },
      error: () => this.isLoadingMainContractors.set(false)
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
