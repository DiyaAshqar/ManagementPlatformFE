import { Component, computed, inject, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';

import { OfficeService } from '../services/office.service';
import { Discipline, LicenseFile, Stage } from '../models/office.models';
import { todayIso } from '../services/office-calc';

/**
 * Screen 20 — going back to the Syndicate never opens a new "license item";
 * it opens a file under "re-certification" (#1, #2…).
 */
@Component({
  selector: 'app-of-recertify-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, TextareaModule, CheckboxModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [header]="'office.recertify.title' | translate" [style]="{ width: '620px' }"
      [breakpoints]="{ '640px': '95vw' }" (onShow)="reset()">
      @if (stage(); as st) {
        <p class="of-muted of-small mt-0">Phase {{ st.n }} · {{ st.name }} · {{ projectName() }}</p>
        <div class="of-note mb-3"><i class="pi pi-info-circle"></i><span>{{ 'office.recertify.rule' | translate }}</span></div>

        <div class="of-kv mb-3">
          <div><div class="k">{{ 'office.recertify.original' | translate }}</div><div class="v">{{ 'office.recertify.licenseItem' | translate }} · {{ original()?.number || '—' }}</div></div>
          <div><div class="k">{{ 'office.recertify.newFile' | translate }}</div><div class="v">{{ 'office.recertify.recertifyN' | translate: { n: nextSeq() } }}</div></div>
        </div>

        <div class="of-form-grid mb-3">
          <div class="of-field"><label>{{ 'office.recertify.newNumber' | translate }}</label><input pInputText [(ngModel)]="form.number" /></div>
          <div class="of-field"><label>{{ 'office.recertify.submittedAt' | translate }}</label><input type="date" pInputText [(ngModel)]="form.submittedAt" /></div>
        </div>

        <div class="of-field mb-2"><label>{{ 'office.recertify.source' | translate }} <span class="req">*</span></label></div>
        <div class="of-options mb-3">
          @for (s of sources; track s) {
            <button type="button" class="of-option" [class.selected]="form.source === s" (click)="form.source = s">
              <div class="of-option-title" style="font-size: .8rem">{{ 'office.recertifySources.' + s | translate }}</div>
            </button>
          }
        </div>

        <div class="of-field mb-2"><label>{{ 'office.recertify.drawings' | translate }}</label></div>
        <div class="flex flex-wrap gap-3 mb-3">
          @for (d of disciplines; track d) {
            <label class="flex gap-2 align-items-center of-small"><p-checkbox [binary]="true" [ngModel]="has(d)" (ngModelChange)="toggle(d)" />{{ 'office.disciplines.' + d | translate }}</label>
          }
        </div>

        <div class="of-form-grid mb-2">
          <div class="of-field"><label>{{ 'office.recertify.fees' | translate }}</label><p-inputnumber [(ngModel)]="form.fees" [min]="0" inputStyleClass="w-full" /></div>
        </div>
        <p class="of-small of-muted mt-0">{{ 'office.recertify.feesHint' | translate }}</p>
        <div class="of-field"><label>{{ 'office.common.notes' | translate }}</label><textarea pTextarea rows="2" [(ngModel)]="form.notes"></textarea></div>
      }
      <ng-template pTemplate="footer">
        <div class="of-dialog-footer">
          <p-button [label]="'office.common.cancel' | translate" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
          <p-button [label]="'office.recertify.open' | translate" icon="pi pi-folder-open" [disabled]="!form.source" [loading]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class RecertifyDialogComponent {
  private readonly office = inject(OfficeService);

  readonly visible = model(false);
  readonly projectId = input.required<string>();
  readonly stage = input<Stage>();

  readonly sources: NonNullable<LicenseFile['source']>[] = ['civilDefense', 'municipality', 'clientChange', 'syndicateNotes'];
  readonly disciplines: Discipline[] = ['architectural', 'structural', 'electrical', 'mechanical'];
  readonly saving = signal(false);

  form: Omit<LicenseFile, 'id' | 'kind' | 'seq' | 'open'> = this.blank();

  readonly original = computed(() => this.stage()?.licenseFiles.find((f) => f.kind === 'original'));
  readonly nextSeq = computed(() => (this.stage()?.licenseFiles.filter((f) => f.kind === 'recertify').length ?? 0) + 1);
  readonly projectName = computed(() => this.office.project(this.projectId())?.name ?? '');

  has(d: Discipline): boolean {
    return this.form.drawings?.includes(d) ?? false;
  }

  toggle(d: Discipline): void {
    const list = this.form.drawings ?? [];
    this.form.drawings = list.includes(d) ? list.filter((x) => x !== d) : [...list, d];
  }

  reset(): void {
    this.form = this.blank();
  }

  save(): void {
    const st = this.stage();
    if (!st) return;
    this.saving.set(true);
    this.office.openRecertify(this.projectId(), st.id, this.form).subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded) this.visible.set(false);
    });
  }

  private blank(): Omit<LicenseFile, 'id' | 'kind' | 'seq' | 'open'> {
    return { number: '', submittedAt: todayIso(), source: 'civilDefense', drawings: ['architectural'], fees: 0, notes: '' };
  }
}
