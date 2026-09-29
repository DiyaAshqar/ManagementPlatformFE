import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  AssignRolePermissionsCommand,
  FeatureDto,
  FeaturePermissionsDto,
  PermissionDto,
} from '../../../../../nswag/api-client';
import { BACKEND_ROLES, Permissions } from '../../../../core/auth/models/auth.models';
import { HasPermissionDirective } from '../../../../core/auth/directives/has-permission.directive';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { FeatureDialogComponent } from '../../components/feature-dialog/feature-dialog.component';
import { PermissionDialogComponent } from '../../components/permission-dialog/permission-dialog.component';
import { FeaturesApiService } from '../../services/features-api.service';
import { PermissionsApiService } from '../../services/permissions-api.service';
import { RolePermissionsApiService } from '../../services/role-permissions-api.service';

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CheckboxModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TabsModule,
    TagModule,
    TooltipModule,
    HasPermissionDirective,
  ],
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss'],
})
export class RolesPermissionsComponent implements OnInit {
  private readonly featuresApi = inject(FeaturesApiService);
  private readonly permissionsApi = inject(PermissionsApiService);
  private readonly rolePermissionsApi = inject(RolePermissionsApiService);
  private readonly dialogService = inject(DialogService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);

  /** Auth permission constants, exposed for `*appHasPermission` in the template (named to avoid colliding with the `permissions` PermissionDto[] signal below). */
  readonly appPermissions = Permissions;

  readonly roleOptions = BACKEND_ROLES;

  readonly features = signal<FeatureDto[]>([]);
  readonly isLoadingFeatures = signal(false);

  readonly permissions = signal<PermissionDto[]>([]);
  readonly isLoadingPermissions = signal(false);

  readonly selectedRoleId = signal<number | null>(null);
  readonly isLoadingMatrix = signal(false);
  readonly isSavingMatrix = signal(false);
  readonly checkedCells = signal<Set<string>>(new Set());

  readonly hasMatrixData = computed(
    () => this.selectedRoleId() != null && this.features().length > 0 && this.permissions().length > 0
  );

  ngOnInit(): void {
    this.loadFeatures();
    this.loadPermissions();
  }

  canManage(): boolean {
    return this.authService.hasPermission(Permissions.RolesPermissions.Manage);
  }

  // --- Features tab ---

  loadFeatures(): void {
    this.isLoadingFeatures.set(true);
    this.featuresApi.getAll().subscribe({
      next: (response) => {
        this.features.set(response.data ?? []);
        this.isLoadingFeatures.set(false);
      },
      error: () => this.isLoadingFeatures.set(false),
    });
  }

  createFeature(): void {
    this.openFeatureDialog(null);
  }

  editFeature(feature: FeatureDto): void {
    this.openFeatureDialog(feature);
  }

  private openFeatureDialog(feature: FeatureDto | null): void {
    const ref = this.dialogService.open(FeatureDialogComponent, {
      header: this.translate.instant(
        feature ? 'rolesPermissions.features.editDialogTitle' : 'rolesPermissions.features.createDialogTitle'
      ),
      width: '32rem',
      modal: true,
      closable: true,
      data: { feature },
    });

    ref.onClose.subscribe((changed: boolean | undefined) => {
      if (changed) {
        this.loadFeatures();
      }
    });
  }

  deleteFeature(feature: FeatureDto): void {
    if (feature.id == null) {
      return;
    }

    this.confirmationService.confirm({
      message: this.translate.instant('rolesPermissions.features.confirmDelete', { name: feature.name }),
      header: this.translate.instant('rolesPermissions.confirmHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.featuresApi.delete(feature.id!).subscribe({
          next: (response) => {
            if (response.succeeded) {
              this.features.update((list) => list.filter((f) => f.id !== feature.id));
            }
          },
        });
      },
    });
  }

  // --- Permissions tab ---

  loadPermissions(): void {
    this.isLoadingPermissions.set(true);
    this.permissionsApi.getAll().subscribe({
      next: (response) => {
        this.permissions.set(response.data ?? []);
        this.isLoadingPermissions.set(false);
      },
      error: () => this.isLoadingPermissions.set(false),
    });
  }

  createPermission(): void {
    this.openPermissionDialog(null);
  }

  editPermission(permission: PermissionDto): void {
    this.openPermissionDialog(permission);
  }

  private openPermissionDialog(permission: PermissionDto | null): void {
    const ref = this.dialogService.open(PermissionDialogComponent, {
      header: this.translate.instant(
        permission
          ? 'rolesPermissions.permissions.editDialogTitle'
          : 'rolesPermissions.permissions.createDialogTitle'
      ),
      width: '28rem',
      modal: true,
      closable: true,
      data: { permission },
    });

    ref.onClose.subscribe((changed: boolean | undefined) => {
      if (changed) {
        this.loadPermissions();
      }
    });
  }

  deletePermission(permission: PermissionDto): void {
    if (permission.id == null) {
      return;
    }

    this.confirmationService.confirm({
      message: this.translate.instant('rolesPermissions.permissions.confirmDelete', { name: permission.name }),
      header: this.translate.instant('rolesPermissions.confirmHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.permissionsApi.delete(permission.id!).subscribe({
          next: (response) => {
            if (response.succeeded) {
              this.permissions.update((list) => list.filter((p) => p.id !== permission.id));
            }
          },
        });
      },
    });
  }

  // --- Role permissions matrix tab ---

  onRoleChange(roleId: number | null): void {
    this.selectedRoleId.set(roleId);
    this.checkedCells.set(new Set());

    if (roleId == null) {
      return;
    }

    this.isLoadingMatrix.set(true);
    this.rolePermissionsApi.getRolePermissions(roleId).subscribe({
      next: (response) => {
        const next = new Set<string>();
        for (const feature of response.data?.features ?? []) {
          for (const permission of feature.permissions ?? []) {
            if (feature.featureId != null && permission.id != null) {
              next.add(this.cellKey(feature.featureId, permission.id));
            }
          }
        }
        this.checkedCells.set(next);
        this.isLoadingMatrix.set(false);
      },
      error: () => this.isLoadingMatrix.set(false),
    });
  }

  private cellKey(featureId: number, permissionId: number): string {
    return `${featureId}:${permissionId}`;
  }

  isCellChecked(featureId: number, permissionId: number): boolean {
    return this.checkedCells().has(this.cellKey(featureId, permissionId));
  }

  toggleCell(featureId: number, permissionId: number): void {
    const key = this.cellKey(featureId, permissionId);
    const next = new Set(this.checkedCells());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.checkedCells.set(next);
  }

  saveMatrix(): void {
    const roleId = this.selectedRoleId();
    if (roleId == null) {
      return;
    }

    const checked = this.checkedCells();
    const features = this.features().map(
      (feature) =>
        new FeaturePermissionsDto({
          featureId: feature.id!,
          permissions: this.permissions()
            .filter((permission) => checked.has(this.cellKey(feature.id!, permission.id!)))
            .map((permission) => permission.id!),
        })
    );

    this.isSavingMatrix.set(true);
    this.rolePermissionsApi
      .assignRolePermissions(roleId, new AssignRolePermissionsCommand({ features }))
      .subscribe({
        next: () => this.isSavingMatrix.set(false),
        error: () => this.isSavingMatrix.set(false),
      });
  }
}
