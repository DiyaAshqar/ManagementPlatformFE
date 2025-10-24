import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

interface AnalyticsMetric {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    TableModule,
    TagModule
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
  
  metrics: AnalyticsMetric[] = [
    {
      title: 'Total Revenue',
      value: '$124,563',
      change: '+12.5%',
      changeType: 'positive',
      icon: 'pi pi-dollar'
    },
    {
      title: 'Active Users',
      value: '8,492',
      change: '+8.2%',
      changeType: 'positive',
      icon: 'pi pi-users'
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '-2.1%',
      changeType: 'negative',
      icon: 'pi pi-chart-line'
    },
    {
      title: 'Avg. Session',
      value: '4m 32s',
      change: '+5.3%',
      changeType: 'positive',
      icon: 'pi pi-clock'
    }
  ];

  timeRanges = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'Last Year', value: '1y' }
  ];

  selectedTimeRange = this.timeRanges[1];

  topPages = [
    { page: '/dashboard', views: 4521, avgTime: '3m 24s', bounceRate: '42%' },
    { page: '/analytics', views: 3240, avgTime: '4m 12s', bounceRate: '38%' },
    { page: '/projects', views: 2890, avgTime: '2m 56s', bounceRate: '51%' },
    { page: '/settings', views: 1823, avgTime: '5m 18s', bounceRate: '29%' },
    { page: '/members', views: 1456, avgTime: '3m 42s', bounceRate: '45%' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  loadAnalyticsData(): void {
    // Simulate loading analytics data
    // In a real application, this would call an API service
    console.log('Loading analytics data for:', this.selectedTimeRange.value);
  }

  onTimeRangeChange(): void {
    this.loadAnalyticsData();
  }

  exportData(): void {
    console.log('Exporting analytics data...');
    // Implement export functionality
  }

  parseFloat(value: string): number {
    return parseFloat(value);
  }
}
