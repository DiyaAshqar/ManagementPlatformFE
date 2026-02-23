import { Component, Input } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { BoqTabComponent } from './tabs/boq-tab/boq-tab.component';
import { PurchaseOrdersTabComponent } from './tabs/purchase-orders-tab/purchase-orders-tab.component';
import { SurveyingVisitsTabComponent } from './tabs/surveying-visits-tab/surveying-visits-tab.component';
import { VoucherOrdersTabComponent } from './tabs/voucher-orders-tab/voucher-orders-tab.component';
import { MilestoneDocumentsTabComponent } from './tabs/documents-tab/documents-tab.component';

@Component({
  selector: 'app-milestone-stage',
  standalone: true,
  imports: [
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
export class MilestoneStageComponent {
  @Input() projectId!: string;
  /** Passed down to each tab that needs a stage ID */
  @Input() projectStageId: number = 0;

  activeTab = '0';
}



