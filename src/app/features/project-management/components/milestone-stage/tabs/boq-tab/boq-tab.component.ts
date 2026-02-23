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
import { ProjectBOQClient } from '../../../../../../../nswag/api-client';
import { AddBoqDialogComponent, BoqFormResult } from '../../../dialog/add-boq-dialog/add-boq-dialog.component';
import type { BoqItemDisplay } from '../../../../models/boq.model';

// ─── Lookup maps ─────────────────────────────────────────────────────────────
const UNIT_MAP: Record<number, string> = {
  1: 'm³', 2: 'kg', 3: 'm²', 4: 'm', 5: 'L', 6: 'pcs', 7: 'ton', 8: 'hr'
};

const MATERIAL_MAP: Record<number, string> = {
  1: 'Concrete Grade 30', 2: 'Steel Reinforcement', 3: 'Cement Bags',
  4: 'Sand', 5: 'Gravel', 6: 'Bricks', 7: 'Timber',
  8: 'Waterproofing Membrane', 9: 'PVC Pipes', 10: 'Electrical Cable'
};

// ─── Dummy seed data ──────────────────────────────────────────────────────────
const DUMMY_BOQ: BoqItemDisplay[] = [
  {
    id: 1, projectStageId: 0, itemCode: 'Item-001',
    description: 'Concrete Grade 30', materialId: 1, unitId: 1, unitLabel: 'm³',
    actualQuantity: 150, price: 850, amount: 127500, subTotal: 127500
  },
  {
    id: 2, projectStageId: 0, itemCode: 'Item-002',
    description: 'Steel Reinforcement', materialId: 2, unitId: 2, unitLabel: 'kg',
    actualQuantity: 5000, price: 12.5, amount: 62500, subTotal: 62500
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

  boqItems  = signal<BoqItemDisplay[]>([]);
  isLoading = signal(false);

  showBoqDialog = signal(false);
  editBoqItem   = signal<BoqItemDisplay | null>(null);

  get grandTotal(): number {
    return this.boqItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
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
    //       this.boqItems.set(res.data.data.map((dto, i) => this.mapDto(dto, i)));
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

  openEditDialog(item: BoqItemDisplay): void {
    this.editBoqItem.set(item);
    this.showBoqDialog.set(true);
  }

  onDialogSaved(result: BoqFormResult): void {
    // TODO: switch to real API when backend is ready:
    // const command = new CreateProjectBOQCommand({ ...result });
    // this.boqClient.createOrUpdate(command).subscribe({ ... });

    const currentItems = this.boqItems();
    const unitLabel = UNIT_MAP[result.unitId] ?? result.unitId.toString();

    if (result.id) {
      // Edit
      this.boqItems.set(currentItems.map(item =>
        item.id === result.id
          ? { ...item, description: result.description, materialId: result.materialId,
              unitId: result.unitId, unitLabel, actualQuantity: result.actualQuantity,
              price: result.price, amount: result.actualQuantity * result.price,
              subTotal: result.subTotal }
          : item
      ));
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'BoQ item updated successfully.' });
    } else {
      // Add
      const nextId = Math.max(0, ...currentItems.map(i => i.id)) + 1;
      const newItem: BoqItemDisplay = {
        id: nextId,
        projectStageId: result.projectStageId,
        itemCode: `Item-${String(nextId).padStart(3, '0')}`,
        description: result.description,
        materialId: result.materialId,
        unitId: result.unitId,
        unitLabel,
        actualQuantity: result.actualQuantity,
        price: result.price,
        amount: result.actualQuantity * result.price,
        subTotal: result.subTotal
      };
      this.boqItems.set([...currentItems, newItem]);
      this.messageService.add({ severity: 'success', summary: 'Added', detail: 'BoQ item added successfully.' });
    }

    this.showBoqDialog.set(false);
  }

  confirmDelete(item: BoqItemDisplay): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.description}"?`,
      header: 'Delete BoQ Item',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        // TODO: this.boqClient.delete(item.id, item.projectStageId).subscribe({ ... });
        this.boqItems.set(this.boqItems().filter(i => i.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'BoQ item removed.' });
      }
    });
  }

  // ── DTO mapper (used when switching to real API) ──────────────────────────
  private mapDto(dto: any, index: number): BoqItemDisplay {
    return {
      id:             dto.id,
      projectStageId: dto.projectStageId,
      itemCode:       `Item-${String(index + 1).padStart(3, '0')}`,
      description:    dto.description ?? MATERIAL_MAP[dto.materialId] ?? 'Unknown',
      materialId:     dto.materialId,
      unitId:         dto.unitId,
      unitLabel:      UNIT_MAP[dto.unitId] ?? `Unit ${dto.unitId}`,
      actualQuantity: dto.actualQuantity ?? 0,
      price:          dto.price ?? 0,
      amount:         (dto.price ?? 0) * (dto.actualQuantity ?? 0),
      subTotal:       dto.subTotal ?? 0,
      constructorId:  dto.constructorId
    };
  }
}
