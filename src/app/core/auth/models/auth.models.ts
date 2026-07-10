/**
 * Authentication / authorization domain models.
 *
 * These types describe the authentication contract used by the rest of the
 * app. The generated `AuthClient` maps onto these shapes in `AuthApiService`.
 */

/**
 * Standard API response envelope used by the backend.
 * Mirrors the generated `*Response` DTOs (e.g. `Int32Response`).
 */
export interface ApiResponse<T> {
  succeeded: boolean;
  message?: string;
  errors?: string[];
  data?: T;
}

/** Credentials submitted from the login form. */
export interface LoginRequest {
  /** Email or username depending on backend configuration. */
  email: string;
  password: string;
  /** When true, the session is persisted across browser restarts. */
  rememberMe?: boolean;
}

/** Payload to exchange a refresh token for a new access token. */
export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

/** Payload to create a new account. */
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  arabicFullName?: string;
  phoneNumber?: string;
}

/** Payload to change the current user's password. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/**
 * The successful login/refresh result `data` payload.
 * This is what the backend is expected to return inside `ApiResponse<LoginResult>`.
 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  user: AuthUser;
}

/** The authenticated user as consumed across the app. */
export interface AuthUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  roles: string[];
  /** Flat list of permission strings (e.g. `projects.create`). */
  permissions: string[];
  /** Optional extras: avatar, language, tenant, etc. */
  avatarUrl?: string;
  preferredLanguage?: string;
}

/**
 * Decoded JWT payload. Names follow common .NET Identity / standard JWT claim
 * conventions; both short and namespaced forms are supported by `JwtService`.
 */
export interface JwtPayload {
  sub?: string;
  nameid?: string;
  email?: string;
  name?: string;
  given_name?: string;
  /** Single role or array of roles. */
  role?: string | string[];
  /** Custom permission claim(s). */
  permission?: string | string[];
  permissions?: string | string[];
  /** Issued-at / expiry (epoch seconds). */
  iat?: number;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string;
  [claim: string]: unknown;
}

/** A single claim as a flat key/value pair (used by `hasClaim`). */
export interface Claim {
  type: string;
  value: string;
}

/**
 * Standard JWT/.NET claim type URIs. Use these instead of magic strings when
 * reading claims so the mock and real tokens stay interchangeable.
 */
export const ClaimTypes = {
  NameIdentifier: 'nameid',
  Sub: 'sub',
  Name: 'name',
  Email: 'email',
  Role: 'role',
  Permission: 'permission',
} as const;

/**
 * Application roles. Keep in sync with the backend role names.
 */
