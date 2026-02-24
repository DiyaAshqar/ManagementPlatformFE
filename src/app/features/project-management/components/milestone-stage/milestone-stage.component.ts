import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { TabsModule } from 'primeng/tabs';
import { ProjectStageDto } from '../../../../../nswag/api-client';
import { BoqTabComponent } from './tabs/boq-tab/boq-tab.component';
import { PurchaseOrdersTabComponent } from './tabs/purchase-orders-tab/purchase-orders-tab.component';
import { SurveyingVisitsTabComponent } from './tabs/surveying-visits-tab/surveying-visits-tab.component';
import { VoucherOrdersTabComponent } from './tabs/voucher-orders-tab/voucher-orders-tab.component';
import { MilestoneDocumentsTabComponent } from './tabs/documents-tab/documents-tab.component';

@Component({
  selector: 'app-milestone-stage',
  standalone: true,
  imports: [
    CommonModule,
    AccordionModule,
    TabsModule,
    BoqTabComponent,
    PurchaseOrdersTabComponent,
    SurveyingVisitsTabComponent,
    VoucherOrdersTabComponent,
    MilestoneDocumentsTabComponent
  ],
  templateUrl: './milestone-stage.component.html',
  styleUrls: ['./milestone-stage.component.scss']
})
export class MilestoneStageComponent implements OnInit {
  @Input() projectId!: string;
  @Input() milestoneStages: ProjectStageDto[] = [];

  // Track active tab for each accordion panel
  activeTabs: { [stageId: number]: string } = {};
  
  // Track which tabs have been opened (format: "stageId-tabIndex")
  openedTabs = new Set<string>();
  
  // Track which accordion panels have been opened
  openedPanels = new Set<number>();
  
  // Track current active accordion panels
  activeAccordionPanels: number[] = [];

  ngOnInit(): void {
    // Initialize active tab for each stage to first tab
    this.milestoneStages.forEach(stage => {
      if (stage.id) {
        this.activeTabs[stage.id] = '0';
      }
    });
  }
  
  onAccordionChange(event: any): void {
    // Track opened panels
    if (event.value) {
      const openPanels = Array.isArray(event.value) ? event.value : [event.value];
      openPanels.forEach((panelId: number) => {
        if (!this.openedPanels.has(panelId)) {
          this.openedPanels.add(panelId);
          // Mark first tab as opened when panel opens
          this.openedTabs.add(`${panelId}-0`);
        }
      });
    }
  }
  
  isPanelLoaded(stageId: number): boolean {
    return this.openedPanels.has(stageId);
  }
  
  onTabChange(stageId: number, newTabValue: string | number): void {
    // Track that this tab has been opened
    const tabValue = typeof newTabValue === 'number' ? newTabValue.toString() : newTabValue;
    const key = `${stageId}-${tabValue}`;
    if (!this.openedTabs.has(key)) {
      this.openedTabs.add(key);
    }
  }
  
  shouldLoadTab(stageId: number, tabValue: string): boolean {
    return this.openedTabs.has(`${stageId}-${tabValue}`);
  }

  getMilestoneTitle(index: number, stage: ProjectStageDto): string {
    return `Milestone ${index + 1} - Stage #${stage.id}`;
  }
}



