import { Injectable } from '@angular/core';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiException,
  AuthClient,
  AuthResponse,
  AuthResponseResponse,
  BooleanResponse,
  ChangePasswordCommand,
  LoginCommand,
  RefreshTokenCommand,
  RegisterCommand,
  UserDto,
} from '../../../../nswag/api-client';
import {
  ApiResponse,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResult,
  RefreshTokenRequest,
  RegisterRequest,
} from '../models/auth.models';
import {
  buildMockLoginResult,
  findMockUser,
  findMockUserById,
  userIdFromRefreshToken,
} from '../mock/mock-auth';
import { JwtService } from './jwt.service';

/**
 * The single seam between the application and the authentication backend.
 *
 * Everything above this service (AuthService, guards, components) is unaware of
 * whether requests are served by the in-memory mock or the real HTTP API. Flip
 * `environment.auth.useMock` to switch.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  /** Simulated network latency for the mock (ms). */
  private readonly mockLatency = 600;

  constructor(
    private readonly authClient: AuthClient,
    private readonly jwt: JwtService
  ) {}

  /** Authenticate with email/username + password. */
  login(request: LoginRequest): Observable<ApiResponse<LoginResult>> {
    if (environment.auth.useMock) {
      return this.mockLogin(request);
    }

    return this.authClient
      .login(new LoginCommand({ email: request.email, password: request.password }))
      .pipe(
        map((response) => this.toLoginApiResponse(response)),
        catchError((error) => this.recoverError<LoginResult>(error))
      );
  }

  /** Create a new account. The backend logs the account in immediately. */
  register(request: RegisterRequest): Observable<ApiResponse<LoginResult>> {
    if (environment.auth.useMock) {
      return this.notImplemented('register');
    }

    return this.authClient
      .register(
        new RegisterCommand({
          email: request.email,
          password: request.password,
          fullName: request.fullName,
          arabicFullName: request.arabicFullName,
          phoneNumber: request.phoneNumber,
        })
      )
      .pipe(
        map((response) => this.toLoginApiResponse(response)),
        catchError((error) => this.recoverError<LoginResult>(error))
      );
  }

  /** Exchange a refresh token for a fresh access token. */
  refreshToken(request: RefreshTokenRequest): Observable<ApiResponse<LoginResult>> {
    if (environment.auth.useMock) {
      return this.mockRefresh(request);
    }

    return this.authClient
      .refreshToken(new RefreshTokenCommand({ refreshToken: request.refreshToken }))
      .pipe(
        map((response) => this.toLoginApiResponse(response)),
        catchError((error) => this.recoverError<LoginResult>(error))
      );
  }

  /** Invalidate the session server-side (best-effort). */
  logout(refreshToken: string | null): Observable<ApiResponse<boolean>> {
    if (environment.auth.useMock) {
      return of<ApiResponse<boolean>>({ succeeded: true, data: true }).pipe(
        delay(this.mockLatency)
      );
    }

    return this.authClient.logout(refreshToken ?? undefined).pipe(
      map((response) => this.toBooleanApiResponse(response)),
      catchError((error) => this.recoverError<boolean>(error))
    );
  }

  /** Change the current user's password. */
  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<boolean>> {
    if (environment.auth.useMock) {
      return this.notImplemented('changePassword');
    }

    return this.authClient
      .changePassword(
        new ChangePasswordCommand({
          currentPassword: request.currentPassword,
          newPassword: request.newPassword,
          confirmNewPassword: request.confirmNewPassword,
        })
      )
      .pipe(
        map((response) => this.toBooleanApiResponse(response)),
        catchError((error) => this.recoverError<boolean>(error))
      );
  }

  /** Fetch the profile of the currently authenticated user. */
  getCurrentUser(): Observable<ApiResponse<AuthUser>> {
    if (environment.auth.useMock) {
      return this.notImplemented('getCurrentUser');
    }

    return this.authClient.getCurrentUser().pipe(
      map((response) => ({
        succeeded: response.succeeded ?? false,
        message: response.message,
        errors: response.errors,
        data: response.data ? this.mapUserDto(response.data) : undefined,
      })),
      catchError((error) => this.recoverError<AuthUser>(error))
    );
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

    // The backend does not yet expose a forgot-password endpoint.
    return this.notImplemented('forgotPassword');
  }

  // ----------------------------------------------------------------------
  // Real-API response mapping
  // ----------------------------------------------------------------------

  /**
   * The backend doesn't fail auth requests with the standard `ApiResponse`
   * envelope — invalid credentials/tokens surface as a non-200 status with an
   * ad-hoc `{ message }` body (NSwag wraps this as `ApiException` with the raw
   * body in `.response`). Recover that message into a normal `succeeded: false`
   * value so it flows through the same path as a real envelope; anything that
   * doesn't look like a known error shape is rethrown for the generic
   * HTTP-error toast to handle.
   */
  private recoverError<T>(error: unknown): Observable<ApiResponse<T>> {
    const message = this.extractErrorMessage(error);
    if (message === null) {
      return throwError(() => error);
    }
    return of<ApiResponse<T>>({ succeeded: false, message });
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!(error instanceof ApiException) || !error.response) {
      return null;
    }
    try {
      const parsed = JSON.parse(error.response);
      return typeof parsed?.message === 'string' ? parsed.message : null;
    } catch {
      return null;
    }
  }

  private toLoginApiResponse(response: AuthResponseResponse): ApiResponse<LoginResult> {
    return {
      succeeded: response.succeeded ?? false,
      message: response.message,
      errors: response.errors,
      data: response.data ? this.mapAuthResponse(response.data) : undefined,
    };
  }

  private toBooleanApiResponse(response: BooleanResponse): ApiResponse<boolean> {
    return {
      succeeded: response.succeeded ?? false,
      message: response.message,
      errors: response.errors,
      data: response.data,
    };
  }

  /** Map the backend's auth payload to the app's backend-agnostic `LoginResult`. */
  private mapAuthResponse(data: AuthResponse): LoginResult {
    const accessToken = data.accessToken ?? '';
    return {
      accessToken,
      refreshToken: data.refreshToken ?? '',
      expiresIn: this.expiresInSeconds(accessToken),
      user: {
        id: data.id?.toString() ?? '',
        userName: data.email ?? '',
        email: data.email ?? '',
        fullName: data.fullName ?? '',
        roles: data.roles ?? [],
        // The backend does not return permissions in the envelope; they are
        // embedded as claims in the access token itself.
        permissions: this.jwt.getPermissions(accessToken),
      },
    };
  }

  private mapUserDto(data: UserDto): AuthUser {
    return {
      id: data.id?.toString() ?? '',
      userName: data.email ?? '',
      email: data.email ?? '',
      fullName: data.fullName ?? '',
      roles: data.roles ?? [],
      permissions: [],
      avatarUrl: data.profileImage,
    };
  }

  /** Seconds remaining until the access token's `exp` claim, derived from the JWT itself. */
  private expiresInSeconds(accessToken: string): number {
    const expiration = this.jwt.getExpiration(accessToken);
    if (!expiration) {
      return 0;
    }
    return Math.max(0, Math.round((expiration.getTime() - Date.now()) / 1000));
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
          `AuthApiService.${operation}: not available while environment.auth.useMock is true ` +
            `(no mock implementation for this operation). Set useMock = false to hit the real API.`
        )
    );
  }
}
