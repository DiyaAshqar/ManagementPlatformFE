import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly SIDEBAR_STATE_KEY = 'sidebar_open';
  
  // Desktop sidebar state
  isOpen = signal<boolean>(true);
  
  // Mobile sidebar state
  isMobileOpen = signal<boolean>(false);

  constructor() {
    this.initializeSidebarState();
  }

  /**
   * Initialize sidebar state from localStorage
   */
  private initializeSidebarState(): void {
    const savedState = localStorage.getItem(this.SIDEBAR_STATE_KEY);
    if (savedState !== null) {
      this.isOpen.set(savedState === 'true');
    }
  }

  /**
   * Toggle sidebar open/close state (desktop)
   */
  toggle(): void {
    const newState = !this.isOpen();
    this.isOpen.set(newState);
    localStorage.setItem(this.SIDEBAR_STATE_KEY, String(newState));
  }

  /**
   * Open sidebar
   */
  open(): void {
    this.isOpen.set(true);
    localStorage.setItem(this.SIDEBAR_STATE_KEY, 'true');
  }

  /**
   * Close sidebar
   */
  close(): void {
    this.isOpen.set(false);
    localStorage.setItem(this.SIDEBAR_STATE_KEY, 'false');
  }

  /**
   * Toggle mobile sidebar
   */
  toggleMobile(): void {
    this.isMobileOpen.set(!this.isMobileOpen());
  }

  /**
   * Open mobile sidebar
   */
  openMobile(): void {
    this.isMobileOpen.set(true);
  }

  /**
   * Close mobile sidebar
   */
  closeMobile(): void {
    this.isMobileOpen.set(false);
  }
}
