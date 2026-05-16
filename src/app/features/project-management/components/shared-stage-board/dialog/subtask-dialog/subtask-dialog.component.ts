import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { SubtaskApiService } from '../../../../services/subtask-api.service';
import { SubtaskService } from '../../../../services/subtask.service';

export interface SubTaskFormData {
  id?: number;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  status: 'completed' | 'in-progress' | 'pending';
  type: string;
  cost: string;
  quantity: string;
}

@Component({
  selector: 'app-subtask-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    CalendarModule,
    TooltipModule
  ],
  templateUrl: './subtask-dialog.component.html',
  styleUrls: ['./subtask-dialog.component.scss']
})
export class SubtaskDialogComponent implements OnInit {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private subtaskApiService = inject(SubtaskApiService);
  private subtaskService = inject(SubtaskService);

  formData = signal<SubTaskFormData>({
    title: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    type: '',
    cost: '',
    quantity: ''
  });

  isLoading = signal(false);
  projectStageTaskId?: number;

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' }
  ];

  ngOnInit(): void {
    const data = this.config.data;
    
    // Get projectStageTaskId from config
    if (data && data.projectStageTaskId) {
      this.projectStageTaskId = data.projectStageTaskId;
    }

    // Load existing subtask data if editing
    if (data && data.subtask) {
      if (data.subtask.id) {
        this.loadSubTask(data.subtask.id);
      } else {
        this.formData.set({ ...data.subtask });
      }
    }
  }

  loadSubTask(id: number): void {
    this.isLoading.set(true);
    this.subtaskApiService.getSubTask(id).subscribe({
      next: (dto) => {
        if (dto) {
          const formData = this.subtaskService.mapToFormData(dto);
          this.formData.set(formData);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading subtask:', error);
        this.isLoading.set(false);
      }
    });
  }

  onSave(): void {
    const data = this.formData();
    
    // Validation
    if (!data.title?.trim()) {
      return;
    }

    if (!this.projectStageTaskId && !data.id) {
      return;
    }

    this.isLoading.set(true);

    // Convert form data to API command
    const command = this.subtaskService.mapToCreateCommand(
      data, 
      this.projectStageTaskId!
    );

    // Call API to create/update subtask
    this.subtaskApiService.createSubTask(command).subscribe({
      next: (success) => {
        this.isLoading.set(false);
        if (success) {
          this.dialogRef.close({ success: true, data });
        }
      },
      error: (error) => {
        console.error('Error saving subtask:', error);
        this.isLoading.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get currentFormData(): SubTaskFormData {
    return this.formData();
  }

  updateFormField(field: keyof SubTaskFormData, value: any): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }
}
