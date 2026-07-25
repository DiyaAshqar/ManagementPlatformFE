import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

/**
 * Accessible empty / error placeholder for the report body. Announces state
 * changes to screen readers and offers a retry action on error.
 */
@Component({
  selector: 'app-report-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, TranslateModule, ButtonModule],
  template: `
    <div class="report-empty" role="status" aria-live="polite">
      <i class="report-empty__icon" [ngClass]="isError ? 'pi pi-exclamation-triangle' : icon" aria-hidden="true"></i>
      <p class="report-empty__message">{{ message | translate }}</p>
      @if (isError) {
        <p-button
          [label]="'reporting.actions.retry' | translate"
          icon="pi pi-refresh"
          severity="secondary"
          (onClick)="retry.emit()">
        </p-button>
      }
    </div>
  `,
  styles: [
    `
      .report-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 3rem 1rem;
        text-align: center;
        color: var(--text-color-secondary, #64748b);
      }
      .report-empty__icon {
        font-size: 2.75rem;
        opacity: 0.7;
      }
      .report-empty__message {
        margin: 0;
        font-size: 0.95rem;
      }
    `,
  ],
})
export class ReportEmptyStateComponent {
  @Input() message = 'reporting.empty.noData';
  @Input() icon = 'pi pi-inbox';
  @Input() isError = false;
  @Output() retry = new EventEmitter<void>();
}
