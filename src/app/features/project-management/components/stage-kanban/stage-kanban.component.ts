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
    template: `
    <div class="stage-kanban-container">
      <div class="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="text-2xl font-semibold m-0 text-color">Stage Overview</h2>
          <p class="text-sm text-500 mt-1 mb-0">Track progress across all construction stages</p>
        </div>
      </div>

      <div class="grid">
        <!-- Preparing Column -->
        <div class="col-12 lg:col-4">
          <div class="stage-column">
            <div class="flex justify-content-between align-items-center mb-3">
              <div class="flex align-items-center gap-2">
                <div class="stage-indicator bg-primary"></div>
                <h3 class="font-semibold m-0 text-color">Preparing</h3>
                <p-badge [value]="stages.preparing.length.toString()" severity="secondary"></p-badge>
              </div>
              <p-button 
                icon="pi pi-plus"
                [text]="true"
                [rounded]="true"
                size="small">
              </p-button>
            </div>
            <div class="space-y-3">
              @for (card of stages.preparing; track card.id) {
                <p-card class="stage-card cursor-pointer" styleClass="h-full">
                  <ng-template pTemplate="header">
                    <div class="flex justify-content-between align-items-start p-3 pb-0">
                      <h4 class="text-base font-semibold m-0 text-color line-height-3">{{ card.title }}</h4>
                      <div class="status-icon" [ngClass]="getStatusBgColor(card.status)">
                        <i [class]="getStatusIcon(card.status)" [ngClass]="getStatusColor(card.status)"></i>
                      </div>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-content-between align-items-center mb-2">
                        <span class="text-xs text-500">Progress</span>
                        <span class="text-xs font-semibold text-color">{{ card.progress }}%</span>
                      </div>
                      <p-progressBar 
                        [value]="card.progress" 
                        [showValue]="false"
                        styleClass="progress-thin">
                      </p-progressBar>
                    </div>
                    <div class="flex justify-content-between align-items-center text-xs">
                      <span class="text-500">{{ card.completedTasks }}/{{ card.tasks }} tasks</span>
                      @if (card.dueDate) {
                        <span class="text-500">Due {{ formatDueDate(card.dueDate) }}</span>
                      }
                    </div>
                  </div>
                </p-card>
              }
            </div>
          </div>
        </div>

        <!-- Excavation Column -->
        <div class="col-12 lg:col-4">
          <div class="stage-column">
            <div class="flex justify-content-between align-items-center mb-3">
              <div class="flex align-items-center gap-2">
                <div class="stage-indicator bg-blue-500"></div>
                <h3 class="font-semibold m-0 text-color">Excavation</h3>
                <p-badge [value]="stages.excavation.length.toString()" severity="secondary"></p-badge>
              </div>
              <p-button 
                icon="pi pi-plus"
                [text]="true"
                [rounded]="true"
                size="small">
              </p-button>
            </div>
            <div class="space-y-3">
              @for (card of stages.excavation; track card.id) {
                <p-card class="stage-card cursor-pointer" styleClass="h-full">
                  <ng-template pTemplate="header">
                    <div class="flex justify-content-between align-items-start p-3 pb-0">
                      <h4 class="text-base font-semibold m-0 text-color line-height-3">{{ card.title }}</h4>
                      <div class="status-icon" [ngClass]="getStatusBgColor(card.status)">
                        <i [class]="getStatusIcon(card.status)" [ngClass]="getStatusColor(card.status)"></i>
                      </div>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-content-between align-items-center mb-2">
                        <span class="text-xs text-500">Progress</span>
                        <span class="text-xs font-semibold text-color">{{ card.progress }}%</span>
                      </div>
                      <p-progressBar 
                        [value]="card.progress" 
                        [showValue]="false"
                        styleClass="progress-thin">
                      </p-progressBar>
                    </div>
                    <div class="flex justify-content-between align-items-center text-xs">
                      <span class="text-500">{{ card.completedTasks }}/{{ card.tasks }} tasks</span>
                      @if (card.dueDate) {
                        <span class="text-500">Due {{ formatDueDate(card.dueDate) }}</span>
                      }
                    </div>
                  </div>
                </p-card>
              }
            </div>
          </div>
        </div>

        <!-- Milestones Column -->
        <div class="col-12 lg:col-4">
          <div class="stage-column">
            <div class="flex justify-content-between align-items-center mb-3">
              <div class="flex align-items-center gap-2">
                <div class="stage-indicator bg-gray-500"></div>
                <h3 class="font-semibold m-0 text-color">Milestones</h3>
                <p-badge [value]="stages.milestones.length.toString()" severity="secondary"></p-badge>
              </div>
              <p-button 
                icon="pi pi-plus"
                [text]="true"
                [rounded]="true"
                size="small">
              </p-button>
            </div>
            <div class="space-y-3">
              @for (card of stages.milestones; track card.id) {
                <p-card class="stage-card cursor-pointer" styleClass="h-full">
                  <ng-template pTemplate="header">
                    <div class="flex justify-content-between align-items-start p-3 pb-0">
                      <h4 class="text-base font-semibold m-0 text-color line-height-3">{{ card.title }}</h4>
                      <div class="status-icon" [ngClass]="getStatusBgColor(card.status)">
                        <i [class]="getStatusIcon(card.status)" [ngClass]="getStatusColor(card.status)"></i>
                      </div>
                    </div>
                  </ng-template>
                  
                  <div class="space-y-3">
                    <div>
                      <div class="flex justify-content-between align-items-center mb-2">
                        <span class="text-xs text-500">Progress</span>
                        <span class="text-xs font-semibold text-color">{{ card.progress }}%</span>
                      </div>
                      <p-progressBar 
                        [value]="card.progress" 
                        [showValue]="false"
                        styleClass="progress-thin">
                      </p-progressBar>
                    </div>
                    <div class="flex justify-content-between align-items-center text-xs">
                      <span class="text-500">{{ card.completedTasks }}/{{ card.tasks }} tasks</span>
                      @if (card.dueDate) {
                        <span class="text-500">Due {{ formatDueDate(card.dueDate) }}</span>
                      }
                    </div>
                  </div>
                </p-card>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .stage-kanban-container {
      padding: 1rem 0;
    }

    .stage-indicator {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
    }

    .bg-blue-500 {
      background-color: #3B82F6;
    }

    .bg-gray-500 {
      background-color: #6B7280;
    }

    .status-icon {
      border-radius: 50%;
      padding: 0.25rem;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        font-size: 0.75rem;
      }
    }

    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }

    ::ng-deep {
      .stage-card {
         margin: 1rem;
        // transition: all 0.2s ease-in-out;
        // border: 1px solid var(--surface-border);

        // &:hover {
        //   border-color: var(--primary-color);
        //   box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        //   transform: translateY(-2px);
        // }

        .p-card-body {
          padding: 1rem;
        }

        .p-card-content {
          padding: 0;
        }
      }

      .progress-thin {
        height: 0.375rem;

        .p-progressbar-value {
          background: linear-gradient(90deg, var(--primary-500), var(--primary-400));
        }
      }
    }

    .cursor-pointer {
      cursor: pointer;
    }

    .line-height-3 {
      line-height: 1.5;
    }

    // Status colors
    .status-completed {
      background-color: rgba(var(--primary-color-rgb), 0.1);
      color: var(--primary-color);
    }

    .status-in-progress {
      background-color: rgba(59, 130, 246, 0.1);
      color: #3B82F6;
    }

    .status-pending {
      background-color: var(--surface-200);
      color: var(--text-color-secondary);
    }

    .status-blocked {
      background-color: rgba(239, 68, 68, 0.1);
      color: #EF4444;
    }

    .text-blue-500 {
      color: #3B82F6;
    }

    .text-red-500 {
      color: #EF4444;
    }
  `]
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
        console.log('Loading stages for project:', this.projectId);
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
