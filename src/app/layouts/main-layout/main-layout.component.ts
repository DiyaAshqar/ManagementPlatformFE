import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslateModule, ButtonModule],
  template: `
    <div class="main-layout">
      <header class="header">
        <div class="header-content">
          <h1>{{ 'app.title' | translate }}</h1>
          <div class="header-actions">
            <p-button 
              [label]="languageService.getCurrentLanguage() === 'en' ? 'العربية' : 'English'"
              (onClick)="toggleLanguage()"
              [outlined]="true"
              severity="secondary">
            </p-button>
            <p-button 
              [label]="themeService.isDarkTheme() ? '☀️' : '🌙'"
              (onClick)="toggleTheme()"
              [outlined]="true"
              severity="secondary">
            </p-button>
            <p-button 
              label="Logout"
              (onClick)="logout()"
              severity="danger">
            </p-button>
          </div>
        </div>
      </header>

      <main class="main-content">
        <router-outlet />
      </main>

      <footer class="footer">
        <p>&copy; 2025 Construction App. All rights reserved.</p>
      </footer>
    </div>
  `,
  styles: [`
    .main-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      background-color: var(--primary-color);
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
    }

    .main-content {
      flex: 1;
      padding: 2rem;
    }

    .footer {
      background-color: #f8f9fa;
      padding: 1rem 2rem;
      text-align: center;
      border-top: 1px solid #dee2e6;
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  
  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    console.log('Main layout initialized');
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
  }
}
