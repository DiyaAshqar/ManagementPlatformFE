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
 * user holds the required permission(s). Reacts automatically to login/logout
 * and token refresh via the AuthService signals.
 *
 * Usage:
 *   <button *appHasPermission="'projects.create'">New project</button>
 *   <button *appHasPermission="[Permissions.Projects.Edit]">Edit</button>
 *   <div *appHasPermission="['a','b']; mode: 'all'">…</div>   // require all
 *
 * `mode` defaults to `'any'` (user needs at least one of the listed permissions).
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  private permissions: string[] = [];
  private mode: 'any' | 'all' = 'any';
  private hasView = false;

  constructor() {
    // Re-evaluate whenever the user's permissions change.
    effect(() => {
      this.auth.permissions();
      this.updateView();
    });
  }

  @Input()
  set appHasPermission(value: string | string[]) {
    this.permissions = this.normalize(value);
    this.updateView();
  }

  @Input()
  set appHasPermissionMode(mode: 'any' | 'all') {
    this.mode = mode;
    this.updateView();
  }

  private updateView(): void {
    const allowed =
      this.mode === 'all'
        ? this.auth.hasAllPermissions(this.permissions)
        : this.auth.hasAnyPermission(this.permissions);

    if (allowed && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private normalize(value: string | string[]): string[] {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }
}
