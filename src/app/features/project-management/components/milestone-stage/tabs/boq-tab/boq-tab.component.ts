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

    this.boqClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
      next: (res) => {
        if (res.succeeded && res.data?.data) {
          this.boqItems.set(res.data.data);
        } else {
          this.boqItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading BOQ items:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to load Bill of Quantities items.' 
        });
        this.isLoading.set(false);
      }
    });
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
    this.boqClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadBoqItems();
          this.showBoqDialog.set(false);
          this.messageService.add({ 
            severity: 'success', 
            summary: command.id ? 'Updated' : 'Added', 
            detail: command.id ? 'BoQ item updated successfully.' : 'BoQ item added successfully.' 
          });
        } else {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: res.message || 'Failed to save BoQ item.' 
          });
        }
      },
      error: (err) => {
        console.error('Error saving BOQ item:', err);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to save BoQ item.' 
        });
      }
    });
  }

  confirmDelete(item: IGetProjectBOQDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.description}"?`,
      header: 'Delete BoQ Item',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.boqClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadBoqItems();
              this.messageService.add({ 
                severity: 'success', 
                summary: 'Deleted', 
                detail: 'BoQ item removed successfully.' 
              });
            } else {
              this.messageService.add({ 
                severity: 'error', 
                summary: 'Error', 
                detail: res.message || 'Failed to delete BoQ item.' 
              });
            }
          },
          error: (err) => {
            console.error('Error deleting BOQ item:', err);
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'Failed to delete BoQ item.' 
            });
          }
        });
      }
    });
  }
}
