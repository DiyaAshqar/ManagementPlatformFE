import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  iconClass: string;
  trend?: number;
  trendLabel?: string;
}

interface RecentProject {
  id: number;
  name: string;
  client: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  progress: number;
  dueDate: string;
}

interface RecentAgreement {
  id: number;
  title: string;
  client: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdDate: string;
}

interface UpcomingTask {
  id: number;
  title: string;
  project: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    ChartModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    AvatarModule,
    TooltipModule,
    SkeletonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  isLoading = true;

  // Statistics
  statCards: StatCard[] = [
    {
      title: 'Total Projects',
      value: 24,
      icon: 'pi pi-briefcase',
      iconClass: 'stat-icon-projects',
      trend: 12,
      trendLabel: 'vs last month'
    },
    {
      title: 'Active Agreements',
      value: 18,
      icon: 'pi pi-file',
      iconClass: 'stat-icon-agreements',
      trend: 8,
      trendLabel: 'vs last month'
    },
    {
      title: 'Total Suppliers',
      value: 42,
      icon: 'pi pi-building',
      iconClass: 'stat-icon-suppliers',
      trend: 5,
      trendLabel: 'new this month'
    },
    {
      title: 'Constructors',
      value: 15,
      icon: 'pi pi-users',
      iconClass: 'stat-icon-constructors',
      trend: 3,
      trendLabel: 'new this month'
    }
  ];

  // Charts Data
  projectStatusChartData: any;
  projectStatusChartOptions: any;
  monthlyProgressChartData: any;
  monthlyProgressChartOptions: any;

  // Recent Projects
  recentProjects: RecentProject[] = [
    { id: 1, name: 'Mall Construction Phase 2', client: 'ABC Holdings', status: 'in_progress', progress: 65, dueDate: '2026-04-15' },
    { id: 2, name: 'Office Building Renovation', client: 'XYZ Corp', status: 'planning', progress: 20, dueDate: '2026-05-01' },
    { id: 3, name: 'Residential Complex A', client: 'Home Builders Ltd', status: 'in_progress', progress: 45, dueDate: '2026-06-30' },
    { id: 4, name: 'Highway Extension Project', client: 'Government', status: 'on_hold', progress: 30, dueDate: '2026-07-15' },
    { id: 5, name: 'School Building', client: 'Education Dept', status: 'completed', progress: 100, dueDate: '2026-02-28' }
  ];

  // Recent Agreements
  recentAgreements: RecentAgreement[] = [
    { id: 1, title: 'Construction Agreement #2024-001', client: 'ABC Holdings', status: 'approved', createdDate: '2026-02-25' },
    { id: 2, title: 'Supplier Contract #2024-015', client: 'Steel Works Inc', status: 'pending', createdDate: '2026-02-28' },
    { id: 3, title: 'Maintenance Agreement #2024-008', client: 'City Council', status: 'draft', createdDate: '2026-03-01' },
    { id: 4, title: 'Partnership Agreement #2024-003', client: 'Construction Co.', status: 'approved', createdDate: '2026-02-20' }
  ];

  // Upcoming Tasks
  upcomingTasks: UpcomingTask[] = [
    { id: 1, title: 'Review BOQ for Mall Project', project: 'Mall Construction Phase 2', priority: 'high', dueDate: '2026-03-05' },
    { id: 2, title: 'Site inspection', project: 'Office Building Renovation', priority: 'medium', dueDate: '2026-03-06' },
    { id: 3, title: 'Submit progress report', project: 'Residential Complex A', priority: 'urgent', dueDate: '2026-03-03' },
    { id: 4, title: 'Contractor meeting', project: 'Highway Extension Project', priority: 'low', dueDate: '2026-03-10' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.initCharts();
    // Simulate loading
    setTimeout(() => {
      this.isLoading = false;
    }, 500);
  }

  initCharts(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    // Project Status Donut Chart
    this.projectStatusChartData = {
      labels: ['In Progress', 'Planning', 'Completed', 'On Hold'],
      datasets: [
        {
          data: [10, 5, 6, 3],
          backgroundColor: [
            '#3b82f6', // Blue - In Progress
            '#f59e0b', // Orange - Planning  
            '#10b981', // Green - Completed
            '#6b7280'  // Gray - On Hold
          ],
          hoverBackgroundColor: [
            '#2563eb',
            '#d97706',
            '#059669',
            '#4b5563'
          ]
        }
      ]
    };

    this.projectStatusChartOptions = {
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 20
          }
        }
      }
    };

    // Monthly Progress Bar Chart
    this.monthlyProgressChartData = {
      labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
      datasets: [
        {
          label: 'Projects Started',
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          data: [4, 6, 3, 5, 7, 4]
        },
        {
          label: 'Projects Completed',
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          data: [2, 4, 5, 3, 4, 6]
        }
      ]
    };

    this.monthlyProgressChartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 1.5,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false
          }
        }
      }
    };
  }

  // Quick Actions
  navigateToProjects(): void {
    this.router.navigate(['/projects']);
  }

  navigateToAgreements(): void {
    this.router.navigate(['/agreement-wizard']);
  }

  navigateToSuppliers(): void {
    this.router.navigate(['/supplier']);
  }

  navigateToConstructors(): void {
    this.router.navigate(['/constructor']);
  }

  viewProject(project: RecentProject): void {
    this.router.navigate(['/projects', project.id]);
  }

  viewAgreement(agreement: RecentAgreement): void {
    this.router.navigate(['/agreement-wizard/view', agreement.id]);
  }

  // Status styling helpers
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: { [key: string]: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' } = {
      'completed': 'success',
      'approved': 'success',
      'in_progress': 'info',
      'pending': 'warn',
      'planning': 'warn',
      'draft': 'secondary',
      'on_hold': 'secondary',
      'rejected': 'danger'
    };
    return severityMap[status] || 'info';
  }

  getStatusLabel(status: string): string {
    const labelMap: { [key: string]: string } = {
      'completed': 'Completed',
      'approved': 'Approved',
      'in_progress': 'In Progress',
      'pending': 'Pending',
      'planning': 'Planning',
      'draft': 'Draft',
      'on_hold': 'On Hold',
      'rejected': 'Rejected'
    };
    return labelMap[status] || status;
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severityMap: { [key: string]: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' } = {
      'low': 'secondary',
      'medium': 'info',
      'high': 'warn',
      'urgent': 'danger'
    };
    return severityMap[priority] || 'info';
  }

  getPriorityLabel(priority: string): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }
}
