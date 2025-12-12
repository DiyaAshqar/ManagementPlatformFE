import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { SubtaskService } from '../../../../services/subtask.service';
import { MessageService } from 'primeng/api';

export interface SubTaskFormData {
  id?: number;
  title: string;
  startDate: string;
  endDate: string;
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
    ButtonModule
  ],
  templateUrl: './subtask-dialog.component.html',
  styleUrls: ['./subtask-dialog.component.scss']
})
export class SubtaskDialogComponent implements OnInit {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private subtaskService = inject(SubtaskService);
  private messageService = inject(MessageService);

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
    console.log('🔍 Subtask Dialog - ngOnInit - Full config data:', data);
    console.log('🔍 Subtask Dialog - ngOnInit - projectStageTaskId:', data?.projectStageTaskId);
    
    // Get projectStageTaskId from config
    if (data && data.projectStageTaskId) {
      this.projectStageTaskId = data.projectStageTaskId;
      console.log('✅ Subtask Dialog - projectStageTaskId SET:', this.projectStageTaskId);
    } else {
      console.warn('⚠️ Subtask Dialog - projectStageTaskId is MISSING in config.data');
    }

    // Load existing subtask data if editing
    if (data && data.subtask) {
      console.log('🔍 Subtask Dialog - subtask data:', data.subtask);
      if (data.subtask.id) {
        this.loadSubTask(data.subtask.id);
      } else {
        this.formData.set({ ...data.subtask });
      }
    }
  }

  loadSubTask(id: number): void {
    this.isLoading.set(true);
    this.subtaskService.getSubTask(id).subscribe({
      next: (dto) => {
        if (dto) {
          const formData = this.subtaskService.mapToFormData(dto);
          this.formData.set(formData);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading subtask:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load subtask data'
        });
        this.isLoading.set(false);
      }
    });
  }

  onSave(): void {
    const data = this.formData();
    
    // Validation
    if (!data.title?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Title is required'
      });
      return;
    }

    console.log('🔍 Subtask Dialog - onSave - projectStageTaskId:', this.projectStageTaskId);
    console.log('🔍 Subtask Dialog - onSave - data.id:', data.id);
    console.log('🔍 Subtask Dialog - onSave - form data:', data);
    
    if (!this.projectStageTaskId && !data.id) {
      console.error('❌ Subtask Dialog - Validation FAILED: projectStageTaskId is missing');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Project stage task ID is missing'
      });
      return;
    }

    this.isLoading.set(true);
    console.log('🚀 Subtask Dialog - Creating API command...');

    // Convert form data to API command
    const command = this.subtaskService.mapToCreateCommand(
      data, 
      this.projectStageTaskId!
    );
    console.log('🔍 Subtask Dialog - API command:', command);

    // Call API to create/update subtask
    this.subtaskService.createSubTask(command).subscribe({
      next: (success) => {
        this.isLoading.set(false);
        if (success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: data.id ? 'Subtask updated successfully' : 'Subtask created successfully'
          });
          this.dialogRef.close({ success: true, data });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save subtask'
          });
        }
      },
      error: (error) => {
        console.error('Error saving subtask:', error);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to save subtask'
        });
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
