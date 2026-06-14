/**
 * Authentication / authorization domain models.
 *
 * These types are intentionally backend-agnostic. They describe the contract
 * the rest of the app depends on. The mock backend and (later) the generated
 * `AuthClient` both map onto these shapes inside `AuthApiService`.
 */

/**
 * Standard API response envelope used by the backend.
 * Mirrors the generated `*Response` DTOs (e.g. `Int32Response`) so a mock
 * response is a drop-in replacement for the real one.
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
  Accountant: 'Accountant',
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
    Create: 'projects.create',
    Edit: 'projects.edit',
    Delete: 'projects.delete',
  },
  Agreements: {
    View: 'agreements.view',
    Create: 'agreements.create',
    Edit: 'agreements.edit',
    Delete: 'agreements.delete',
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
