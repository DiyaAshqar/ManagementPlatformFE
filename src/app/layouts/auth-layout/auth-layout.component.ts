import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-layout">
      <div class="auth-backdrop">
        <span class="auth-orb auth-orb-1"></span>
        <span class="auth-orb auth-orb-2"></span>
        <span class="auth-orb auth-orb-3"></span>
        <span class="auth-grid"></span>
      </div>
      <div class="auth-container">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .auth-layout {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: linear-gradient(160deg, #001a4d 0%, #0052cc 45%, #0a84ff 100%);
    }

    .auth-backdrop {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .auth-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(circle at 50% 40%, rgba(0, 0, 0, 0.7), transparent 75%);
    }

    .auth-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.55;
    }

    .auth-orb-1 {
      width: 32rem;
      height: 32rem;
      top: -10rem;
      left: -8rem;
      background: radial-gradient(circle, #4f9dff 0%, transparent 70%);
    }

    .auth-orb-2 {
      width: 26rem;
      height: 26rem;
      bottom: -10rem;
      right: -6rem;
      background: radial-gradient(circle, #7ee0ff 0%, transparent 70%);
    }

    .auth-orb-3 {
      width: 18rem;
      height: 18rem;
      bottom: 8%;
      left: 8%;
      background: radial-gradient(circle, #ffffff 0%, transparent 70%);
      opacity: 0.12;
    }

    .auth-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
      padding: 1.5rem;
    }

    @media (max-width: 480px) {
      .auth-container {
        padding: 1rem;
        max-width: 100%;
      }
    }
  `]
})
export class AuthLayoutComponent {}
