import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

import { ColumnToggle } from '../../models/report-view.model';

/**
 * Column visibility + ordering control. Mandatory columns stay visible and
 * cannot be unchecked. Emits the full ordered list on every change so the
 * parent remains the single source of truth.
 */
@Component({
  selector: 'app-report-column-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    ButtonModule,
    CheckboxModule,
    PopoverModule,
    TooltipModule,
  ],
  template: `
    <p-button
      icon="pi pi-sliders-h"
      severity="secondary"
      [text]="true"
      [rounded]="true"
      [attr.aria-label]="'reporting.columns.title' | translate"
      [pTooltip]="'reporting.columns.title' | translate"
      tooltipPosition="bottom"
      (onClick)="panel.toggle($event)">
    </p-button>

    <p-popover #panel [style]="{ width: '20rem' }">
      <div class="column-selector">
        <div class="column-selector__title">{{ 'reporting.columns.title' | translate }}</div>
        <ul class="column-selector__list" role="group" [attr.aria-label]="'reporting.columns.title' | translate">
          @for (item of working; track item.key; let i = $index) {
            <li class="column-selector__item">
              <p-checkbox
                [binary]="true"
                [ngModel]="item.visible"
                [disabled]="item.mandatory"
                [inputId]="'col-' + item.key"
                (ngModelChange)="toggle(item, $event)">
              </p-checkbox>
              <label class="column-selector__label" [for]="'col-' + item.key">
                {{ item.header }}
                @if (item.mandatory) {
                  <span class="column-selector__badge">{{ 'reporting.columns.required' | translate }}</span>
                }
              </label>
              <span class="column-selector__reorder">
                <button
                  type="button"
                  class="reorder-btn"
                  [disabled]="i === 0"
                  [attr.aria-label]="'reporting.columns.moveUp' | translate"
                  (click)="move(i, -1)">
                  <i class="pi pi-chevron-up" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="reorder-btn"
                  [disabled]="i === working.length - 1"
                  [attr.aria-label]="'reporting.columns.moveDown' | translate"
                  (click)="move(i, 1)">
                  <i class="pi pi-chevron-down" aria-hidden="true"></i>
                </button>
              </span>
            </li>
          }
        </ul>
        <div class="column-selector__actions">
          <p-button
            [label]="'reporting.columns.selectAll' | translate"
            severity="secondary"
            size="small"
            [text]="true"
            (onClick)="selectAll()">
          </p-button>
          <p-button
            [label]="'reporting.columns.reset' | translate"
            severity="secondary"
            size="small"
            [text]="true"
            (onClick)="reset.emit()">
          </p-button>
        </div>
      </div>
    </p-popover>
  `,
  styles: [
    `
      .column-selector__title {
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      .column-selector__list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 18rem;
        overflow-y: auto;
      }
      .column-selector__item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0;
      }
      .column-selector__label {
        flex: 1;
        cursor: pointer;
        font-size: 0.9rem;
      }
      .column-selector__badge {
        font-size: 0.65rem;
        color: var(--text-color-secondary, #64748b);
        margin-inline-start: 0.4rem;
      }
      .column-selector__reorder {
        display: inline-flex;
        gap: 0.15rem;
      }
      .reorder-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-color-secondary, #64748b);
        padding: 0.15rem;
        border-radius: 0.25rem;
      }
      .reorder-btn:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .reorder-btn:hover:not(:disabled) {
        background: var(--surface-hover, #f1f5f9);
      }
      .column-selector__actions {
        display: flex;
        justify-content: space-between;
        margin-top: 0.5rem;
        border-top: 1px solid var(--surface-border, #e2e8f0);
        padding-top: 0.5rem;
      }
    `,
  ],
})
export class ReportColumnSelectorComponent implements OnChanges {
  @Input() items: ColumnToggle[] = [];
  @Output() change = new EventEmitter<ColumnToggle[]>();
  @Output() reset = new EventEmitter<void>();

  working: ColumnToggle[] = [];

  ngOnChanges(): void {
    this.working = this.items.map((item) => ({ ...item }));
  }

  toggle(item: ColumnToggle, visible: boolean): void {
    if (item.mandatory) {
      return;
    }
    item.visible = visible;
    this.emit();
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.working.length) {
      return;
    }
    const next = [...this.working];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    this.working = next;
    this.emit();
  }

  selectAll(): void {
    this.working = this.working.map((item) => ({ ...item, visible: true }));
    this.emit();
  }

  private emit(): void {
    this.change.emit(this.working.map((item) => ({ ...item })));
  }
}
