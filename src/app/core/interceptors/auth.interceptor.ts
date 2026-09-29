import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

/**
 * Attaches the bearer token to outgoing requests and transparently refreshes an
 * expired token on a `401`, retrying the original request once.
 *
 * Refresh coordination itself lives in `AuthService.refreshToken()` (a shared,
 * `shareReplay`'d observable) — concurrent requests that hit `401` either
 * reuse that single in-flight call, or, if it already resolved with a newer
 * token by the time they get here, just retry with that token directly.
 *
 * Requests to the auth endpoints themselves are never decorated or retried.
 */
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
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (!authService.getRefreshToken()) {
        // No refresh token to try — the session is unrecoverable, force it now.
        authService.forceLogout();
        return throwError(() => error);
      }

      // Another concurrent request may already have completed the refresh.
      const latestToken = authService.getToken();
      if (latestToken && latestToken !== token) {
        return next(addToken(req, latestToken));
      }

      return authService.refreshToken().pipe(
        switchMap(() => {
          const newToken = authService.getToken();
          return next(newToken ? addToken(req, newToken) : req);
        }),
        catchError((refreshError: unknown) => {
          authService.forceLogout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

function isAuthEndpoint(url: string): boolean {
  return /\/auth\/(login|refresh-token|refreshtoken)(\/|$|\?)/i.test(url);
}
