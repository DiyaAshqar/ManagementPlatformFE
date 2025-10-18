import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonModule],
  template: `
    
  `,
  styles: [`
    
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
