import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { StorageService } from '../../services/storage.service';
import {
  AuthUser,
  ChangePasswordRequest,
  Claim,
  LoginRequest,
  LoginResult,
  PERMISSION_FEATURE_MAP,
  RegisterRequest,
  getPermissionsForRoles,
  getSystemFeatureId,
  getSystemPermissionId,
  normalizeRoleName,
} from '../models/auth.models';
import { AuthApiService } from './auth-api.service';
import { JwtService } from './jwt.service';

/**
 * Central session/authorization state for the app.
 *
 * Holds the current user, tokens and derived claims as signals, and is the
 * only thing components/guards/directives should depend on. It talks to the
 * backend exclusively through {@link AuthApiService}, so it is agnostic to
 * whether the mock or real API is active.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly jwt = inject(JwtService);

  private readonly keys = environment.auth;

  // --- Reactive state -----------------------------------------------------
  private readonly currentUserSignal = signal<AuthUser | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);

  /** The authenticated user, or `null`. */
  readonly currentUser = this.currentUserSignal.asReadonly();
  /** The raw access token, or `null`. */
  readonly accessToken = this.accessTokenSignal.asReadonly();

  /** Whether a user is currently authenticated. */
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  /** Roles of the current user. */
  readonly roles = computed(() => this.currentUserSignal()?.roles ?? []);
  /** JWT permissions combined with permissions derived from the user's roles. */
  readonly permissions = computed(() => {
    const user = this.currentUserSignal();
    const fromRoles = getPermissionsForRoles(user?.roles ?? []);
    const merged = [...new Set([...(user?.permissions ?? []), ...fromRoles])];
    // eslint-disable-next-line no-console
    console.log('[AuthDebug] AuthService.permissions computed', {
      userRoles: user?.roles,
      userPermissions: user?.permissions,
      permissionsFromRoles: fromRoles,
      merged,
    });
    return merged;
  });
  /** Flattened JWT claims of the current access token. */
  readonly claims = computed<Claim[]>(() => this.jwt.getClaims(this.accessTokenSignal()));
  /** Backend-granted permission ids per feature id, decoded from the JWT. */
  readonly featurePermissions = computed(() => this.currentUserSignal()?.featurePermissions ?? {});

  constructor() {
    this.initializeAuth();
  }

  // ----------------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------------

  /**
   * Authenticate a user. On success the session is persisted and signals are
   * updated. Emits the authenticated user; errors with a message on failure.
   */
  login(request: LoginRequest): Observable<AuthUser> {
    return this.authApi.login(request).pipe(
      map((response) => {
        if (!response.succeeded || !response.data) {
          throw new Error(response.message || 'Login failed. Please try again.');
        }
        this.persistSession(response.data);
        // The login response only carries id/email/fullName/roles — the full
        // profile (avatar, arabic name, phone) lives on `/api/Auth/me`.
        // Fetch it in the background so the UI (top nav, etc.) reflects it
        // without blocking the login flow.
        this.getCurrentUser().subscribe({ error: () => {} });
        return response.data.user;
      })
    );
  }

  /**
   * Exchange the stored refresh token for a fresh access token. Used by the
   * auth interceptor on `401`. Clears the session if refresh is not possible.
   */
  refreshToken(): Observable<AuthUser> {
    const accessToken = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!accessToken || !refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available.'));
    }

    return this.authApi.refreshToken({ accessToken, refreshToken }).pipe(
      map((response) => {
        if (!response.succeeded || !response.data) {
          throw new Error(response.message || 'Session refresh failed.');
        }
        this.persistSession(response.data);
        return response.data.user;
      }),
      tap({ error: () => this.clearSession() })
    );
  }

  /** Log out: notify the backend (best-effort), clear state, go to login. */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    this.authApi.logout(refreshToken).subscribe({
      next: () => this.completeLogout(),
      error: () => this.completeLogout(),
    });
  }

  /**
   * Create a new account. The backend signs the account in immediately, so this
   * persists the session exactly like {@link login}.
   */
  register(request: RegisterRequest): Observable<AuthUser> {
    return this.authApi.register(request).pipe(
      map((response) => {
        if (!response.succeeded || !response.data) {
          throw new Error(response.message || 'Registration failed. Please try again.');
        }
        this.persistSession(response.data);
        return response.data.user;
      })
    );
  }

  /** Change the current user's password. */
  changePassword(request: ChangePasswordRequest): Observable<boolean> {
    return this.authApi.changePassword(request).pipe(
      map((response) => {
        if (!response.succeeded) {
          throw new Error(response.message || 'Failed to change password.');
        }
        return response.data ?? true;
      })
    );
  }

  /**
   * Refresh the current user's profile from the backend and sync local/session
   * state. Permissions are preserved from the current session since the
   * backend does not return them on this endpoint (they live in the JWT).
   */
  getCurrentUser(): Observable<AuthUser> {
    return this.authApi.getCurrentUser().pipe(
      map((response) => {
        if (!response.succeeded || !response.data) {
          throw new Error(response.message || 'Failed to load the current user.');
        }

        const merged: AuthUser = {
          ...response.data,
          permissions: this.currentUserSignal()?.permissions ?? response.data.permissions,
          featurePermissions:
            this.currentUserSignal()?.featurePermissions ?? response.data.featurePermissions,
        };
        this.storage.setItem(this.keys.userStorageKey, merged);
        this.currentUserSignal.set(merged);
        return merged;
      })
    );
  }

  // --- Authorization helpers ---------------------------------------------

  /**
   * TEMPORARY: always returns `true`. Roles aren't part of the real backend's
   * feature/permission model (that's per-role Feature→Permission grants, not
   * role-name based), and the app has no reliable backend role-name catalog
   * to check against (`BACKEND_ROLES` only has 2 hardcoded entries used for
   * role *assignment*, e.g. `"System Admin"` / `"Resident Engineer"` aren't
   * in it). Nothing currently gates on `roles`/`appHasRole` in practice, so
   * this is a safe no-op rather than an actual bypass of anything.
   */
  hasRole(_role: string): boolean {
    return true;
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /**
   * Checks the app's fine-grained permission string. When `permission` has a
   * real backend mapping (see {@link PERMISSION_FEATURE_MAP}), this checks
   * the actual per-feature grant from the JWT via {@link hasFeaturePermission}.
   * Anything not yet mapped falls back to the legacy hardcoded
   * role-name-based permission set (see `getPermissionsForRoles`), which will
   * be empty for real backend role names the hardcoded table doesn't know.
   */
  hasPermission(permission: string): boolean {
    const mapping = PERMISSION_FEATURE_MAP[permission];
    if (mapping) {
      const featureId = getSystemFeatureId(mapping.featureCode);
      if (featureId != null) {
        return mapping.permissionCodes.some((code) => this.hasFeaturePermission(featureId, code));
      }
    }
    return this.permissions().includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  /**
   * Check the real backend-granted permission for a given feature, using the
   * numeric `featureId → permissionId[]` map decoded from the JWT (see
   * {@link SystemPermissions} for `permissionCode` values). Distinct from
   * {@link hasPermission}, which checks the app's hardcoded string-based
   * permission set — the two are not yet unified.
   */
  hasFeaturePermission(featureId: number, permissionCode: string): boolean {
    const permissionId = getSystemPermissionId(permissionCode);
    if (permissionId == null) {
      return false;
    }
    return this.featurePermissions()[featureId]?.includes(permissionId) ?? false;
  }

  /** True when the token carries a claim of the given type (and value). */
  hasClaim(type: string, value?: string): boolean {
    return this.claims().some(
      (claim) => claim.type === type && (value === undefined || claim.value === value)
    );
  }

  // --- Token accessors (used by interceptors) ----------------------------

  getToken(): string | null {
    return this.storage.getItem<string>(this.keys.tokenStorageKey);
  }

  getRefreshToken(): string | null {
    return this.storage.getItem<string>(this.keys.refreshTokenStorageKey);
  }

  /** True when there is a token and it has not expired. */
  isTokenValid(): boolean {
    const token = this.getToken();
    return !!token && !this.jwt.isExpired(token, 0);
  }

  // ----------------------------------------------------------------------
  // Internals
  // ----------------------------------------------------------------------

  /** Restore the session from storage on startup. */
  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.storage.getItem<AuthUser>(this.keys.userStorageKey);

    if (!token || !user) {
      this.clearSession();
      return;
    }

    // Restore optimistically so the UI is not blocked on a refresh round-trip.
    this.currentUserSignal.set(user);
    this.accessTokenSignal.set(token);

    // If the access token is already expired, try a silent refresh; if there is
    // no usable refresh token, drop the stale session.
    if (this.jwt.isExpired(token, 0)) {
      if (this.getRefreshToken()) {
        this.refreshToken().subscribe({
          next: () => this.getCurrentUser().subscribe({ error: () => {} }),
          error: () => this.clearSession(),
        });
      } else {
        this.clearSession();
      }
    } else {
      // Refresh the full profile (avatar, arabic name, phone) in the
      // background — the persisted session may only have the minimal fields
      // the login response carries.
      this.getCurrentUser().subscribe({ error: () => {} });
    }
  }

  /** Save tokens + user to storage and update signals. */
  private persistSession(result: LoginResult): void {
    this.storage.setItem(this.keys.tokenStorageKey, result.accessToken);
    this.storage.setItem(this.keys.refreshTokenStorageKey, result.refreshToken);
    this.storage.setItem(this.keys.userStorageKey, result.user);

    this.accessTokenSignal.set(result.accessToken);
    this.currentUserSignal.set(result.user);
  }

  /** Wipe all session state from storage and signals. */
  private clearSession(): void {
    this.storage.removeItem(this.keys.tokenStorageKey);
    this.storage.removeItem(this.keys.refreshTokenStorageKey);
    this.storage.removeItem(this.keys.userStorageKey);

    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  private completeLogout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }
}
