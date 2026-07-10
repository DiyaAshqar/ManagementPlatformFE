import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { IUserDto, UserDto } from '../../../../../nswag/api-client';
import { AssignRoleDialogComponent } from '../../components/assign-role-dialog/assign-role-dialog.component';
import { CreateUserDialogComponent } from '../../components/create-user-dialog/create-user-dialog.component';
import { UsersApiService } from '../../services/users-api.service';

@Component({
  selector: 'app-user-list',
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
    TagModule,
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent implements OnInit {
  private readonly usersApi = inject(UsersApiService);
  private readonly dialogService = inject(DialogService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly users = signal<UserDto[]>([]);
  readonly isLoading = signal(false);
  readonly searchText = signal('');

  readonly filteredUsers = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.users();
    }
    return this.users().filter((user) =>
      [user.fullName, user.arabicFullName, user.email, user.phoneNumber]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.usersApi.getAllUsers().subscribe({
      next: (response) => {
        this.users.set(response.data ?? []);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  toggleActive(user: UserDto): void {
    if (user.id == null) {
      return;
    }

    const activating = !user.isActive;
    const messageKey = activating
      ? 'userManagement.confirm.activateMessage'
      : 'userManagement.confirm.deactivateMessage';

    this.confirmationService.confirm({
      message: this.translate.instant(messageKey, { name: user.fullName || user.email }),
      header: this.translate.instant('userManagement.confirm.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const request$ = activating
          ? this.usersApi.activateUser(user.id!)
          : this.usersApi.deactivateUser(user.id!);

        request$.subscribe({
          next: (response) => {
            if (response.succeeded) {
              this.users.update((list) =>
                list.map((u) =>
                  u.id === user.id ? new UserDto({ ...u, isActive: activating } as IUserDto) : u
                )
              );
            }
          },
        });
      },
    });
  }

  softDelete(user: UserDto): void {
    if (user.id == null) {
      return;
    }

    this.confirmationService.confirm({
      message: this.translate.instant('userManagement.confirm.deleteMessage', {
        name: user.fullName || user.email,
      }),
      header: this.translate.instant('userManagement.confirm.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.usersApi.softDeleteUser(user.id!).subscribe({
          next: (response) => {
            if (response.succeeded) {
              this.users.update((list) => list.filter((u) => u.id !== user.id));
            }
          },
        });
      },
    });
  }

  manageRoles(user: UserDto): void {
    if (user.id == null) {
      return;
    }

    const ref = this.dialogService.open(AssignRoleDialogComponent, {
      header: this.translate.instant('userManagement.rolesDialog.title'),
      width: '30rem',
      modal: true,
      closable: true,
      data: { user },
    });

    ref.onClose.subscribe((changed: boolean | undefined) => {
      if (changed) {
        this.loadUsers();
      }
    });
  }

  createUser(): void {
    const ref = this.dialogService.open(CreateUserDialogComponent, {
      header: this.translate.instant('userManagement.createDialog.title'),
      width: '32rem',
      modal: true,
      closable: true,
    });

    ref.onClose.subscribe((created: boolean | undefined) => {
      if (created) {
        this.loadUsers();
      }
    });
  }
}
