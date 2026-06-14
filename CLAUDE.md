# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository.

## Project

**Management Platform FE** — a construction project management platform built with **Angular 19** (standalone components, signals) and **PrimeNG 19** (Aura theme). The app is internationalized (English + Arabic, RTL-aware) via `@ngx-translate`.

- Package name: `construction`
- Node/Angular: Angular 19.1, TypeScript 5.7, RxJS 7.8
- UI: PrimeNG 19 + PrimeFlex + PrimeIcons, custom Aura preset (blue primary)
- State: Angular **signals** (no NgRx)

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | `ng serve` — dev server at `http://localhost:4200` |
| `npm run build` | Production build |
| `npm run watch` | Dev build, watch mode |
| `npm test` | Karma + Jasmine unit tests |
| `npm run generate-api` | Regenerate the typed API client from backend Swagger (alias: `npm run nswag`) |

## API client generation (NSwag)

The HTTP layer is **generated**, not hand-written.

- Config: [src/nswag/nswag.json](src/nswag/nswag.json) — pulls `http://62.84.178.178:93/swagger/all/swagger.json`
- Output: `src/nswag/api-client.ts` (one `XxxClient` class per controller, e.g. `ProjectClient`, `TaskClient`)
- After the backend changes, run `npm run generate-api` and the typed clients/DTOs update automatically.
- Clients are registered as providers in [src/app/app.config.ts](src/app/app.config.ts) and the base URL is bound to the `API_BASE_URL` token from `environment.nSwagUrl`.

### Response envelope

Every backend endpoint returns a standard envelope. The generated `*Response` DTOs all look like:

```ts
{ succeeded: boolean; message?: string; errors?: string[]; data?: T }
```

Interceptors rely on the `succeeded` flag (see below). **Any new mock/fake API must return this same shape** so it is a drop-in replacement once the real endpoint exists.

## Architecture

```
src/app/
  core/            Singleton, app-wide concerns (provided in root)
    auth/          Auth/login/claims — services, guards, directives, models, mock
    interceptors/  HTTP interceptors (auth, error, success, loading)
    services/      storage, language, theme, sidebar
  shared/          Reusable components, services, models (no feature logic)
  layouts/         auth-layout (public) + main-layout (authenticated shell)
  features/        Feature modules (lazy-loaded standalone components)
    auth/          Login page(s)
    dashboard/ analytics/ project-management/ agreement-wizard/
    constructor/ supplier/ material/ ...
  app.config.ts    Application providers (router, http, primeng, i18n, API clients)
  app.routes.ts    Lazy route definitions + guards
```

### Conventions

- **Standalone components only** — no NgModules. Each component declares its own `imports`.
- **Lazy routes** via `loadComponent: () => import(...)`.
- **Signals** for component/service state (`signal`, `computed`, `.asReadonly()`).
- **Feature folders** contain `pages/` (routed), `components/` (presentational/dialogs), `services/`, `models/`.
- Wrapper services per feature delegate to the generated `*Client` (see [project-api.service.ts](src/app/features/project-management/services/project-api.service.ts)) — keep components free of direct client calls.
- **i18n**: every user-facing string uses a translate key in [src/assets/i18n/en.json](src/assets/i18n/en.json) and [src/assets/i18n/ar.json](src/assets/i18n/ar.json). Keep both files in sync.
- File references in code reviews/PRs use clickable relative paths.

### HTTP interceptors

Registered in [app.config.ts](src/app/app.config.ts) (outermost → innermost): `ErrorInterceptor`, `SuccessInterceptor`, `LoadingInterceptor`, `AuthInterceptor`.

- **AuthInterceptor** — attaches `Authorization: Bearer <token>`; transparently refreshes on `401` and retries once, else logs out. Skips `/auth/*` endpoints.
- **ErrorInterceptor** — maps HTTP errors to toast messages. Honors `X-Skip-Error-Toast`.
- **SuccessInterceptor** — shows success toasts for mutations, and treats `succeeded: false` envelopes as errors. Honors `X-Skip-Success-Toast`; skips `GET`s.
- **LoadingInterceptor** — global loading hook (honors `X-Skip-Loading`).

Useful request headers: `X-Skip-Error-Toast`, `X-Skip-Success-Toast`, `X-Skip-Loading`.

## Authentication, authorization & claims

Lives under [src/app/core/auth/](src/app/core/auth/). Built to run **fully on a mock backend today** and swap to the real API by flipping one flag once the backend exposes auth endpoints.

- `environment.auth.useMock` — `true` uses the in-memory mock (`core/auth/mock`); set to `false` once the generated `AuthClient` exists.
- **AuthService** — signal-based session: `currentUser`, `isAuthenticated`, `roles`, `permissions`, `claims`. Exposes `login()`, `logout()`, `refreshToken()`, and `hasRole`/`hasAnyRole`/`hasPermission`/`hasClaim`.
- **JwtService** — decodes JWTs (no external lib), reads expiry and claims.
- **AuthApiService** — single seam between the app and the backend; delegates to the mock or the real client based on `useMock`.
- **Guards** ([guards/auth.guard.ts](src/app/core/auth/guards/auth.guard.ts)): `AuthGuard`, `GuestGuard`, `roleGuard([...])`, `permissionGuard([...])` — unauthenticated users are redirected to `/auth/login?returnUrl=...`.
- **Directives**: `*appHasPermission` and `*appHasRole` conditionally render UI based on the current session.
- **Claims/permissions** are centralized as constants in [models/auth.models.ts](src/app/core/auth/models/auth.models.ts) — reference these, don't hardcode strings.

### Switching from mock to real backend

1. Run `npm run generate-api` after the backend adds the auth controller.
2. Set `environment.auth.useMock = false` in all `environment*.ts`.
3. Wire the generated client inside `AuthApiService` (a `// REAL API` block marks the exact spot) and register it in `app.config.ts`.

Nothing else in the app should need to change — components, guards, and directives depend only on `AuthService`.

## Environment

[src/environments/](src/environments/) holds `environment.ts` (base), `.development.ts`, `.production.ts`. Keys: `apiUrl`, `nSwagUrl`, `auth` (storage keys, mock flag), `api` (timeout/retry), `cache`, `features`.

## Gotchas

- Keep `en.json` and `ar.json` keys identical — a missing key renders the raw key.
- The backend lives at `http://62.84.178.178:93`; `apiUrl` includes `/api`, `nSwagUrl` does not (the generated client appends paths).
- Toasts are driven by interceptors, not components — don't double-toast on success/error.
- PrimeNG dark mode uses the `.dark-theme` selector (see `providePrimeNG` in app.config).
