# PROJECT_CONTEXT.md

> Long-term context document for AI agents and developers working on this repository.
> Generated from a full repository inspection on 2026-05-23.

---

## 1. Project Overview

**Project name (internal):** `construction` (see [package.json](package.json#L2))
**Display / brand name:** `Construction` / "Neuro Code" (referenced in [styles.scss](src/styles.scss#L1) and assets/logo).
**Type of application:** Single-Page Application (SPA), an internal management/back-office platform.

### What it does
This is the **frontend** of a Construction Project Management Platform. It allows construction-company users to:

- Create and manage **Agreements** (contracts with clients) via a multi-step wizard.
- Create and track **Projects** that are derived from those agreements.
- Manage construction work in three stage families: **Preparing**, **Excavation**, and one or more **Milestone** stages.
- Per milestone, track **Bill of Quantities (BoQ)**, **Purchase Orders (PO)**, **Variation Orders (VO)**, **Surveying Visits**, **Main Contractor** assignments, **Contractor Payments**, **Owner Payments**, **Expenses**, **Documents**, and **Payment Claims**.
- Maintain master data: **Constructors** (contractors), **Suppliers**, and a hierarchical **Materials** catalog (Category → SubCategory → Material).
- Upload, preview, and download **Attachments** linked to entities (project, milestone, task, PO, surveying visit, etc.).
- Visualize project timeline via a **Timeframe** Gantt-style view.
- View a kanban-style **Stage Board** for tasks with subtasks under preparing/excavation stages.

### Business domain
Construction industry — agreement-driven projects with hierarchical staging, financial flows (budget, BoQ, PO/VO, payments) and document management. The UI is bilingual (English / Arabic) with full RTL support.

### Main technologies
- **Angular 19** (standalone components, signals API, lazy-loaded routes).
- **PrimeNG 19** + **PrimeFlex** + **PrimeIcons** for UI.
- **`@ngx-translate`** for i18n (en + ar).
- **NSwag-generated TypeScript client** for a .NET Web API backend (87 endpoints across 21 controller-clients).
- **RxJS 7.8** with signals interop for state.
- **SCSS** with custom CSS variables and a custom PrimeNG Aura preset.

### High-level summary of how the app works
1. The browser loads [main.ts](src/main.ts) which bootstraps `AppComponent` with the providers from [app.config.ts](src/app/app.config.ts).
2. Routing is defined in [app.routes.ts](src/app/app.routes.ts). The root path redirects to `/dashboard`. The `/auth/login` path is guarded by `GuestGuard`; everything else lives under `MainLayoutComponent` guarded by `AuthGuard`.
3. Auth is **mocked locally** today — `LoginComponent` calls `AuthService.login()` with hard-coded tokens/user (see [login.component.ts](src/app/features/auth/pages/login/login.component.ts#L127)). Tokens are persisted via `StorageService` (localStorage).
4. All HTTP calls go through 4 functional interceptors (Error → Success → Loading → Auth) wired in `app.config.ts`. The `AuthInterceptor` attaches `Authorization: Bearer <token>` from storage.
5. Most API access uses the NSwag-generated clients in [src/nswag/api-client.ts](src/nswag/api-client.ts), wrapped by feature-specific services (e.g. `ProjectApiService`, `BoqApiService`, `TaskService`).
6. PrimeNG `MessageService` is used globally — the `SuccessInterceptor` shows toasts on successful POST/PUT/PATCH/DELETE and the `ErrorInterceptor` shows toasts on HTTP errors (with opt-out via `X-Skip-Error-Toast` / `X-Skip-Success-Toast` headers).

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Frontend framework | Angular 19.1 (standalone components, no NgModules in app code) |
| State management | Angular **Signals** (`signal`, `computed`, `effect`) — no NgRx, no observable store |
| Routing | `@angular/router` with lazy-loaded `loadComponent()` |
| Forms | Reactive Forms + Template-driven Forms (both used) |
| Styling | SCSS + CSS custom properties (CSS variables) in [_variables.scss](src/assets/styles/_variables.scss); PrimeFlex for utility classes |
| UI library | PrimeNG 19 with a **custom Aura preset** (see [app.config.ts:28](src/app/app.config.ts#L28)) |
| Icons | PrimeIcons (`pi pi-*`) |
| HTTP client | `@angular/common/http` + functional `HttpInterceptorFn`s |
| API contract | **NSwag-generated** client from `http://62.84.178.178:93/swagger/all/swagger.json` |
| Auth | Custom — token in localStorage, Bearer header (real backend integration is mocked) |
| i18n | `@ngx-translate/core` v17 + `@ngx-translate/http-loader` v8, JSON files in [src/assets/i18n](src/assets/i18n/) |
| Charts | `chart.js` 4 (used in dashboard/analytics) |
| Dates | `date-fns` 4 |
| Drag & drop | `@angular/cdk` (used in `shared-stage-board`) |
| Testing | Karma + Jasmine (default Angular CLI setup — see [angular.json:83](angular.json#L83)) |
| Build tool | Angular CLI 19 (`@angular-devkit/build-angular:application` builder) |
| Linting / formatting | **None configured** — no ESLint, Prettier, or stylelint config in repo |
| Deployment | Static output to `dist/construction/` — no CI/CD files in repo |

---

## 3. Project Structure

```
ManagementPlatformFE/
├── angular.json                    # Angular CLI workspace config
├── package.json                    # Dependencies + scripts
├── tsconfig.json, tsconfig.app.json, tsconfig.spec.json
├── README.md                       # Default Angular CLI README
├── docs/                           # Feature implementation notes (Markdown)
├── public/favicon.ico
├── src/
│   ├── index.html                  # HTML shell (<app-root>)
│   ├── main.ts                     # bootstrapApplication(AppComponent, appConfig)
│   ├── styles.scss                 # Global styles + RTL overrides
│   ├── environments/
│   │   ├── environment.ts          # Default (dev) environment
│   │   ├── environment.development.ts
│   │   └── environment.production.ts
│   ├── assets/
│   │   ├── i18n/{en,ar}.json       # Translation dictionaries (~1100 lines each)
│   │   ├── logo/                   # Logo PNGs/SVGs (Neuro Code branding)
│   │   └── styles/
│   │       ├── _variables.scss     # CSS variables, light + dark theme tokens
│   │       └── global.scss
│   ├── nswag/
│   │   ├── nswag.json              # NSwag config (Angular template, RxJS 7)
│   │   └── api-client.ts           # ~17K lines, all generated DTOs + 21 clients
│   └── app/
│       ├── app.component.{ts,html,scss,spec.ts}
│       ├── app.config.ts           # ApplicationConfig with all providers
│       ├── app.routes.ts           # Root route table
│       ├── core/
│       │   ├── auth/
│       │   │   ├── guards/auth.guard.ts        # AuthGuard, GuestGuard, RoleGuard()
│       │   │   └── services/auth.service.ts    # signal-based auth state
│       │   ├── interceptors/                   # auth, error, loading, success
│       │   └── services/
│       │       ├── language.service.ts         # en/ar + RTL toggle
│       │       ├── sidebar.service.ts          # sidebar open/closed state
│       │       ├── storage.service.ts          # typed localStorage wrapper
│       │       └── theme.service.ts            # light/dark theme via signals + effect
│       ├── shared/
│       │   ├── components/                     # sidebar, top-nav, breadcrumb,
│       │   │                                   # confirm-dialog, documents-table
│       │   ├── services/                       # api, api-client, attachment,
│       │   │                                   # loading, print
│       │   └── index.ts                        # Barrel exports
│       ├── layouts/
│       │   ├── auth-layout/                    # Inline-template gradient layout
│       │   └── main-layout/                    # Sidebar + top-nav shell
│       └── features/
│           ├── auth/pages/login/               # Mock login page
│           ├── dashboard/                      # Landing page with stat cards + charts
│           ├── analytics/                      # Stub analytics page
│           ├── theme-showcase/                 # Dev-only PrimeNG showcase
│           ├── agreement-wizard/               # 8-step agreement creation wizard
│           │   ├── components/
│           │   │   ├── agreement-wizard.component.{ts,html}
│           │   │   └── steps/{step1..7, step-milestones}/
│           │   ├── pages/{agreement-list, agreement-success}/
│           │   └── services/agreement-wizard.service.ts
│           ├── project-management/             # ⭐ Largest feature
│           │   ├── components/                 # See section 6
│           │   ├── models/                     # Local Project/Stage/Task models + enums
│           │   ├── pages/{project-list, project-detail}/
│           │   └── services/                   # project, task, subtask, boq, expense, …
│           ├── constructor/                    # Contractor master-data CRUD
│           ├── supplier/                       # Supplier master-data CRUD
│           └── material/                       # Hierarchical materials catalog
```

### Folder conventions
- **`core/`** — singletons and app-wide infrastructure (auth, interceptors, theme, language, storage, sidebar). Imported once.
- **`shared/`** — building blocks reusable across features (UI components, generic services, attachments).
- **`layouts/`** — top-level chrome components that wrap routed children via `<router-outlet />`.
- **`features/<name>/`** — one folder per feature, each typically with `pages/`, `components/`, `services/`, optional `models/`.
- **`features/<feature>/pages/`** — route-target screens (one per top-level URL).
- **`features/<feature>/components/`** — internal building blocks for that feature (dialogs, tabs, sub-sections).
- **`features/<feature>/services/`** — wrappers around NSwag clients + domain logic (e.g. mapping DTOs to view models).

---

## 4. Application Architecture

### Entry points
- [main.ts](src/main.ts) bootstraps the root component.
- [app.component.ts](src/app/app.component.ts) initializes translations and renders `<router-outlet>` plus the global `<p-toast>` and `<p-progressSpinner>`.
- [app.config.ts](src/app/app.config.ts) is the central `ApplicationConfig` — it registers providers, all NSwag clients, the PrimeNG theme preset, the four interceptors, and the translation loader.

### Module / layer organization
There are **no NgModules** in app code — every component is a **standalone component**. Layering:

1. **Root layer**: `AppComponent` (only the `<router-outlet>`, toast, and spinner overlay).
2. **Layout layer**: `MainLayoutComponent` (sidebar + top-nav + confirm-dialog) and `AuthLayoutComponent` (centered card).
3. **Page layer**: per-feature page components (e.g. `ProjectListComponent`, `ProjectDetailComponent`).
4. **Feature-component layer**: per-feature sub-components (dialogs, tabs, stage components).
5. **Shared-component layer**: cross-feature components in `shared/components`.
6. **Service layer**: feature services and shared services — most are `@Injectable({ providedIn: 'root' })`.
7. **API layer**: NSwag-generated clients in [src/nswag/api-client.ts](src/nswag/api-client.ts). Almost all feature services depend on these (not on `HttpClient` directly), with the notable exception of [ProjectService](src/app/features/project-management/services/project.service.ts) which calls `HttpClient` for the project list endpoint.

### Component hierarchy (project-management)
```
ProjectDetailComponent
├── (tab) PreparingStageComponent           ← wraps StageKanbanComponent / SharedStageBoardComponent
├── (tab) ExcavationStageComponent          ← same pattern
├── (tab) MilestoneStageComponent           ← p-accordion of milestone stages
│         └── per milestone, p-tabs of:
│            ├── BoqTabComponent
│            ├── ProjectMainContractorTabComponent
│            ├── PurchaseOrdersTabComponent
│            ├── VoucherOrdersTabComponent
│            ├── SurveyingVisitsTabComponent
│            ├── PaymentClaimTabComponent
│            ├── ProjectExpenseManagementComponent
│            └── MilestoneDocumentsTabComponent
├── (tab) OwnerPaymentTabComponent
├── (tab) DocumentsStageComponent
└── (tab) TimeframeTabComponent             ← Gantt-style timeline
```

### Service / data-access patterns
- **Generated NSwag clients** (one per controller) are registered as providers in `app.config.ts` and injected into feature services.
- Feature services usually do **one of three things**:
  1. Thin pass-through (`return this.client.getById(id)`) — e.g. [ConstructorService](src/app/features/constructor/services/constructor.service.ts), [SupplierService](src/app/features/supplier/services/supplier.service.ts).
  2. Lookup helpers using `LookupClient.getAllLookups([key])` and unwrapping the dictionary — see [AgreementWizardService.getCountries()](src/app/features/agreement-wizard/services/agreement-wizard.service.ts#L71).
  3. DTO ↔ view-model mapping — see [ProjectService.mapApiProjectToProject()](src/app/features/project-management/services/project.service.ts#L46) and [SubtaskService.mapToCreateCommand()](src/app/features/project-management/services/subtask.service.ts#L19).

### Dependency flow
```
Feature components ──► Feature services ──► NSwag clients ──► HttpClient ──► Interceptors ──► API
                  └─► Shared services (attachment, loading) ─┘
Cross-cutting:
  All HTTP responses are observed by SuccessInterceptor → MessageService (toasts)
  All HTTP errors    are observed by ErrorInterceptor   → MessageService + AuthService.logout() on 401
```

### Architectural conventions
- **Signals over BehaviorSubject** — services expose `signal()` state (e.g. `projects`, `isLoading`, `stats`, `currentUser`).
- **Standalone components everywhere** — every component declares its own `imports: [...]`.
- **DTOs are class instances** — NSwag generates classes with `init/fromJS/toJSON`, so `new CreateTaskCommand({ ... })` is the canonical way to build a request body (see [project.service.ts:242](src/app/features/project-management/services/project.service.ts#L242)).
- **Toast-driven UX** — POST/PUT/DELETE responses surface success or error toasts automatically; opt out with skip headers.

---

## 5. Routing and Navigation

All routes are defined in [app.routes.ts](src/app/app.routes.ts) and use **`loadComponent()` lazy loading**.

| Path | Guard | Layout | Target |
|---|---|---|---|
| `/` | — | — | redirects to `/dashboard` |
| `/auth/login` | `GuestGuard` | `AuthLayoutComponent` | `LoginComponent` |
| `/dashboard` | `AuthGuard` | `MainLayoutComponent` | `DashboardComponent` |
| `/analytics` | `AuthGuard` | Main | `AnalyticsComponent` |
| `/theme-showcase` | `AuthGuard` | Main | `ThemeShowcaseComponent` |
| `/agreement-wizard` | `AuthGuard` | Main | `AgreementListComponent` |
| `/agreement-wizard/create` | `AuthGuard` | Main | `AgreementWizardComponent` (create) |
| `/agreement-wizard/edit/:id` | `AuthGuard` | Main | `AgreementWizardComponent` (edit) |
| `/agreement-wizard/view/:id` | `AuthGuard` | Main | `AgreementWizardComponent` (view-only) |
| `/agreement-wizard/success` | `AuthGuard` | Main | `AgreementSuccessComponent` |
| `/projects` | `AuthGuard` | Main | `ProjectListComponent` |
| `/projects/:id` | `AuthGuard` | Main | `ProjectDetailComponent` |
| `/constructor` | `AuthGuard` | Main | `ConstructorListComponent` |
| `/constructor/new` | `AuthGuard` | Main | `ConstructorFormComponent` |
| `/constructor/edit/:id` | `AuthGuard` | Main | `ConstructorFormComponent` |
| `/supplier` | `AuthGuard` | Main | `SupplierListComponent` |
| `/supplier/new` | `AuthGuard` | Main | `SupplierFormComponent` |
| `/supplier/edit/:id` | `AuthGuard` | Main | `SupplierFormComponent` |
| `/materials` | `AuthGuard` | Main | `MaterialManagementComponent` |
| `**` | — | — | redirects to `/dashboard` |

### Guards
- [`AuthGuard`](src/app/core/auth/guards/auth.guard.ts#L8) — redirects unauthenticated users to `/auth/login`.
- [`GuestGuard`](src/app/core/auth/guards/auth.guard.ts#L23) — redirects already-authenticated users away from `/auth` to `/dashboard`.
- [`RoleGuard(roles)`](src/app/core/auth/guards/auth.guard.ts#L38) — factory exists but is **not currently wired into any route**.

### Navigation flow
- After login, `LoginComponent` calls `router.navigate(['/dashboard'])`.
- The sidebar ([sidebar.component.ts:48](src/app/shared/components/sidebar/sidebar.component.ts#L48)) lists Dashboard, Agreement Wizard, Project Management, Constructors, Suppliers, Materials.
- Settings / Help links exist in the sidebar footer **but the routes are not defined** — clicking them lands on the wildcard redirect.

---

## 6. Core Features

### 6.1 Authentication (mocked)
- **Purpose:** Gate the app behind a login screen.
- **Files:** [login.component.ts](src/app/features/auth/pages/login/login.component.ts), [auth.service.ts](src/app/core/auth/services/auth.service.ts), [auth.guard.ts](src/app/core/auth/guards/auth.guard.ts).
- **Flow:** User types anything → `onLogin()` builds a fake token `'mock-token-12345'` and a fake user `{role: 'admin'}` → `AuthService.login()` persists them via `StorageService` → router navigates to `/dashboard`.
- **Business rule:** the login form has hard-coded default credentials (`admin@construction.com / password123`) for demo convenience — **there is no real backend auth integration yet**.

### 6.2 Dashboard
- **Purpose:** Landing page summary (stat cards, charts, recent projects/agreements/tasks).
- **Files:** [dashboard.component.ts](src/app/features/dashboard/dashboard.component.ts).
- **Data source:** Currently uses **local hard-coded data** (interfaces `StatCard`, `RecentProject`, `RecentAgreement`, `UpcomingTask`) — not yet wired to API. *(inferred from the file structure and component interfaces.)*

### 6.3 Agreement Wizard
- **Purpose:** Create / edit / view an Agreement across **8 steps** (step 1–7 + a `step-milestones` interlude between step 2 and step 3).
- **Files:**
  - [agreement-wizard.component.ts](src/app/features/agreement-wizard/components/agreement-wizard.component.ts) — orchestrates the PrimeNG `Stepper`, holds per-step data signals.
  - `components/steps/step1..7/` + `step-milestones/` — one component per step.
  - [agreement-wizard.service.ts](src/app/features/agreement-wizard/services/agreement-wizard.service.ts) — wraps `AgreementClient`, `AttachmentClient`, `LookupClient`, `ConstructorClient`.
- **User flow:** From `/agreement-wizard` (list) → click "create" → step through wizard → on completion navigate to `/agreement-wizard/success`. Existing agreements can be edited via `/edit/:id` or read-only via `/view/:id`. The wizard reads `?step=N` query param to resume at a given step.
- **API:** `POST /api/Agreement` (create/upsert), `GET /api/Agreement?pageNumber=&pageSize=`, `GET /api/Agreement/{id}?step=`.

### 6.4 Project Management (largest feature)
- **Purpose:** Manage a Project derived from an Agreement, including all financial and field activity across stages.
- **Pages:**
  - [project-list.component.ts](src/app/features/project-management/pages/project-list/project-list.component.ts) — searchable/filterable table with create dialog.
  - [project-detail.component.ts](src/app/features/project-management/pages/project-detail/project-detail.component.ts) — tabbed view with one tab per stage type.
- **Stage architecture:** Each project has `projectStages: ProjectStageDto[]` with `stageType` ∈ {`_1` Preparing, `_2` Excavation, `_3` Milestone}. Multiple milestone stages can exist.
- **Per-milestone tabs** (in `components/milestone-stage/tabs/`):
  - **BoQ tab** — Bill of Quantities items via `ProjectBOQClient`.
  - **Project Main Contractor tab** — assign contractors via `ProjectMainContractorClient` + `add-contractor-dialog`.
  - **Purchase Orders tab** — `ProjectPOClient`.
  - **Voucher / Variation Orders tab** — `ProjectVOClient`.
  - **Surveying Visits tab** — `ProjectSurveyingVisitClient`.
  - **Payment Claim tab** — `ProjectMainContractorPaymentClient`.
  - **Expense Management** — `ExpenseClient` (also reused at stage level).
  - **Documents tab** — uses shared `DocumentsTableComponent` with `AttachmentType._3` (Milestone).
- **Preparing & Excavation stages** — use a Kanban board (`shared-stage-board`) backed by `TaskClient` + `SubTaskClient` with CDK drag-drop between status columns.
- **Tasks & subtasks:** `CreateTaskCommand`, `CreateSubTaskCommand`. Status enum `StatusTask` has values 0–3 (To Do / In Progress / Review / Completed). Subtasks have their own `ProjectStatusSubTask` (0–1) and `SubTaskType` (only `_0` exists currently).
- **Timeframe tab:** [timeframe-tab.component.ts](src/app/features/project-management/components/timeframe-tab/timeframe-tab.component.ts) — Gantt-style chart of milestone stages over time using `ProjectMainContractorClient` to fetch each stage's contractors and derive start/end dates.

### 6.5 Constructor (Contractor) management
- CRUD over `/api/Constructor` via [ConstructorService](src/app/features/constructor/services/constructor.service.ts). Form uses `MainContractType` lookup.

### 6.6 Supplier management
- CRUD over `/api/Supplier` via [SupplierService](src/app/features/supplier/services/supplier.service.ts).

### 6.7 Material catalog
- Three-level hierarchy via [MaterialService](src/app/features/material/services/material.service.ts):
  - `MaterialCategoryClient` → `MaterialSubCategoryClient` → `MaterialClient`.
  - `getByCategoryId`/`getBySubCategoryId` chain.

### 6.8 Attachments (cross-cutting)
- One service ([AttachmentService](src/app/shared/services/attachment.service.ts)) covers all entity types.
- `AttachmentType` enum mapping (defined inline in the service):
  - `1` Agreement, `2` Project, `3` Milestone, `4` Task, `5` ProjectPO, `6` SurveyingVisit, `7` (exists but unmapped).
- Uploads convert files to base64 before sending to `UploadAttachmentCommand`.
- Downloads stream via raw `HttpClient` to `GET /api/Attachment/{id}/download` (the NSwag-generated download method is not used for browser-side blob download).

---

## 7. Data Models and Types

### 7.1 NSwag-generated models (canonical, in [src/nswag/api-client.ts](src/nswag/api-client.ts))
There are ~180 generated DTO classes. Highlights:

| Type | Purpose | Lines |
|---|---|---|
| `FullAgreementDto` | Complete agreement payload sent through the wizard | api-client.ts |
| `GetAllAgreementDto` | List-row projection of an agreement | api-client.ts |
| `GetProjectDto` | Project read DTO with `projectStages`, counts, agreement link | api-client.ts |
| `ProjectStageDto` | A stage with `id`, `stageType` (`ProjectStageType`), dates | api-client.ts |
| `GetProjectTaskDto` | Task row | api-client.ts |
| `CreateTaskCommand` | Task create/update payload | api-client.ts |
| `CreateSubTaskCommand` | Subtask payload | api-client.ts |
| `CreateProjectBOQCommand` | BoQ create/update payload | api-client.ts |
| `GetProjectBOQDto` | BoQ read DTO | api-client.ts |
| `GetConstructorDto` / `CreateConstructorCommand` | Contractor read / write | api-client.ts |
| `SupplierDto` / `CreateSupplierCommand` | Supplier | api-client.ts |
| `GetMaterialDto`, `GetMaterialCategoryDto`, `GetMaterialSubCategoryDto` | Material hierarchy | api-client.ts |
| `UploadAttachmentCommand`, `GetAttachmentMetaData` | Attachments | api-client.ts |
| `LookupDto`, `StringLookupDtoListDictionaryResponse` | Generic key/value lookup | api-client.ts |

### 7.2 Generated enums
| Enum | Values | Meaning (inferred) |
|---|---|---|
| `ProjectStatus` | `_0`–`_3` | 0=To Do/Planning, 1=In Progress, 2=Review, 3=Completed (per [create-project-dialog.component.ts:51](src/app/features/project-management/components/dialog/create-project-dialog/create-project-dialog.component.ts#L51)) |
| `ProjectStageType` | `_1`–`_3` | 1=Preparing, 2=Excavation, 3=Milestone ([project.service.ts:108](src/app/features/project-management/services/project.service.ts#L108)) |
| `StatusTask` | `_0`–`_3` | 0=Todo, 1=In Progress, 2=Review, 3=Completed |
| `ProjectStatusSubTask` | `_0`, `_1` | 0=In Progress / Pending, 1=Completed ([subtask.service.ts:62](src/app/features/project-management/services/subtask.service.ts#L62)) |
| `SubTaskType` | `_0` | Only one value defined; **mapping is a stub** |
| `AttachmentType` | `_1`–`_7` | See section 6.8 |
| `AcceptenceStatus` | `_1`–`_3` | (sic) — appears to be approval status |

### 7.3 Local view-model models
[src/app/features/project-management/models/](src/app/features/project-management/models/):

- [`Project`](src/app/features/project-management/models/project.model.ts#L3) — frontend representation (string id, mapped status enum, computed progress, embedded `stages: Stage[]`).
- [`ProjectStatus`](src/app/features/project-management/models/project.model.ts#L24), [`ProjectPriority`](src/app/features/project-management/models/project.model.ts#L32), [`StageStatus`](src/app/features/project-management/models/project.model.ts#L51), [`TaskStatus`](src/app/features/project-management/models/project.model.ts#L63), [`TaskPriority`](src/app/features/project-management/models/project.model.ts#L71), [`DocumentType`](src/app/features/project-management/models/project.model.ts#L97) — string-valued enums used in templates.
- [`Stage`](src/app/features/project-management/models/project.model.ts#L39), [`TeamMember`](src/app/features/project-management/models/project.model.ts#L78), [`ProjectDocument`](src/app/features/project-management/models/project.model.ts#L86), [`CreateProjectDto`](src/app/features/project-management/models/project.model.ts#L106), [`UpdateProjectDto`](src/app/features/project-management/models/project.model.ts#L117), [`ProjectFilters`](src/app/features/project-management/models/project.model.ts#L128), [`ProjectStats`](src/app/features/project-management/models/project.model.ts#L136).
- [`BoqItemDisplay`](src/app/features/project-management/models/boq.model.ts) — display projection combining BoQ DTO fields with computed totals/labels.

> Note: there are **two TaskStatus enums** — one in `models/project.model.ts` and another in [shared-stage-board.component.ts:73](src/app/features/project-management/components/shared-stage-board/shared-stage-board.component.ts#L73). Both are string-valued but the values differ (`'todo'` vs `'todo'`, `'in_progress'` vs `'in-progress'`). This is a known consistency risk (see section 19).

### 7.4 Auth interfaces
- [`User`](src/app/core/auth/services/auth.service.ts#L6) and [`AuthTokens`](src/app/core/auth/services/auth.service.ts#L14) in `auth.service.ts`.

### 7.5 Attachment interfaces
- [`AttachmentMetaData`](src/app/shared/services/attachment.service.ts#L42), [`AttachmentUploadParams`](src/app/shared/services/attachment.service.ts#L35), [`UploadedFile`](src/app/shared/components/documents-table/documents-table.component.ts#L18).

---

## 8. State Management

### Strategy
This codebase uses **Angular Signals everywhere** as the primary state primitive. There is no NgRx, no Akita, and no observable-store. RxJS Observables are used **only at the HTTP boundary** (NSwag returns Observables) — results are then pushed into signals.

### Patterns observed
- **Component-local state** via `signal<T>(initial)` for things like `isLoading`, `documents`, `selectedFiles`, `filteredProjects`. Examples:
  - [DocumentsTableComponent](src/app/shared/components/documents-table/documents-table.component.ts#L57-L60).
  - [ProjectDetailComponent](src/app/features/project-management/pages/project-detail/project-detail.component.ts#L65-L88) (with `computed()` derivations of stage IDs).
- **Service-level state** (singletons) — e.g. [ProjectService.projects](src/app/features/project-management/services/project.service.ts#L29), [AuthService.currentUser](src/app/core/auth/services/auth.service.ts#L26), [SidebarService.isOpen](src/app/core/services/sidebar.service.ts#L10), [ThemeService.currentTheme](src/app/core/services/theme.service.ts#L12), [LanguageService.currentLanguage](src/app/core/services/language.service.ts#L12).
- **`computed()`** for derived state — see [ProjectDetailComponent.preparingStageId](src/app/features/project-management/pages/project-detail/project-detail.component.ts#L74), [TimeframeTab.rangeStart/rangeEnd/totalDays](src/app/features/project-management/components/timeframe-tab/timeframe-tab.component.ts#L59).
- **`effect()`** for side effects — see [ThemeService](src/app/core/services/theme.service.ts#L18) where an effect reapplies the theme class on the `<html>` element whenever the signal changes.
- **`signal.asReadonly()`** to expose state without write access — used in `AuthService`.

### Loading / error patterns
- Each async operation toggles a local `isLoading` signal in `.pipe(finalize(() => this.isLoading.set(false)))`.
- A global [LoadingService](src/app/shared/services/loading.service.ts) exists with a counter-based `show()/hide()` API, but the [LoadingInterceptor](src/app/core/interceptors/loading.interceptor.ts) currently has its `show`/`hide` calls **commented out** — so the global spinner is effectively disabled today.
- Errors are surfaced as toasts via `MessageService`. Component-level error branches typically still call `messageService.add({severity: 'error', …})` even though the global `ErrorInterceptor` also shows a toast. This can produce duplicate toasts (see section 19).

### Caching
- There is **no HTTP caching layer** in code. `environment.cache.defaultTtl`/`maxSize` are declared but unused. *(inferred — no grep hits for `defaultTtl`.)*

---

## 9. API and Backend Integration

### Base configuration
- **Base URL:** [environment.nSwagUrl](src/environments/environment.ts#L4) → `http://62.84.178.178:93` (dev and prod use the same backend at the time of writing).
- Provided to NSwag clients via the [`API_BASE_URL`](src/app/app.config.ts#L86) injection token.
- [environment.apiUrl](src/environments/environment.ts#L3) (`http://62.84.178.178:93/api`) is consumed by the legacy `ApiService` and by `ProjectService.getProjects()` which still uses `HttpClient` directly.

### NSwag clients (one per controller, in [api-client.ts](src/nswag/api-client.ts))
Registered as DI providers in `app.config.ts`:

| Client | Endpoint root |
|---|---|
| `AgreementClient` | `/api/Agreement` |
| `AttachmentClient` | `/api/Attachment` |
| `ConstructorClient` | `/api/Constructor` |
| `CurrencyClient` | `/api/Currency` |
| `ExpenseClient` | `/api/Expense` |
| `LookupClient` | `/api/Lookup` |
| `MaterialClient` | `/api/Material` |
| `MaterialCategoryClient` | `/api/MaterialCategory` |
| `MaterialSubCategoryClient` | `/api/MaterialSubCategory` |
| `MilestoneClient` | `/api/Milestone` |
| `PaymentFlowClient` | `/api/PaymentFlow` |
| `ProjectClient` | `/api/Project` |
| `ProjectBOQClient` | `/api/ProjectBOQ` |
| `ProjectMainContractorClient` | `/api/ProjectMainContractor` |
| `ProjectMainContractorPaymentClient` | `/api/ProjectMainContractorPayment` |
| `ProjectPOClient` | `/api/ProjectPO` |
| `ProjectSurveyingVisitClient` | `/api/ProjectSurveyingVisit` |
| `ProjectVOClient` | `/api/ProjectVO` |
| `SubTaskClient` | `/api/SubTask` |
| `SupplierClient` | `/api/Supplier` |
| `TaskClient` | `/api/Task` |

> Note: `MilestoneClient`, `PaymentFlowClient`, and `CurrencyClient` exist in `api-client.ts` but are **not registered in `app.config.ts`** (so they would fail at injection time). See section 19.

### Interceptors (order matters)
[app.config.ts:51](src/app/app.config.ts#L51) registers the interceptor pipeline:
1. **`ErrorInterceptor`** ([error.interceptor.ts](src/app/core/interceptors/error.interceptor.ts)) — `catchError`, maps status codes to friendly messages, calls `AuthService.logout()` on 401, shows error toasts (unless `X-Skip-Error-Toast` header).
2. **`SuccessInterceptor`** ([success.interceptor.ts](src/app/core/interceptors/success.interceptor.ts)) — for non-GET success responses, shows a success toast. Parses Blob bodies as JSON when content-type is JSON (NSwag uses `responseType: "blob"` everywhere). Treats `succeeded: false` envelope responses as errors. Skips toasts for GETs and for `/api/Lookup`.
3. **`LoadingInterceptor`** ([loading.interceptor.ts](src/app/core/interceptors/loading.interceptor.ts)) — currently a no-op (lines commented).
4. **`AuthInterceptor`** ([auth.interceptor.ts](src/app/core/interceptors/auth.interceptor.ts)) — attaches `Authorization: Bearer <token>` from `AuthService.getToken()`.

### Custom request headers used by interceptors
- `X-Skip-Error-Toast` — suppress error toast.
- `X-Skip-Success-Toast` — suppress success toast.
- `X-Skip-Loading` — currently unused since the loading interceptor is no-op.

### Response envelope conventions
Most generated responses follow `{ succeeded: boolean, message?: string, errors?: string[], data?: T }`. Components must check `response.succeeded` and unwrap `response.data` explicitly. Paged responses wrap `{ data: { data: T[], totalRecords: number, pageNumber, pageSize } }`.

### Retry logic
- `environment.api.retryAttempts: 3`, `retryDelay: 1000` are declared but **never read** by the interceptors. *(inferred.)*

### Important endpoints (from api-client.ts)
A sample — see the full table by grepping `this.baseUrl + "/api/`:
- `POST/GET/DELETE /api/Agreement`, `GET /api/Agreement/{id}?step=`
- `GET /api/Attachment/{id}`, `POST /api/Attachment/upload`, `GET /api/Attachment/{id}/download`, `DELETE /api/Attachment`
- `GET /api/Lookup` (returns a dictionary keyed by lookup type, used heavily by dropdowns)
- `POST/GET /api/Project`, `GET /api/Project/{id}`
- `POST/GET/DELETE /api/Task`, `GET /api/Task/by-stage`, `GET /api/Task/types`, `PUT /api/Task/update-status`
- `POST/GET /api/SubTask`, `GET /api/SubTask/By/{Taskid}`, `DELETE /api/SubTask`
- `POST/GET/DELETE /api/ProjectBOQ`, `GET /api/ProjectBOQ/by-stage`
- `POST/GET/DELETE /api/ProjectPO`, `GET /api/ProjectPO/by-stage`
- `POST/GET/DELETE /api/ProjectMainContractor`, `GET /api/ProjectMainContractor/by-stage`
- `POST/GET/DELETE /api/ProjectMainContractorPayment`, `GET /api/ProjectMainContractorPayment/by-contractor`
- `POST/GET/DELETE /api/Expense`, `GET /api/Expense/by-project`

---

## 10. Authentication and Authorization

### Login / logout flow
- **Login:** [LoginComponent.onLogin()](src/app/features/auth/pages/login/login.component.ts#L127) — currently a mock that builds a fake token and calls `AuthService.login()`. There is no `/auth/login` API call yet.
- **Logout:** [AuthService.logout()](src/app/core/auth/services/auth.service.ts#L67) — clears tokens + user from `StorageService` and navigates to `/auth/login`. Also auto-triggered by `ErrorInterceptor` on HTTP 401.

### Token / session handling
- Tokens are stored in `localStorage` under keys configured in [environment.auth](src/environments/environment.ts#L9):
  - `auth_token` — access token (used by `AuthInterceptor`).
  - `refresh_token` — declared but **no refresh flow is implemented**.
  - `current_user` — JSON of the `User` object.
- `tokenExpirationWarningMinutes: 5` is declared but unused.

### Route guards
- `AuthGuard` and `GuestGuard` are wired in [app.routes.ts](src/app/app.routes.ts) (see section 5).
- `RoleGuard(roles)` exists but is **unused** in current routes.

### Permission system
- `AuthService.hasRole(role)` and `hasPermission(permission)` exist but **no component or guard currently calls them** (besides `RoleGuard`).
- The mock login assigns `role: 'admin'`.

### Protected pages
Every route under the second `path: ''` block in `app.routes.ts` is behind `AuthGuard`. There is no per-feature role gating today.

---

## 11. UI and Styling System

### Styling strategy
- **Global SCSS:** [src/styles.scss](src/styles.scss) imports `_variables.scss`, `_theme.scss` *(declared but file is missing — see section 19)*, `global.scss`, PrimeIcons CSS, and PrimeFlex CSS. Also loads Inter (Latin) and Tajawal (Arabic) from Google Fonts.
- **Custom theme:** [_variables.scss](src/assets/styles/_variables.scss) defines the "Neuro Code" palette (`#0052CC` primary blue) as CSS custom properties, with a `.dark-theme` selector for the dark variant.
- **PrimeNG custom preset:** in [app.config.ts:28-44](src/app/app.config.ts#L28) — overrides the Aura preset's primary color ramp to the blue palette. `darkModeSelector` is set to `.dark-theme`.
- **Component styles:** every component has its own `.scss` (the schematic enforces `style: 'scss'` per [angular.json:11](angular.json#L11)). Some small components inline their styles (e.g. `AuthLayoutComponent`, `LoginComponent`).

### Theming
- [ThemeService](src/app/core/services/theme.service.ts) toggles a `dark-theme` / `light-theme` class on `document.documentElement` whenever its signal changes (via `effect()`). The user's preference persists in `localStorage` under `app_theme`. Initial value falls back to `prefers-color-scheme: dark` media query.

### RTL & i18n
- [LanguageService](src/app/core/services/language.service.ts) sets `document.documentElement.dir = 'rtl'` when Arabic is active.
- [styles.scss](src/styles.scss#L43) contains RTL overrides for PrimeNG `<p-toast>` positioning.
- Translation keys live in [src/assets/i18n/en.json](src/assets/i18n/en.json) and [ar.json](src/assets/i18n/ar.json) (~1100 lines each).

### Reusable components ([shared/components](src/app/shared/components/))
- `SidebarComponent` — main nav, configurable nav sections, supports collapsed/mobile states.
- `TopNavComponent` — top header (breadcrumb, theme toggle, language toggle, user menu).
- `BreadcrumbComponent` — derived from route data.
- `ConfirmDialogComponent` — global PrimeNG `<p-confirmDialog>` instance.
- `DocumentsTableComponent` — **the** attachment UI. Takes `attachmentType` + `relationshipId` inputs, supports drag-drop upload, preview (image/PDF), download, delete with confirmation.

### Layout components
- [MainLayoutComponent](src/app/layouts/main-layout/main-layout.component.ts) — composes Sidebar + TopNav + ConfirmDialog + `<router-outlet>`.
- [AuthLayoutComponent](src/app/layouts/auth-layout/auth-layout.component.ts) — centered gradient card.

### Responsive behavior
- The sidebar has a separate `isMobileOpen` signal in [SidebarService](src/app/core/services/sidebar.service.ts) that toggles a mobile drawer mode. Templates use PrimeFlex utility classes for breakpoints.

---

## 12. Forms and Validation

### Form strategies (both are in use)
- **Reactive Forms** (preferred for non-trivial forms) — e.g. [CreateProjectDialogComponent](src/app/features/project-management/components/dialog/create-project-dialog/create-project-dialog.component.ts) uses `FormBuilder` + `Validators`.
- **Template-driven forms** with `[(ngModel)]` — used in simpler forms like [LoginComponent](src/app/features/auth/pages/login/login.component.ts#L33-L80) and various dialogs.

### Important forms
- **Login** — template-driven.
- **Agreement Wizard** (8 step components) — mostly reactive forms; the parent component aggregates per-step data via `signal<any>(null)`.
- **Project create/edit dialog** — reactive form with required validators on title, agreement, dates, budget, status.
- **Constructor / Supplier forms** — under `features/<x>/pages/<x>-form/`.
- **BoQ / Contractor / PO / VO / Surveying-visit dialogs** — under `features/project-management/components/dialog/`.

### Validation patterns
- Standard Angular built-ins (`Validators.required`, `Validators.email`, `min/max`).
- Validation errors are usually surfaced in the template by binding to `form.get('field').hasError(...)` and showing PrimeNG inline messages.
- There is **no central custom-validator library** in the repo. Each form defines its validators inline.

### Error message handling
- Form-level errors typically render inline next to the field.
- Server-side errors (after submit) are surfaced via the global `ErrorInterceptor` toast.

---

## 13. Error Handling and Logging

### Global error handling
- HTTP errors → `ErrorInterceptor` → toast + `AuthService.logout()` on 401 + `throwError()`.
- Failed business responses (HTTP 200 with `succeeded: false`) → `SuccessInterceptor.handleFailedResponse()` → toast.

### User-facing error messages
- All toasts go through PrimeNG `MessageService` (`<p-toast>` rendered in `app.component.html`).

### Logging
- No structured logger. The codebase uses `console.log`/`console.error` directly in a few places:
  - [main-layout.component.ts:36](src/app/layouts/main-layout/main-layout.component.ts#L36) — `'Main layout initialized'`.
  - [storage.service.ts:16](src/app/core/services/storage.service.ts#L16) — logs localStorage errors.
  - [project-detail.component.ts:152](src/app/features/project-management/pages/project-detail/project-detail.component.ts#L152) — print/download stubs.
- `environment.enableLogging` and `debugMode` flags exist but **no code reads them**. *(inferred — no grep hits.)*

### Known failure scenarios
- 401 → forced logout. Subsequent requests on the same page may also 401 before the redirect lands → duplicate toasts.
- Backend at `http://62.84.178.178:93` unreachable → every request fails with a toast; the app does not have a network-status indicator.
- Mock login: any credentials succeed. If the real backend requires a real token, every authenticated call will 401 → instant logout.

---

## 14. Configuration and Environments

### Files
- [environment.ts](src/environments/environment.ts) — the **default** (used for development).
- [environment.development.ts](src/environments/environment.development.ts) — present but **not wired** to any Angular build configuration. *(inferred — `angular.json` has no `fileReplacements` block.)*
- [environment.production.ts](src/environments/environment.production.ts) — present but **also not wired** via fileReplacements. Both dev and prod thus use the same `environment.ts` unless reconfigured.

### Notable values
| Key | Dev value | Prod value |
|---|---|---|
| `apiUrl` | `http://62.84.178.178:93/api` | same |
| `nSwagUrl` | `http://62.84.178.178:93` | same |
| `production` | `false` | `true` |
| `enableLogging` | `true` | `false` |
| `debugMode` | `true` | `false` |
| `features.enablePush` | `false` | `true` |
| `features.enableAnalytics` | `false` | `true` |
| `features.enableBeta` | `true` | `false` |

### Build configurations ([angular.json](angular.json))
- `production` — budgets (initial: 2 MB warning / 4 MB error; per-component-style: 10 kB / 20 kB), output hashing.
- `development` — optimization off, source maps on.
- Default config is **production** for `build`, and **development** for `serve`.

---

## 15. Scripts and Commands

From [package.json](package.json#L4):

| Command | What it does |
|---|---|
| `npm start` | Runs `ng serve` — starts dev server on default port 4200 with HMR. |
| `npm run build` | Runs `ng build` — production build into `dist/construction/`. |
| `npm run watch` | `ng build --watch --configuration development` — rebuild on change. |
| `npm test` | `ng test` — Karma + Jasmine. |
| `npm run ng` | Direct passthrough to Angular CLI. |
| `npm run nswag` | `nswag run src/nswag/nswag.json` — regenerate the API client from the live Swagger doc. |
| `npm run generate-api` | Alias for `nswag`. |

> There are **no `lint`, `format`, or `e2e` scripts**.

---

## 16. Testing Strategy

- **Framework:** Karma + Jasmine (Angular CLI defaults).
- **Config:** [tsconfig.spec.json](tsconfig.spec.json) and the `test` architect in [angular.json](angular.json#L83).
- **Test files present:** only [src/app/app.component.spec.ts](src/app/app.component.spec.ts) (the auto-generated boilerplate). Effectively **no tests exist** in this codebase.
- **No e2e tests.**
- **Mocking strategy:** N/A — no test doubles defined.
- **How to run:** `npm test`.

This is a significant gap (see section 19).

---

## 17. Code Conventions

### Naming
- **Components:** `kebab-case` folder + file (`project-list.component.ts`); class `PascalCase` ending in `Component` (`ProjectListComponent`).
- **Services:** `kebab-case.service.ts`; class `PascalCase` ending in `Service`.
- **Interfaces / models:** `*.model.ts`. Local enums use `UPPER_CASE` string values (`ProjectStatus.PLANNING = 'planning'`). Generated NSwag enums use the cryptic `_N` form because the underlying .NET enum names were not preserved.
- **Selectors:** `app-*` (set by [angular.json:15](angular.json#L15)).

### Folder conventions
- Pages under `features/<x>/pages/<page-name>/`.
- Sub-components under `features/<x>/components/<name>/`.
- Dialogs under `features/<x>/components/dialog/<name>-dialog/`.
- One file per concern: `.ts`, `.html`, `.scss` per component.

### Component patterns
- **Standalone**: every component has `standalone: true` (the new Angular default) and declares its own `imports: [...]`.
- **Inputs/Outputs**: classic `@Input() / @Output() EventEmitter`. `input.required()` signal-based inputs are **not** in use yet.
- **State**: `signal<T>(...)` for local state. `computed()` for derivations.
- **Lifecycle**: `OnInit` / `OnDestroy` with `private destroy$ = new Subject<void>()` + `takeUntil(this.destroy$)` to unsubscribe.
- **DI**: mix of constructor injection and `inject()` — newer code (especially in shared/) prefers `inject()`.

### Import patterns
- Relative paths within a feature; deep relative paths (`../../../../nswag/api-client`) to reach the API client. *(no path aliases configured in [tsconfig.json](tsconfig.json).)*

### Observable vs. signal vs. promise
- HTTP returns Observables (NSwag).
- Component/service state is exposed as signals.
- Promises are used sparingly — e.g. `FileReader` in [AttachmentService.convertFileToBase64()](src/app/shared/services/attachment.service.ts#L179).

### Linting / formatting
- **None configured.** Indentation and quote style are inconsistent across files (some use 2-space, some 4-space; some single quotes, some double). The NSwag-generated file uses 4-space indentation by NSwag convention.

---

## 18. Important Dependencies

| Package | Why it matters |
|---|---|
| `@angular/core` 19.1 | Core framework — uses standalone components + signals API. |
| `@angular/cdk` 19.2 | Provides `DragDropModule` for the Kanban board in `shared-stage-board`. |
| `primeng` 19.1 + `@primeng/themes` | All visible UI — tables, dialogs, dropdowns, stepper, accordion, tabs, toast, confirm dialog, chart, datepicker, etc. The custom Aura preset is defined in `app.config.ts`. |
| `primeflex` 4 | Utility CSS classes (`p-d-flex`, `p-grid`, etc.). |
| `primeicons` 7 | All icons (`pi pi-*`). |
| `@ngx-translate/core` 17 + `http-loader` 8 | i18n with JSON dictionaries loaded over HTTP. |
| `chart.js` 4 | Dashboard charts (via PrimeNG `<p-chart>`). |
| `date-fns` 4 | Used in `shared-stage-board` for `parseISO`. |
| `rxjs` 7.8 | All HTTP observables; mostly used at boundaries before pushing to signals. |
| `nswag` (dev) | Regenerates `api-client.ts` from the backend Swagger document. |

There is **no `@angular/material`** and **no Tailwind**. PrimeNG + PrimeFlex covers the whole UI.

---

## 19. Known Technical Debt / Risks

### Architecture / consistency
1. **Duplicate `TaskStatus` enums** — [project.model.ts:63](src/app/features/project-management/models/project.model.ts#L63) vs [shared-stage-board.component.ts:73](src/app/features/project-management/components/shared-stage-board/shared-stage-board.component.ts#L73). Values diverge (`'in_progress'` vs `'in-progress'`). Risk of subtle filter bugs.
2. **Three layers of project status mapping**: `ApiProjectStatus._0-_3` (NSwag) ↔ `ProjectStatus` (local model, string enum) ↔ display strings. [project.service.ts:70-81](src/app/features/project-management/services/project.service.ts#L70) only maps three of the four backend values (`_3` is missing), so projects with status 3 will silently fall through to `PLANNING`.
3. **`SubtaskService.mapTypeToEnum()` and `mapEnumToType()` are stubs** ([subtask.service.ts:79](src/app/features/project-management/services/subtask.service.ts#L79)) — they always return `_0` / `"Type 0"`.
4. **Three unused NSwag clients** (`MilestoneClient`, `PaymentFlowClient`, `CurrencyClient`) — they exist in `api-client.ts` but are **not provided** in `app.config.ts`. Any component that tries to inject them will throw `NullInjectorError` at runtime.
5. **`environment.development.ts` and `environment.production.ts` are not wired** — no `fileReplacements` block in [angular.json](angular.json). The prod build still loads `environment.ts` unless this is fixed.
6. **Both production and development point at the same backend** (`62.84.178.178:93`). There is no staging environment configured.

### Auth
7. **Login is mocked** — production auth is not implemented. Any deployed build is effectively wide-open until `LoginComponent.onLogin()` is replaced.
8. **No refresh-token flow** — 401 → immediate logout. The `refresh_token` slot exists but nothing reads it.
9. **`RoleGuard` is unused** and `hasPermission()` is uncalled — role-based access control is declared but not enforced.

### Interceptors / UX
10. **`LoadingInterceptor` is a no-op** (the `show`/`hide` calls are commented). The global spinner element exists but never appears for HTTP traffic.
11. **Duplicate toasts** — components frequently call `messageService.add(severity: 'error')` themselves *and* the `ErrorInterceptor` also adds one. Users see two toasts on the same failure.
12. **Success interceptor parses every Blob body as JSON** when content-type is missing — this works because NSwag uses `responseType: "blob"` everywhere, but it's a subtle dependency.

### Code organization
13. **`ApiClientService`** ([api-client.service.ts](src/app/shared/services/api-client.service.ts)) is a placeholder containing only commented examples and a reference to a non-existent `Client` class — it should be deleted or completed.
14. **`ApiService`** ([api.service.ts](src/app/shared/services/api.service.ts)) is a generic wrapper that is **not used anywhere** in features (which all go through NSwag clients directly). It's dead code.
15. **`ProjectService` bypasses NSwag** — it calls `this.http.get(apiUrl/Project)` directly instead of `ProjectClient.getAllProjects()`. Inconsistent with every other feature.
16. **Stub print/download report logic** — [project-detail.component.ts:151-160](src/app/features/project-management/pages/project-detail/project-detail.component.ts#L151) just `console.log`s.
17. **`mock-projects.data.ts`** still lives in `features/project-management/services/` — likely dead now that real API is wired.
18. **Missing SCSS partial** — [styles.scss:5](src/styles.scss#L5) does `@use './assets/styles/theme';` but `_theme.scss` does not exist in `src/assets/styles/` (only `_variables.scss` and `global.scss` are present). Build may still succeed if the import is silently dropped or if there is a path-resolution accident, but this is fragile.
19. **Generated `api-client.ts` is 17,303 lines** and is checked in. Every regeneration produces a noisy diff.
20. **Top-level docs are partially out of date** — `ADD_TASK_API_INTEGRATION.md`, `API_INTEGRATION_EXAMPLES.md`, `IMPLEMENTATION_SUMMARY.md`, plus the `docs/` folder describe earlier iterations. Treat as historical, verify against code.

### Testing
21. **No tests** beyond the default `app.component.spec.ts`. No CI to run them.

### Tooling
22. **No linter, no formatter, no commit hooks.** Style drift is visible across files.
23. **No CI configuration** in repo (no `.github/`, no `Jenkinsfile`, no `.gitlab-ci.yml`).

### Security
24. The dev backend URL `http://62.84.178.178:93` is **plain HTTP**. Tokens travel in clear text. Should be HTTPS in production.
25. `bypassSecurityTrustResourceUrl` is used on attachment blob URLs in [documents-table.component.ts:210](src/app/shared/components/documents-table/documents-table.component.ts#L210). This is acceptable because the URL comes from `URL.createObjectURL(blob)` (local origin), but it's a pattern future devs should not generalize to remote URLs.

---

## 20. How to Add a New Feature

Assume the new feature is called `widget` and exposes a list + detail page.

1. **Generate the folders** under `src/app/features/widget/` with `pages/`, `components/`, `services/`, and optionally `models/`.
2. **If a new backend controller exists**, regenerate the API client:
   ```bash
   npm run generate-api
   ```
   Then add the new `WidgetClient` provider to [app.config.ts](src/app/app.config.ts) and import the generated DTOs from `src/nswag/api-client`.
3. **Create a service** in `features/widget/services/widget.service.ts`:
   ```ts
   @Injectable({ providedIn: 'root' })
   export class WidgetService {
     constructor(private widgetClient: WidgetClient) {}
     getAll(page = 1, size = 50) { return this.widgetClient.getAll(page, size, undefined); }
   }
   ```
4. **Create the pages** as **standalone** components. Use:
   - PrimeNG `<p-table>` + `<p-iconfield>` for the list, following [project-list.component.ts](src/app/features/project-management/pages/project-list/project-list.component.ts) as a template.
   - PrimeNG `<p-tabs>` for tabbed detail pages.
   - `signal()` for component state; never `BehaviorSubject`.
5. **Wire routes** in [app.routes.ts](src/app/app.routes.ts) inside the `path: ''` block guarded by `AuthGuard`, using `loadComponent: () => import('./features/widget/pages/widget-list/widget-list.component').then(m => m.WidgetListComponent)`.
6. **Add navigation** in [sidebar.component.ts:48](src/app/shared/components/sidebar/sidebar.component.ts#L48) — add an item to `navSections[0].items` with an `icon: 'pi pi-*'`, route, and translation key.
7. **Add translations** — `widget.*` keys in both [en.json](src/assets/i18n/en.json) and [ar.json](src/assets/i18n/ar.json). Use the existing key structure (`feature.section.field`).
8. **Styles** — put feature-specific styles in the component's `.scss`; reuse CSS variables from [_variables.scss](src/assets/styles/_variables.scss) (`var(--primary-color)`, etc.).
9. **For dialogs**, follow `features/project-management/components/dialog/create-project-dialog/` as a template (reactive form + `[(visible)]` + `EventEmitter`).
10. **For document/attachment support**, reuse `<app-documents-table>` with an `attachmentType` (you'll need to add a new value to `AttachmentType` on the backend or pick an existing one) and `relationshipId`.

### Common mistakes to avoid
- Forgetting to add the new NSwag client to the `providers` array in `app.config.ts` (it will fail at runtime).
- Mixing `[(ngModel)]` and reactive forms in the same form.
- Manually subscribing to Observables without `takeUntil(this.destroy$)` (leads to memory leaks).
- Double error toasts — don't `messageService.add(severity:'error')` in the error branch; the global interceptor already handles it. Use `X-Skip-Error-Toast` if you want to suppress the global toast and handle the error yourself.

---

## 21. How to Modify Existing Features Safely

### What's usually connected
- **A service change** affects every component that injects it. Grep for `inject(MyService)` or `: MyService` before editing.
- **A model change** (e.g. adding a field to `Project`) usually flows from the NSwag DTO → mapping function (e.g. `ProjectService.mapApiProjectToProject()`) → templates. Update all three.
- **A translation key rename** breaks every `{{ 'old.key' | translate }}` usage. Grep `i18n/en.json` and `*.html` together.
- **The sidebar nav** is hardcoded in `sidebar.component.ts` — adding a new top-level route requires a code change there.

### Things to check before changing a shared service or component
- For `AuthService` / interceptors — open every feature and make sure no behavior depends on the current toast/logout semantics.
- For `AttachmentService` / `DocumentsTableComponent` — used in `documents-stage`, milestone `documents-tab`, possibly `agreement-wizard` step uploads. Search for `<app-documents-table` and `AttachmentService`.
- For `LanguageService` / `ThemeService` — they mutate `document.documentElement`. Changing class names or attribute mutations breaks SCSS that depends on them.
- For NSwag clients — never edit `api-client.ts` by hand; regenerate via `npm run nswag`.

### How to avoid breaking flows
- Always preserve the `succeeded` envelope check before unwrapping `data`.
- When you add a new interceptor opt-out, document the header here.
- When you add a new sidebar route, add the translation key in both languages.
- Standalone components mean **imports must be added to the component that uses them** — there is no NgModule to update.

### Commands to run after changes
There is no CI and no lint script. Manually:
```bash
npm run build    # confirms the production build still compiles + budgets pass
npm start        # smoke-test the UI in a browser
```
There are no tests to run beyond the boilerplate.

---

## 22. AI Agent Notes

### Things to read first (in order)
1. [src/app/app.config.ts](src/app/app.config.ts) — see the full provider list, interceptor order, NSwag client list, PrimeNG preset.
2. [src/app/app.routes.ts](src/app/app.routes.ts) — see every page in the app and its guard.
3. [src/app/core/auth/services/auth.service.ts](src/app/core/auth/services/auth.service.ts) and [auth.guard.ts](src/app/core/auth/guards/auth.guard.ts) — auth state.
4. [src/app/core/interceptors/error.interceptor.ts](src/app/core/interceptors/error.interceptor.ts) and [success.interceptor.ts](src/app/core/interceptors/success.interceptor.ts) — the global toast pipeline; you almost never want to duplicate this logic in components.
5. [src/app/features/project-management/services/project.service.ts](src/app/features/project-management/services/project.service.ts) — canonical example of DTO mapping and signal-based service state.
6. [src/app/shared/services/attachment.service.ts](src/app/shared/services/attachment.service.ts) and [shared/components/documents-table](src/app/shared/components/documents-table/documents-table.component.ts) — the shared attachment pattern.
7. [src/nswag/api-client.ts](src/nswag/api-client.ts) — search by client name or endpoint string, do not read top-to-bottom.

### The most important things to understand before editing
- **Standalone components**: there are no NgModules. To add a new dependency to a component's template, add it to that component's `imports: [...]` array, not anywhere else.
- **Signals first**: prefer `signal()` over `BehaviorSubject` for any new state.
- **NSwag clients**: every controller has a generated `*Client`. Find the method by browsing `api-client.ts` (search for `/api/<Resource>`); call it from a feature service.
- **Toast pipeline**: success/error toasts are automatic. Use `X-Skip-Error-Toast` / `X-Skip-Success-Toast` headers when you want to handle the response yourself.
- **Response envelope**: always check `response.succeeded` before using `response.data`.
- **i18n**: every visible string should be a translation key; update both `en.json` and `ar.json` together.

### Areas that are risky to modify
- **`src/nswag/api-client.ts`** — never edit by hand; it will be regenerated.
- **`app.config.ts` interceptor order** — the order matters (Error wraps everything, Auth attaches the bearer last). Reordering will silently break behavior.
- **`AuthService` / `StorageService`** — used app-wide; changing localStorage keys would log everyone out.
- **`LanguageService.setLanguage`** — sets `document.documentElement.lang/dir`; many CSS rules depend on `[dir="rtl"]`.
- **The signal `currentTheme` effect** in `ThemeService` — runs on first render and on every change; don't add blocking work.

### Patterns that must be followed
- **Standalone components only**.
- **Lazy `loadComponent()` routes** under `MainLayoutComponent`.
- **One service file per feature/resource** that wraps the NSwag client; do not inject `*Client` directly into a component.
- **Use `takeUntil(this.destroy$)`** in every component that subscribes manually.
- **Read CSS color from `var(--primary-color)`** etc., not from hex codes.

### Things not to change without good reason
- The PrimeNG Aura preset definition (would change every page's colors).
- The interceptor pipeline (would change every HTTP response).
- The mock login (until a real auth API exists, replacing it without one will lock the app).
- The NSwag-generated file (regenerate, don't edit).
- The translation key structure (renames cascade through every template).

### Assumptions made while analyzing this codebase
- The mock login is intentional placeholder code, not a security oversight.
- The backend at `http://62.84.178.178:93` is a shared dev environment.
- The "Neuro Code" branding refers to the agency / product line — `construction` is the internal project name.
- Stage type 3 (Milestone) supports **multiple** stages per project; types 1 and 2 are singletons. (Inferred from `MilestoneStageComponent` accepting `milestoneStages: ProjectStageDto[]` and from `project-detail.component.ts` filtering with `.filter` for milestones but `.find` for preparing/excavation.)
- Status enum `_N` numbers in the NSwag file correspond to the `enum` integer values in the .NET backend; meaningful names are inferred from how they're used.

---

## 23. Glossary

| Term | Meaning |
|---|---|
| **Agreement** | A signed contract with a client. Created via the 8-step Agreement Wizard. Identified by `id` and `agreementId`. A project usually references an agreement. |
| **Project** | A construction project that materializes from an agreement. Has stages, tasks, BoQ items, etc. |
| **Stage** | A project phase. Three types: Preparing (`_1`), Excavation (`_2`), and Milestone (`_3`). Each project has one Preparing + one Excavation + many Milestones. |
| **Milestone** | A discrete deliverable / construction milestone within a project (stage type 3). Each has its own tabs (BoQ, PO, VO, etc.). |
| **BoQ** (Bill of Quantities) | An itemized list of materials/work with quantities, unit prices, and totals. Tied to a stage via `projectStageId`. |
| **PO** (Purchase Order) | An order to a supplier. Per-stage. Endpoint `/api/ProjectPO`. |
| **VO** (Variation Order / Voucher Order) | A change order against the BoQ. Endpoint `/api/ProjectVO`. The UI calls these "Voucher Orders" in some places. |
| **Main Contractor** | A construction company assigned to a stage. Endpoint `/api/ProjectMainContractor`. |
| **Surveying Visit** | An on-site inspection visit. Endpoint `/api/ProjectSurveyingVisit`. |
| **Owner Payment** | A payment from the project owner. See `OwnerPaymentTabComponent`. |
| **Contractor Payment** | A payment to a main contractor. Endpoint `/api/ProjectMainContractorPayment`. |
| **Payment Claim** | A claim against contractor payments. See `PaymentClaimTabComponent`. |
| **Expense** | A miscellaneous project expense. Endpoint `/api/Expense`. |
| **Constructor** | Used synonymously with **Contractor** in the UI and code. (The naming follows the .NET backend.) |
| **Supplier** | A vendor that supplies materials. |
| **Material** | An item in the materials catalog. Hierarchy: Category → SubCategory → Material. |
| **Attachment** | A file uploaded against an entity (project, milestone, task, etc.). The `AttachmentType` enum disambiguates the parent entity. |
| **Lookup** | A reference data list (countries, cities, agreement types, contract types, units, etc.) served by `/api/Lookup`. The endpoint returns a dictionary keyed by lookup name. |
| **NSwag** | The tool that generates `api-client.ts` from the backend's Swagger JSON. Run via `npm run nswag`. |
| **Aura** | The PrimeNG theme preset used. Customized in `app.config.ts`. |
| **Neuro Code** | The product / brand name shown in the sidebar logo and global CSS comments. |

---

## 24. Missing or Unclear Information

| Item | Why it matters | Where to look / who to ask |
|---|---|---|
| **Real authentication endpoint** | The login is mocked. We don't know which API call produces a real token. | Ask the backend team for the login + refresh-token endpoints. Wire them in `LoginComponent.onLogin()` and add a refresh handler that uses `refresh_token`. |
| **Backend URL for staging/prod** | All environments point at `62.84.178.178:93`. Production deploys would leak data to the dev backend. | Ask DevOps; then split `environment.production.ts` and wire `fileReplacements` in `angular.json`. |
| **Meaning of `AcceptenceStatus` enum** | Used in the API but no mapping in frontend code. (sic — likely "Acceptance".) | Inspect any DTO that references it and check with the backend team. |
| **Meaning of `AttachmentType._7`** | The frontend `AttachmentTypeMap` defines `_1`–`_6`; `_7` exists in the enum but has no label. | Check Swagger for the resource that uses type 7, or `git log src/nswag/` for context. |
| **Whether `MilestoneClient`, `PaymentFlowClient`, `CurrencyClient` are intentionally unused** | They are generated but unprovided. Either they're future-work placeholders or the providers list is missing entries. | Search PRs and `docs/` for references; ask product. |
| **Whether the Dashboard is supposed to use real data** | All numbers and tables are local stubs. | Likely yes — check if a `Dashboard` controller exists in the Swagger doc. |
| **Whether `SubTaskType` is supposed to have more than one value** | Today only `_0` exists; mapping helpers in `SubtaskService` always return `_0`. | Ask product for the intended subtype set. |
| **Whether the Excavation board UI semantics differ from the Preparing board** | Both use `shared-stage-board` — visually identical. | Check business requirements; the kanban currently has no per-stage customization. |
| **Whether the `RoleGuard` should be applied** | It exists but isn't used anywhere. | Ask product whether role-based access is a real requirement; if so, define which routes/buttons need which roles. |
| **Settings / Help pages** | The sidebar links to `/settings` and `/help` but there are no routes for either. | Decide whether these are deferred features; remove the links or create the routes. |
| **Refresh-token rotation** | A storage key is reserved but nothing reads it. | Coordinate with backend. |
| **The intended `_theme.scss` partial** | `styles.scss` imports it but the file is missing. | Investigate whether `theme.scss` was renamed or if styles silently fail. |
| **Project status `_3` meaning** | Backend has 4 statuses but `ProjectService` only maps three. | Confirm what status 3 means and add it to the mapper. |
| **CI / deployment pipeline** | No config in repo. | Ask DevOps; documenting the build/deploy flow here would help future agents. |

---

*End of PROJECT_CONTEXT.md*
