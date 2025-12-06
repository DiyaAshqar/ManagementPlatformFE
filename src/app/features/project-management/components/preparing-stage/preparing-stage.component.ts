import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedStageBoardComponent, Column, TaskStatus, WorkItemType } from '../shared-stage-board/shared-stage-board.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-preparing-stage',
  standalone: true,
  imports: [
    CommonModule,
    SharedStageBoardComponent
  ],
  providers: [DialogService],
  templateUrl: './preparing-stage.component.html',
  styleUrls: ['./preparing-stage.component.scss']
})
export class PreparingStageComponent {
  @Input() projectId!: string;

  columns = signal<Column[]>([
    {
      id: TaskStatus.TODO,
      title: 'To Do',
      items: [
        {
          id: 'prep-1',
          title: 'Conduct topographical survey',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'John Smith',
          assigneeAvatar: 'JS',
          taskPoints: '8',
          tags: ['survey', 'site-analysis'],
          description: 'Complete detailed topographical survey of the construction site including measurements and elevations',
          status: TaskStatus.TODO,
          subtasks: [
            { id: 'sub-1-1', title: 'Initial site measurement', startDate: '2024-01-15', endDate: '2024-01-16', status: 'pending', type: 'Survey', cost: '$2,500', quantity: '1' },
            { id: 'sub-1-2', title: 'Elevation mapping', startDate: '2024-01-16', endDate: '2024-01-17', status: 'pending', type: 'Survey', cost: '$3,200', quantity: '1' }
          ],
          startDate: '2024-01-15',
          endDate: '2024-01-18',
          location: 'Construction Site',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-01-15'
        },
        {
          id: 'prep-2',
          title: 'Submit building permit application',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Emily Brown',
          assigneeAvatar: 'EB',
          taskPoints: '8',
          tags: ['permits', 'documentation'],
          description: 'Prepare and submit complete building permit application with all required documentation',
          status: TaskStatus.TODO,
          subtasks: [],
          startDate: '2024-01-20',
          endDate: '2024-01-22',
          location: 'Building Department',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-01-20'
        }
      ],
      wipLimit: 5
    },
    {
      id: TaskStatus.IN_PROGRESS,
      title: 'In Progress',
      items: [
        {
          id: 'prep-3',
          title: 'Soil testing and analysis',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Sarah Johnson',
          assigneeAvatar: 'SJ',
          taskPoints: '5',
          tags: ['testing', 'analysis'],
          description: 'Conduct comprehensive soil testing to determine load-bearing capacity and composition',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [
            { id: 'sub-3-1', title: 'Collect soil samples', startDate: '2024-01-17', endDate: '2024-01-18', status: 'completed', type: 'Testing', cost: '$1,500', quantity: '5' },
            { id: 'sub-3-2', title: 'Laboratory analysis', startDate: '2024-01-18', endDate: '2024-01-19', status: 'in-progress', type: 'Testing', cost: '$2,800', quantity: '5' }
          ],
          startDate: '2024-01-17',
          endDate: '2024-01-19',
          location: 'Testing Lab',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-01-17'
        },
        {
          id: 'prep-4',
          title: 'Utility mapping',
          type: WorkItemType.TASK,
          priority: 'medium',
          assignTo: 'John Smith',
          assigneeAvatar: 'JS',
          taskPoints: '3',
          tags: ['survey', 'utilities'],
          description: 'Map existing utilities to avoid conflicts during construction',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [],
          startDate: '2024-01-19',
          endDate: '2024-01-20',
          location: 'Construction Site',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-01-19'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.REVIEW,
      title: 'Review',
      items: [
        {
          id: 'prep-5',
          title: 'Environmental impact assessment',
          type: WorkItemType.TASK,
          priority: 'medium',
          assignTo: 'Mike Davis',
          assigneeAvatar: 'MD',
          taskPoints: '5',
          tags: ['assessment', 'compliance'],
          description: 'Evaluate environmental impact and ensure compliance with regulations',
          status: TaskStatus.REVIEW,
          subtasks: [],
          startDate: '2024-01-18',
          endDate: '2024-01-20',
          location: 'Site Office',
          depth: '',
          volume: '',
          soilType: '',
          equipment: '',
          createdDate: '2024-01-18'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.DONE,
      title: 'Done',
      items: [],
      wipLimit: undefined
    }
  ]);
}
