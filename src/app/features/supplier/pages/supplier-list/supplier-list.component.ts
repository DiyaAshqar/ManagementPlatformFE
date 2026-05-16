import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { SupplierService } from '../../services/supplier.service';
import { Supplier } from '../../../../../nswag/api-client';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './supplier-list.component.html',
  styleUrls: ['./supplier-list.component.scss']
})
export class SupplierListComponent implements OnInit {
  suppliers = signal<Supplier[]>([]);
  isLoading = signal<boolean>(false);
  
  // Filters
  searchText: string = '';
  
  // Pagination
  totalRecords: number = 0;
  pageNumber: number = 1;
  pageSize: number = 10;
  first: number = 0;

  constructor(
    private supplierService: SupplierService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
  }

  loadSuppliers(): void {
    this.isLoading.set(true);
    
    this.supplierService.getAllSuppliers(
      this.pageNumber,
      this.pageSize,
      this.searchText || undefined
    ).subscribe({
      next: (response) => {
        if (response.succeeded && response.data) {
          this.suppliers.set(response.data.data || []);
          this.totalRecords = response.data.totalRecords || 0;
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading suppliers:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load suppliers'
        });
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.pageNumber = 1;
    this.first = 0;
    this.loadSuppliers();
  }

  onPageChange(event: any): void {
    this.pageNumber = (event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.first = event.first;
    this.loadSuppliers();
  }

  createSupplier(): void {
    this.router.navigate(['/supplier/new']);
  }

  editSupplier(supplier: Supplier): void {
    this.router.navigate(['/supplier/edit', supplier.id]);
  }

  deleteSupplier(supplier: Supplier): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${supplier.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (supplier.id !== undefined) {
          this.supplierService.deleteSupplier(supplier.id).subscribe({
            next: (response) => {
              if (response.succeeded) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Supplier deleted successfully'
                });
                this.loadSuppliers();
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: response.message || 'Failed to delete supplier'
                });
              }
            },
            error: (error) => {
              console.error('Error deleting supplier:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete supplier'
              });
            }
          });
        }
      }
    });
  }
}
