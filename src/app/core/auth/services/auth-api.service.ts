import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

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
import { JwtService } from './jwt.service';

/**
 * The application's authentication gateway to the generated backend client.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(
    private readonly authClient: AuthClient,
    private readonly jwt: JwtService
  ) {}

  /** Authenticate with email/username + password. */
  login(request: LoginRequest): Observable<ApiResponse<LoginResult>> {
    return this.authClient
      // The generated backend contract names this identifier `email`, but it
      // accepts the user's email address or regular username in that field.
      .login(new LoginCommand({ email: request.username, password: request.password }))
      .pipe(
        map((response) => this.toLoginApiResponse(response)),
        catchError((error) => this.recoverError<LoginResult>(error))
      );
  }

  /** Create a new account. The backend logs the account in immediately. */
  register(request: RegisterRequest): Observable<ApiResponse<LoginResult>> {
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
    return this.authClient
      .refreshToken(new RefreshTokenCommand({ refreshToken: request.refreshToken }))
      .pipe(
        map((response) => this.toLoginApiResponse(response)),
        catchError((error) => this.recoverError<LoginResult>(error))
      );
  }

  /** Invalidate the session server-side (best-effort). */
  logout(refreshToken: string | null): Observable<ApiResponse<boolean>> {
    return this.authClient.logout(refreshToken ?? undefined).pipe(
      map((response) => this.toBooleanApiResponse(response)),
      catchError((error) => this.recoverError<boolean>(error))
    );
  }

  /** Change the current user's password. */
  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<boolean>> {
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
    // The backend does not yet expose a forgot-password endpoint.
    return throwError(
      () => new Error(`AuthApiService.forgotPassword is not supported by the backend (${email}).`)
    );
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
    const user: AuthUser = {
      id: data.id?.toString() ?? '',
      userName: data.email ?? '',
      email: data.email ?? '',
      fullName: data.fullName ?? '',
      roles: data.roles ?? [],
      // The backend does not return permissions in the envelope; they are
      // embedded as claims in the access token itself.
      permissions: this.jwt.getPermissions(accessToken),
      featurePermissions: this.jwt.getFeaturePermissions(accessToken),
    };
    // eslint-disable-next-line no-console
    console.log('[AuthDebug] AuthApiService.mapAuthResponse', {
      backendResponseRoles: data.roles,
      jwtRoleClaim: this.jwt.getRoles(accessToken),
      mappedUser: user,
    });
    return {
      accessToken,
      refreshToken: data.refreshToken ?? '',
      expiresIn: this.expiresInSeconds(accessToken),
      user,
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
      featurePermissions: {},
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

}