export const Roles = {
  Admin: 'Admin',
  ProjectManager: 'ProjectManager',
  Owner: 'Owner',
  Engineer: 'Engineer',
  BOQEngineer: 'BOQEngineer',
  Accountant: 'Accountant',
  MainEngineer: 'MainEngineer',
  Viewer: 'Viewer',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

/**
 * Application permissions (fine-grained). Reference these constants from
 * guards, directives and templates rather than hardcoding strings.
 *
 * Convention: `<resource>.<action>`.
 */
export const Permissions = {
  Dashboard: {
    View: 'dashboard.view',
  },
  Projects: {
    View: 'projects.view',
    ViewAssigned: 'projects.view-assigned',
    Create: 'projects.create',
    Edit: 'projects.edit',
    Delete: 'projects.delete',
  },
  ProjectTabs: {
    Overview: 'project-tabs.overview.view',
    Preparing: 'project-tabs.preparing.view',
    Excavation: 'project-tabs.excavation.view',
    Milestones: 'project-tabs.milestones.view',
    Documents: 'project-tabs.documents.view',
    OwnerPayments: 'project-tabs.owner-payments.view',
    Timeframe: 'project-tabs.timeframe.view',
  },
  MilestoneTabs: {
    BOQ: 'milestone-tabs.boq.view',
    ProjectMainContractor: 'milestone-tabs.project-main-contractor.view',
    PurchaseOrders: 'milestone-tabs.purchase-orders.view',
    SurveyingVisits: 'milestone-tabs.surveying-visits.view',
    VoucherOrders: 'milestone-tabs.voucher-orders.view',
    Documents: 'milestone-tabs.documents.view',
    PettyCash: 'milestone-tabs.petty-cash.view',
    Advances: 'milestone-tabs.advances.view',
    Tasks: 'milestone-tabs.tasks.view',
    PaymentClaims: 'milestone-tabs.payment-claims.view',
  },
  Agreements: {
    View: 'agreements.view',
    Create: 'agreements.create',
    Edit: 'agreements.edit',
    Delete: 'agreements.delete',
    ViewPaymentDetails: 'agreements.payment-details.view',
  },
  BOQ: {
    View: 'boq.view',
    Create: 'boq.create',
    Edit: 'boq.edit',
    Delete: 'boq.delete',
    Close: 'boq.close',
  },
  PaymentClaims: {
    View: 'payment-claims.view',
    Print: 'payment-claims.print',
    Lock: 'payment-claims.lock',
  },
  Advances: {
    View: 'advances.view',
    Create: 'advances.create',
    Edit: 'advances.edit',
    Delete: 'advances.delete',
    Settle: 'advances.settle',
  },
  PettyCash: {
    View: 'petty-cash.view',
    Create: 'petty-cash.create',
    Edit: 'petty-cash.edit',
    Delete: 'petty-cash.delete',
  },
  OwnerPayments: {
    View: 'owner-payments.view',
    Create: 'owner-payments.create',
    Edit: 'owner-payments.edit',
    Delete: 'owner-payments.delete',
  },
  Timeframe: {
    View: 'timeframe.view',
  },
  Documents: {
    View: 'documents.view',
    Manage: 'documents.manage',
  },
  ProjectWork: {
    Manage: 'project-work.manage',
  },
  Constructors: {
    View: 'constructors.view',
    Manage: 'constructors.manage',
  },
  Suppliers: {
    View: 'suppliers.view',
    Manage: 'suppliers.manage',
  },
  Materials: {
    View: 'materials.view',
    Manage: 'materials.manage',
  },
  Users: {
    View: 'users.view',
    Manage: 'users.manage',
  },
} as const;

/** Flatten the nested `Permissions` object to a string[] (all known permissions). */
export const ALL_PERMISSIONS: string[] = Object.values(Permissions).flatMap((group) =>
  Object.values(group)
);

const ALL_PROJECT_TABS = Object.values(Permissions.ProjectTabs);
const ALL_MILESTONE_TABS = Object.values(Permissions.MilestoneTabs);

const PROJECT_VIEW_PERMISSIONS = [
  Permissions.Projects.View,
  Permissions.OwnerPayments.View,
  Permissions.Timeframe.View,
  Permissions.Documents.View,
  Permissions.BOQ.View,
  Permissions.PaymentClaims.View,
  Permissions.Advances.View,
  Permissions.PettyCash.View,
];

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  admin: ALL_PERMISSIONS,
  mainengineer: ALL_PERMISSIONS,
  owner: [
    ...PROJECT_VIEW_PERMISSIONS.filter((permission) => permission !== Permissions.BOQ.View),
    Permissions.ProjectTabs.Milestones,
    Permissions.ProjectTabs.Documents,
    Permissions.ProjectTabs.OwnerPayments,
    Permissions.ProjectTabs.Timeframe,
    ...ALL_MILESTONE_TABS.filter((permission) => permission !== Permissions.MilestoneTabs.BOQ),
  ],
  engineer: [
    ...PROJECT_VIEW_PERMISSIONS.filter((permission) =>
      permission !== Permissions.Projects.View &&
      permission !== Permissions.OwnerPayments.View &&
      permission !== Permissions.PaymentClaims.View
    ),
    Permissions.Projects.ViewAssigned,
    ...ALL_PROJECT_TABS.filter((permission) => permission !== Permissions.ProjectTabs.OwnerPayments),
    ...ALL_MILESTONE_TABS.filter((permission) => permission !== Permissions.MilestoneTabs.PaymentClaims),
    Permissions.BOQ.Create,
    Permissions.BOQ.Edit,
    Permissions.Documents.Manage,
    Permissions.ProjectWork.Manage,
  ],
  boqengineer: [
    ...PROJECT_VIEW_PERMISSIONS.filter((permission) =>
      permission !== Permissions.Projects.View &&
      permission !== Permissions.OwnerPayments.View &&
      permission !== Permissions.PaymentClaims.View
    ),
    Permissions.Projects.ViewAssigned,
    ...ALL_PROJECT_TABS.filter((permission) => permission !== Permissions.ProjectTabs.OwnerPayments),
    ...ALL_MILESTONE_TABS.filter((permission) => permission !== Permissions.MilestoneTabs.PaymentClaims),
    Permissions.BOQ.Create,
    Permissions.BOQ.Edit,
    Permissions.BOQ.Delete,
    Permissions.Documents.Manage,
    Permissions.ProjectWork.Manage,
    Permissions.Agreements.View,
    Permissions.Agreements.Create,
    Permissions.Agreements.Edit,
  ],
  accountant: [
    Permissions.Projects.View,
    Permissions.ProjectTabs.Milestones,
    Permissions.ProjectTabs.OwnerPayments,
    Permissions.MilestoneTabs.PettyCash,
    Permissions.MilestoneTabs.PaymentClaims,
    Permissions.OwnerPayments.View,
    Permissions.PaymentClaims.View,
    Permissions.PettyCash.View,
    Permissions.PettyCash.Create,
    Permissions.PettyCash.Edit,
    Permissions.Documents.Manage,
  ],
};

/** Normalize backend role labels so `BOQ Engineer` and `BOQEngineer` are equivalent. */
export function normalizeRoleName(role: string): string {
  return role.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/** Permissions granted by the application's role matrix. */
export function getPermissionsForRoles(roles: readonly string[]): string[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[normalizeRoleName(role)] ?? []))];
}
