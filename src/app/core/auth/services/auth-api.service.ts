import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  LoginRequest,
  LoginResult,
  RefreshTokenRequest,
} from '../models/auth.models';
import {
  buildMockLoginResult,
  findMockUser,
  findMockUserById,
  userIdFromRefreshToken,
} from '../mock/mock-auth';

/**
 * The single seam between the application and the authentication backend.
 *
 * Everything above this service (AuthService, guards, components) is unaware of
 * whether requests are served by the in-memory mock or the real HTTP API. Flip
 * `environment.auth.useMock` to switch; wire the generated client in the
 * `// REAL API` blocks below once `npm run generate-api` produces an AuthClient.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  /** Simulated network latency for the mock (ms). */
  private readonly mockLatency = 600;

  // When the real backend is ready, inject the generated client here, e.g.:
  // constructor(private authClient: AuthClient) {}

  /** Authenticate with email/username + password. */
  login(request: LoginRequest): Observable<ApiResponse<LoginResult>> {
    if (environment.auth.useMock) {
      return this.mockLogin(request);
    }

    // REAL API — replace with the generated client call, mapping its DTO to
    // `ApiResponse<LoginResult>` (the shapes already align with the envelope):
    //   return this.authClient.login(new LoginCommand({ ... }));
    return this.notImplemented('login');
  }

  /** Exchange a refresh token for a fresh access token. */
  refreshToken(request: RefreshTokenRequest): Observable<ApiResponse<LoginResult>> {
    if (environment.auth.useMock) {
      return this.mockRefresh(request);
    }

    // REAL API:
    //   return this.authClient.refreshToken(new RefreshTokenCommand({ ... }));
    return this.notImplemented('refreshToken');
  }

  /** Invalidate the session server-side (best-effort). */
  logout(refreshToken: string | null): Observable<ApiResponse<boolean>> {
    if (environment.auth.useMock) {
      return of<ApiResponse<boolean>>({ succeeded: true, data: true }).pipe(
        delay(this.mockLatency)
      );
    }

    // REAL API:
    //   return this.authClient.logout(new LogoutCommand({ refreshToken }));
    return this.notImplemented('logout');
  }

  /** Begin a password-reset flow. */
  forgotPassword(email: string): Observable<ApiResponse<boolean>> {
    if (environment.auth.useMock) {
      return of<ApiResponse<boolean>>({
        succeeded: true,
        data: true,
        message: 'If the account exists, a reset link has been sent.',
      }).pipe(delay(this.mockLatency));
    }

    // REAL API:
    //   return this.authClient.forgotPassword(new ForgotPasswordCommand({ email }));
    return this.notImplemented('forgotPassword');
  }

  // ----------------------------------------------------------------------
  // Mock implementations
  // ----------------------------------------------------------------------

  private mockLogin(request: LoginRequest): Observable<ApiResponse<LoginResult>> {
    const user = findMockUser(request.email, request.password);

    if (!user) {
      return of<ApiResponse<LoginResult>>({
        succeeded: false,
        message: 'Invalid email or password.',
        errors: ['Invalid credentials'],
      }).pipe(delay(this.mockLatency));
    }

    return of<ApiResponse<LoginResult>>({
      succeeded: true,
      message: 'Login successful.',
      data: buildMockLoginResult(user),
    }).pipe(delay(this.mockLatency));
  }

  private mockRefresh(request: RefreshTokenRequest): Observable<ApiResponse<LoginResult>> {
    const userId = userIdFromRefreshToken(request.refreshToken);
    const user = userId ? findMockUserById(userId) : undefined;

    if (!user) {
      return of<ApiResponse<LoginResult>>({
        succeeded: false,
        message: 'Invalid or expired refresh token.',
        errors: ['Invalid refresh token'],
      }).pipe(delay(this.mockLatency));
    }

    return of<ApiResponse<LoginResult>>({
      succeeded: true,
      data: buildMockLoginResult(user),
    }).pipe(delay(this.mockLatency));
  }

  private notImplemented<T>(operation: string): Observable<ApiResponse<T>> {
    return throwError(
      () =>
        new Error(
          `AuthApiService.${operation}: real backend not wired yet. ` +
            `Set environment.auth.useMock = true or implement the REAL API block.`
        )
    );
  }
}
