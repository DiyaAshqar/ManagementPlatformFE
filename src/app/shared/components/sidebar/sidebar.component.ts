import { Component, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
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

/** A module is a collapsible group in the sidebar; its items are the module's screens. */
interface NavModule {
  key: string;
  title: string;
  icon: string;
  items: NavItem[];
}

const EXPANDED_MODULES_KEY = 'sidebar_expanded_modules';

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
  readonly deploymentStatus = this.getDeploymentStatus();

  navModules: NavModule[] = [
    {
      key: 'construction',
      title: 'sidebar.modules.construction',
      icon: 'pi pi-building',
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
          label: 'sidebar.items.wirChecklist',
          icon: 'pi pi-list-check',
          route: '/wir-checklist',
          permissions: [Permissions.Wir.Manage],
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
    },
    {
      key: 'office',
      title: 'sidebar.modules.office',
      icon: 'pi pi-compass',
      items: [
        { label: 'sidebar.office.projects', icon: 'pi pi-th-large', route: '/office/projects' },
        { label: 'sidebar.office.quotes', icon: 'pi pi-file-edit', route: '/office/quotes' },
        { label: 'sidebar.office.stageTemplates', icon: 'pi pi-sitemap', route: '/office/stage-templates' },
        { label: 'sidebar.office.claims', icon: 'pi pi-money-bill', route: '/office/claims' },
        { label: 'sidebar.office.receipts', icon: 'pi pi-wallet', route: '/office/receipts' },
        { label: 'sidebar.office.expenses', icon: 'pi pi-credit-card', route: '/office/expenses' },
        { label: 'sidebar.office.reports', icon: 'pi pi-chart-bar', route: '/office/reports' },
      ]
    }
  ];

  /** Which modules are expanded; persisted so the sidebar keeps its shape across reloads. */
  readonly expandedModules = signal<Record<string, boolean>>(this.loadExpanded());

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
      const allItems = [...this.navModules.flatMap((module) => module.items), ...this.footerItems];
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

  ngOnInit(): void {
    this.expandActiveModule();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.expandActiveModule());
  }

  canShow(item: NavItem): boolean {
    const hasRequiredRole = !item.roles?.length || this.authService.hasAnyRole(item.roles);
    const hasRequiredPermission =
      !item.permissions?.length || this.authService.hasAnyPermission(item.permissions);
    return hasRequiredRole && hasRequiredPermission;
  }

  visibleItems(module: NavModule): NavItem[] {
    return module.items.filter((item) => this.canShow(item));
  }

  isModuleExpanded(module: NavModule): boolean {
    return !!this.expandedModules()[module.key];
  }

  isModuleActive(module: NavModule): boolean {
    return module.items.some((item) => this.isActiveRoute(item.route));
  }

  toggleModule(module: NavModule): void {
    this.expandedModules.update((state) => ({ ...state, [module.key]: !state[module.key] }));
    this.saveExpanded();
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
    const url = this.router.url.split('?')[0];
    if (route === '/dashboard') return url === '/dashboard';
    return url === route || url.startsWith(route + '/');
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
    this.closeMobileMenu();
  }

  /** Opens the module that owns the current route so the active item is always visible. */
  private expandActiveModule(): void {
    const active = this.navModules.find((m) => this.isModuleActive(m));
    if (active && !this.isModuleExpanded(active)) {
      this.expandedModules.update((state) => ({ ...state, [active.key]: true }));
      this.saveExpanded();
    }
  }

  private loadExpanded(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(EXPANDED_MODULES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveExpanded(): void {
    try {
      localStorage.setItem(EXPANDED_MODULES_KEY, JSON.stringify(this.expandedModules()));
    } catch {
      /* storage unavailable: the state just won't persist */
    }
  }

  private getDeploymentStatus(): string {
    const deployedAt = window.__env?.DEPLOYED_AT;
    if (!deployedAt) {
      return 'Local development version';
    }

    const date = new Date(deployedAt);
    if (Number.isNaN(date.getTime())) {
      return `Server version: ${deployedAt}`;
    }

    return `Server version: ${date.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}`;
  }
}
