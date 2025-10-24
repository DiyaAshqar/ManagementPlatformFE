import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from './core/auth/guards/auth.guard';

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
        path: 'agreement-wizard',
        loadComponent: () => import('./features/agreement-wizard/agreement-wizard.component')
          .then(m => m.AgreementWizardComponent)
      }
    ]
  },

  // Wildcard route (404)
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
