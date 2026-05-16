import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { SupplierService } from '../../services/supplier.service';
import { CreateSupplierCommand } from '../../../../../nswag/api-client';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    SkeletonModule
  ],
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss']
})
export class SupplierFormComponent implements OnInit {
  supplierForm!: FormGroup;
  isEditMode: boolean = false;
  supplierId?: number;
  isLoading: boolean = false;
  isSaving: boolean = false;

  constructor(
    private fb: FormBuilder,
    private supplierService: SupplierService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id'] && params['id'] !== 'new') {
        this.isEditMode = true;
        this.supplierId = +params['id'];
        this.loadSupplier(this.supplierId);
      }
    });
  }

  initForm(): void {
    this.supplierForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  loadSupplier(id: number): void {
    this.isLoading = true;
    this.supplierService.getSupplierById(id).subscribe({
      next: (response) => {
        if (response.succeeded && response.data) {
          this.supplierForm.patchValue({
            name: response.data.name,
            phoneNumber: response.data.phoneNumber,
            email: response.data.email
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading supplier:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load supplier'
        });
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.supplierForm.valid) {
      this.isSaving = true;
      
      const command = new CreateSupplierCommand({
        id: this.supplierId,
        name: this.supplierForm.value.name,
        phoneNumber: this.supplierForm.value.phoneNumber,
        email: this.supplierForm.value.email
      });

      this.supplierService.createOrUpdateSupplier(command).subscribe({
        next: (response) => {
          if (response.succeeded) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: this.isEditMode 
                ? 'Supplier updated successfully' 
                : 'Supplier created successfully'
            });
            setTimeout(() => {
              this.router.navigate(['/supplier']);
            }, 1000);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to save supplier'
            });
            this.isSaving = false;
          }
        },
        error: (error) => {
          console.error('Error saving supplier:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save supplier'
          });
          this.isSaving = false;
        }
      });
    } else {
      Object.keys(this.supplierForm.controls).forEach(key => {
        const control = this.supplierForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/supplier']);
  }

  get name() {
    return this.supplierForm.get('name');
  }

  get phoneNumber() {
    return this.supplierForm.get('phoneNumber');
  }

  get email() {
    return this.supplierForm.get('email');
  }
}
