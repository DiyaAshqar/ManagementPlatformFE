import { Component, computed, inject, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

import { OfficeService } from '../services/office.service';
import { Scope, Stage } from '../models/office.models';
import { fileNames } from '../shared/office-ui';

/** Screen 19 — send the file back to an earlier stage (only targets allowed in the Stages Builder). */
@Component({
  selector: 'app-of-return-stage-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogModule, ButtonModule, TextareaModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [header]="'office.returnStage.title' | translate" [style]="{ width: '600px' }"
      [breakpoints]="{ '640px': '95vw' }" (onShow)="reset()">
      @if (stage(); as st) {
        <p class="of-muted of-small mt-0">{{ 'office.returnStage.current' | translate }}: Phase {{ st.n }} · {{ st.name }}</p>

        <div class="of-field mb-2"><label>{{ 'office.returnStage.target' | translate }}</label></div>
        @if (targets().length) {
          <div class="flex flex-column gap-2 mb-3">
            @for (t of targets(); track t.id) {
              <button type="button" class="of-option" [class.selected]="target() === t.name" (click)="target.set(t.name)">
                <div class="of-option-title">Phase {{ t.n }} · {{ t.name }}</div>
                <div class="of-option-sub">{{ (t.allowRecertify ? 'office.returnStage.opensRecertify' : 'office.returnStage.resubmit') | translate }}</div>
              </button>
            }
          </div>
        } @else {
          <div class="of-note warn mb-3"><i class="pi pi-info-circle"></i><span>{{ 'office.returnStage.noTargets' | translate }}</span></div>
        }

        <div class="of-field mb-2"><label>{{ 'office.returnStage.reason' | translate }} <span class="req">*</span></label></div>
        <div class="of-options mb-3">
          @for (r of reasons; track r) {
            <button type="button" class="of-option" [class.selected]="reason === r" (click)="reason = r">
              <div class="of-option-title" style="font-size: .8rem">{{ 'office.returnReasons.' + r | translate }}</div>
            </button>
          }
        </div>
        <div class="of-field mb-3">
          <label>{{ 'office.returnStage.details' | translate }} <span class="req">*</span></label>
          <textarea pTextarea rows="3" [(ngModel)]="details"></textarea>
        </div>
        <label class="of-dropzone block mb-3">
          <i class="pi pi-paperclip"></i>{{ attachment || ('office.returnStage.attachLetter' | translate) }}
          <input type="file" hidden (change)="attachment = names($event)[0] || ''" />
        </label>
        @if (targetStage()?.allowRecertify) {
          <div class="of-note mb-2"><i class="pi pi-folder-open"></i><span>{{ 'office.returnStage.recertifyNote' | translate }}</span></div>
        }
        <div class="of-note warn"><i class="pi pi-info-circle"></i><span>{{ 'office.returnStage.effectNote' | translate }}</span></div>
      }
      <ng-template pTemplate="footer">
        <div class="of-dialog-footer">
          <p-button [label]="'office.common.cancel' | translate" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
          <p-button [label]="'office.returnStage.confirm' | translate" icon="pi pi-undo" severity="warn"
            [disabled]="!target() || !reason || !details.trim()" [loading]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ReturnStageDialogComponent {
  private readonly office = inject(OfficeService);

  readonly visible = model(false);
  readonly projectId = input.required<string>();
  readonly scope = input<Scope>();
  readonly stage = input<Stage>();

  readonly reasons = ['authorityNotes', 'clientChange', 'missingDocs', 'drawingError', 'other'];
  readonly target = signal<string | null>(null);
  readonly saving = signal(false);
  reason = 'authorityNotes';
  details = '';
  attachment = '';

  readonly targets = computed(() => {
    const st = this.stage();
    const sc = this.scope();
    if (!st || !sc) return [];
    const allowed = st.returnTo.length ? st.returnTo : [];
    return sc.stages.filter((s) => s.n < st.n && allowed.includes(s.name));
  });

  readonly targetStage = computed(() => this.targets().find((t) => t.name === this.target()));

  names(e: Event): string[] {
    return fileNames(e);
  }

  reset(): void {
    this.target.set(this.targets()[0]?.name ?? null);
    this.reason = 'authorityNotes';
    this.details = '';
    this.attachment = '';
  }

  save(): void {
    const st = this.stage();
    const t = this.target();
    if (!st || !t) return;
    this.saving.set(true);
    this.office.returnStage(this.projectId(), st.id, t, this.reason, this.details, this.attachment || undefined).subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded) this.visible.set(false);
    });
  }
}
