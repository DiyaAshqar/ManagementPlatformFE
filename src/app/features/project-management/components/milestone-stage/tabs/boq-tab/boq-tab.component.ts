import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  CreateProjectBOQCommand,
  IGetProjectBOQDto,
  ProjectBOQClient
} from '../../../../../../../nswag/api-client';
import { AddBoqDialogComponent } from '../../../dialog/add-boq-dialog/add-boq-dialog.component';

// ─── Lookup maps ─────────────────────────────────────────────────────────────
const UNIT_MAP: Record<number, string> = {
  1: 'm³', 2: 'kg', 3: 'm²', 4: 'm', 5: 'L', 6: 'pcs', 7: 'ton', 8: 'hr'
};

// ─── Dummy seed data ──────────────────────────────────────────────────────────
const DUMMY_BOQ: IGetProjectBOQDto[] = [
  {
    id: 1, projectStageId: 0,
    description: 'Concrete Grade 30', materialId: 1, unitId: 1,
    actualQuantity: 150, price: 850, subTotal: 127500
  },
  {
    id: 2, projectStageId: 0,
    description: 'Steel Reinforcement', materialId: 2, unitId: 2,
    actualQuantity: 5000, price: 12.5, subTotal: 62500
  }
];

@Component({
  selector: 'app-boq-tab',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    AddBoqDialogComponent
  ],
  providers: [MessageService, ConfirmationService, ProjectBOQClient],
  templateUrl: './boq-tab.component.html',
  styleUrls: ['./boq-tab.component.scss']
})
export class BoqTabComponent implements OnInit {
  @Input() projectStageId: number = 0;

  boqItems  = signal<IGetProjectBOQDto[]>([]);
  isLoading = signal(false);

  showBoqDialog = signal(false);
  editBoqItem   = signal<IGetProjectBOQDto | null>(null);

  readonly unitMap = UNIT_MAP;

  get grandTotal(): number {
    return this.boqItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
  }

  getAmount(item: IGetProjectBOQDto): number {
    return (item.price ?? 0) * (item.actualQuantity ?? 0);
  }

  constructor(
    private boqClient: ProjectBOQClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadBoqItems();
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  loadBoqItems(): void {
    this.isLoading.set(true);

    // TODO: switch to real API when backend is ready:
    // this.boqClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
    //   next: (res) => {
    //     if (res.succeeded && res.data?.data) {
    //       this.boqItems.set(res.data.data);
    //     }
    //     this.isLoading.set(false);
    //   },
    //   error: () => this.isLoading.set(false)
    // });

    // ── Dummy ──
    setTimeout(() => {
      this.boqItems.set(DUMMY_BOQ.map(item => ({ ...item, projectStageId: this.projectStageId })));
      this.isLoading.set(false);
    }, 400);
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    this.editBoqItem.set(null);
    this.showBoqDialog.set(true);
  }

  openEditDialog(item: IGetProjectBOQDto): void {
    this.editBoqItem.set(item);
    this.showBoqDialog.set(true);
  }

  onDialogSaved(command: CreateProjectBOQCommand): void {
    // TODO: switch to real API when backend is ready:
    // this.boqClient.createOrUpdate(command).subscribe({
    //   next: () => { this.loadBoqItems(); this.showBoqDialog.set(false); },
    //   error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save.' })
    // });

    const currentItems = this.boqItems();

    if (command.id) {
      // Edit
      this.boqItems.set(currentItems.map(item =>
        item.id === command.id
          ? { ...item, ...command }
          : item
      ));
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'BoQ item updated successfully.' });
    } else {
      // Add
      const nextId = Math.max(0, ...currentItems.map(i => i.id ?? 0)) + 1;
      const newItem: IGetProjectBOQDto = { ...command, id: nextId };
      this.boqItems.set([...currentItems, newItem]);
      this.messageService.add({ severity: 'success', summary: 'Added', detail: 'BoQ item added successfully.' });
    }

    this.showBoqDialog.set(false);
  }

  confirmDelete(item: IGetProjectBOQDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.description}"?`,
      header: 'Delete BoQ Item',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        // TODO: this.boqClient.delete(item.id!, item.projectStageId!).subscribe({ ... });
        this.boqItems.set(this.boqItems().filter(i => i.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'BoQ item removed.' });
      }
    });
  }
}
