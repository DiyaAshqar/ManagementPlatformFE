import { CommonModule } from '@angular/common';
import { Component, OnInit, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { BooleanResponse, UserDto } from '../../../../../nswag/api-client';
import { UsersApiService } from '../../services/users-api.service';

/**
 * Backend role directory, confirmed manually (no `GET /api/Roles` endpoint
 * exists to fetch this). Keep in sync with the backend's Role table if it
 * ever changes.
 */
export const BACKEND_ROLES: { label: string; value: number }[] = [
  { label: 'userManagement.roles.admin', value: 1 },
  { label: 'userManagement.roles.user', value: 2 },
];

@Component({
  selector: 'app-assign-role-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ButtonModule, SelectModule, MessageModule, TagModule],
  templateUrl: './assign-role-dialog.component.html',
  styleUrls: ['./assign-role-dialog.component.scss'],
})
export class AssignRoleDialogComponent implements OnInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly usersApi = inject(UsersApiService);

  readonly roleOptions = BACKEND_ROLES;

  readonly user = signal<UserDto | null>(null);
  readonly roleId = signal<number | null>(null);
  readonly isAssigning = signal(false);
  readonly isRemoving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** Whether any role was successfully assigned/removed — tells the caller to refresh. */
  private changed = false;

  ngOnInit(): void {
    this.user.set(this.config.data?.user ?? null);
  }

  assignRole(): void {
    this.runRoleAction(this.isAssigning, (userId, roleId) =>
      this.usersApi.assignRole(userId, roleId)
    );
  }

  removeRole(): void {
    this.runRoleAction(this.isRemoving, (userId, roleId) =>
      this.usersApi.removeRole(userId, roleId)
    );
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }

  private runRoleAction(
    loading: WritableSignal<boolean>,
    action: (userId: number, roleId: number) => Observable<BooleanResponse>
  ): void {
    const user = this.user();
    const roleId = this.roleId();
    this.errorMessage.set(null);

    if (user?.id == null || roleId == null) {
      return;
    }

    loading.set(true);
    action(user.id, roleId).subscribe({
      next: (response) => {
        loading.set(false);
        if (response.succeeded) {
          this.changed = true;
          this.roleId.set(null);
        } else {
          this.errorMessage.set(response.message || null);
        }
      },
      error: () => loading.set(false),
    });
  }
}
