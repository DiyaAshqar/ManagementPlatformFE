import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { environment } from '../../../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);

  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  constructor(
    private storageService: StorageService,
    private router: Router
  ) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from storage
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.storageService.getItem<User>(environment.auth.userStorageKey);

    if (token && user) {
      this.currentUserSignal.set(user);
      this.isAuthenticatedSignal.set(true);
    }
  }

  /**
   * Login user with tokens
   */
  login(tokens: AuthTokens, user: User): void {
    this.setToken(tokens.accessToken);
    
    if (tokens.refreshToken) {
      this.setRefreshToken(tokens.refreshToken);
    }

    this.storageService.setItem(environment.auth.userStorageKey, user);
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
  }

  /**
   * Logout user
   */
  logout(): void {
    this.storageService.removeItem(environment.auth.tokenStorageKey);
    this.storageService.removeItem(environment.auth.refreshTokenStorageKey);
    this.storageService.removeItem(environment.auth.userStorageKey);
    
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
    
    this.router.navigate(['/auth/login']);
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    return this.storageService.getItem<string>(environment.auth.tokenStorageKey);
  }

  /**
   * Set access token
   */
  setToken(token: string): void {
    this.storageService.setItem(environment.auth.tokenStorageKey, token);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.storageService.getItem<string>(environment.auth.refreshTokenStorageKey);
  }

  /**
   * Set refresh token
   */
  setRefreshToken(token: string): void {
    this.storageService.setItem(environment.auth.refreshTokenStorageKey, token);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    return user?.role === role;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.currentUserSignal();
    return user?.permissions?.includes(permission) ?? false;
  }

  /**
   * Update current user
   */
  updateUser(user: User): void {
    this.storageService.setItem(environment.auth.userStorageKey, user);
    this.currentUserSignal.set(user);
  }
}
