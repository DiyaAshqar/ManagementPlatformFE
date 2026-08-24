import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

import { ConfirmationService } from 'primeng/api';
import {
  CreateProjectPOCommand,
  IGetProjectPODto,
  LookupClient,
  LookupType,
  ProjectPOClient,
  SupplierClient
} from '../../../../../../../nswag/api-client';
import { AddPoDialogComponent } from '../../../dialog/add-po-dialog/add-po-dialog.component';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';
import { AppNumberPipe } from '../../../../../../shared/pipes/app-number.pipe';

// PO Status enum matching the backend
export enum POStatus {
  Approved = 1,
  Pending = 2,
  Rejected = 3
}

@Component({
  selector: 'app-purchase-orders-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule,
    AddPoDialogComponent,
    HasPermissionDirective,
    AppNumberPipe
  ],
  providers: [ProjectPOClient, LookupClient, SupplierClient],
  templateUrl: './purchase-orders-tab.component.html',
  styleUrls: ['./purchase-orders-tab.component.scss']
})
export class PurchaseOrdersTabComponent implements OnInit, OnDestroy {
  readonly permissions = Permissions;
  @Input() projectStageId: number = 0;

  poItems = signal<IGetProjectPODto[]>([]);
  isLoading = signal(false);

  showPoDialog = signal(false);
  editPoItem = signal<IGetProjectPODto | null>(null);

  // ─── Lookup maps (for table display) ───────────────────────────────────────
  unitMap: Record<number, string> = {};
  supplierMap: Record<number, string> = {};

  // ─── Option arrays (passed to dialog) ──────────────────────────────────────
  unitOptions: { label: string; value: number }[] = [];
  supplierOptions: { label: string; value: number }[] = [];
  supplierLoading = signal(false);

  private supplierFilter$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  POStatus = POStatus;

  get totalPOValue(): number {
    return this.poItems().reduce((sum, item) => sum + (item.subTotal ?? 0), 0);
  }

  getAmount(item: IGetProjectPODto): number {
    return (item.price ?? 0);
  }

  constructor(
    private poClient: ProjectPOClient,
    private lookupClient: LookupClient,
    private supplierClient: SupplierClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initializeSupplierSearch();
    this.loadLookups();
    this.loadPOItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  loadLookups(): void {
    forkJoin({
      lookups: this.lookupClient.getAllLookups([LookupType.Unit])
    }).subscribe({
      next: ({ lookups }) => {
        const data = lookups.data as any;

        if (data?.['unit']) {
          this.unitOptions = (data['unit'] as { id: number; name: string }[])
            .map(u => ({ label: u.name, value: u.id }));
          this.unitMap = Object.fromEntries(this.unitOptions.map(o => [o.value, o.label]));
        }

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

  loadPOItems(): void {
    this.isLoading.set(true);

    this.poClient.getByStageId(this.projectStageId, 1, 100, undefined).subscribe({
      next: (res) => {
        if (res.succeeded && res.data?.data) {
          this.poItems.set(res.data.data);
        } else {
          this.poItems.set([]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading PO items:', err);
        this.isLoading.set(false);
      }
    });
  }

  // ── Dialog ───────────────────────────────────────────────────────────────

  openAddDialog(): void {
    if (!this.canManage()) return;
    this.editPoItem.set(null);
    this.showPoDialog.set(true);
  }

  openEditDialog(item: IGetProjectPODto): void {
    if (!this.canManage()) return;
    this.editPoItem.set(item);
    this.showPoDialog.set(true);
  }

  onDialogSaved(command: CreateProjectPOCommand): void {
    if (!this.canManage()) return;
    this.poClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.loadPOItems();
          this.showPoDialog.set(false);
        }
      },
      error: (err) => {
        console.error('Error saving PO item:', err);
      }
    });
  }

  confirmDelete(item: IGetProjectPODto): void {
    if (!this.canManage()) return;
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.po.confirmDelete.message', { name: item.poNumber }),
      header: this.translate.instant('projectTabs.po.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.poClient.delete(item.id!, item.projectStageId!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadPOItems();
            }
          },
          error: (err) => {
            console.error('Error deleting PO item:', err);
          }
        });
      }
    });
  }

  getStatusSeverity(status?: number): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case POStatus.Approved: return 'success';
      case POStatus.Pending: return 'warn';
      case POStatus.Rejected: return 'danger';
      default: return 'secondary';
    }
  }

  canManage(): boolean {
    return this.authService.hasPermission(Permissions.PurchaseOrders.Manage);
  }

  getStatusLabel(status?: number): string {
    switch (status) {
      case POStatus.Approved: return 'Approved';
      case POStatus.Pending: return 'Pending';
      case POStatus.Rejected: return 'Rejected';
      default: return 'Unknown';
    }
  }
}
