import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { CreateWirChecklistItemCommand, GetWirChecklistItemDto } from '../../../../../nswag/api-client';
import { HasPermissionDirective } from '../../../../core/auth/directives/has-permission.directive';
import { Permissions } from '../../../../core/auth/models/auth.models';
import { WirApiService } from '../../services/wir-api.service';

/** Master catalog of WIR checklist items (the rows of the Excel checklist). */
@Component({
  selector: 'app-wir-checklist-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    HasPermissionDirective,
  ],
  templateUrl: './wir-checklist-management.component.html',
  styleUrls: ['./wir-checklist-management.component.scss'],
})
export class WirChecklistManagementComponent implements OnInit {
  readonly permissions = Permissions;

  private readonly wirApi = inject(WirApiService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly items = signal<GetWirChecklistItemDto[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isReordering = signal(false);
  readonly search = signal('');

  readonly dialogVisible = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly form = this.fb.group({
    checklistItem: ['', [Validators.required, Validators.maxLength(500)]],
    displayOrder: [1 as number | null, [Validators.required, Validators.min(1)]],
  });

  readonly sortedItems = computed(() =>
    [...this.items()].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0))
  );

  readonly filteredItems = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.sortedItems().filter((i) => (i.checklistItem ?? '').toLowerCase().includes(term)) : this.sortedItems();
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.wirApi.getChecklistItems().subscribe({
      next: (res) => {
        this.items.set(res.succeeded ? res.data?.data ?? [] : []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  openAdd(): void {
    const nextOrder = Math.max(0, ...this.items().map((i) => i.displayOrder ?? 0)) + 1;
    this.editingId.set(null);
    this.form.reset({ checklistItem: '', displayOrder: nextOrder });
    this.dialogVisible.set(true);
  }

  openEdit(item: GetWirChecklistItemDto): void {
    this.editingId.set(item.id ?? null);
    this.form.reset({ checklistItem: item.checklistItem ?? '', displayOrder: item.displayOrder ?? 1 });
    this.dialogVisible.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { checklistItem, displayOrder } = this.form.getRawValue();
    this.isSaving.set(true);
    this.wirApi
      .saveChecklistItem(
        new CreateWirChecklistItemCommand({
          id: this.editingId() ?? 0,
          checklistItem: checklistItem!.trim(),
          displayOrder: displayOrder ?? 1,
        })
      )
      .subscribe({
        next: (res) => {
          this.isSaving.set(false);
          if (res.succeeded) {
            this.dialogVisible.set(false);
            this.load();
          }
        },
        error: () => this.isSaving.set(false),
      });
  }

  confirmDelete(item: GetWirChecklistItemDto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('wirChecklist.deleteConfirm', { item: item.checklistItem }),
      header: this.translate.instant('projectTabs.wir.confirmDeleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: this.translate.instant('common.delete') },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: this.translate.instant('common.cancel') },
      accept: () => {
        this.wirApi.deleteChecklistItem(item.id!).subscribe({
          next: (res) => {
            if (res.succeeded) this.items.update((list) => list.filter((i) => i.id !== item.id));
          },
        });
      },
    });
  }

  /** Swaps display order with the neighbour (only while the list is not filtered). */
  move(item: GetWirChecklistItemDto, direction: -1 | 1): void {
    const list = this.sortedItems();
    const index = list.findIndex((i) => i.id === item.id);
    const other = list[index + direction];
    if (!other || this.isReordering()) return;

    // Normalise to 1..n first so swapping always changes something, even with duplicate orders.
    const orders = new Map(list.map((i, idx) => [i.id!, idx + 1]));
    orders.set(item.id!, index + 1 + direction);
    orders.set(other.id!, index + 1);
    const changed = list.filter((i) => (i.displayOrder ?? 0) !== orders.get(i.id!));

    this.isReordering.set(true);
    forkJoin(
      changed.map((i) =>
        this.wirApi.saveChecklistItem(
          new CreateWirChecklistItemCommand({ id: i.id, checklistItem: i.checklistItem, displayOrder: orders.get(i.id!) })
        )
      )
    ).subscribe({
      next: () => {
        this.items.update((all) => all.map((i) => new GetWirChecklistItemDto({ ...i, displayOrder: orders.get(i.id!) ?? i.displayOrder })));
        this.isReordering.set(false);
      },
      error: () => {
        this.isReordering.set(false);
        this.load();
      },
    });
  }

  isFieldInvalid(name: 'checklistItem' | 'displayOrder'): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
