import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ComputedSummary } from '../../models/report-summary.model';
import { SummaryScope } from '../../models/report-view.model';

/**
 * Displays computed summaries (KPIs) as a responsive row of cards. Purely
 * presentational — values are already formatted upstream.
 */
@Component({
  selector: 'app-report-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  template: `
    @if (summaries.length > 0) {
      <section class="report-summary" [attr.aria-label]="'reporting.summary.title' | translate">
        @if (scope) {
          <div class="report-summary__scope">{{ scopeLabelKey | translate }}</div>
        }
        <div class="report-summary__cards">
          @for (item of summaries; track item.key) {
            <article class="summary-card">
              <div class="summary-card__head">
                @if (item.icon) {
                  <i class="summary-card__icon" [class]="item.icon" aria-hidden="true"></i>
                }
                <span class="summary-card__label">{{ item.labelKey ? (item.labelKey | translate) : item.label }}</span>
              </div>
              <div class="summary-card__value">{{ item.display }}</div>
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .report-summary {
        margin-bottom: 1rem;
      }
      .report-summary__scope {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-color-secondary, #64748b);
        margin-bottom: 0.4rem;
      }
      .report-summary__cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
      }
      .summary-card {
        border: 1px solid var(--surface-border, #e2e8f0);
        border-radius: 0.6rem;
        padding: 0.75rem 0.9rem;
        background: var(--surface-card, #fff);
      }
      .summary-card__head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--text-color-secondary, #64748b);
      }
      .summary-card__icon {
        font-size: 1rem;
        color: var(--primary-color, #2563eb);
      }
      .summary-card__label {
        font-size: 0.8rem;
        font-weight: 600;
      }
      .summary-card__value {
        margin-top: 0.35rem;
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--text-color, #0f172a);
      }
    `,
  ],
})
export class ReportSummaryComponent {
  @Input() summaries: ComputedSummary[] = [];
  @Input() scope: SummaryScope | null = null;

  get scopeLabelKey(): string {
    switch (this.scope) {
      case 'page':
        return 'reporting.summary.scopePage';
      case 'all':
        return 'reporting.summary.scopeAll';
      case 'filtered':
      default:
        return 'reporting.summary.scopeFiltered';
    }
  }
}
