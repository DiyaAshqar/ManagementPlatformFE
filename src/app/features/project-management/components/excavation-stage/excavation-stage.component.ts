import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedStageBoardComponent, Column, TaskStatus, WorkItemType } from '../shared-stage-board/shared-stage-board.component';
import { DialogService } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-excavation-stage',
  standalone: true,
  imports: [
    CommonModule,
    SharedStageBoardComponent
  ],
  providers: [DialogService],
  templateUrl: './excavation-stage.component.html',
  styleUrls: ['./excavation-stage.component.scss']
})
export class ExcavationStageComponent {
  @Input() projectId!: string;

  columns = signal<Column[]>([
    {
      id: TaskStatus.TODO,
      title: 'To Do',
      items: [
        {
          id: 'exc-1',
          title: 'Foundation Excavation - Phase 1',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Mike Johnson',
          assigneeAvatar: 'MJ',
          taskPoints: '8',
          tags: ['foundation', 'excavation'],
          description: 'Initial foundation excavation for the main building structure',
          status: TaskStatus.TODO,
          subtasks: [
            { id: 'sub-1-1', title: 'Topsoil Removal', startDate: '2024-02-05', endDate: '2024-02-05', status: 'pending', type: 'Excavation', cost: '$1,200', quantity: '150 m³' },
            { id: 'sub-1-2', title: 'Clay Extraction', startDate: '2024-02-05', endDate: '2024-02-05', status: 'pending', type: 'Excavation', cost: '$2,500', quantity: '300 m³' }
          ],
          startDate: '2024-02-05',
          endDate: '2024-02-05',
          location: 'Grid A1-A5',
          depth: '3.5m',
          volume: '450 m³',
          soilType: 'Clay',
          equipment: 'Excavator CAT 320',
          createdDate: '2024-02-05'
        },
        {
          id: 'exc-2',
          title: 'Utility Trench - North Section',
          type: WorkItemType.TASK,
          priority: 'medium',
          assignTo: 'Sarah Williams',
          assigneeAvatar: 'SW',
          taskPoints: '5',
          tags: ['utilities', 'trench'],
          description: 'Excavate trench for utility lines in the north section',
          status: TaskStatus.TODO,
          subtasks: [],
          startDate: '2024-02-06',
          endDate: '2024-02-07',
          location: 'North Section',
          depth: '2m',
          volume: '120 m³',
          soilType: 'Sandy Clay',
          equipment: 'Mini Excavator',
          createdDate: '2024-02-06'
        }
      ],
      wipLimit: 5
    },
    {
      id: TaskStatus.IN_PROGRESS,
      title: 'In Progress',
      items: [
        {
          id: 'exc-3',
          title: 'Basement Excavation - Level 1',
          type: WorkItemType.TASK,
          priority: 'critical',
          assignTo: 'David Chen',
          assigneeAvatar: 'DC',
          taskPoints: '13',
          tags: ['basement', 'excavation'],
          description: 'First level basement excavation with shoring installation',
          status: TaskStatus.IN_PROGRESS,
          subtasks: [
            { id: 'sub-3-1', title: 'Shoring Installation', startDate: '2024-02-07', endDate: '2024-02-08', status: 'completed', type: 'Safety', cost: '$5,000', quantity: '1' },
            { id: 'sub-3-2', title: 'Soil Excavation', startDate: '2024-02-08', endDate: '2024-02-09', status: 'in-progress', type: 'Excavation', cost: '$3,500', quantity: '600 m³' },
            { id: 'sub-3-3', title: 'Soil Testing', startDate: '2024-02-09', endDate: '2024-02-09', status: 'pending', type: 'Testing', cost: '$800', quantity: '1' }
          ],
          startDate: '2024-02-07',
          endDate: '2024-02-09',
          location: 'Building Core',
          depth: '5m',
          volume: '600 m³',
          soilType: 'Mixed Clay/Rock',
          equipment: 'Excavator CAT 336',
          createdDate: '2024-02-07'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.REVIEW,
      title: 'Review',
      items: [
        {
          id: 'exc-4',
          title: 'Site Leveling - East Wing',
          type: WorkItemType.TASK,
          priority: 'medium',
          assignTo: 'Robert Taylor',
          assigneeAvatar: 'RT',
          taskPoints: '5',
          tags: ['leveling', 'grading'],
          description: 'Level and grade the east wing area for construction',
          status: TaskStatus.REVIEW,
          subtasks: [
            { id: 'sub-4-1', title: 'Initial Grading', startDate: '2024-02-04', endDate: '2024-02-05', status: 'completed', type: 'Grading', cost: '$2,000', quantity: '200 m³' },
            { id: 'sub-4-2', title: 'Final Leveling', startDate: '2024-02-05', endDate: '2024-02-06', status: 'completed', type: 'Leveling', cost: '$1,500', quantity: '200 m³' }
          ],
          startDate: '2024-02-04',
          endDate: '2024-02-06',
          location: 'East Wing',
          depth: '0.5m',
          volume: '200 m³',
          soilType: 'Topsoil',
          equipment: 'Bulldozer',
          createdDate: '2024-02-04'
        }
      ],
      wipLimit: 3
    },
    {
      id: TaskStatus.DONE,
      title: 'Done',
      items: [
        {
          id: 'exc-5',
          title: 'Access Road Excavation',
          type: WorkItemType.TASK,
          priority: 'high',
          assignTo: 'Emily Brown',
          assigneeAvatar: 'EB',
          taskPoints: '8',
          tags: ['road', 'access'],
          description: 'Excavate and prepare access road to construction site',
          status: TaskStatus.DONE,
          subtasks: [
            { id: 'sub-5-1', title: 'Clear Vegetation', startDate: '2024-02-01', endDate: '2024-02-02', status: 'completed', type: 'Clearing', cost: '$1,000', quantity: '1' },
            { id: 'sub-5-2', title: 'Excavate Road Base', startDate: '2024-02-02', endDate: '2024-02-03', status: 'completed', type: 'Excavation', cost: '$2,500', quantity: '300 m³' },
            { id: 'sub-5-3', title: 'Compact Base', startDate: '2024-02-03', endDate: '2024-02-04', status: 'completed', type: 'Compaction', cost: '$800', quantity: '1' }
          ],
          startDate: '2024-02-01',
          endDate: '2024-02-04',
          location: 'Site Access',
          depth: '1m',
          volume: '300 m³',
          soilType: 'Mixed',
          equipment: 'Excavator + Compactor',
          createdDate: '2024-02-01'
        }
      ],
      wipLimit: undefined
    }
  ]);
}
