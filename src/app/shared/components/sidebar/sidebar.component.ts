import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

// Services
import { SidebarService } from '../../../core/services/sidebar.service';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  command?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    ButtonModule,
    SidebarModule,
    AvatarModule,
    MenuModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  
  navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Agreement Wizard', icon: 'pi pi-briefcase', route: '/agreement-wizard' },
        { label: 'Theme Showcase', icon: 'pi pi-palette', route: '/theme-showcase' },
      ]
    },
    {
      title: 'Modules',
      items: [
        { label: 'Module 1', icon: 'pi pi-wallet', route: '/Module1' },
      ]
    },
    {
      title: 'Modules',
      items: [
        { label: 'Module 1', icon: 'pi pi-users', route: '/Module1' },
      ]
    }
  ];

  footerItems: NavItem[] = [
    { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
    { label: 'Help', icon: 'pi pi-question-circle', route: '/help' }
  ];

  constructor(
    private router: Router,
    public sidebarService: SidebarService
  ) {}

  ngOnInit(): void {}

  toggleMobileMenu(): void {
    this.sidebarService.toggleMobile();
  }

  closeMobileMenu(): void {
    this.sidebarService.closeMobile();
  }

  navigateTo(route: string | undefined): void {
    if (route) {
      this.router.navigate([route]);
      this.closeMobileMenu();
    }
  }

  isActiveRoute(route: string | undefined): boolean {
    if (!route) return false;
    return this.router.url === route;
  }
}
