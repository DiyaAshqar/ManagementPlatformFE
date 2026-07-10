import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { OverlayPanelModule } from 'primeng/overlaypanel';

// Services
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

// Components
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { ChangePasswordDialogComponent } from '../change-password-dialog/change-password-dialog.component';

@Component({
  selector: 'app-top-nav',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    AvatarModule,
    MenuModule,
    BadgeModule,
    OverlayPanelModule,
    BreadcrumbComponent
  ],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss']
})
export class TopNavComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly dialogService = inject(DialogService);

  profileMenuItems: MenuItem[] = [];
  notificationsCount = 3;

  constructor(
    public themeService: ThemeService,
    public languageService: LanguageService,
    public authService: AuthService,
    public sidebarService: SidebarService
  ) {
    // Rebuild the menu labels whenever the active language changes.
    effect(() => {
      this.languageService.currentLanguage();
      this.initializeProfileMenu();
    });
  }

  ngOnInit(): void {
    this.initializeProfileMenu();
  }

  initializeProfileMenu(): void {
    this.profileMenuItems = [
      {
        label: this.translate.instant('topNav.profileMenu.profile'),
        icon: 'pi pi-user',
        command: () => this.navigateToProfile()
      },
      {
        label: this.translate.instant('topNav.profileMenu.changePassword'),
        icon: 'pi pi-key',
        command: () => this.openChangePassword()
      },
      {
        label: this.translate.instant('topNav.profileMenu.settings'),
        icon: 'pi pi-cog',
        command: () => this.navigateToSettings()
      },
      {
        separator: true
      },
      {
        label: this.translate.instant('topNav.profileMenu.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];
  }

  openChangePassword(): void {
    this.dialogService.open(ChangePasswordDialogComponent, {
      header: this.translate.instant('changePassword.title'),
      width: '28rem',
      modal: true,
      closable: true
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  toggleMobileSidebar(): void {
    this.sidebarService.toggleMobile();
  }

  navigateToProfile(): void {
    console.log('Navigate to profile');
  }

  navigateToSettings(): void {
    console.log('Navigate to settings');
  }

  logout(): void {
    this.authService.logout();
  }

  showNotifications(): void {
    console.log('Show notifications');
  }
}
