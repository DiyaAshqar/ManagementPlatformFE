import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskCategory {
  id: string;
  name: string;
  tasks: Task[];
}

@Component({
  selector: 'app-preparing-stage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    TagModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
    BadgeModule,
    TooltipModule
  ],
  templateUrl: './preparing-stage.component.html',
  styleUrls: ['./preparing-stage.component.scss']
})
export class PreparingStageComponent {
  @Input() projectId!: string;

  categories: TaskCategory[] = [
    {
      id: 'cat-1',
      name: 'Site Survey & Analysis',
      tasks: [
        {
          id: 'task-1',
          title: 'Conduct topographical survey',
          completed: true,
          assignee: 'John Smith',
          dueDate: '2024-01-18',
          priority: 'high',
        },
        {
          id: 'task-2',
          title: 'Soil testing and analysis',
          completed: true,
          assignee: 'Sarah Johnson',
          dueDate: '2024-01-19',
          priority: 'high',
        },
        {
          id: 'task-3',
          title: 'Environmental impact assessment',
          completed: true,
          assignee: 'Mike Davis',
          dueDate: '2024-01-20',
          priority: 'medium',
        },
        {
          id: 'task-4',
          title: 'Utility mapping',
          completed: true,
          assignee: 'John Smith',
          dueDate: '2024-01-20',
          priority: 'medium',
        },
      ],
    },
    {
      id: 'cat-2',
      name: 'Permits & Approvals',
      tasks: [
        {
          id: 'task-5',
          title: 'Submit building permit application',
          completed: true,
          assignee: 'Emily Brown',
          dueDate: '2024-01-22',
          priority: 'high',
        },
        {
          id: 'task-6',
          title: 'Obtain zoning approval',
          completed: true,
          assignee: 'Emily Brown',
          dueDate: '2024-01-23',
          priority: 'high',
        },
        {
          id: 'task-7',
          title: 'Fire safety approval',
          completed: true,
          assignee: 'David Wilson',
          dueDate: '2024-01-24',
          priority: 'medium',
        },
        {
          id: 'task-8',
          title: 'Environmental clearance',
          completed: true,
          assignee: 'Mike Davis',
          dueDate: '2024-01-25',
          priority: 'medium',
        },
      ],
    },
    {
      id: 'cat-3',
      name: 'Material Procurement',
      tasks: [
        {
          id: 'task-9',
          title: 'Source concrete suppliers',
          completed: true,
          assignee: 'Robert Lee',
          dueDate: '2024-01-28',
          priority: 'high',
        },
        {
          id: 'task-10',
          title: 'Order steel reinforcement',
          completed: true,
          assignee: 'Robert Lee',
          dueDate: '2024-01-29',
          priority: 'high',
        },
        {
          id: 'task-11',
          title: 'Arrange equipment rental',
          completed: true,
          assignee: 'Sarah Johnson',
          dueDate: '2024-01-30',
          priority: 'medium',
        },
        {
          id: 'task-12',
          title: 'Finalize material delivery schedule',
          completed: true,
          assignee: 'Robert Lee',
          dueDate: '2024-02-01',
          priority: 'medium',
        },
      ],
    },
  ];

  showAddTaskDialog = false;
  selectedCategory = '';
  newTask = {
    title: '',
    assignee: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  };

  categoryOptions = this.categories.map(cat => ({ label: cat.name, value: cat.id }));
  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
  ];

  get totalTasks(): number {
    return this.categories.reduce((sum, cat) => sum + cat.tasks.length, 0);
  }

  get completedTasks(): number {
    return this.categories.reduce(
      (sum, cat) => sum + cat.tasks.filter((t) => t.completed).length,
      0
    );
  }

  get overallProgress(): number {
    return this.totalTasks > 0 ? Math.round((this.completedTasks / this.totalTasks) * 100) : 0;
  }

  toggleTask(categoryId: string, taskId: string): void {
    this.categories = this.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            tasks: cat.tasks.map((task) =>
              task.id === taskId ? { ...task, completed: !task.completed } : task
            ),
          }
        : cat
    );
  }

  deleteTask(categoryId: string, taskId: string): void {
    this.categories = this.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            tasks: cat.tasks.filter((task) => task.id !== taskId),
          }
        : cat
    );
  }

  openAddTaskDialog(): void {
    this.showAddTaskDialog = true;
  }

  addTask(): void {
    if (!this.newTask.title || !this.selectedCategory) return;

    const newTaskObj: Task = {
      id: `task-${Date.now()}`,
      title: this.newTask.title,
      completed: false,
      assignee: this.newTask.assignee || undefined,
      dueDate: this.newTask.dueDate || undefined,
      priority: this.newTask.priority,
    };

    this.categories = this.categories.map((cat) =>
      cat.id === this.selectedCategory
        ? {
            ...cat,
            tasks: [...cat.tasks, newTaskObj],
          }
        : cat
    );

    this.resetNewTask();
    this.showAddTaskDialog = false;
  }

  resetNewTask(): void {
    this.newTask = {
      title: '',
      assignee: '',
      dueDate: '',
      priority: 'medium',
    };
    this.selectedCategory = '';
  }

  calculateProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
  }

  getCompletedTasksCount(tasks: Task[]): number {
    return tasks.filter((t) => t.completed).length;
  }

  getPrioritySeverity(priority: 'low' | 'medium' | 'high'): 'success' | 'warning' | 'danger' {
    switch (priority) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'danger';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
