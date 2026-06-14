import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protect routes that require authentication. Unauthenticated users are sent to
 * the login page with a `returnUrl` so they land back where they intended.
 */
export const AuthGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Same as {@link AuthGuard} but for child routes. */
export const AuthChildGuard: CanActivateChildFn = (route, state) =>
  (AuthGuard as CanActivateFn)(route, state);

/** Prevent authenticated users from visiting guest-only pages (e.g. login). */
export const GuestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

/**
 * Factory: allow the route only if the user has one of `allowedRoles`.
 * Usage in routes: `canActivate: [roleGuard([Roles.Admin])]`
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
};

/**
 * Factory: allow the route only if the user has the required permission(s).
 * @param mode `'any'` (default) requires at least one; `'all'` requires every one.
 * Usage: `canActivate: [permissionGuard([Permissions.Projects.View])]`
 */
export const permissionGuard = (
  permissions: string[],
  mode: 'any' | 'all' = 'any'
): CanActivateFn => {
  return (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const allowed =
      mode === 'all'
        ? authService.hasAllPermissions(permissions)
        : authService.hasAnyPermission(permissions);

    return allowed ? true : router.createUrlTree(['/dashboard']);
  };
};

/**
 * @deprecated Use {@link roleGuard}. Kept for backwards compatibility.
 */
export const RoleGuard = roleGuard;
