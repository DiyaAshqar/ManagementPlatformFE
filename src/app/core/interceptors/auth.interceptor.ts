import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

/**
 * Attaches the bearer token to outgoing requests and transparently refreshes an
 * expired token on a `401`, retrying the original request once. Concurrent
 * requests that hit `401` during a refresh wait for the single in-flight
 * refresh instead of each triggering their own.
 *
 * Requests to the auth endpoints themselves are never decorated or retried.
 */

// Module-level refresh coordination (shared across all requests).
let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Never touch the anonymous auth endpoints (login / refresh-token). Every
  // other endpoint — including register/change-password/me/logout on this
  // backend — requires the bearer token, so it must go through the normal
  // attach-and-retry-on-401 flow below.
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = authService.getToken();
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        authService.getRefreshToken()
      ) {
        return handle401(req, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<any> {
  // A refresh is already running — queue this request until it completes.
  if (isRefreshing) {
    return refreshedToken$.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next(addToken(req, token)))
    );
  }

  isRefreshing = true;
  refreshedToken$.next(null);

  return authService.refreshToken().pipe(
    switchMap(() => {
      const newToken = authService.getToken();
      isRefreshing = false;
      refreshedToken$.next(newToken);
      return next(newToken ? addToken(req, newToken) : req);
    }),
    catchError((error: unknown) => {
      isRefreshing = false;
      authService.logout();
      return throwError(() => error);
    })
  );
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

function isAuthEndpoint(url: string): boolean {
  return /\/auth\/(login|refresh-token|refreshtoken)(\/|$|\?)/i.test(url);
}
