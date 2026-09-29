import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
} from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Structural directive that renders its host element only when the current
 * user has at least one of the required role(s). Reacts to auth changes.
 *
 * Usage:
 *   <a *appHasRole="'Admin'">Admin panel</a>
 *   <a *appHasRole="['Admin', 'ProjectManager']">…</a>
 */
@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private roles: string[] = [];
  private hasView = false;

  constructor() {
    effect(() => {
      this.auth.roles();
      this.updateView();
    });
  }

  @Input()
  set appHasRole(value: string | string[]) {
    this.roles = value ? (Array.isArray(value) ? value : [value]) : [];
    this.updateView();
  }

  private updateView(): void {
    const allowed = this.auth.hasAnyRole(this.roles);

    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
