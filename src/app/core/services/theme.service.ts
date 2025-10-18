import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app_theme';
  private readonly DEFAULT_THEME: Theme = 'light';

  currentTheme = signal<Theme>(this.DEFAULT_THEME);

  constructor() {
    this.initializeTheme();
    
    // Effect to update theme when signal changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  /**
   * Initialize theme from storage or system preference
   */
  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      this.currentTheme.set(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.currentTheme.set('dark');
    }
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    
    if (theme === 'dark') {
      htmlElement.classList.add('dark-theme');
      htmlElement.classList.remove('light-theme');
    } else {
      htmlElement.classList.add('light-theme');
      htmlElement.classList.remove('dark-theme');
    }

    localStorage.setItem(this.THEME_KEY, theme);
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Set specific theme
   */
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme {
    return this.currentTheme();
  }

  /**
   * Check if dark theme is active
   */
  isDarkTheme(): boolean {
    return this.currentTheme() === 'dark';
  }
}
