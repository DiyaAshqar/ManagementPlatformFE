import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard, permissionGuard } from './core/auth/guards/auth.guard';
import { Permissions } from './core/auth/models/auth.models';

export const routes: Routes = [
  // Root redirect
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },

  // Authentication routes (public - guest only)
  {
    path: 'auth',
    canActivate: [GuestGuard],
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component')
      .then(m => m.AuthLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.component')
          .then(m => m.LoginComponent)
      }
    ]
  },

  // Protected routes with main layout
  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics.component')
          .then(m => m.AnalyticsComponent)
      },
      {
        path: 'theme-showcase',
        loadComponent: () => import('./features/theme-showcase/theme-showcase.component')
          .then(m => m.ThemeShowcaseComponent)
      },
      {
        path: 'reporting-demo',
        loadComponent: () => import('./features/reporting/demo/reporting-demo-page/reporting-demo-page.component')
          .then(m => m.ReportingDemoPageComponent)
      },
      {
        path: 'project-report-demo',
        loadComponent: () => import('./features/project-management/components/project-report/demo/project-report-demo-page/project-report-demo-page.component')
          .then(m => m.ProjectReportDemoPageComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'agreement-wizard',
        children: [
          {
            path: '',
            canActivate: [permissionGuard([Permissions.Agreements.View])],
            loadComponent: () => import('./features/agreement-wizard/pages/agreement-list/agreement-list.component')
              .then(m => m.AgreementListComponent)
          },
          {
            path: 'create',
            canActivate: [permissionGuard([Permissions.Agreements.Create])],
            loadComponent: () => import('./features/agreement-wizard/components/agreement-wizard.component')
              .then(m => m.AgreementWizardComponent)
          },
          {
            path: 'success',
            canActivate: [permissionGuard([Permissions.Agreements.Create, Permissions.Agreements.Edit])],
            loadComponent: () => import('./features/agreement-wizard/pages/agreement-success/agreement-success.component')
              .then(m => m.AgreementSuccessComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [permissionGuard([Permissions.Agreements.Edit])],
            loadComponent: () => import('./features/agreement-wizard/components/agreement-wizard.component')
              .then(m => m.AgreementWizardComponent)
          },
          {
            path: 'view/:id',
            canActivate: [permissionGuard([Permissions.Agreements.View])],
            loadComponent: () => import('./features/agreement-wizard/components/agreement-wizard.component')
              .then(m => m.AgreementWizardComponent)
          }
        ]
      },
      {
        path: 'projects',
        children: [
          {
            path: '',
            canActivate: [permissionGuard([Permissions.Projects.View, Permissions.Projects.ViewAssigned])],
            loadComponent: () => import('./features/project-management/pages/project-list/project-list.component')
              .then(m => m.ProjectListComponent)
          },
          {
            path: ':id',
            canActivate: [permissionGuard([Permissions.Projects.View, Permissions.Projects.ViewAssigned])],
            loadComponent: () => import('./features/project-management/pages/project-detail/project-detail.component')
              .then(m => m.ProjectDetailComponent)
          }
        ]
      },
      {
        path: 'constructor',
        children: [
          {
            path: '',
            canActivate: [permissionGuard([Permissions.Constructors.View, Permissions.Constructors.Manage])],
            loadComponent: () => import('./features/constructor/pages/constructor-list/constructor-list.component')
              .then(m => m.ConstructorListComponent)
          },
          {
            path: 'new',
            canActivate: [permissionGuard([Permissions.Constructors.Manage])],
            loadComponent: () => import('./features/constructor/pages/constructor-form/constructor-form.component')
              .then(m => m.ConstructorFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [permissionGuard([Permissions.Constructors.Manage])],
            loadComponent: () => import('./features/constructor/pages/constructor-form/constructor-form.component')
              .then(m => m.ConstructorFormComponent)
          }
        ]
      },
      {
        path: 'supplier',
        children: [
          {
            path: '',
            canActivate: [permissionGuard([Permissions.Suppliers.View, Permissions.Suppliers.Manage])],
            loadComponent: () => import('./features/supplier/pages/supplier-list/supplier-list.component')
              .then(m => m.SupplierListComponent)
          },
          {
            path: 'new',
            canActivate: [permissionGuard([Permissions.Suppliers.Manage])],
            loadComponent: () => import('./features/supplier/pages/supplier-form/supplier-form.component')
              .then(m => m.SupplierFormComponent)
          },
          {
            path: 'edit/:id',
            canActivate: [permissionGuard([Permissions.Suppliers.Manage])],
            loadComponent: () => import('./features/supplier/pages/supplier-form/supplier-form.component')
              .then(m => m.SupplierFormComponent)
          }
        ]
      },
      {
        path: 'materials',
        canActivate: [permissionGuard([Permissions.Materials.View, Permissions.Materials.Manage])],
        loadComponent: () => import('./features/material/pages/material-management/material-management.component')
          .then(m => m.MaterialManagementComponent)
      },
      {
        path: 'users',
        canActivate: [permissionGuard([Permissions.Users.View, Permissions.Users.Manage])],
        loadComponent: () => import('./features/user-management/pages/user-list/user-list.component')
          .then(m => m.UserListComponent)
      },
      {
        path: 'roles-permissions',
        canActivate: [permissionGuard([Permissions.RolesPermissions.View, Permissions.RolesPermissions.Manage])],
        loadComponent: () => import('./features/roles-permissions/pages/roles-permissions/roles-permissions.component')
          .then(m => m.RolesPermissionsComponent)
      }
    ]
  },

  // Wildcard route (404)
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
