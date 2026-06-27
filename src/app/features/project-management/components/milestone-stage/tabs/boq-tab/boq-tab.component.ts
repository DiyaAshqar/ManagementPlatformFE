import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmationService } from 'primeng/api';
import {
  ConstructorClient,
  CreateProjectBOQCommand,
  IGetProjectBOQDto,
  LookupClient,
  ProjectBOQClient,
  SupplierClient
} from '../../../../../../../nswag/api-client';
import { AddBoqDialogComponent } from '../../../dialog/add-boq-dialog/add-boq-dialog.component';

@Component({
  selector: 'app-boq-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    AddBoqDialogComponent
  ],
  providers: [ProjectBOQClient, LookupClient, ConstructorClient, SupplierClient],
  templateUrl: './boq-tab.component.html',
  styleUrls: ['./boq-tab.component.scss']
})
export class BoqTabComponent implements OnInit, OnDestroy {
  @Input() projectStageId: number = 0;

  boqItems = signal<IGetProjectBOQDto[]>([]);
  isLoading = signal(false);

  showBoqDialog = signal(false);
  editBoqItem = signal<IGetProjectBOQDto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  unitMap: Record<number, string> = {};
  materialMap: Record<number, string> = {};
  constructorMap: Record<number, string> = {};
  supplierMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  unitOptions: { label: string; value: number }[] = [];
  materialOptions: { label: string; value: number }[] = [];
  constructorOptions: { label: string; value: number }[] = [];
  supplierOptions: { label: string; value: number }[] = [];
  supplierLoading = signal(false);

  private supplierFilter$ = new Subject<string>();
  private destroy$ = new Subject<void>();

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
    private supplierClient: SupplierClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.initializeSupplierSearch();
    this.loadLookups();
    this.loadBoqItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  private initializeSupplierSearch(): void {
    this.supplierFilter$
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(filter => {
          this.supplierLoading.set(true);
          return this.supplierClient.getAllSuppliers(1, 100, filter || undefined).pipe(
            catchError(error => {
              console.error('Error loading suppliers:', error);
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        const suppliers = response?.data?.data ?? [];
        this.supplierOptions = suppliers
          .filter(s => s.id != null && s.name)
          .map(s => ({ label: s.name!, value: s.id! }));
        this.supplierMap = {
          ...this.supplierMap,
          ...Object.fromEntries(this.supplierOptions.map(option => [option.value, option.label]))
        };
        this.supplierLoading.set(false);
      });
  }

  onSupplierFilter(filter: string): void {
    this.supplierFilter$.next(filter);
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
        }
      },
      error: (err) => {
        console.error('Error saving BOQ item:', err);
      }
    });
  }

  confirmDelete(item: IGetProjectBOQDto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.boq.confirmDelete.message', { name: item.description }),
      header: this.translate.instant('projectTabs.boq.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.boqClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadBoqItems();
            }
          },
          error: (err) => {
            console.error('Error deleting BOQ item:', err);
          }
        });
      }
    });
  }
}
