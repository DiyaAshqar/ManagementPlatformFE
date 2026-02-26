import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-project-main-contractor-tab',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    SkeletonModule,
    TableModule,
    ToastModule,
    TooltipModule,
    BadgeModule
  ],
  providers: [MessageService],
  templateUrl: './project-main-contractor-tab.component.html',
  styleUrl: './project-main-contractor-tab.component.scss'
})
export class ProjectMainContractorTabComponent implements OnInit {
  @Input() projectStageId!: number;

  // Signal for loading state
  isLoading = signal(false);
  
  // Signal for contractor data
  contractorData = signal<any[]>([]);

  ngOnInit(): void {
    console.log('ProjectMainContractorTabComponent initialized with projectStageId:', this.projectStageId);
    this.loadContractorData();
  }

  loadContractorData(): void {
    this.isLoading.set(true);
    
    // TODO: Replace with actual API call
    // Example: this.projectMainContractorService.getByStage(this.projectStageId).subscribe(...)
    
    setTimeout(() => {
      this.contractorData.set([
        // Placeholder data
        {
          id: 1,
          contractorName: 'Main Contractor Company',
          contactPerson: 'John Doe',
          email: 'john@contractor.com',
          phone: '+966 50 123 4567',
          status: 'Active'
        }
      ]);
      this.isLoading.set(false);
    }, 500);
  }
}
