import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  // Root redirect
  {
    path: '',
    redirectTo: '/agreement-wizard',
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
        path: 'agreement-wizard',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/agreement-wizard/pages/agreement-list/agreement-list.component')
              .then(m => m.AgreementListComponent)
          },
          {
            path: 'create',
            loadComponent: () => import('./features/agreement-wizard/components/agreement-wizard.component')
              .then(m => m.AgreementWizardComponent)
          },
          {
            path: 'success',
            loadComponent: () => import('./features/agreement-wizard/pages/agreement-success/agreement-success.component')
              .then(m => m.AgreementSuccessComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./features/agreement-wizard/components/agreement-wizard.component')
              .then(m => m.AgreementWizardComponent)
          },
          {
            path: 'view/:id',
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
            loadComponent: () => import('./features/project-management/pages/project-list/project-list.component')
              .then(m => m.ProjectListComponent)
          },
          {
            path: ':id',
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
            loadComponent: () => import('./features/constructor/pages/constructor-list/constructor-list.component')
              .then(m => m.ConstructorListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/constructor/pages/constructor-form/constructor-form.component')
              .then(m => m.ConstructorFormComponent)
          },
          {
            path: 'edit/:id',
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
            loadComponent: () => import('./features/supplier/pages/supplier-list/supplier-list.component')
              .then(m => m.SupplierListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/supplier/pages/supplier-form/supplier-form.component')
              .then(m => m.SupplierFormComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./features/supplier/pages/supplier-form/supplier-form.component')
              .then(m => m.SupplierFormComponent)
          }
        ]
      }
    ]
  },

  // Wildcard route (404)
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
