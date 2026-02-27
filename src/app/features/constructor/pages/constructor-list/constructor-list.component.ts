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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ConstructorService } from '../../services/constructor.service';
import { GetConstructorDto } from '../../../../../nswag/api-client';

@Component({
  selector: 'app-constructor-list',
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
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './constructor-list.component.html',
  styleUrls: ['./constructor-list.component.scss']
})
export class ConstructorListComponent implements OnInit {
  constructors = signal<GetConstructorDto[]>([]);
  isLoading = signal<boolean>(false);
  
  // Filters
  searchText: string = '';
  
  // Pagination
  totalRecords: number = 0;
  pageNumber: number = 1;
  pageSize: number = 10;
  first: number = 0;

  constructor(
    private constructorService: ConstructorService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
  }

  loadConstructors(): void {
    this.isLoading.set(true);
    
    this.constructorService.getAllConstructors(
      this.pageNumber,
      this.pageSize,
      this.searchText || undefined
    ).subscribe({
      next: (response) => {
        if (response.succeeded && response.data) {
          this.constructors.set(response.data.data || []);
          this.totalRecords = response.data.totalRecords || 0;
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading constructors:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load constructors'
        });
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.pageNumber = 1;
    this.first = 0;
    this.loadConstructors();
  }

  onPageChange(event: any): void {
    this.pageNumber = (event.first / event.rows) + 1;
    this.pageSize = event.rows;
    this.first = event.first;
    this.loadConstructors();
  }

  createConstructor(): void {
    this.router.navigate(['/constructor/new']);
  }

  editConstructor(constructor: GetConstructorDto): void {
    this.router.navigate(['/constructor/edit', constructor.id]);
  }

  deleteConstructor(constructor: GetConstructorDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${constructor.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (constructor.id !== undefined) {
          this.constructorService.deleteConstructor(constructor.id).subscribe({
            next: (response) => {
              if (response.succeeded) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Constructor deleted successfully'
                });
                this.loadConstructors();
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: response.message || 'Failed to delete constructor'
                });
              }
            },
            error: (error) => {
              console.error('Error deleting constructor:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete constructor'
              });
            }
          });
        }
      }
    });
  }

  getMainContractorTypeName(typeId?: number): string {
    // You can map this to actual type names from lookup service
    return typeId ? `Type ${typeId}` : 'N/A';
  }
}
