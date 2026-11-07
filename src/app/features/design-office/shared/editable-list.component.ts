import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

/** Numbered list of editable text items (contract clauses, obligations…). */
@Component({
  selector: 'app-of-editable-list',
  standalone: true,
  imports: [FormsModule, TranslateModule, ButtonModule, TextareaModule],
  template: `
    <div class="of-editable-list">
      @for (item of items(); track $index; let i = $index) {
        <div class="item">
          <span class="idx">{{ i + 1 }}</span>
          <textarea pTextarea class="grow w-full" rows="1" [autoResize]="true" [disabled]="disabled()"
            [ngModel]="item" (ngModelChange)="update(i, $event)"></textarea>
          @if (!disabled()) {
            <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" size="small" (onClick)="remove(i)" />
          }
        </div>
      }
      @if (!disabled()) {
        <div>
          <p-button [label]="addLabel() | translate" icon="pi pi-plus" [text]="true" size="small" (onClick)="add()" />
        </div>
      }
    </div>
  `,
})
export class EditableListComponent {
  readonly items = model<string[]>([]);
  readonly addLabel = input('office.common.addItem');
  readonly disabled = input(false);

  update(i: number, value: string): void {
    const next = [...this.items()];
    next[i] = value;
    this.items.set(next);
  }

  remove(i: number): void {
    this.items.set(this.items().filter((_, idx) => idx !== i));
  }

  add(): void {
    this.items.set([...this.items(), '']);
  }
}
