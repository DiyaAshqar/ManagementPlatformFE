import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ConfirmationService, MessageService } from 'primeng/api';

import { MaterialService } from '../../services/material.service';
import {
  GetMaterialCategoryDto,
  GetMaterialSubCategoryDto,
  GetMaterialDto,
  CreateMaterialCategoryCommand,
  CreateMaterialSubCategoryCommand,
  CreateMaterialCommand
} from '../../../../../nswag/api-client';

@Component({
  selector: 'app-material-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DialogModule,
    SkeletonModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
    CardModule,
    DividerModule
  ],
  providers: [ConfirmationService],
  templateUrl: './material-management.component.html',
  styleUrls: ['./material-management.component.scss']
})
export class MaterialManagementComponent implements OnInit {

  // ── Categories ─────────────────────────────────────────────────────────
  categories = signal<GetMaterialCategoryDto[]>([]);
  categoriesLoading = signal(false);
  selectedCategory = signal<GetMaterialCategoryDto | null>(null);
  categorySearch = '';
  categoryTotal = 0;
  categoryPage = 1;
  categoryPageSize = 10;
  categoryFirst = 0;

  categoryDialogVisible = false;
  categoryDialogTitle = '';
  categoryForm: { id?: number; name: string } = { name: '' };
  categorySaving = false;

  // ── SubCategories ───────────────────────────────────────────────────────
  subCategories = signal<GetMaterialSubCategoryDto[]>([]);
  subCategoriesLoading = signal(false);
  selectedSubCategory = signal<GetMaterialSubCategoryDto | null>(null);
  subCategorySearch = '';
  subCategoryTotal = 0;
  subCategoryPage = 1;
  subCategoryPageSize = 10;
  subCategoryFirst = 0;

  subCategoryDialogVisible = false;
  subCategoryDialogTitle = '';
  subCategoryForm: { id?: number; name: string; categoryId?: number } = { name: '' };
  subCategorySaving = false;

  // ── Materials ───────────────────────────────────────────────────────────
  materials = signal<GetMaterialDto[]>([]);
  materialsLoading = signal(false);
  materialSearch = '';
  materialTotal = 0;
  materialPage = 1;
  materialPageSize = 10;
  materialFirst = 0;

  materialDialogVisible = false;
  materialDialogTitle = '';
  materialForm: { id?: number; name: string; subCategoryId?: number } = { name: '' };
  materialSaving = false;

  readonly Math = Math;

