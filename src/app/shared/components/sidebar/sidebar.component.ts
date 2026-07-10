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
import { TooltipModule } from 'primeng/tooltip';

// Services
import { SidebarService } from '../../../core/services/sidebar.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/auth/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  command?: () => void;
  /**
   * When set, the item is only shown if the current user has one of these
   * roles. Gated by role (not permission) because roles come straight off
   * the login response body — reliable across mock and real backends —
   * whereas fine-grained permissions depend on JWT claims the real backend
   * may not issue yet.
   */
  roles?: string[];
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
    MenuModule,
    TooltipModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  
  navSections: NavSection[] = [
    {
      title: 'sidebar.sections.overview',
      items: [
        { label: 'sidebar.items.dashboard', icon: 'pi pi-home', route: '/dashboard' },
        // { label: 'sidebar.items.agreementWizard', icon: 'pi pi-briefcase', route: '/agreement-wizard' },
        { label: 'sidebar.items.projectManagement', icon: 'pi pi-th-large', route: '/projects' },
        { label: 'sidebar.items.constructors', icon: 'pi pi-users', route: '/constructor' },
        { label: 'sidebar.items.suppliers', icon: 'pi pi-building', route: '/supplier' },
        { label: 'sidebar.items.materials', icon: 'pi pi-box', route: '/materials' },
        { label: 'sidebar.items.users', icon: 'pi pi-user-edit', route: '/users' },
      ]
    }
  ];

  footerItems: NavItem[] = [
    { label: 'sidebar.footer.settings', icon: 'pi pi-cog', route: '/settings' },
    { label: 'sidebar.footer.help', icon: 'pi pi-question-circle', route: '/help' }
  ];

  constructor(
    private router: Router,
    public sidebarService: SidebarService,
    public themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  canShow(item: NavItem): boolean {
    return !item.roles?.length || this.authService.hasAnyRole(item.roles);
  }

  get logoPath(): string {
    return this.themeService.isDarkTheme() 
      ? 'assets/logo/neuro code dark.png' 
      : 'assets/logo/neuro code light.png';
  }

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
    if (route === '/dashboard') return this.router.url === '/dashboard';
    return this.router.url.startsWith(route);
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
    this.closeMobileMenu();
  }
}
