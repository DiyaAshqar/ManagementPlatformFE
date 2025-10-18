import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANGUAGE_KEY = 'app_language';
  private readonly DEFAULT_LANGUAGE = 'en';
  private readonly SUPPORTED_LANGUAGES = ['en', 'ar'];

  currentLanguage = signal<string>(this.DEFAULT_LANGUAGE);
  isRTL = signal<boolean>(false);

  constructor(private translate: TranslateService) {
    this.initializeLanguage();
  }

  /**
   * Initialize language from storage or default
   */
  private initializeLanguage(): void {
    const savedLanguage = localStorage.getItem(this.LANGUAGE_KEY);
    const browserLang = this.translate.getBrowserLang();
    
    let initialLang = savedLanguage || browserLang || this.DEFAULT_LANGUAGE;
    
    // Ensure the language is supported
    if (!this.SUPPORTED_LANGUAGES.includes(initialLang)) {
      initialLang = this.DEFAULT_LANGUAGE;
    }

    this.setLanguage(initialLang);
  }

  /**
   * Set the application language
   */
  setLanguage(lang: string): void {
    if (!this.SUPPORTED_LANGUAGES.includes(lang)) {
      console.warn(`Language ${lang} not supported. Falling back to ${this.DEFAULT_LANGUAGE}`);
      lang = this.DEFAULT_LANGUAGE;
    }

    this.translate.use(lang);
    this.currentLanguage.set(lang);
    this.isRTL.set(lang === 'ar');
    
    localStorage.setItem(this.LANGUAGE_KEY, lang);
    
    // Update document direction
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  /**
   * Toggle between languages
   */
  toggleLanguage(): void {
    const currentLang = this.currentLanguage();
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    this.setLanguage(newLang);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage();
  }

  /**
   * Check if current language is RTL
   */
  isRightToLeft(): boolean {
    return this.isRTL();
  }

  /**
   * Get translation for a key
   */
  translateKey(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }
}
