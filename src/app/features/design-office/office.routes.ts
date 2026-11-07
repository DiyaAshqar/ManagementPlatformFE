import { Routes } from '@angular/router';

/** Engineering Office module — lazy-loaded under /office. */
export const OFFICE_ROUTES: Routes = [
  { path: '', redirectTo: 'projects', pathMatch: 'full' },
  {
    path: 'projects',
    loadComponent: () => import('./pages/project-list/project-list.component').then((m) => m.OfficeProjectListComponent),
  },
  {
    path: 'projects/new',
    loadComponent: () => import('./pages/project-form/project-form.component').then((m) => m.OfficeProjectFormComponent),
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./pages/project-detail/project-detail.component').then((m) => m.OfficeProjectDetailComponent),
  },
  {
    path: 'projects/:id/edit',
    loadComponent: () => import('./pages/project-form/project-form.component').then((m) => m.OfficeProjectFormComponent),
  },
  {
    path: 'projects/:id/contract',
    loadComponent: () => import('./pages/project-contract/project-contract.component').then((m) => m.OfficeProjectContractComponent),
  },
  {
    path: 'projects/:id/expenses',
    loadComponent: () => import('./pages/project-expenses/project-expenses.component').then((m) => m.OfficeProjectExpensesComponent),
  },
  {
    path: 'projects/:id/drawings',
    loadComponent: () => import('./pages/drawings/drawings.component').then((m) => m.OfficeDrawingsComponent),
  },
  {
    path: 'projects/:id/stages/:stageId',
    loadComponent: () => import('./pages/stage-detail/stage-detail.component').then((m) => m.OfficeStageDetailComponent),
  },
  {
    path: 'quotes',
    loadComponent: () => import('./pages/quote-list/quote-list.component').then((m) => m.OfficeQuoteListComponent),
  },
  {
    path: 'quotes/new',
    loadComponent: () => import('./pages/quote-form/quote-form.component').then((m) => m.OfficeQuoteFormComponent),
  },
  {
    path: 'quotes/:id',
    loadComponent: () => import('./pages/quote-form/quote-form.component').then((m) => m.OfficeQuoteFormComponent),
  },
  {
    path: 'quotes/:id/preview',
    loadComponent: () => import('./pages/quote-preview/quote-preview.component').then((m) => m.OfficeQuotePreviewComponent),
  },
  {
    path: 'stage-templates',
    loadComponent: () => import('./pages/stage-templates/stage-templates.component').then((m) => m.OfficeStageTemplatesComponent),
  },
  {
    path: 'claims',
    loadComponent: () => import('./pages/claim-list/claim-list.component').then((m) => m.OfficeClaimListComponent),
  },
  {
    path: 'claims/:id',
    loadComponent: () => import('./pages/claim-detail/claim-detail.component').then((m) => m.OfficeClaimDetailComponent),
  },
  {
    path: 'receipts',
    loadComponent: () => import('./pages/receipts/receipts.component').then((m) => m.OfficeReceiptsComponent),
  },
  {
    path: 'expenses',
    loadComponent: () => import('./pages/admin-expenses/admin-expenses.component').then((m) => m.OfficeAdminExpensesComponent),
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports.component').then((m) => m.OfficeReportsComponent),
  },
  {
    path: 'clients/:id/statement',
    loadComponent: () => import('./pages/client-statement/client-statement.component').then((m) => m.OfficeClientStatementComponent),
  },
];
