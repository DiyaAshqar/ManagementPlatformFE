import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { AccordionModule } from 'primeng/accordion';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';

interface Contractor {
  id: string;
  name: string;
  company: string;
  trade: string;
  contact: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'pending';
}

interface BoQItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  description: string;
  amount: string;
  orderDate: string;
  deliveryDate: string;
  status: 'pending' | 'approved' | 'delivered';
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  uploadedBy: string;
}

interface SurveyingVisit {
  id: string;
  visitDate: string;
  surveyor: string;
  purpose: string;
  findings: string;
  status: 'scheduled' | 'completed' | 'pending';
}

interface VoucherOrder {
  id: string;
  voNumber: string;
  description: string;
  amount: string;
  requestDate: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy: string;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
  dueDate: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  budget: string;
  progress: number;
  status: 'completed' | 'in-progress' | 'pending' | 'delayed';
  subTasks: SubTask[];
  notes: string;
  contractors: Contractor[];
  boqItems: BoQItem[];
  purchaseOrders: PurchaseOrder[];
  documents: Document[];
  surveyingVisits: SurveyingVisit[];
  voucherOrders: VoucherOrder[];
}

@Component({
  selector: 'app-milestone-stage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    TagModule,
    AccordionModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    TableModule,
    TabViewModule,
    CheckboxModule,
    SelectModule,
    InputNumberModule
  ],
  templateUrl: './milestone-stage.component.html',
  styleUrls: ['./milestone-stage.component.scss']
})
export class MilestoneStageComponent implements OnInit {
  @Input() projectId!: string;

  milestones: Milestone[] = [];
  expandedMilestones: Set<string> = new Set(['mile-1']);
  
  // Dialog states
  isAddMilestoneDialogOpen = false;
  isAddContractorDialogOpen = false;
  isAddBoQDialogOpen = false;
  isAddPODialogOpen = false;
  isAddSurveyingDialogOpen = false;
  isAddVODialogOpen = false;
  
  currentMilestoneId = '';

  // Form data
  newMilestone: Partial<Milestone> = this.getEmptyMilestone();
  newContractor: Partial<Contractor> = this.getEmptyContractor();
  newBoQItem: Partial<BoQItem> = this.getEmptyBoQItem();
  newPurchaseOrder: Partial<PurchaseOrder> = this.getEmptyPurchaseOrder();
  newSurveyingVisit: Partial<SurveyingVisit> = this.getEmptySurveyingVisit();
  newVoucherOrder: Partial<VoucherOrder> = this.getEmptyVoucherOrder();

  statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' }
  ];

  ngOnInit() {
    this.loadMockData();
  }

  loadMockData() {
    this.milestones = [
      {
        id: 'mile-1',
        title: 'Foundation Complete',
        description: 'Complete all foundation work including footings, grade beams, and basement walls',
        targetDate: '2024-03-01',
        budget: '$450,000',
        progress: 0,
        status: 'pending',
        subTasks: [
          {
            id: 'st-1',
            title: 'Pour foundation footings',
            completed: false,
            assignee: 'Construction Team A',
            dueDate: '2024-02-20'
          },
          {
            id: 'st-2',
            title: 'Install rebar and formwork',
            completed: false,
            assignee: 'Construction Team A',
            dueDate: '2024-02-22'
          }
        ],
        notes: 'Weather conditions may affect concrete curing time. Monitor temperature closely.',
        contractors: [
          {
            id: 'c-1',
            name: 'John Smith',
            company: 'ABC Concrete Ltd',
            trade: 'Concrete Work',
            contact: '+1-555-0101',
            startDate: '2024-02-15',
            endDate: '2024-03-01',
            status: 'active'
          }
        ],
        boqItems: [
          {
            id: 'boq-1',
            itemCode: 'FND-001',
            description: 'Concrete Grade 30 for Foundation',
            unit: 'm³',
            quantity: 150,
            rate: 120,
            amount: 18000
          },
          {
            id: 'boq-2',
            itemCode: 'FND-002',
            description: 'Reinforcement Steel',
            unit: 'ton',
            quantity: 12,
            rate: 850,
            amount: 10200
          }
        ],
        purchaseOrders: [
          {
            id: 'po-1',
            poNumber: 'PO-2024-001',
            vendor: 'Steel Suppliers Inc',
            description: 'Reinforcement bars and mesh',
            amount: '$12,500',
            orderDate: '2024-02-01',
            deliveryDate: '2024-02-14',
            status: 'delivered'
          }
        ],
        documents: [
          {
            id: 'doc-1',
            name: 'Foundation Design Drawings.pdf',
            type: 'PDF',
            uploadDate: '2024-01-15',
            size: '2.4 MB',
            uploadedBy: 'Engineering Team'
          }
        ],
        surveyingVisits: [
          {
            id: 'sv-1',
            visitDate: '2024-02-10',
            surveyor: 'Mike Johnson',
            purpose: 'Foundation level verification',
            findings: 'Levels within tolerance',
            status: 'completed'
          }
        ],
        voucherOrders: [
          {
            id: 'vo-1',
            voNumber: 'VO-2024-001',
            description: 'Additional excavation work',
            amount: '$5,000',
            requestDate: '2024-02-05',
            approvalStatus: 'approved',
            approvedBy: 'Project Manager'
          }
        ]
      }
    ];
  }

  get completedMilestones(): number {
    return this.milestones.filter(m => m.status === 'completed').length;
  }

  get totalBudget(): number {
    return this.milestones.reduce((sum, m) => 
      sum + parseFloat(m.budget.replace(/[^\d.]/g, '')), 0
    );
  }

  get averageProgress(): number {
    if (this.milestones.length === 0) return 0;
    return Math.round(
      this.milestones.reduce((sum, m) => sum + m.progress, 0) / this.milestones.length
    );
  }

  isMilestoneExpanded(id: string): boolean {
    return this.expandedMilestones.has(id);
  }

  toggleSubTask(milestoneId: string, subTaskId: string) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      const task = milestone.subTasks.find(t => t.id === subTaskId);
      if (task) {
        task.completed = !task.completed;
        this.updateMilestoneProgress(milestone);
      }
    }
  }

  updateMilestoneProgress(milestone: Milestone) {
    const completedCount = milestone.subTasks.filter(t => t.completed).length;
    milestone.progress = Math.round((completedCount / milestone.subTasks.length) * 100);
  }

  // Milestone operations
  openAddMilestoneDialog() {
    this.newMilestone = this.getEmptyMilestone();
    this.isAddMilestoneDialogOpen = true;
  }

  addMilestone() {
    if (!this.newMilestone.title || !this.newMilestone.targetDate) return;

    const milestone: Milestone = {
      id: `mile-${Date.now()}`,
      title: this.newMilestone.title,
      description: this.newMilestone.description || '',
      targetDate: this.newMilestone.targetDate,
      budget: this.newMilestone.budget || '$0',
      progress: 0,
      status: 'pending',
      subTasks: [],
      notes: this.newMilestone.notes || '',
      contractors: [],
      boqItems: [],
      purchaseOrders: [],
      documents: [],
      surveyingVisits: [],
      voucherOrders: []
    };

    this.milestones.push(milestone);
    this.isAddMilestoneDialogOpen = false;
    this.newMilestone = this.getEmptyMilestone();
  }

  // Contractor operations
  openAddContractorDialog(milestoneId: string) {
    this.currentMilestoneId = milestoneId;
    this.newContractor = this.getEmptyContractor();
    this.isAddContractorDialogOpen = true;
  }

  addContractor() {
    if (!this.newContractor.name || !this.newContractor.company) return;

    const milestone = this.milestones.find(m => m.id === this.currentMilestoneId);
    if (milestone) {
      milestone.contractors.push({
        id: `c-${Date.now()}`,
        name: this.newContractor.name!,
        company: this.newContractor.company!,
        trade: this.newContractor.trade || '',
        contact: this.newContractor.contact || '',
        startDate: this.newContractor.startDate || '',
        endDate: this.newContractor.endDate || '',
        status: this.newContractor.status || 'pending'
      });
      this.isAddContractorDialogOpen = false;
    }
  }

  deleteContractor(milestoneId: string, contractorId: string) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.contractors = milestone.contractors.filter(c => c.id !== contractorId);
    }
  }

  // BoQ operations
  openAddBoQDialog(milestoneId: string) {
    this.currentMilestoneId = milestoneId;
    this.newBoQItem = this.getEmptyBoQItem();
    this.isAddBoQDialogOpen = true;
  }

  addBoQItem() {
    if (!this.newBoQItem.itemCode || !this.newBoQItem.description) return;

    const milestone = this.milestones.find(m => m.id === this.currentMilestoneId);
    if (milestone) {
      const amount = (this.newBoQItem.quantity || 0) * (this.newBoQItem.rate || 0);
      milestone.boqItems.push({
        id: `boq-${Date.now()}`,
        itemCode: this.newBoQItem.itemCode!,
        description: this.newBoQItem.description!,
        unit: this.newBoQItem.unit || '',
        quantity: this.newBoQItem.quantity || 0,
        rate: this.newBoQItem.rate || 0,
        amount: amount
      });
      this.isAddBoQDialogOpen = false;
    }
  }

  deleteBoQItem(milestoneId: string, itemId: string) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.boqItems = milestone.boqItems.filter(i => i.id !== itemId);
    }
  }

  getBoQTotal(items: BoQItem[]): number {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }

  // Purchase Order operations
  openAddPODialog(milestoneId: string) {
    this.currentMilestoneId = milestoneId;
    this.newPurchaseOrder = this.getEmptyPurchaseOrder();
    this.isAddPODialogOpen = true;
  }

  addPurchaseOrder() {
    if (!this.newPurchaseOrder.poNumber || !this.newPurchaseOrder.vendor) return;

    const milestone = this.milestones.find(m => m.id === this.currentMilestoneId);
    if (milestone) {
      milestone.purchaseOrders.push({
        id: `po-${Date.now()}`,
        poNumber: this.newPurchaseOrder.poNumber!,
        vendor: this.newPurchaseOrder.vendor!,
        description: this.newPurchaseOrder.description || '',
        amount: this.newPurchaseOrder.amount || '$0',
        orderDate: this.newPurchaseOrder.orderDate || '',
        deliveryDate: this.newPurchaseOrder.deliveryDate || '',
        status: this.newPurchaseOrder.status || 'pending'
      });
      this.isAddPODialogOpen = false;
    }
  }

  deletePurchaseOrder(milestoneId: string, poId: string) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.purchaseOrders = milestone.purchaseOrders.filter(p => p.id !== poId);
    }
  }

  // Surveying Visit operations
  openAddSurveyingDialog(milestoneId: string) {
    this.currentMilestoneId = milestoneId;
    this.newSurveyingVisit = this.getEmptySurveyingVisit();
    this.isAddSurveyingDialogOpen = true;
  }

  addSurveyingVisit() {
    if (!this.newSurveyingVisit.visitDate || !this.newSurveyingVisit.surveyor) return;

    const milestone = this.milestones.find(m => m.id === this.currentMilestoneId);
    if (milestone) {
      milestone.surveyingVisits.push({
        id: `sv-${Date.now()}`,
        visitDate: this.newSurveyingVisit.visitDate!,
        surveyor: this.newSurveyingVisit.surveyor!,
        purpose: this.newSurveyingVisit.purpose || '',
        findings: this.newSurveyingVisit.findings || '',
        status: this.newSurveyingVisit.status || 'scheduled'
      });
      this.isAddSurveyingDialogOpen = false;
    }
  }

  deleteSurveyingVisit(milestoneId: string, visitId: string) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.surveyingVisits = milestone.surveyingVisits.filter(v => v.id !== visitId);
    }
  }

  // Voucher Order operations
  openAddVODialog(milestoneId: string) {
    this.currentMilestoneId = milestoneId;
    this.newVoucherOrder = this.getEmptyVoucherOrder();
    this.isAddVODialogOpen = true;
  }

  addVoucherOrder() {
    if (!this.newVoucherOrder.voNumber || !this.newVoucherOrder.description) return;

    const milestone = this.milestones.find(m => m.id === this.currentMilestoneId);
    if (milestone) {
      milestone.voucherOrders.push({
        id: `vo-${Date.now()}`,
        voNumber: this.newVoucherOrder.voNumber!,
        description: this.newVoucherOrder.description!,
        amount: this.newVoucherOrder.amount || '$0',
        requestDate: this.newVoucherOrder.requestDate || '',
        approvalStatus: this.newVoucherOrder.approvalStatus || 'pending',
        approvedBy: this.newVoucherOrder.approvedBy || ''
      });
      this.isAddVODialogOpen = false;
    }
  }

  deleteVoucherOrder(milestoneId: string, voId: string) {
    const milestone = this.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      milestone.voucherOrders = milestone.voucherOrders.filter(v => v.id !== voId);
    }
  }

  // Utility methods
  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
      'completed': 'success',
      'active': 'info',
      'in-progress': 'info',
      'pending': 'warning',
      'delayed': 'danger',
      'approved': 'success',
      'delivered': 'success',
      'rejected': 'danger',
      'scheduled': 'info'
    };
    return severityMap[status] || 'secondary';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getCompletedSubTasksCount(subTasks: SubTask[]): number {
    return subTasks.filter(t => t.completed).length;
  }

  private getEmptyMilestone(): Partial<Milestone> {
    return {
      title: '',
      description: '',
      targetDate: '',
      budget: '',
      notes: ''
    };
  }

  private getEmptyContractor(): Partial<Contractor> {
    return {
      name: '',
      company: '',
      trade: '',
      contact: '',
      startDate: '',
      endDate: '',
      status: 'pending'
    };
  }

  private getEmptyBoQItem(): Partial<BoQItem> {
    return {
      itemCode: '',
      description: '',
      unit: '',
      quantity: 0,
      rate: 0
    };
  }

  private getEmptyPurchaseOrder(): Partial<PurchaseOrder> {
    return {
      poNumber: '',
      vendor: '',
      description: '',
      amount: '',
      orderDate: '',
      deliveryDate: '',
      status: 'pending'
    };
  }

  private getEmptySurveyingVisit(): Partial<SurveyingVisit> {
    return {
      visitDate: '',
      surveyor: '',
      purpose: '',
      findings: '',
      status: 'scheduled'
    };
  }

  private getEmptyVoucherOrder(): Partial<VoucherOrder> {
    return {
      voNumber: '',
      description: '',
      amount: '',
      requestDate: '',
      approvalStatus: 'pending',
      approvedBy: ''
    };
  }
}
