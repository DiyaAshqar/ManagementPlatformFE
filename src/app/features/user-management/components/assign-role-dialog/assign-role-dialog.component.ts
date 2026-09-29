import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { BooleanResponse, UserDto } from '../../../../../nswag/api-client';
import { BACKEND_ROLES } from '../../../../core/auth/models/auth.models';
import { UsersApiService } from '../../services/users-api.service';

interface RoleOption {
  label: string;
  value: number;
}

interface AssignedRole {
  name: string;
  /** Resolved backend role id; null when the role is not in the known directory (cannot be removed here). */
  id: number | null;
}

@Component({
  selector: 'app-assign-role-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ButtonModule, SelectModule, MessageModule, TooltipModule],
  templateUrl: './assign-role-dialog.component.html',
  styleUrls: ['./assign-role-dialog.component.scss'],
})
export class AssignRoleDialogComponent implements OnInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly usersApi = inject(UsersApiService);
  private readonly translate = inject(TranslateService);

  readonly user = signal<UserDto | null>(null);
  readonly selectedRoleId = signal<number | null>(null);
  readonly isAssigning = signal(false);
  /** Role id currently being removed (spinner on that chip). */
  readonly removingRoleId = signal<number | null>(null);
  readonly isRefreshing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** Known roles with translated labels (backend has no GET /api/Roles yet). */
  private readonly directory: RoleOption[] = BACKEND_ROLES.map((r) => ({ value: r.value, label: this.translate.instant(r.label) }));

  readonly assignedRoles = computed<AssignedRole[]>(() =>
    (this.user()?.roles ?? []).map((name) => ({ name, id: this.resolveRoleId(name) }))
  );

  /** Only roles the user does not already have. */
  readonly availableRoles = computed<RoleOption[]>(() => {
    const assigned = new Set(this.assignedRoles().map((r) => r.id).filter((id) => id != null));
    return this.directory.filter((r) => !assigned.has(r.value));
  });

  readonly isBusy = computed(() => this.isAssigning() || this.removingRoleId() != null || this.isRefreshing());

  /** Whether any role was assigned/removed — tells the caller to refresh the list. */
  private changed = false;

  ngOnInit(): void {
    this.user.set(this.config.data?.user ?? null);
  }

  assignRole(): void {
    const roleId = this.selectedRoleId();
    if (roleId == null) return;
    this.isAssigning.set(true);
    this.run(
      (userId) => this.usersApi.assignRole(userId, roleId),
      () => this.isAssigning.set(false)
    );
  }

  removeRole(role: AssignedRole): void {
    if (role.id == null) return;
    this.removingRoleId.set(role.id);
    this.run(
      (userId) => this.usersApi.removeRole(userId, role.id!),
      () => this.removingRoleId.set(null)
    );
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }

  private run(action: (userId: number) => Observable<BooleanResponse>, done: () => void): void {
    const userId = this.user()?.id;
    if (userId == null) return;
    this.errorMessage.set(null);

    action(userId).subscribe({
      next: (response) => {
        done();
        if (response.succeeded) {
          this.changed = true;
          this.selectedRoleId.set(null);
          this.refreshUser(userId);
        } else {
          this.errorMessage.set(response.message || this.translate.instant('userManagement.rolesDialog.failed'));
        }
      },
      error: () => done(),
    });
  }

  /** Re-reads the user so the chips reflect the backend's actual role names. */
  private refreshUser(userId: number): void {
    this.isRefreshing.set(true);
    this.usersApi.getUserById(userId).subscribe({
      next: (res) => {
        if (res.succeeded && res.data) this.user.set(res.data);
        this.isRefreshing.set(false);
      },
      error: () => this.isRefreshing.set(false),
    });
  }

  /** Matches a role name from the user DTO against the known directory (raw key or translated label). */
  private resolveRoleId(name: string): number | null {
    const normalized = name.trim().toLowerCase();
    const match = BACKEND_ROLES.find((r) => {
      const key = r.label.split('.').pop()!.toLowerCase();
      return key === normalized || this.translate.instant(r.label).toLowerCase() === normalized;
    });
    return match?.value ?? null;
  }
}
