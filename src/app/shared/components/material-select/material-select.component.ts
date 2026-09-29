import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectFilterEvent, SelectModule } from 'primeng/select';
import { Subject, finalize, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { GetMaterialDto } from '../../../../nswag/api-client';
import { MaterialCatalogService } from '../../services/material-catalog.service';

@Component({
  selector: 'app-material-select',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaterialSelectComponent),
      multi: true,
    },
  ],
  templateUrl: './material-select.component.html',
  styles: [`:host { display: block; width: 100%; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  inputId = input('materialId');
  placeholder = input('');
  filterPlaceholder = input('Search materials...');
  emptyMessage = input('No materials found');
  loadingMessage = input('Loading...');
  loadMoreLabel = input('Load more');
  appendTo = input<any>('body');
  showClear = input(true);
  resetFilterOnHide = input(true);
  selectClass = input('w-full');
  invalid = input(false);
  disabledInput = input(false, { alias: 'disabled' });
  pageSize = input(20);

  value = signal<number | null>(null);
  materials = signal<GetMaterialDto[]>([]);
  loading = signal(false);
  controlDisabled = signal(false);
  isDisabled = computed(() => this.disabledInput() || this.controlDisabled());

  materialGroups = computed(() => {
    const selected = this.materialCatalog.getCached(this.value());
    const options = selected && !this.materials().some((material) => material.id === selected.id)
      ? [selected, ...this.materials()]
      : this.materials();
    const groups = new Map<string, { label: string; items: GetMaterialDto[] }>();

    for (const material of options) {
      const label = material.subCategoryName?.trim() || 'Uncategorized';
      const key = `${material.subCategoryId ?? 'none'}:${label}`;
      const group = groups.get(key) ?? { label, items: [] };
      group.items.push(material);
      groups.set(key, group);
    }

    return Array.from(groups.values());
  });

  totalRecords = 0;
  currentPage = 0;

  private readonly destroy$ = new Subject<void>();
  private readonly filter$ = new Subject<string>();
  private activeFilter = '';
  private readonly loadedPages = new Set<string>();
  private readonly loadingPages = new Set<string>();
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private materialCatalog: MaterialCatalogService) {}

  ngOnInit(): void {
    this.loadPage(1, '', false);
    this.filter$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((filter) => {
        this.activeFilter = filter;
        this.materials.set([]);
        this.loadedPages.clear();
        this.totalRecords = 0;
        this.currentPage = 0;
        this.loadPage(1, filter, false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: number | null | undefined): void {
    const materialId = value ?? null;
    this.value.set(materialId);
    if (materialId != null && !this.materialCatalog.getCached(materialId)) {
      this.materialCatalog.getById(materialId).pipe(takeUntil(this.destroy$)).subscribe();
    }
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.controlDisabled.set(isDisabled);
  }

  selectMaterial(value: number | null): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  handleFilter(event: SelectFilterEvent): void {
    this.filter$.next((event.filter || '').trim());
  }

  handleHide(): void {
    this.markTouched();
    if (this.resetFilterOnHide() && this.activeFilter) {
      this.filter$.next('');
    }
  }

  markTouched(): void {
    this.onTouched();
  }

  loadMore(event: Event): void {
    event.stopPropagation();
    this.loadPage(this.currentPage + 1, this.activeFilter, true);
  }

  get hasMore(): boolean {
    return this.materials().length < this.totalRecords;
  }

  private loadPage(page: number, filter: string, append: boolean): void {
    const requestKey = `${filter}\u0000${page}`;
    if (this.loadedPages.has(requestKey) || this.loadingPages.has(requestKey)) {
      return;
    }

    this.loadingPages.add(requestKey);
    this.loading.set(true);

    this.materialCatalog
      .getPage(page, this.pageSize(), filter || undefined)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.finishPageLoad(requestKey))
      )
      .subscribe({
        next: (response) => {
          if (filter !== this.activeFilter) {
            return;
          }

          const result = response.succeeded && response.data?.succeeded ? response.data : undefined;
          const pageItems = result?.data ?? [];
          const existing = append ? this.materials() : [];
          const merged = [...existing, ...pageItems].filter(
            (material, index, items) => items.findIndex((item) => item.id === material.id) === index
          );

          this.materials.set(merged);
          this.totalRecords = result?.totalRecords ?? merged.length;
          this.currentPage = result?.pageNumber ?? page;
          this.loadedPages.add(requestKey);
        },
        error: (error) => {
          if (filter === this.activeFilter) {
            console.error('Error loading materials:', error);
          }
        },
      });
  }

  private finishPageLoad(requestKey: string): void {
    this.loadingPages.delete(requestKey);
    this.loading.set(this.loadingPages.size > 0);
  }
}
