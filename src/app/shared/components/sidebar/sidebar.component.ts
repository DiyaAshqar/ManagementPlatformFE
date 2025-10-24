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
        { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
        { label: 'Analytics', icon: 'pi pi-chart-bar', route: '/analytics' },
        { label: 'Organization', icon: 'pi pi-building', route: '/organization' },
        { label: 'Projects', icon: 'pi pi-folder', route: '/projects' }
      ]
    },
    {
      title: 'Finance',
      items: [
        { label: 'Transactions', icon: 'pi pi-wallet', route: '/transactions' },
        { label: 'Invoices', icon: 'pi pi-file', route: '/invoices' },
        { label: 'Payments', icon: 'pi pi-credit-card', route: '/payments' }
      ]
    },
    {
      title: 'Team',
      items: [
        { label: 'Members', icon: 'pi pi-users', route: '/members' },
        { label: 'Permissions', icon: 'pi pi-shield', route: '/permissions' },
        { label: 'Chat', icon: 'pi pi-comments', route: '/chat' },
        { label: 'Meetings', icon: 'pi pi-video', route: '/meetings' }
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
