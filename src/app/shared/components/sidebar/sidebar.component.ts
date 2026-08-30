import { Component, OnInit, effect } from '@angular/core';
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
import { Permissions } from '../../../core/auth/models/auth.models';

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
  permissions?: string[];
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
        {
          label: 'sidebar.items.agreementWizard',
          icon: 'pi pi-briefcase',
          route: '/agreement-wizard',
          permissions: [Permissions.Agreements.View],
        },
        {
          label: 'sidebar.items.projectManagement',
          icon: 'pi pi-th-large',
          route: '/projects',
          permissions: [Permissions.Projects.View, Permissions.Projects.ViewAssigned],
        },
        {
          label: 'sidebar.items.constructors',
          icon: 'pi pi-users',
          route: '/constructor',
          permissions: [Permissions.Constructors.View, Permissions.Constructors.Manage],
        },
        {
          label: 'sidebar.items.suppliers',
          icon: 'pi pi-building',
          route: '/supplier',
          permissions: [Permissions.Suppliers.View, Permissions.Suppliers.Manage],
        },
        {
          label: 'sidebar.items.materials',
          icon: 'pi pi-box',
          route: '/materials',
          permissions: [Permissions.Materials.View, Permissions.Materials.Manage],
        },
        {
          label: 'sidebar.items.users',
          icon: 'pi pi-user-edit',
          route: '/users',
          permissions: [Permissions.Users.View, Permissions.Users.Manage],
        },
        {
          label: 'sidebar.items.rolesPermissions',
          icon: 'pi pi-shield',
          route: '/roles-permissions',
          permissions: [Permissions.RolesPermissions.View, Permissions.RolesPermissions.Manage],
        },
        {
          label: 'sidebar.items.projectReportDemo',
          icon: 'pi pi-file-pdf',
          route: '/project-report-demo',
          permissions: [Permissions.ProjectReport.View],
        },
        // {
        //   label: 'sidebar.items.reportingDemo',
        //   icon: 'pi pi-chart-bar',
        //   route: '/reporting-demo',
        // },
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
  ) {
    // Re-runs whenever roles/permissions change (login, refresh, logout) —
    // shows exactly why each nav item is/isn't visible.
    effect(() => {
      const roles = this.authService.roles();
      const permissions = this.authService.permissions();
      const allItems = [...this.navSections.flatMap((section) => section.items), ...this.footerItems];
      const visibility = allItems.map((item) => ({
        label: item.label,
        requiredRoles: item.roles,
        requiredPermissions: item.permissions,
        visible: this.canShow(item),
      }));
      // eslint-disable-next-line no-console
      console.log('[AuthDebug] Sidebar visibility snapshot', { roles, permissions, visibility });
    });
  }

  ngOnInit(): void {}

  canShow(item: NavItem): boolean {
    const hasRequiredRole = !item.roles?.length || this.authService.hasAnyRole(item.roles);
    const hasRequiredPermission =
      !item.permissions?.length || this.authService.hasAnyPermission(item.permissions);
    return hasRequiredRole && hasRequiredPermission;
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
