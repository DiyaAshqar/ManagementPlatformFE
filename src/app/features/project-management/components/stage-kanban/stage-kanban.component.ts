import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';

interface StageCard {
    id: string;
    title: string;
    progress: number;
    status: 'completed' | 'in-progress' | 'pending' | 'blocked';
    tasks: number;
    completedTasks: number;
    dueDate?: string;
}

interface StatusConfig {
    icon: string;
    color: string;
    bgColor: string;
    label: string;
}

@Component({
    selector: 'app-stage-kanban',
    standalone: true,
    imports: [
        CommonModule,
        CardModule,
        ButtonModule,
        ProgressBarModule,
        BadgeModule,
        TagModule
    ],
    templateUrl: './stage-kanban.component.html',
    styleUrls: ['./stage-kanban.component.scss']
})
export class StageKanbanComponent implements OnInit {
    @Input() projectId!: string;

    stages = {
        preparing: [
            {
                id: 'prep-1',
                title: 'Site Survey & Analysis',
                progress: 100,
                status: 'completed',
                tasks: 8,
                completedTasks: 8,
                dueDate: '2024-01-20'
            },
            {
                id: 'prep-2',
                title: 'Permits & Approvals',
                progress: 100,
                status: 'completed',
                tasks: 12,
                completedTasks: 12,
                dueDate: '2024-01-25'
            },
            {
                id: 'prep-3',
                title: 'Material Procurement',
                progress: 100,
                status: 'completed',
                tasks: 15,
                completedTasks: 15,
                dueDate: '2024-02-01'
            }
        ],
        excavation: [
            {
                id: 'exc-1',
                title: 'Site Clearing',
                progress: 100,
                status: 'completed',
                tasks: 6,
                completedTasks: 6,
                dueDate: '2024-02-05'
            },
            {
                id: 'exc-2',
                title: 'Foundation Excavation',
                progress: 75,
                status: 'in-progress',
                tasks: 10,
                completedTasks: 7,
                dueDate: '2024-02-15'
            },
            {
                id: 'exc-3',
                title: 'Utility Installation',
                progress: 30,
                status: 'in-progress',
                tasks: 8,
                completedTasks: 2,
                dueDate: '2024-02-20'
            }
        ],
        milestones: [
            {
                id: 'mile-1',
                title: 'Foundation Complete',
                progress: 0,
                status: 'pending',
                tasks: 5,
                completedTasks: 0,
                dueDate: '2024-03-01'
            },
            {
                id: 'mile-2',
                title: 'Structure Framework',
                progress: 0,
                status: 'pending',
                tasks: 12,
                completedTasks: 0,
                dueDate: '2024-04-15'
            },
            {
                id: 'mile-3',
                title: 'Exterior Completion',
                progress: 0,
                status: 'pending',
                tasks: 18,
                completedTasks: 0,
                dueDate: '2024-06-01'
            }
        ]
    };

    private statusConfig: Record<string, StatusConfig> = {
        completed: {
            icon: 'pi pi-check-circle',
            color: 'text-primary',
            bgColor: 'status-completed',
            label: 'Completed'
        },
        'in-progress': {
            icon: 'pi pi-clock',
            color: 'text-blue-500',
            bgColor: 'status-in-progress',
            label: 'In Progress'
        },
        pending: {
            icon: 'pi pi-exclamation-circle',
            color: 'text-500',
            bgColor: 'status-pending',
            label: 'Pending'
        },
        blocked: {
            icon: 'pi pi-exclamation-triangle',
            color: 'text-red-500',
            bgColor: 'status-blocked',
            label: 'Blocked'
        }
    };

    ngOnInit(): void {
        // Load stages data based on projectId
    }

    getStatusIcon(status: string): string {
        return this.statusConfig[status]?.icon || 'pi pi-circle';
    }

    getStatusColor(status: string): string {
        return this.statusConfig[status]?.color || 'text-500';
    }

    getStatusBgColor(status: string): string {
        return this.statusConfig[status]?.bgColor || 'status-pending';
    }

    formatDueDate(date: string): string {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}
