import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingCountSignal = signal<number>(0);
  isLoading = signal<boolean>(false);

  /**
   * Show loading indicator
   */
  show(): void {
    this.loadingCountSignal.update(count => count + 1);
    this.isLoading.set(true);
  }

  /**
   * Hide loading indicator
   */
  hide(): void {
    this.loadingCountSignal.update(count => Math.max(0, count - 1));
    
    if (this.loadingCountSignal() === 0) {
      this.isLoading.set(false);
    }
  }

  /**
   * Reset loading state
   */
  reset(): void {
    this.loadingCountSignal.set(0);
    this.isLoading.set(false);
  }
}
