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
import { SelectModule } from 'primeng/select';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';

interface SubTask {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  type: string;
  cost: number;
  quantity: number;
}

interface Task {
  id: string;
  title: string;
  type: string;
  assignTo: string;
  startDate: string;
  endDate: string;
  priority: 'low' | 'medium' | 'high';
  taskPoints: number;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  subTasks?: SubTask[];
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
    SelectModule,
    BadgeModule,
    TooltipModule,
    TextareaModule
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
          type: 'Survey',
          assignTo: 'John Smith',
          startDate: '2024-01-15',
          endDate: '2024-01-18',
          priority: 'high',
          taskPoints: 8,
          description: 'Complete detailed topographical survey of the construction site including measurements and elevations',
          status: 'completed',
          subTasks: [
            {
              id: 'sub-1-1',
              title: 'Initial site measurement',
              startDate: '2024-01-15',
              endDate: '2024-01-16',
              status: 'completed',
              type: 'Survey',
              cost: 2500,
              quantity: 1
            },
            {
              id: 'sub-1-2',
              title: 'Elevation mapping',
              startDate: '2024-01-16',
              endDate: '2024-01-17',
              status: 'completed',
              type: 'Survey',
              cost: 3200,
              quantity: 1
            }
          ]
        },
        {
          id: 'task-2',
          title: 'Soil testing and analysis',
          type: 'Testing',
          assignTo: 'Sarah Johnson',
          startDate: '2024-01-17',
          endDate: '2024-01-19',
          priority: 'high',
          taskPoints: 5,
          description: 'Conduct comprehensive soil testing to determine load-bearing capacity and composition',
          status: 'completed',
          subTasks: [
            {
              id: 'sub-2-1',
              title: 'Collect soil samples',
              startDate: '2024-01-17',
              endDate: '2024-01-18',
              status: 'completed',
              type: 'Testing',
              cost: 1500,
              quantity: 5
            },
            {
              id: 'sub-2-2',
              title: 'Laboratory analysis',
              startDate: '2024-01-18',
              endDate: '2024-01-19',
              status: 'completed',
              type: 'Testing',
              cost: 2800,
              quantity: 5
            }
          ]
        },
        {
          id: 'task-3',
          title: 'Environmental impact assessment',
          type: 'Assessment',
          assignTo: 'Mike Davis',
          startDate: '2024-01-18',
          endDate: '2024-01-20',
          priority: 'medium',
          taskPoints: 5,
          description: 'Evaluate environmental impact and ensure compliance with regulations',
          status: 'completed'
        },
        {
          id: 'task-4',
          title: 'Utility mapping',
          type: 'Survey',
          assignTo: 'John Smith',
          startDate: '2024-01-19',
          endDate: '2024-01-20',
          priority: 'medium',
          taskPoints: 3,
          description: 'Map existing utilities to avoid conflicts during construction',
          status: 'in-progress'
        }
      ],
    },
    {
      id: 'cat-2',
      name: 'Permits & Approvals',
      tasks: [
        {
          id: 'task-5',
          title: 'Submit building permit application',
          type: 'Documentation',
          assignTo: 'Emily Brown',
          startDate: '2024-01-20',
          endDate: '2024-01-22',
          priority: 'high',
          taskPoints: 8,
          description: 'Prepare and submit complete building permit application with all required documentation',
          status: 'in-progress'
        },
        {
          id: 'task-6',
          title: 'Obtain zoning approval',
          type: 'Approval',
          assignTo: 'Emily Brown',
          startDate: '2024-01-22',
          endDate: '2024-01-23',
          priority: 'high',
          taskPoints: 5,
          description: 'Secure zoning approval from local authorities',
          status: 'pending'
        },
        {
          id: 'task-7',
          title: 'Fire safety approval',
          type: 'Approval',
          assignTo: 'David Wilson',
          startDate: '2024-01-23',
          endDate: '2024-01-24',
          priority: 'medium',
          taskPoints: 3,
          description: 'Obtain fire safety approval and ensure compliance with fire codes',
          status: 'pending'
        },
        {
          id: 'task-8',
          title: 'Environmental clearance',
          type: 'Approval',
          assignTo: 'Mike Davis',
          startDate: '2024-01-24',
          endDate: '2024-01-25',
          priority: 'medium',
          taskPoints: 5,
          description: 'Secure environmental clearance certificate',
          status: 'pending'
        }
      ],
    },
    {
      id: 'cat-3',
      name: 'Material Procurement',
      tasks: [
        {
          id: 'task-9',
          title: 'Source concrete suppliers',
          type: 'Procurement',
          assignTo: 'Robert Lee',
          startDate: '2024-01-25',
          endDate: '2024-01-28',
          priority: 'high',
          taskPoints: 5,
          description: 'Identify and evaluate concrete suppliers for quality and pricing',
          status: 'pending'
        },
        {
          id: 'task-10',
          title: 'Order steel reinforcement',
          type: 'Procurement',
          assignTo: 'Robert Lee',
          startDate: '2024-01-27',
          endDate: '2024-01-29',
          priority: 'high',
          taskPoints: 8,
          description: 'Place orders for steel reinforcement bars and related materials',
          status: 'pending'
        },
        {
          id: 'task-11',
          title: 'Arrange equipment rental',
          type: 'Procurement',
          assignTo: 'Sarah Johnson',
          startDate: '2024-01-28',
          endDate: '2024-01-30',
          priority: 'medium',
          taskPoints: 3,
          description: 'Coordinate rental of heavy equipment and machinery',
          status: 'pending'
        },
        {
          id: 'task-12',
          title: 'Finalize material delivery schedule',
          type: 'Planning',
          assignTo: 'Robert Lee',
          startDate: '2024-01-30',
          endDate: '2024-02-01',
          priority: 'medium',
          taskPoints: 3,
          description: 'Create detailed material delivery schedule coordinated with construction timeline',
          status: 'pending'
        }
      ],
    }
  ];

  showAddTaskDialog = false;
  selectedCategory = '';
  expandedTasks = new Set<string>();
  showAddSubTaskDialog = false;
  selectedTask: { categoryId: string; taskId: string } | null = null;
  
  newTask = {
    title: '',
    type: '',
    assignTo: '',
    startDate: '',
    endDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    taskPoints: '',
    description: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed'
  };

  newSubTask = {
    title: '',
    startDate: '',
    endDate: '',
    status: 'pending' as 'pending' | 'in-progress' | 'completed',
    type: '',
    cost: '',
    quantity: ''
  };

  categoryOptions = this.categories.map(cat => ({ label: cat.name, value: cat.id }));
  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];
  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' }
  ];

  get totalTasks(): number {
    return this.categories.reduce((sum, cat) => sum + cat.tasks.length, 0);
  }

  get completedTasks(): number {
    return this.categories.reduce(
      (sum, cat) => sum + cat.tasks.filter((t) => t.status === 'completed').length,
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
              task.id === taskId
                ? {
                    ...task,
                    status:
                      task.status === 'completed'
                        ? 'pending'
                        : task.status === 'pending'
                          ? 'in-progress'
                          : 'completed'
                  }
                : task
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
      type: this.newTask.type,
      assignTo: this.newTask.assignTo,
      startDate: this.newTask.startDate,
      endDate: this.newTask.endDate,
      priority: this.newTask.priority,
      taskPoints: parseFloat(this.newTask.taskPoints) || 0,
      description: this.newTask.description,
      status: this.newTask.status,
      subTasks: []
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
      type: '',
      assignTo: '',
      startDate: '',
      endDate: '',
      priority: 'medium',
      taskPoints: '',
      description: '',
      status: 'pending'
    };
    this.selectedCategory = '';
  }

  calculateProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100);
  }

  getCompletedTasksCount(tasks: Task[]): number {
    return tasks.filter((t) => t.status === 'completed').length;
  }

  toggleSubTasks(taskId: string): void {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
    this.expandedTasks = new Set(this.expandedTasks);
  }

  isTaskExpanded(taskId: string): boolean {
    return this.expandedTasks.has(taskId);
  }

  openAddSubTaskDialog(categoryId: string, taskId: string): void {
    this.selectedTask = { categoryId, taskId };
    this.showAddSubTaskDialog = true;
  }

  addSubTask(): void {
    if (!this.newSubTask.title || !this.selectedTask) return;

    const newSubTaskObj: SubTask = {
      id: `sub-${Date.now()}`,
      title: this.newSubTask.title,
      startDate: this.newSubTask.startDate,
      endDate: this.newSubTask.endDate,
      status: this.newSubTask.status,
      type: this.newSubTask.type,
      cost: parseFloat(this.newSubTask.cost) || 0,
      quantity: parseFloat(this.newSubTask.quantity) || 0
    };

    this.categories = this.categories.map((cat) =>
      cat.id === this.selectedTask!.categoryId
        ? {
            ...cat,
            tasks: cat.tasks.map((task) =>
              task.id === this.selectedTask!.taskId
                ? { ...task, subTasks: [...(task.subTasks || []), newSubTaskObj] }
                : task
            ),
          }
        : cat
    );

    this.resetNewSubTask();
    this.showAddSubTaskDialog = false;
    this.selectedTask = null;
  }

  resetNewSubTask(): void {
    this.newSubTask = {
      title: '',
      startDate: '',
      endDate: '',
      status: 'pending',
      type: '',
      cost: '',
      quantity: ''
    };
  }

  deleteSubTask(categoryId: string, taskId: string, subTaskId: string): void {
    this.categories = this.categories.map((cat) =>
      cat.id === categoryId
        ? {
            ...cat,
            tasks: cat.tasks.map((task) =>
              task.id === taskId
                ? { ...task, subTasks: (task.subTasks || []).filter((st) => st.id !== subTaskId) }
                : task
            ),
          }
        : cat
    );
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      'completed': 'success',
      'in-progress': 'info',
      'pending': 'secondary'
    };
    return severityMap[status] || 'secondary';
  }

  getPrioritySeverity(priority: 'low' | 'medium' | 'high'): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast'> = {
      'high': 'danger',
      'medium': 'warning',
      'low': 'info'
    };
    return severityMap[priority] || 'secondary';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
