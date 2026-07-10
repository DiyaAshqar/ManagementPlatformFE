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
  LookupType,
  ProjectBOQClient,
  SupplierClient
} from '../../../../../../../nswag/api-client';
import { AddBoqDialogComponent } from '../../../dialog/add-boq-dialog/add-boq-dialog.component';
import { MaterialCatalogService } from '../../../../../../shared/services/material-catalog.service';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';

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
    AddBoqDialogComponent,
    HasPermissionDirective
  ],
  providers: [ProjectBOQClient, LookupClient, ConstructorClient, SupplierClient],
  templateUrl: './boq-tab.component.html',
  styleUrls: ['./boq-tab.component.scss']
})
export class BoqTabComponent implements OnInit, OnDestroy {
  readonly permissions = Permissions;
  @Input() projectStageId: number = 0;

  boqItems = signal<IGetProjectBOQDto[]>([]);
  isLoading = signal(false);

  showBoqDialog = signal(false);
  editBoqItem = signal<IGetProjectBOQDto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  unitMap: Record<number, string> = {};
  constructorMap: Record<number, string> = {};
  supplierMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  unitOptions: { label: string; value: number }[] = [];
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
    private materialCatalog: MaterialCatalogService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
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
      lookups: this.lookupClient.getAllLookups([LookupType.Unit]),
      constructors: this.constructorClient.getAll(1, 200, undefined)
    }).subscribe({
      next: ({ lookups, constructors }) => {
        const data = lookups.data as any;

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
          this.materialCatalog.ensureByIds(res.data.data.map((item) => item.materialId))
            .pipe(takeUntil(this.destroy$))
            .subscribe();
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

  getMaterialName(materialId: number | undefined): string {
    return this.materialCatalog.getName(materialId, '—');
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    if (!this.canCreate()) return;
    this.editBoqItem.set(null);
    this.showBoqDialog.set(true);
  }

  openEditDialog(item: IGetProjectBOQDto): void {
    if (!this.canEdit()) return;
    this.editBoqItem.set(item);
    this.showBoqDialog.set(true);
  }

  onDialogSaved(command: CreateProjectBOQCommand): void {
    if (this.editBoqItem() ? !this.canEdit() : !this.canCreate()) return;
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
    if (!this.canDelete()) return;
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

  canCreate(): boolean {
    return this.authService.hasPermission(Permissions.BOQ.Create);
  }

  canEdit(): boolean {
    return this.authService.hasPermission(Permissions.BOQ.Edit);
  }

  canDelete(): boolean {
    return this.authService.hasPermission(Permissions.BOQ.Delete);
  }
}
