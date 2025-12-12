import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { SubtaskDialogComponent } from '../../shared-stage-board/dialog/subtask-dialog/subtask-dialog.component';
import { SubTaskFormData } from '../subtask-dialog/subtask-dialog.component';

export interface SubTask {
  id: string | number;
  title: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'in-progress' | 'pending';
  type: string;
  cost: string;
  quantity: string;
}

export interface WorkItemFormData {
  id?: string;
  title: string;
  type: string;
  priority: string;
  assignTo: string;
  taskPoints: string;
  tags: string[];
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  depth: string;
  volume: string;
  soilType: string;
  equipment: string;
  status?: string;
  subtasks?: SubTask[];
}

@Component({
  selector: 'app-work-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule
  ],
  templateUrl: './work-item-dialog.component.html',
  styleUrls: ['./work-item-dialog.component.scss']
})
export class WorkItemDialogComponent implements OnInit {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private dialogService = inject(DialogService);

  subtasks = signal<SubTask[]>([]);

  formData = signal<WorkItemFormData>({
    title: '',
    type: 'Task',
    priority: 'medium',
    assignTo: '',
    taskPoints: '',
    tags: [],
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    depth: '',
    volume: '',
    soilType: '',
    equipment: '',
    subtasks: []
  });

  workItemTypes = [
    { label: 'User Story', value: 'User Story' },
    { label: 'Bug', value: 'Bug' },
    { label: 'Task', value: 'Task' },
    { label: 'Epic', value: 'Epic' },
    { label: 'Feature', value: 'Feature' }
  ];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  ngOnInit(): void {
    const data = this.config.data;
    if (data && data.workItem) {
      this.formData.set({ ...data.workItem });
      this.subtasks.set(data.workItem.subtasks || []);
    }
  }

  onSave(): void {
    const data = this.formData();
    if (!data.title) return;

    const dataWithSubtasks = {
      ...data,
      subtasks: this.subtasks()
    };

    this.dialogRef.close(dataWithSubtasks);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  get currentFormData(): WorkItemFormData {
    return this.formData();
  }

  updateFormField(field: keyof WorkItemFormData, value: any): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  openAddSubtaskDialog(): void {
    alert('openAddSubtaskDialog');
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Add Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'add',
        subtask: {
          title: '',
          startDate: '',
          endDate: '',
          status: 'pending',
          type: '',
          cost: '',
          quantity: ''
        },
        parentTaskTitle: this.formData().title
      }
    });

    dialogRef.onClose.subscribe((formData: SubTaskFormData) => {
      if (formData) {
        const subtask: SubTask = {
          id: `sub-${Date.now()}`,
          ...formData
        };
        this.subtasks.update(subtasks => [...subtasks, subtask]);
      }
    });
  }

  openEditSubtaskDialog(subtask: SubTask): void {
    alert('openEditSubtaskDialog');
    const dialogRef = this.dialogService.open(SubtaskDialogComponent, {
      header: 'Edit Subtask',
      width: '500px',
      modal: true,
      maximizable: true,
      data: {
        mode: 'edit',
        subtask: subtask,
        parentTaskTitle: this.formData().title
      }
    });

    dialogRef.onClose.subscribe((formData: SubTaskFormData) => {
      if (formData) {
        this.subtasks.update(subtasks =>
          subtasks.map(st =>
            st.id === subtask.id ? { ...st, ...formData } : st
          )
        );
      }
    });
  }

  deleteSubtask(subtaskId: string): void {
    this.subtasks.update(subtasks => subtasks.filter(st => st.id !== subtaskId));
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      'completed': 'success',
      'in-progress': 'info',
      'pending': 'warning'
    };
    return severityMap[status] || 'secondary';
  }

  getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      'completed': 'Completed',
      'in-progress': 'In Progress',
      'pending': 'Pending'
    };
    return labelMap[status] || status;
  }
}
