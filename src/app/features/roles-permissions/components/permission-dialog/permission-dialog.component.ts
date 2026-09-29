import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import {
  CreatePermissionCommand,
  PermissionDto,
  UpdatePermissionCommand,
} from '../../../../../nswag/api-client';
import { PermissionsApiService } from '../../services/permissions-api.service';

@Component({
  selector: 'app-permission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
  ],
  templateUrl: './permission-dialog.component.html',
  styleUrls: ['./permission-dialog.component.scss'],
})
export class PermissionDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly permissionsApi = inject(PermissionsApiService);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  private permission: PermissionDto | null = null;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
  });

  get name() {
    return this.form.controls.name;
  }

  get code() {
    return this.form.controls.code;
  }

  get isEditMode(): boolean {
    return this.permission != null;
  }

  ngOnInit(): void {
    this.permission = this.config.data?.permission ?? null;
    if (this.permission) {
      this.form.patchValue({
        name: this.permission.name ?? '',
        code: this.permission.code ?? '',
      });
    }
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, code } = this.form.getRawValue();
    this.loading.set(true);

    const request$ =
      this.permission?.id != null
        ? this.permissionsApi.update(this.permission.id, new UpdatePermissionCommand({ name, code }))
        : this.permissionsApi.create(new CreatePermissionCommand({ name, code }));

    request$.subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.succeeded) {
          this.dialogRef.close(true);
        } else {
          this.errorMessage.set(response.message || null);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
