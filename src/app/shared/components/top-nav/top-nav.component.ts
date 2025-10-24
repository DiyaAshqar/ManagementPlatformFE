import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';
import { OverlayPanelModule } from 'primeng/overlaypanel';

// Services
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { SidebarService } from '../../../core/services/sidebar.service';

interface Breadcrumb {
  label: string;
  url?: string;
}

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
    OverlayPanelModule
  ],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss']
})
export class TopNavComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [
    { label: 'Management', url: '#' },
    { label: 'Dashboard', url: '#' }
  ];

  profileMenuItems: MenuItem[] = [];
  notificationsCount = 3;

  constructor(
    public themeService: ThemeService,
    public languageService: LanguageService,
    public authService: AuthService,
    public sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.initializeProfileMenu();
  }

  initializeProfileMenu(): void {
    this.profileMenuItems = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.navigateToProfile()
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => this.navigateToSettings()
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];
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
