import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { ConstructorService } from '../../services/constructor.service';
import { CreateConstructorCommand, LookupDto } from '../../../../../nswag/api-client';

interface MainContractorType {
  id?: number;
  name?: string;
}

@Component({
  selector: 'app-constructor-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CardModule,
    SkeletonModule
  ],
  templateUrl: './constructor-form.component.html',
  styleUrls: ['./constructor-form.component.scss']
})
export class ConstructorFormComponent implements OnInit {
  constructorForm!: FormGroup;
  isEditMode: boolean = false;
  constructorId?: number;
  isLoading: boolean = false;
  isSaving: boolean = false;
  isLoadingDropdowns: boolean = false;
  
  // Dropdown options - loaded from lookup endpoint
  mainContractorTypes: MainContractorType[] = [];

  constructor(
    private fb: FormBuilder,
    private constructorService: ConstructorService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadDropdownOptions();
    this.route.params.subscribe(params => {
      if (params['id'] && params['id'] !== 'new') {
        this.isEditMode = true;
        this.constructorId = +params['id'];
        this.loadConstructor(this.constructorId);
      }
    });
  }

  initForm(): void {
    this.constructorForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      mainContractorTypeId: [null, Validators.required]
    });
  }

  loadDropdownOptions(): void {
    this.isLoadingDropdowns = true;
    this.constructorService.getMainContractorTypes().subscribe({
      next: (data: LookupDto[]) => {
        this.mainContractorTypes = data;
        this.isLoadingDropdowns = false;
      },
      error: (error) => {
        console.error('Error loading main contractor types:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load contractor types'
        });
        this.isLoadingDropdowns = false;
      }
    });
  }

  loadConstructor(id: number): void {
    this.isLoading = true;
    this.constructorService.getConstructorById(id).subscribe({
      next: (response) => {
        if (response.succeeded && response.data) {
          this.constructorForm.patchValue({
            name: response.data.name,
            mainContractorTypeId: response.data.mainContractorTypeId
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading constructor:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load constructor'
        });
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.constructorForm.valid) {
      this.isSaving = true;
      
      const command = new CreateConstructorCommand({
        id: this.constructorId,
        name: this.constructorForm.value.name,
        mainContractorTypeId: this.constructorForm.value.mainContractorTypeId
      });

      this.constructorService.createOrUpdateConstructor(command).subscribe({
        next: (response) => {
          if (response.succeeded) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: this.isEditMode 
                ? 'Constructor updated successfully' 
                : 'Constructor created successfully'
            });
            setTimeout(() => {
              this.router.navigate(['/constructor']);
            }, 1000);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Failed to save constructor'
            });
            this.isSaving = false;
          }
        },
        error: (error) => {
          console.error('Error saving constructor:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save constructor'
          });
          this.isSaving = false;
        }
      });
    } else {
      Object.keys(this.constructorForm.controls).forEach(key => {
        const control = this.constructorForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/constructor']);
  }

  get name() {
    return this.constructorForm.get('name');
  }

  get mainContractorTypeId() {
    return this.constructorForm.get('mainContractorTypeId');
  }
}
