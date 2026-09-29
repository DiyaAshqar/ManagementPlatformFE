import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { CreateFeatureCommand, FeatureDto, UpdateFeatureCommand } from '../../../../../nswag/api-client';
import { FeaturesApiService } from '../../services/features-api.service';

@Component({
  selector: 'app-feature-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    MessageModule,
  ],
  templateUrl: './feature-dialog.component.html',
  styleUrls: ['./feature-dialog.component.scss'],
})
export class FeatureDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly featuresApi = inject(FeaturesApiService);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  private feature: FeatureDto | null = null;

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    description: [''],
    isActive: [true],
  });

  get name() {
    return this.form.controls.name;
  }

  get code() {
    return this.form.controls.code;
  }

  get isEditMode(): boolean {
    return this.feature != null;
  }

  ngOnInit(): void {
    this.feature = this.config.data?.feature ?? null;
    if (this.feature) {
      this.form.patchValue({
        name: this.feature.name ?? '',
        code: this.feature.code ?? '',
        description: this.feature.description ?? '',
        isActive: this.feature.isActive ?? true,
      });
    }
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, code, description, isActive } = this.form.getRawValue();
    this.loading.set(true);

    const request$ =
      this.feature?.id != null
        ? this.featuresApi.update(
            this.feature.id,
            new UpdateFeatureCommand({ name, code, description: description || undefined, isActive })
          )
        : this.featuresApi.create(
            new CreateFeatureCommand({ name, code, description: description || undefined, isActive })
          );

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
