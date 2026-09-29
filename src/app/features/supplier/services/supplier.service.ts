import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  SupplierClient,
  CreateSupplierCommand,
  DeleteSupplierCommand,
  SupplierListPagedResponseResponse,
  SupplierResponse,
  BooleanResponse
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

  constructor(private supplierClient: SupplierClient) { }

  // Get all suppliers with pagination and filters
  getAllSuppliers(
    pageNumber?: number,
    pageSize?: number,
    search?: string
  ): Observable<SupplierListPagedResponseResponse> {
    return this.supplierClient.getAllSuppliers(
      pageNumber,
      pageSize,
      search
    );
  }

  // Get supplier by ID
  getSupplierById(id: number): Observable<SupplierResponse> {
    return this.supplierClient.getSupplierById(id);
  }

  // Create or update supplier
  createOrUpdateSupplier(command: CreateSupplierCommand): Observable<BooleanResponse> {
    return this.supplierClient.createSupplier(command);
  }

  // Delete supplier
  deleteSupplier(id: number): Observable<BooleanResponse> {
    const command = new DeleteSupplierCommand({ id });
    return this.supplierClient.deleteSupplier(command);
  }
}
