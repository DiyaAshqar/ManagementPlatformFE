import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';

interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
  completed: boolean;
}

interface WorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  assigneeAvatar?: string;
  storyPoints?: number;
  tags: string[];
  description: string;
  status: TaskStatus;
  subtasks: SubTask[];
  dueDate?: string;
  createdDate: string;
}

enum WorkItemType {
  USER_STORY = 'User Story',
  BUG = 'Bug',
  TASK = 'Task',
  EPIC = 'Epic',
  FEATURE = 'Feature'
}

enum TaskStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done'
}

interface Column {
  id: TaskStatus;
  title: string;
  items: WorkItem[];
  wipLimit?: number;
}

@Component({
  selector: 'app-staging-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    TextareaModule,
    AvatarModule,
    AvatarGroupModule,
    ChipModule,
    ProgressBarModule
  ],
  templateUrl: './staging-board.component.html',
  styleUrls: ['./staging-board.component.scss']
})
export class StagingBoardComponent {
  @Input() projectId!: string;

  columns = signal<Column[]>([
    {
      id: TaskStatus.BACKLOG,
      title: 'Backlog',
      items: [
        {
          id: 'item-1',
          title: 'Implement User Authentication',
          type: WorkItemType.USER_STORY,
          priority: 'high',
          assignee: 'John Smith',
          assigneeAvatar: 'JS',
          storyPoints: 8,
          tags: ['authentication', 'security'],
          description: 'Implement secure user authentication with JWT tokens',
          status: TaskStatus.BACKLOG,
          subtasks: [
            { id: 'sub-1-1', title: 'Setup JWT middleware', status: TaskStatus.BACKLOG, completed: false },
            { id: 'sub-1-2', title: 'Create login endpoint', status: TaskStatus.BACKLOG, completed: false },
            { id: 'sub-1-3', title: 'Add password encryption', status: TaskStatus.BACKLOG, completed: false }
          ],
          dueDate: '2024-03-15',
          createdDate: '2024-02-01'
        },
        {
          id: 'item-2',
          title: 'Fix Navigation Menu Bug',
          type: WorkItemType.BUG,
          priority: 'medium',
          assignee: 'Sarah Johnson',
          assigneeAvatar: 'SJ',
          tags: ['bug', 'ui'],
          description: 'Navigation menu not closing on mobile devices',
          status: TaskStatus.BACKLOG,
          subtasks: [],
          createdDate: '2024-02-05'
        }
      ]
    },
    {
      id: TaskStatus.TODO,
      title: 'To Do',
      items: [
        {
          id: 'item-3',
          title: 'Design Dashboard Layout',
          type: WorkItemType.TASK,
          priority: 'high',
          assignee: 'Mike Wilson',
          assigneeAvatar: 'MW',
          storyPoints: 5,
          tags: ['design', 'dashboard'],
          description: 'Create wireframes and mockups for dashboard',
          status: TaskStatus.TODO,
          subtasks: [
            { id: 'sub-3-1', title: 'Create wireframes', status: TaskStatus.TODO, assignee: 'Mike Wilson', completed: false },
            { id: 'sub-3-2', title: 'Design mockups', status: TaskStatus.TODO, completed: false },
            { id: 'sub-3-3', title: 'Get stakeholder approval', status: TaskStatus.TODO, completed: false }
          ],
          dueDate: '2024-03-10',
          createdDate: '2024-02-03'
        }
      ],
      wipLimit: 5
    },
    {
      id: TaskStatus.IN_PROGRESS,
      title: 'In Progress',
      items: [
        {
          id: 'item-4',
          title: 'API Integration for Reports',
          type: WorkItemType.FEATURE,
          priority: 'critical',
          assignee: 'David Chen',
          assigneeAvatar: 'DC',
          storyPoints: 13,
          tags: ['api', 'backend', 'reports'],
          description: 'Integrate reporting API endpoints with frontend',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [
            { id: 'sub-4-1', title: 'Setup API client', status: TaskStatus.IN_PROGRESS, assignee: 'David Chen', completed: true },
            { id: 'sub-4-2', title: 'Implement data fetching', status: TaskStatus.IN_PROGRESS, assignee: 'David Chen', completed: true },
            { id: 'sub-4-3', title: 'Add error handling', status: TaskStatus.IN_PROGRESS, completed: false },
            { id: 'sub-4-4', title: 'Write unit tests', status: TaskStatus.IN_PROGRESS, completed: false }
          ],
          dueDate: '2024-03-08',
          createdDate: '2024-02-02'
        },
        {
          id: 'item-5',
          title: 'Database Schema Migration',
          type: WorkItemType.TASK,
          priority: 'high',
          assignee: 'Emily Brown',
          assigneeAvatar: 'EB',
          storyPoints: 8,
          tags: ['database', 'backend'],
          description: 'Migrate database schema to new version',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [
            { id: 'sub-5-1', title: 'Create migration scripts', status: TaskStatus.IN_PROGRESS, completed: true },
            { id: 'sub-5-2', title: 'Test on staging', status: TaskStatus.IN_PROGRESS, completed: false }
          ],
          dueDate: '2024-03-12',
          createdDate: '2024-02-04'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.REVIEW,
      title: 'Review',
      items: [
        {
          id: 'item-6',
          title: 'Implement Search Functionality',
          type: WorkItemType.FEATURE,
          priority: 'medium',
          assignee: 'Alex Turner',
          assigneeAvatar: 'AT',
          storyPoints: 5,
          tags: ['search', 'frontend'],
          description: 'Add search functionality to the application',
          status: TaskStatus.REVIEW,
          subtasks: [
            { id: 'sub-6-1', title: 'Build search component', status: TaskStatus.REVIEW, completed: true },
            { id: 'sub-6-2', title: 'Add search filters', status: TaskStatus.REVIEW, completed: true },
            { id: 'sub-6-3', title: 'Optimize search performance', status: TaskStatus.REVIEW, completed: true }
          ],
          createdDate: '2024-02-01'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.DONE,
      title: 'Done',
      items: [
        {
          id: 'item-7',
          title: 'Setup CI/CD Pipeline',
          type: WorkItemType.TASK,
          priority: 'high',
          assignee: 'Chris Lee',
          assigneeAvatar: 'CL',
          storyPoints: 8,
          tags: ['devops', 'ci-cd'],
          description: 'Configure automated deployment pipeline',
          status: TaskStatus.DONE,
          subtasks: [
            { id: 'sub-7-1', title: 'Configure GitHub Actions', status: TaskStatus.DONE, completed: true },
            { id: 'sub-7-2', title: 'Setup staging environment', status: TaskStatus.DONE, completed: true },
            { id: 'sub-7-3', title: 'Add automated tests', status: TaskStatus.DONE, completed: true }
          ],
          createdDate: '2024-01-28'
        }
      ]
    }
  ]);

  selectedItem = signal<WorkItem | null>(null);
  showItemDialog = signal(false);
  showAddDialog = signal(false);
  expandedItems = signal<Set<string>>(new Set());
  selectedColumn = signal<TaskStatus | null>(null);

  newItem: Partial<WorkItem> = {
    title: '',
    type: WorkItemType.TASK,
    priority: 'medium',
    assignee: '',
    storyPoints: 0,
    tags: [],
    description: '',
    subtasks: []
  };

  newSubtask = {
    title: '',
    assignee: ''
  };

  workItemTypes = [
    { label: 'User Story', value: WorkItemType.USER_STORY },
    { label: 'Bug', value: WorkItemType.BUG },
    { label: 'Task', value: WorkItemType.TASK },
    { label: 'Epic', value: WorkItemType.EPIC },
    { label: 'Feature', value: WorkItemType.FEATURE }
  ];

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' },
    { label: 'Critical', value: 'critical' }
  ];

  get totalItems(): number {
    return this.columns().reduce((sum, col) => sum + col.items.length, 0);
  }

  get inProgressCount(): number {
    return this.columns().find(c => c.id === TaskStatus.IN_PROGRESS)?.items.length || 0;
  }

  get completedCount(): number {
    return this.columns().find(c => c.id === TaskStatus.DONE)?.items.length || 0;
  }

  get completionRate(): number {
    if (this.totalItems === 0) return 0;
    return Math.round((this.completedCount / this.totalItems) * 100);
  }

  get connectedDropLists(): string[] {
    return this.columns().map(c => c.id);
  }

  onDrop(event: CdkDragDrop<WorkItem[]>, targetColumn: Column): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Check WIP limit
      if (targetColumn.wipLimit && event.container.data.length >= targetColumn.wipLimit) {
        console.warn(`WIP limit of ${targetColumn.wipLimit} reached for ${targetColumn.title}`);
        return;
      }

      // Update item status
      const item = event.previousContainer.data[event.previousIndex];
      item.status = targetColumn.id;

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update columns signal
      this.columns.update(cols => [...cols]);
    }
  }

  openItemDialog(item: WorkItem): void {
    this.selectedItem.set(item);
    this.showItemDialog.set(true);
  }

  openAddDialog(columnId: TaskStatus): void {
    this.selectedColumn.set(columnId);
    this.newItem = {
      title: '',
      type: WorkItemType.TASK,
      priority: 'medium',
      assignee: '',
      storyPoints: 0,
      tags: [],
      description: '',
      subtasks: []
    };
    this.showAddDialog.set(true);
  }

  addWorkItem(): void {
    if (!this.newItem.title || !this.selectedColumn()) return;

    const item: WorkItem = {
      id: `item-${Date.now()}`,
      title: this.newItem.title!,
      type: this.newItem.type || WorkItemType.TASK,
      priority: this.newItem.priority || 'medium',
      assignee: this.newItem.assignee || 'Unassigned',
      assigneeAvatar: this.newItem.assignee ? this.newItem.assignee.split(' ').map(n => n[0]).join('') : '?',
      storyPoints: this.newItem.storyPoints || 0,
      tags: this.newItem.tags || [],
      description: this.newItem.description || '',
      status: this.selectedColumn()!,
      subtasks: [],
      createdDate: new Date().toISOString().split('T')[0]
    };

    this.columns.update(cols => 
      cols.map(col => 
        col.id === this.selectedColumn()
          ? { ...col, items: [...col.items, item] }
          : col
      )
    );

    this.showAddDialog.set(false);
    this.selectedColumn.set(null);
  }

  addSubtask(item: WorkItem): void {
    if (!this.newSubtask.title) return;

    const subtask: SubTask = {
      id: `sub-${Date.now()}`,
      title: this.newSubtask.title,
      status: item.status,
      assignee: this.newSubtask.assignee || undefined,
      completed: false
    };

    item.subtasks.push(subtask);
    this.newSubtask = { title: '', assignee: '' };

    // Force update
    this.columns.update(cols => [...cols]);
  }

  toggleSubtask(item: WorkItem, subtask: SubTask): void {
    subtask.completed = !subtask.completed;
    this.columns.update(cols => [...cols]);
  }

  deleteSubtask(item: WorkItem, subtaskId: string): void {
    item.subtasks = item.subtasks.filter(st => st.id !== subtaskId);
    this.columns.update(cols => [...cols]);
  }

  deleteWorkItem(item: WorkItem): void {
    this.columns.update(cols =>
      cols.map(col => ({
        ...col,
        items: col.items.filter(i => i.id !== item.id)
      }))
    );
    this.showItemDialog.set(false);
  }

  toggleExpanded(itemId: string): void {
    const expanded = new Set(this.expandedItems());
    if (expanded.has(itemId)) {
      expanded.delete(itemId);
    } else {
      expanded.add(itemId);
    }
    this.expandedItems.set(expanded);
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems().has(itemId);
  }

  getWorkItemIcon(type: WorkItemType): string {
    const icons: Record<WorkItemType, string> = {
      [WorkItemType.USER_STORY]: 'pi-book',
      [WorkItemType.BUG]: 'pi-exclamation-circle',
      [WorkItemType.TASK]: 'pi-check-square',
      [WorkItemType.EPIC]: 'pi-bolt',
      [WorkItemType.FEATURE]: 'pi-star'
    };
    return icons[type] || 'pi-circle';
  }

  getWorkItemColor(type: WorkItemType): string {
    const colors: Record<WorkItemType, string> = {
      [WorkItemType.USER_STORY]: 'bg-blue-500',
      [WorkItemType.BUG]: 'bg-red-500',
      [WorkItemType.TASK]: 'bg-green-500',
      [WorkItemType.EPIC]: 'bg-purple-500',
      [WorkItemType.FEATURE]: 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      'low': 'secondary',
      'medium': 'info',
      'high': 'warn',
      'critical': 'danger'
    };
    return severityMap[priority] || 'secondary';
  }

  getCompletedSubtasks(item: WorkItem): number {
    return item.subtasks.filter(st => st.completed).length;
  }

  getSubtaskProgress(item: WorkItem): number {
    if (item.subtasks.length === 0) return 0;
    return Math.round((this.getCompletedSubtasks(item) / item.subtasks.length) * 100);
  }
}
