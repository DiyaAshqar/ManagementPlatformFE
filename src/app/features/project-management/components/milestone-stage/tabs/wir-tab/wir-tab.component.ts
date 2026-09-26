import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { ConstructorClient, GetProjectWirDto, WirChecklistItemStatus, WirStatus } from '../../../../../../../nswag/api-client';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { UsersApiService } from '../../../../../user-management/services/users-api.service';
import { WirApiService } from '../../../../services/wir-api.service';
import { WIR_STATUS_SEVERITY, WirDialogComponent, WirOption } from '../../../dialog/wir-dialog/wir-dialog.component';

/** Work Inspection Requests (WIR) of a milestone stage — list + master/details dialog. */
@Component({
  selector: 'app-wir-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TooltipModule,
    HasPermissionDirective,
    WirDialogComponent,
  ],
  templateUrl: './wir-tab.component.html',
  styleUrls: ['./wir-tab.component.scss'],
})
export class WirTabComponent implements OnInit {
  @Input({ required: true }) projectStageId!: number;

  readonly permissions = Permissions;
  severityOf(status: WirStatus) {
    return WIR_STATUS_SEVERITY[status];
  }

  private readonly wirApi = inject(WirApiService);
  private readonly constructorClient = inject(ConstructorClient);
  private readonly usersApi = inject(UsersApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly wirs = signal<GetProjectWirDto[]>([]);
  readonly isLoading = signal(false);
  readonly revisingId = signal<number | null>(null);

  // Dialog state
  readonly dialogVisible = signal(false);
  readonly dialogWirId = signal<number | null>(null);
  readonly dialogReadonly = signal(false);

  constructorOptions: WirOption[] = [];
  userOptions: WirOption[] = [];
  checklistOptions: WirOption[] = [];

  readonly sortedWirs = computed(() =>
    [...this.wirs()].sort((a, b) => (a.wirNo ?? '').localeCompare(b.wirNo ?? '', undefined, { numeric: true }) || (b.revisionNo ?? 0) - (a.revisionNo ?? 0))
  );

  ngOnInit(): void {
    this.loadLookups();
    this.loadWirs();
  }

  loadWirs(): void {
    this.isLoading.set(true);
    this.wirApi.getByStageId(this.projectStageId).subscribe({
      next: (res) => {
        this.wirs.set(res.succeeded ? res.data?.data ?? [] : []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openAdd(): void {
    this.openDialog(null, false);
  }

  openEdit(wir: GetProjectWirDto): void {
    this.openDialog(wir.id ?? null, false);
  }

  openView(wir: GetProjectWirDto): void {
    this.openDialog(wir.id ?? null, true);
  }

  /** POST /api/ProjectWir/clone → new revision (RevNo + 1), then opens it for editing. */
  createRevision(wir: GetProjectWirDto): void {
    if (!wir.id) return;
    this.revisingId.set(wir.id);
    this.wirApi.createRevision(wir.id).subscribe({
      next: (res) => {
        this.revisingId.set(null);
        if (res.succeeded) {
          this.loadWirs();
          if (res.data?.id) this.openDialog(res.data.id, false);
        }
      },
      error: () => this.revisingId.set(null),
    });
  }

  confirmDelete(wir: GetProjectWirDto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.wir.deleteConfirm', { no: wir.wirNo }),
      header: this.translate.instant('projectTabs.wir.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: this.translate.instant('common.delete') },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: this.translate.instant('common.cancel') },
      accept: () => {
        this.wirApi.delete(wir.id!).subscribe({
          next: (res) => {
            if (res.succeeded) this.wirs.update((list) => list.filter((w) => w.id !== wir.id));
          },
        });
      },
    });
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
  }

  onSaved(): void {
    this.loadWirs();
  }

  /** "12 / 3 / 1" → approved / with comments / rejected counts for the list. */
  itemSummary(wir: GetProjectWirDto): { approved: number; withComment: number; rejected: number } {
    const items = wir.checklistItems ?? [];
    return {
      approved: items.filter((i) => i.status === WirChecklistItemStatus.Approved).length,
      withComment: items.filter((i) => i.status === WirChecklistItemStatus.ApprovedWithComment).length,
      rejected: items.filter((i) => i.status === WirChecklistItemStatus.Rejected).length,
    };
  }

  private openDialog(id: number | null, readonly: boolean): void {
    this.dialogWirId.set(id);
    this.dialogReadonly.set(readonly);
    this.dialogVisible.set(true);
  }

  private loadLookups(): void {
    forkJoin({
      constructors: this.constructorClient.getAll(1, 1000, undefined),
      users: this.usersApi.getAllUsers(),
      checklist: this.wirApi.getChecklistItems(),
    }).subscribe({
      next: ({ constructors, users, checklist }) => {
        this.constructorOptions = (constructors.data?.data ?? [])
          .filter((c) => c.id != null)
          .map((c) => ({ label: c.name || `#${c.id}`, value: c.id! }));
        this.userOptions = (users.data ?? [])
          .filter((u) => u.id != null)
          .map((u) => ({ label: u.fullName || u.arabicFullName || u.email || `#${u.id}`, value: u.id! }));
        this.checklistOptions = [...(checklist.data?.data ?? [])]
          .filter((c) => c.id != null)
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map((c) => ({ label: c.checklistItem || `#${c.id}`, value: c.id! }));
      },
    });
  }
}