  constructor(
    private materialService: MaterialService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  // ── Category CRUD ────────────────────────────────────────────────────────

  loadCategories(): void {
    this.categoriesLoading.set(true);
    this.materialService.getAllCategories(this.categoryPage, this.categoryPageSize, this.categorySearch || undefined)
      .subscribe({
        next: (res) => {
          if (res.succeeded && res.data) {
            this.categories.set(res.data.data || []);
            this.categoryTotal = res.data.totalRecords || 0;
          }
          this.categoriesLoading.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load categories' });
          this.categoriesLoading.set(false);
        }
      });
  }

  onCategorySearchChange(): void {
    this.categoryPage = 1;
    this.categoryFirst = 0;
    this.loadCategories();
  }

  onCategoryPageChange(event: any): void {
    this.categoryPage = (event.first / event.rows) + 1;
    this.categoryPageSize = event.rows;
    this.categoryFirst = event.first;
    this.loadCategories();
  }

  selectCategory(category: GetMaterialCategoryDto): void {
    if (this.selectedCategory()?.id === category.id) return;
    this.selectedCategory.set(category);
    this.selectedSubCategory.set(null);
    this.materials.set([]);
    this.subCategorySearch = '';
    this.subCategoryPage = 1;
    this.subCategoryFirst = 0;
    this.loadSubCategories();
  }

  openAddCategory(): void {
    this.categoryForm = { name: '' };
    this.categoryDialogTitle = 'material.category.addTitle';
    this.categoryDialogVisible = true;
  }

  openEditCategory(category: GetMaterialCategoryDto, event: Event): void {
    event.stopPropagation();
    this.categoryForm = { id: category.id, name: category.name || '' };
    this.categoryDialogTitle = 'material.category.editTitle';
    this.categoryDialogVisible = true;
  }

  saveCategory(): void {
    if (!this.categoryForm.name?.trim()) return;
    this.categorySaving = true;
    const command = new CreateMaterialCategoryCommand({ id: this.categoryForm.id, name: this.categoryForm.name.trim() });
    this.materialService.saveCategory(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Category saved' });
          this.categoryDialogVisible = false;
          this.loadCategories();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Save failed' });
        }
        this.categorySaving = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Save failed' });
        this.categorySaving = false;
      }
    });
  }

  deleteCategory(category: GetMaterialCategoryDto, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${category.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.materialService.deleteCategory(category.id!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Category deleted' });
              if (this.selectedCategory()?.id === category.id) {
                this.selectedCategory.set(null);
                this.subCategories.set([]);
                this.materials.set([]);
              }
              this.loadCategories();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Delete failed' });
            }
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' })
        });
      }
    });
  }

  // ── SubCategory CRUD ─────────────────────────────────────────────────────

  loadSubCategories(): void {
    const cat = this.selectedCategory();
    if (!cat?.id) return;
    this.subCategoriesLoading.set(true);
    this.materialService.getSubCategoriesByCategoryId(cat.id, this.subCategoryPage, this.subCategoryPageSize, this.subCategorySearch || undefined)
      .subscribe({
        next: (res) => {
          if (res.succeeded && res.data) {
            this.subCategories.set(res.data.data || []);
            this.subCategoryTotal = res.data.totalRecords || 0;
          }
          this.subCategoriesLoading.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load subcategories' });
          this.subCategoriesLoading.set(false);
        }
      });
  }

  onSubCategorySearchChange(): void {
    this.subCategoryPage = 1;
    this.subCategoryFirst = 0;
    this.loadSubCategories();
  }

  onSubCategoryPageChange(event: any): void {
    this.subCategoryPage = (event.first / event.rows) + 1;
    this.subCategoryPageSize = event.rows;
    this.subCategoryFirst = event.first;
    this.loadSubCategories();
  }

  selectSubCategory(sub: GetMaterialSubCategoryDto): void {
    if (this.selectedSubCategory()?.id === sub.id) return;
    this.selectedSubCategory.set(sub);
    this.materialSearch = '';
    this.materialPage = 1;
    this.materialFirst = 0;
    this.loadMaterials();
  }

  openAddSubCategory(): void {
    this.subCategoryForm = { name: '', categoryId: this.selectedCategory()?.id };
    this.subCategoryDialogTitle = 'material.subCategory.addTitle';
    this.subCategoryDialogVisible = true;
  }

  openEditSubCategory(sub: GetMaterialSubCategoryDto, event: Event): void {
    event.stopPropagation();
    this.subCategoryForm = { id: sub.id, name: sub.name || '', categoryId: sub.categoryId };
    this.subCategoryDialogTitle = 'material.subCategory.editTitle';
    this.subCategoryDialogVisible = true;
  }

  saveSubCategory(): void {
    if (!this.subCategoryForm.name?.trim()) return;
    this.subCategorySaving = true;
    const command = new CreateMaterialSubCategoryCommand({
      id: this.subCategoryForm.id,
      name: this.subCategoryForm.name.trim(),
      categoryId: this.subCategoryForm.categoryId
    });
    this.materialService.saveSubCategory(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Subcategory saved' });
          this.subCategoryDialogVisible = false;
          this.loadSubCategories();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Save failed' });
        }
        this.subCategorySaving = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Save failed' });
        this.subCategorySaving = false;
      }
    });
  }

  deleteSubCategory(sub: GetMaterialSubCategoryDto, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${sub.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.materialService.deleteSubCategory(sub.id!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Subcategory deleted' });
              if (this.selectedSubCategory()?.id === sub.id) {
                this.selectedSubCategory.set(null);
                this.materials.set([]);
              }
              this.loadSubCategories();
            } else {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Delete failed' });
            }
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' })
        });
      }
    });
  }

  // ── Material CRUD ─────────────────────────────────────────────────────────

  loadMaterials(): void {
    const sub = this.selectedSubCategory();
    if (!sub?.id) return;
    this.materialsLoading.set(true);
    this.materialService.getMaterialsBySubCategoryId(sub.id, this.materialPage, this.materialPageSize, this.materialSearch || undefined)
      .subscribe({
        next: (res) => {
          if (res.succeeded && res.data) {
            this.materials.set(res.data.data || []);
            this.materialTotal = res.data.totalRecords || 0;
          }
          this.materialsLoading.set(false);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load materials' });
          this.materialsLoading.set(false);
        }
      });
  }

  onMaterialSearchChange(): void {
    this.materialPage = 1;
    this.materialFirst = 0;
    this.loadMaterials();
  }

  onMaterialPageChange(event: any): void {
    this.materialPage = (event.first / event.rows) + 1;
    this.materialPageSize = event.rows;
    this.materialFirst = event.first;
    this.loadMaterials();
  }

  openAddMaterial(): void {
    this.materialForm = { name: '', subCategoryId: this.selectedSubCategory()?.id };
    this.materialDialogTitle = 'material.item.addTitle';
    this.materialDialogVisible = true;
  }

  openEditMaterial(mat: GetMaterialDto): void {
    this.materialForm = { id: mat.id, name: mat.name || '', subCategoryId: mat.subCategoryId };
    this.materialDialogTitle = 'material.item.editTitle';
    this.materialDialogVisible = true;
  }

  saveMaterial(): void {
    if (!this.materialForm.name?.trim()) return;
    this.materialSaving = true;
    const command = new CreateMaterialCommand({
      id: this.materialForm.id,
      name: this.materialForm.name.trim(),
      subCategoryId: this.materialForm.subCategoryId
    });
    this.materialService.saveMaterial(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.materialDialogVisible = false;
          this.loadMaterials();
        }
        this.materialSaving = false;
      },
      error: () => {
        this.materialSaving = false;
      }
    });
  }

  deleteMaterial(mat: GetMaterialDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${mat.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.materialService.deleteMaterial(mat.id!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadMaterials();
            } 
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' })
        });
      }
    });
  }
}
