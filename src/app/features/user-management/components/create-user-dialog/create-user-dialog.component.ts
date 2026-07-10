import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { AuthApiService } from '../../../../core/auth/services/auth-api.service';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
  ],
  templateUrl: './create-user-dialog.component.html',
  styleUrls: ['./create-user-dialog.component.scss'],
})
export class CreateUserDialogComponent {
  private readonly fb = inject(FormBuilder);
  // Registers the account without touching the current (admin) session —
  // AuthService.register() would log the admin out and in as the new user.
  private readonly authApi = inject(AuthApiService);
  private readonly dialogRef = inject(DynamicDialogRef);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    arabicFullName: [''],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get fullName() {
    return this.form.controls.fullName;
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { fullName, arabicFullName, email, phoneNumber, password } = this.form.getRawValue();

    this.loading.set(true);
    this.authApi
      .register({
        fullName,
        arabicFullName: arabicFullName || undefined,
        email,
        phoneNumber: phoneNumber || undefined,
        password,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.succeeded) {
            this.dialogRef.close(true);
          } else {
            this.errorMessage.set(response.message || null);
          }
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(
            error instanceof Error ? error.message : 'Failed to create user. Please try again.'
          );
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
