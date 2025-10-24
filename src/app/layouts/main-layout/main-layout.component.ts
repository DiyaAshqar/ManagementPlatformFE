import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { TopNavComponent } from '../../shared/components/top-nav/top-nav.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    TranslateModule,
    SidebarComponent,
    TopNavComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    public themeService: ThemeService,
    public sidebarService: SidebarService
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
