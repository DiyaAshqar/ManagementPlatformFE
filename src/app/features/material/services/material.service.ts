import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MaterialClient,
  MaterialCategoryClient,
  MaterialSubCategoryClient,
  CreateMaterialCommand,
  CreateMaterialCategoryCommand,
  CreateMaterialSubCategoryCommand,
  BooleanResponse,
  GetMaterialDtoListPagedResponseResponse,
  GetMaterialDtoResponse,
  GetMaterialCategoryDtoListPagedResponseResponse,
  GetMaterialCategoryDtoResponse,
  GetMaterialSubCategoryDtoListPagedResponseResponse,
  GetMaterialSubCategoryDtoResponse
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {

  constructor(
    private materialClient: MaterialClient,
    private categoryClient: MaterialCategoryClient,
    private subCategoryClient: MaterialSubCategoryClient
  ) {}

  // ── Category ──────────────────────────────────────────────────────────────

  getAllCategories(
    pageNumber?: number,
    pageSize?: number,
    filter?: string
  ): Observable<GetMaterialCategoryDtoListPagedResponseResponse> {
    return this.categoryClient.getAll(pageNumber, pageSize, filter);
  }

  getCategoryById(id: number): Observable<GetMaterialCategoryDtoResponse> {
    return this.categoryClient.getById(id);
  }

  saveCategory(command: CreateMaterialCategoryCommand): Observable<BooleanResponse> {
    return this.categoryClient.createOrUpdate(command);
  }

  deleteCategory(id: number): Observable<BooleanResponse> {
    return this.categoryClient.delete(id);
  }

  // ── SubCategory ───────────────────────────────────────────────────────────

  getAllSubCategories(
    pageNumber?: number,
    pageSize?: number,
    filter?: string
  ): Observable<GetMaterialSubCategoryDtoListPagedResponseResponse> {
    return this.subCategoryClient.getAll(pageNumber, pageSize, filter);
  }

  getSubCategoriesByCategoryId(
    categoryId: number,
    pageNumber?: number,
    pageSize?: number,
    filter?: string
  ): Observable<GetMaterialSubCategoryDtoListPagedResponseResponse> {
    return this.subCategoryClient.getByCategoryId(categoryId, pageNumber, pageSize, filter);
  }

  getSubCategoryById(id: number): Observable<GetMaterialSubCategoryDtoResponse> {
    return this.subCategoryClient.getById(id);
  }

  saveSubCategory(command: CreateMaterialSubCategoryCommand): Observable<BooleanResponse> {
    return this.subCategoryClient.createOrUpdate(command);
  }

  deleteSubCategory(id: number): Observable<BooleanResponse> {
    return this.subCategoryClient.delete(id);
  }

  // ── Material ──────────────────────────────────────────────────────────────

  getAllMaterials(
    pageNumber?: number,
    pageSize?: number,
    filter?: string,
    name?: string
  ): Observable<GetMaterialDtoListPagedResponseResponse> {
    return this.materialClient.getAll(pageNumber, pageSize, filter, name);
  }

  getMaterialsBySubCategoryId(
    subCategoryId: number,
    pageNumber?: number,
    pageSize?: number,
    filter?: string
  ): Observable<GetMaterialDtoListPagedResponseResponse> {
    return this.materialClient.getByCategoryId(subCategoryId, pageNumber, pageSize, filter);
  }

  getMaterialById(id: number): Observable<GetMaterialDtoResponse> {
    return this.materialClient.getById(id);
  }

  saveMaterial(command: CreateMaterialCommand): Observable<BooleanResponse> {
    return this.materialClient.createOrUpdate(command);
  }

  deleteMaterial(id: number): Observable<BooleanResponse> {
    return this.materialClient.delete(id);
  }
}
