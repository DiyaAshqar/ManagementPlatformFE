import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    CheckboxModule
  ],
  template: `
    <div class="login-card">
      <p-card>
        <div class="text-center mb-4">
          <h2>{{ 'app.title' | translate }}</h2>
          <p class="text-secondary">{{ 'auth.login' | translate }}</p>
        </div>
        
        <form (ngSubmit)="onLogin()">
          <div class="field">
            <label for="email">{{ 'auth.email' | translate }}</label>
            <input 
              pInputText 
              id="email" 
              [(ngModel)]="credentials.email" 
              name="email"
              type="email"
              class="w-full"
              placeholder="Enter your email" />
          </div>
          
          <div class="field">
            <label for="password">{{ 'auth.password' | translate }}</label>
            <p-password 
              [(ngModel)]="credentials.password" 
              name="password"
              [toggleMask]="true"
              [feedback]="false"
              placeholder="Enter your password"
              styleClass="w-full"
              [inputStyleClass]="'w-full'">
            </p-password>
          </div>

          <div class="field-checkbox mb-4">
            <p-checkbox 
              [(ngModel)]="rememberMe" 
              name="rememberMe"
              [binary]="true"
              inputId="rememberMe">
            </p-checkbox>
            <label for="rememberMe" class="ml-2">{{ 'auth.rememberMe' | translate }}</label>
          </div>

          <p-button 
            type="submit" 
            [label]="'auth.login' | translate"
            styleClass="w-full"
            size="large">
          </p-button>

          <div class="text-center mt-3">
            <a href="#" class="text-sm">{{ 'auth.forgotPassword' | translate }}</a>
          </div>
        </form>
      </p-card>
    </div>
  `,
  styles: [`
    .login-card {
      width: 100%;
    }

    .field {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--text-color);
    }

    .text-secondary {
      color: var(--text-secondary);
    }

    h2 {
      color: var(--primary-color);
      margin: 0;
    }

    .field-checkbox {
      display: flex;
      align-items: center;
    }
  `]
})
export class LoginComponent {
  credentials = {
    email: 'admin@construction.com',
    password: 'password123'
  };
  rememberMe = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    // Mock login for testing
    const mockTokens = {
      accessToken: 'mock-token-12345'
    };

    const mockUser = {
      id: '1',
      email: this.credentials.email,
      name: 'Test User',
      role: 'admin'
    };

    this.authService.login(mockTokens, mockUser);
    this.router.navigate(['/dashboard']);
  }
}
