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
  /** Email address or username used to identify the account. */
  username: string;
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

/**
 * Backend-granted permission ids per feature id, exactly as decoded from the
 * JWT `permissions` claim (`{"<featureId>": [<permissionId>, ...]}`).
 */
export type FeaturePermissionsMap = Record<number, number[]>;

/** The authenticated user as consumed across the app. */
export interface AuthUser {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  roles: string[];
  /** Flat list of permission strings (e.g. `projects.create`). */
  permissions: string[];
  /** Backend-granted permission ids per feature id, decoded from the JWT. */
  featurePermissions: FeaturePermissionsMap;
  /** Optional extras: avatar, language, tenant, etc. */
  avatarUrl?: string;
  preferredLanguage?: string;
  /**
   * Populated from `/api/Auth/me` (not present on the login response) — see
   * `AuthApiService.mapUserDto`. Undefined until that background refresh
   * completes.
   */
  arabicFullName?: string;
  phoneNumber?: string;
  isActive?: boolean;
  lastLoginDate?: Date;
  createdDate?: Date;
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
  /**
   * The real backend emits this as a JSON-encoded object string —
   * `'{"<featureId>":[<permissionId>, ...]}'` — not a flat list. Decode it
   * with `JwtService.getFeaturePermissions()`, not `normalizeClaim`.
   */
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
 * Backend role directory, confirmed manually (no `GET /api/Roles` endpoint
 * exists to fetch this). Keep in sync with the backend's Role table if it
 * ever changes.
 */
export const BACKEND_ROLES: { label: string; value: number }[] = [
  { label: 'userManagement.roles.admin', value: 1 },
  { label: 'userManagement.roles.user', value: 2 },
];

/**
 * Fixed system permission catalog (confirmed by the backend team — these ids
 * are seeded and stable, unlike `Feature`s which are managed dynamically via
 * the Roles & Permissions admin screens). Used to resolve a permission code
 * to the numeric id the JWT's `featurePermissions` map is keyed by.
 */
export const SystemPermissions = {
  Create: { id: 1, code: 'CREATE' },
  Read: { id: 2, code: 'READ' },
  Update: { id: 3, code: 'UPDATE' },
  Delete: { id: 4, code: 'DELETE' },
  Claim: { id: 5, code: 'CLAIM' },
  Close: { id: 6, code: 'CLOSE' },
  Export: { id: 7, code: 'EXPORT' },
  Approve: { id: 8, code: 'APPROVE' },
  Attach: { id: 9, code: 'ATTACH' },
  Settle: { id: 10, code: 'SETTLE' },
  FinanceDetails: { id: 11, code: 'FINANCE_DETAILS' },
} as const;

/** Resolve a system permission id from its backend code (e.g. `'READ'` → `2`). */
export function getSystemPermissionId(code: string): number | undefined {
  return Object.values(SystemPermissions).find((permission) => permission.code === code)?.id;
}

/**
 * Backend feature catalog snapshot (confirmed by the backend team), used to
 * resolve a feature code to the numeric id the JWT's `featurePermissions`
 * map is keyed by (e.g. `getSystemFeatureId('PROJECTS')` → `7`). Features are
 * still managed dynamically via the Roles & Permissions admin screens
 * (`/api/Features`) — this snapshot exists so code can reference a feature by
 * its stable code without an extra API round-trip. Keep in sync if the
 * backend's Feature table changes.
 */
export const SystemFeatures = {
  Users: { id: 1, code: 'USERS' },
  Roles: { id: 2, code: 'ROLES' },
  Constructors: { id: 3, code: 'CONSTRUCTORS' },
  Suppliers: { id: 4, code: 'SUPPLIERS' },
  Materials: { id: 5, code: 'MATERIALS' },
  Agreements: { id: 6, code: 'AGREEMENTS' },
  Projects: { id: 7, code: 'PROJECTS' },
  ProjectPreparing: { id: 8, code: 'PROJECT_PREPARING' },
  ProjectExcavation: { id: 9, code: 'PROJECT_EXCAVATION' },
  ProjectDocuments: { id: 10, code: 'PROJECT_DOCUMENTS' },
  OwnerPayment: { id: 11, code: 'OWNER_PAYMENT' },
  ProjectTimeframe: { id: 12, code: 'PROJECT_TIMEFRAME' },
  ProjectMilestone: { id: 13, code: 'PROJECT_MILESTONE' },
  ProjectMilestoneBOQ: { id: 14, code: 'PROJECT_MILESTONE_BOQ' },
  ProjectMilestoneMC: { id: 15, code: 'PROJECT_MILESTONE_MC' },
  ProjectMilestonePurchaseOrders: { id: 16, code: 'PROJECT_MILESTONE_PURCHASE_ORDERS' },
  ProjectMilestoneSurveying: { id: 17, code: 'PROJECT_MILESTONE_SURVEYING' },
  ProjectMilestoneVO: { id: 18, code: 'PROJECT_MILESTONE_VO' },
  ProjectMilestoneDocuments: { id: 19, code: 'PROJECT_MILESTONE_DOCUMENTS' },
  ProjectMilestoneExpenses: { id: 20, code: 'PROJECT_MILESTONE_EXPENSES' },
  ProjectMilestoneAdvancePayments: { id: 21, code: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS' },
  ProjectMilestoneTasks: { id: 22, code: 'PROJECT_MILESTONE_TASKS' },
  ProjectMilestonePaymentClaim: { id: 23, code: 'PROJECT_MILESTONE_PAYMENT_CLAIM' },
} as const;

/** Resolve a system feature id from its backend code (e.g. `'PROJECTS'` → `7`). */
export function getSystemFeatureId(code: string): number | undefined {
  return Object.values(SystemFeatures).find((feature) => feature.code === code)?.id;
}

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
  RolesPermissions: {
    View: 'roles-permissions.view',
    Manage: 'roles-permissions.manage',
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
  const result = [
    ...new Set(
      roles.flatMap((role) => {
        const normalized = normalizeRoleName(role);
        const matched = ROLE_PERMISSIONS[normalized] ?? [];
        // eslint-disable-next-line no-console
        console.log('[AuthDebug] getPermissionsForRoles: role lookup', {
          role,
          normalized,
          matchedCount: matched.length,
          knownRoleKeys: Object.keys(ROLE_PERMISSIONS),
        });
        return matched;
      })
    ),
  ];
  return result;
}

/** Maps an app permission string to the real backend feature + any-of-these permission codes that grant it. */
interface FeaturePermissionMapping {
  featureCode: string;
  permissionCodes: string[];
}

/**
 * Maps the app's fine-grained permission strings to the backend's real
 * `(featureCode, permissionCode)` pairs, so `AuthService.hasPermission()` can
 * check the JWT's actual `featurePermissions` grant instead of (only) the
 * hardcoded {@link ROLE_PERMISSIONS} table. A `"Manage"`-style permission
 * maps to more than one permission code (any one of them grants it).
 *
 * Not exhaustive — `Permissions.Dashboard.View`, `Permissions.Documents.*`
 * and `Permissions.ProjectWork.Manage` are deliberately left unmapped: they
 * either have no corresponding backend feature, or (for `Documents`/
 * `ProjectWork`) are reused across multiple distinct milestone tabs by the
 * same shared component, so a single feature code can't be inferred from the
 * permission string alone. Those fall back to {@link ROLE_PERMISSIONS}.
 */
export const PERMISSION_FEATURE_MAP: Record<string, FeaturePermissionMapping> = {
  [Permissions.Projects.View]: { featureCode: 'PROJECTS', permissionCodes: ['READ'] },
  [Permissions.Projects.ViewAssigned]: { featureCode: 'PROJECTS', permissionCodes: ['READ'] },
  [Permissions.Projects.Create]: { featureCode: 'PROJECTS', permissionCodes: ['CREATE'] },
  [Permissions.Projects.Edit]: { featureCode: 'PROJECTS', permissionCodes: ['UPDATE'] },
  [Permissions.Projects.Delete]: { featureCode: 'PROJECTS', permissionCodes: ['DELETE'] },

  [Permissions.ProjectTabs.Overview]: { featureCode: 'PROJECTS', permissionCodes: ['READ'] },
  [Permissions.ProjectTabs.Preparing]: { featureCode: 'PROJECT_PREPARING', permissionCodes: ['READ'] },
  [Permissions.ProjectTabs.Excavation]: { featureCode: 'PROJECT_EXCAVATION', permissionCodes: ['READ'] },
  [Permissions.ProjectTabs.Milestones]: { featureCode: 'PROJECT_MILESTONE', permissionCodes: ['READ'] },
  [Permissions.ProjectTabs.Documents]: { featureCode: 'PROJECT_DOCUMENTS', permissionCodes: ['READ'] },
  [Permissions.ProjectTabs.OwnerPayments]: { featureCode: 'OWNER_PAYMENT', permissionCodes: ['READ'] },
  [Permissions.ProjectTabs.Timeframe]: { featureCode: 'PROJECT_TIMEFRAME', permissionCodes: ['READ'] },

  [Permissions.MilestoneTabs.BOQ]: { featureCode: 'PROJECT_MILESTONE_BOQ', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.ProjectMainContractor]: { featureCode: 'PROJECT_MILESTONE_MC', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.PurchaseOrders]: { featureCode: 'PROJECT_MILESTONE_PURCHASE_ORDERS', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.SurveyingVisits]: { featureCode: 'PROJECT_MILESTONE_SURVEYING', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.VoucherOrders]: { featureCode: 'PROJECT_MILESTONE_VO', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.Documents]: { featureCode: 'PROJECT_MILESTONE_DOCUMENTS', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.PettyCash]: { featureCode: 'PROJECT_MILESTONE_EXPENSES', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.Advances]: { featureCode: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.Tasks]: { featureCode: 'PROJECT_MILESTONE_TASKS', permissionCodes: ['READ'] },
  [Permissions.MilestoneTabs.PaymentClaims]: { featureCode: 'PROJECT_MILESTONE_PAYMENT_CLAIM', permissionCodes: ['READ'] },

  [Permissions.Agreements.View]: { featureCode: 'AGREEMENTS', permissionCodes: ['READ'] },
  [Permissions.Agreements.Create]: { featureCode: 'AGREEMENTS', permissionCodes: ['CREATE'] },
  [Permissions.Agreements.Edit]: { featureCode: 'AGREEMENTS', permissionCodes: ['UPDATE'] },
  [Permissions.Agreements.Delete]: { featureCode: 'AGREEMENTS', permissionCodes: ['DELETE'] },
  [Permissions.Agreements.ViewPaymentDetails]: { featureCode: 'AGREEMENTS', permissionCodes: ['FINANCE_DETAILS'] },

  [Permissions.BOQ.View]: { featureCode: 'PROJECT_MILESTONE_BOQ', permissionCodes: ['READ'] },
  [Permissions.BOQ.Create]: { featureCode: 'PROJECT_MILESTONE_BOQ', permissionCodes: ['CREATE'] },
  [Permissions.BOQ.Edit]: { featureCode: 'PROJECT_MILESTONE_BOQ', permissionCodes: ['UPDATE'] },
  [Permissions.BOQ.Delete]: { featureCode: 'PROJECT_MILESTONE_BOQ', permissionCodes: ['DELETE'] },
  [Permissions.BOQ.Close]: { featureCode: 'PROJECT_MILESTONE_BOQ', permissionCodes: ['CLOSE'] },

  [Permissions.PaymentClaims.View]: { featureCode: 'PROJECT_MILESTONE_PAYMENT_CLAIM', permissionCodes: ['READ'] },
  [Permissions.PaymentClaims.Print]: { featureCode: 'PROJECT_MILESTONE_PAYMENT_CLAIM', permissionCodes: ['EXPORT'] },
  [Permissions.PaymentClaims.Lock]: { featureCode: 'PROJECT_MILESTONE_PAYMENT_CLAIM', permissionCodes: ['CLOSE'] },

  [Permissions.Advances.View]: { featureCode: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS', permissionCodes: ['READ'] },
  [Permissions.Advances.Create]: { featureCode: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS', permissionCodes: ['CREATE'] },
  [Permissions.Advances.Edit]: { featureCode: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS', permissionCodes: ['UPDATE'] },
  [Permissions.Advances.Delete]: { featureCode: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS', permissionCodes: ['DELETE'] },
  [Permissions.Advances.Settle]: { featureCode: 'PROJECT_MILESTONE_ADVANCE_PAYMENTS', permissionCodes: ['SETTLE'] },

  [Permissions.PettyCash.View]: { featureCode: 'PROJECT_MILESTONE_EXPENSES', permissionCodes: ['READ'] },
  [Permissions.PettyCash.Create]: { featureCode: 'PROJECT_MILESTONE_EXPENSES', permissionCodes: ['CREATE'] },
  [Permissions.PettyCash.Edit]: { featureCode: 'PROJECT_MILESTONE_EXPENSES', permissionCodes: ['UPDATE'] },
  [Permissions.PettyCash.Delete]: { featureCode: 'PROJECT_MILESTONE_EXPENSES', permissionCodes: ['DELETE'] },

  [Permissions.OwnerPayments.View]: { featureCode: 'OWNER_PAYMENT', permissionCodes: ['READ'] },
  [Permissions.OwnerPayments.Create]: { featureCode: 'OWNER_PAYMENT', permissionCodes: ['CREATE'] },
  [Permissions.OwnerPayments.Edit]: { featureCode: 'OWNER_PAYMENT', permissionCodes: ['UPDATE'] },
  [Permissions.OwnerPayments.Delete]: { featureCode: 'OWNER_PAYMENT', permissionCodes: ['DELETE'] },

  [Permissions.Timeframe.View]: { featureCode: 'PROJECT_TIMEFRAME', permissionCodes: ['READ'] },

  [Permissions.Constructors.View]: { featureCode: 'CONSTRUCTORS', permissionCodes: ['READ'] },
  [Permissions.Constructors.Manage]: { featureCode: 'CONSTRUCTORS', permissionCodes: ['CREATE', 'UPDATE', 'DELETE'] },

  [Permissions.Suppliers.View]: { featureCode: 'SUPPLIERS', permissionCodes: ['READ'] },
  [Permissions.Suppliers.Manage]: { featureCode: 'SUPPLIERS', permissionCodes: ['CREATE', 'UPDATE', 'DELETE'] },

  [Permissions.Materials.View]: { featureCode: 'MATERIALS', permissionCodes: ['READ'] },
  [Permissions.Materials.Manage]: { featureCode: 'MATERIALS', permissionCodes: ['CREATE', 'UPDATE', 'DELETE'] },

  [Permissions.Users.View]: { featureCode: 'USERS', permissionCodes: ['READ'] },
  [Permissions.Users.Manage]: { featureCode: 'USERS', permissionCodes: ['CREATE', 'UPDATE', 'DELETE'] },

  [Permissions.RolesPermissions.View]: { featureCode: 'ROLES', permissionCodes: ['READ'] },
  [Permissions.RolesPermissions.Manage]: { featureCode: 'ROLES', permissionCodes: ['CREATE', 'UPDATE', 'DELETE'] },
};
