import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { LoadingService } from './shared/services/loading.service';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    TranslateModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'construction';

  constructor(
    private translateService: TranslateService,
    private languageService: LanguageService,
    public loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Initialize translations
    this.translateService.setDefaultLang('en');
    
    // Set initial language from service
    const currentLang = this.languageService.getCurrentLanguage();
    this.translateService.use(currentLang);
  }
}
