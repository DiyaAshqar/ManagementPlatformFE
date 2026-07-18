import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogService } from 'primeng/dynamicdialog';
import { TagModule } from 'primeng/tag';

import { ChangePasswordDialogComponent } from '../../shared/components/change-password-dialog/change-password-dialog.component';
import { AuthService } from '../../core/auth/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslateModule, AvatarModule, ButtonModule, CardModule, TagModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  private readonly dialogService = inject(DialogService);
  private readonly translate = inject(TranslateService);
  private readonly authService = inject(AuthService);

  readonly user = this.authService.currentUser;

  readonly initials = computed<string | undefined>(() => {
    const name = this.user()?.fullName?.trim();
    if (!name) {
      return undefined;
    }
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  changePassword(): void {
    this.dialogService.open(ChangePasswordDialogComponent, {
      header: this.translate.instant('changePassword.title'),
      width: '28rem',
      modal: true,
      closable: true,
    });
  }
}
