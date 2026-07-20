import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AccordionModule } from 'primeng/accordion';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { ProjectStageDto } from '../../../../../nswag/api-client';
import { BoqTabComponent } from './tabs/boq-tab/boq-tab.component';
import { PurchaseOrdersTabComponent } from './tabs/purchase-orders-tab/purchase-orders-tab.component';
import { SurveyingVisitsTabComponent } from './tabs/surveying-visits-tab/surveying-visits-tab.component';
import { VoucherOrdersTabComponent } from './tabs/voucher-orders-tab/voucher-orders-tab.component';
import { MilestoneDocumentsTabComponent } from './tabs/documents-tab/documents-tab.component';
import { ProjectMainContractorTabComponent } from './tabs/project-main-contractor-tab/project-main-contractor-tab.component';
import { ProjectExpenseManagementComponent } from '../project-expense-management/project-expense-management.component';
import { ProjectAdvanceManagementComponent } from '../project-advance-management/project-advance-management.component';
import { PaymentClaimTabComponent } from './tabs/payment-claim-tab/payment-claim-tab.component';
import { PreparingStageComponent } from '../preparing-stage/preparing-stage.component';
import { Permissions } from '../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../core/auth/directives/has-permission.directive';

@Component({
  selector: 'app-milestone-stage',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AccordionModule,
    SkeletonModule,
    TabsModule,
    BoqTabComponent,
    PurchaseOrdersTabComponent,
    SurveyingVisitsTabComponent,
    VoucherOrdersTabComponent,
    MilestoneDocumentsTabComponent,
    ProjectMainContractorTabComponent,
    ProjectExpenseManagementComponent,
    ProjectAdvanceManagementComponent,
    PaymentClaimTabComponent,
    PreparingStageComponent,
    HasPermissionDirective
  ],
  templateUrl: './milestone-stage.component.html',
  styleUrls: ['./milestone-stage.component.scss']
})
export class MilestoneStageComponent implements OnInit {
  readonly permissions = Permissions;
  @Input() projectId!: string;
  @Input() projectName: string = '';
  @Input() milestoneStages: ProjectStageDto[] = [];
  @Input() agreementId: number = 0;

  isLoadingMilestones = signal(false);

  // Track active tab for each accordion panel
  activeTabs: { [panelId: number]: string } = {};
  
  // Track which tabs have been opened (format: "panelId-tabIndex")
  openedTabs = new Set<string>();
  
  // Track which accordion panels have been opened
  openedPanels = new Set<number>();
  
  // Track current active accordion panel (single selection)
  activeAccordionValue: any = undefined;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.milestoneStages.forEach(stage => {
      if (stage.id) {
        this.activeTabs[stage.id] = this.firstAccessibleTab();
      }
    });
  }

  onAccordionChange(event: any): void {
    const panelId: number | undefined = event.value ?? undefined;
    if (panelId !== undefined && !this.openedPanels.has(panelId)) {
      this.openedPanels.add(panelId);
      const firstTab = this.firstAccessibleTab();
      this.activeTabs[panelId] = firstTab;
      this.openedTabs.add(`${panelId}-${firstTab}`);
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

  canViewTab(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }

  private firstAccessibleTab(): string {
    const tabs = [
      ['0', Permissions.MilestoneTabs.BOQ],
      ['1', Permissions.MilestoneTabs.ProjectMainContractor],
      ['2', Permissions.MilestoneTabs.PurchaseOrders],
      ['3', Permissions.MilestoneTabs.SurveyingVisits],
      ['4', Permissions.MilestoneTabs.VoucherOrders],
      ['5', Permissions.MilestoneTabs.Documents],
      ['6', Permissions.MilestoneTabs.PettyCash],
      ['7', Permissions.MilestoneTabs.Advances],
      ['8', Permissions.MilestoneTabs.Tasks],
      ['9', Permissions.MilestoneTabs.PaymentClaims],
    ] as const;
    return tabs.find(([, permission]) => this.canViewTab(permission))?.[0] ?? '0';
  }

  getMilestoneTitle(index: number, stage: ProjectStageDto): string {
    return stage.mileStone?.name || `Milestone ${index + 1}`;
  }
}



