import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ConstructorClient,
  CreateProjectBOQCommand,
  IGetProjectBOQDto,
  LookupClient,
  ProjectBOQClient
} from '../../../../../../../nswag/api-client';
import { AddBoqDialogComponent } from '../../../dialog/add-boq-dialog/add-boq-dialog.component';

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
  providers: [MessageService, ConfirmationService, ProjectBOQClient, LookupClient, ConstructorClient],
  templateUrl: './boq-tab.component.html',
  styleUrls: ['./boq-tab.component.scss']
})
export class BoqTabComponent implements OnInit {
  @Input() projectStageId: number = 0;

  boqItems = signal<IGetProjectBOQDto[]>([]);
  isLoading = signal(false);

  showBoqDialog = signal(false);
  editBoqItem = signal<IGetProjectBOQDto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  unitMap: Record<number, string> = {};
  materialMap: Record<number, string> = {};
  constructorMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  unitOptions: { label: string; value: number }[] = [];
  materialOptions: { label: string; value: number }[] = [];
  constructorOptions: { label: string; value: number }[] = [];

  get grandTotal(): number {
    return this.boqItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
  }

  getAmount(item: IGetProjectBOQDto): number {
    return (item.price ?? 0) * (item.actualQuantity ?? 0);
  }

  constructor(
    private boqClient: ProjectBOQClient,
    private lookupClient: LookupClient,
    private constructorClient: ConstructorClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.loadLookups();
    this.loadBoqItems();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    forkJoin({
      lookups: this.lookupClient.getAllLookups(['material', 'unit']),
      constructors: this.constructorClient.getAll(1, 200, undefined)
    }).subscribe({
      next: ({ lookups, constructors }) => {
        const data = lookups.data as any;

        if (data?.['material']) {
          this.materialOptions = (data['material'] as { id: number; name: string }[])
            .map(m => ({ label: m.name, value: m.id }));
          this.materialMap = Object.fromEntries(this.materialOptions.map(o => [o.value, o.label]));
        }

        if (data?.['unit']) {
          this.unitOptions = (data['unit'] as { id: number; name: string }[])
            .map(u => ({ label: u.name, value: u.id }));
          this.unitMap = Object.fromEntries(this.unitOptions.map(o => [o.value, o.label]));
        }

        const ctors = constructors.data?.data ?? [];
        this.constructorOptions = ctors
          .filter(c => c.id != null && c.name)
          .map(c => ({ label: c.name!, value: c.id! }));
        this.constructorMap = Object.fromEntries(this.constructorOptions.map(o => [o.value, o.label]));
      }
    });
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
      const newItem: IGetProjectBOQDto = {
        ...command,
        id: nextId,
        constructorId: command.constructorId
      };
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
