import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

export interface SubTaskFormData {
  id?: string;
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

  formData = signal<SubTaskFormData>({
    title: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    type: '',
    cost: '',
    quantity: ''
  });

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' }
  ];

  ngOnInit(): void {
    const data = this.config.data;
    if (data && data.subtask) {
      this.formData.set({ ...data.subtask });
    }
  }

  onSave(): void {
    const data = this.formData();
    if (!data.title) return;
    
    this.dialogRef.close(data);
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
