import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';

import { AddScopeForm, OfficeService } from '../services/office.service';
import { Project } from '../models/office.models';
import { todayIso } from '../services/office-calc';

/** Screen 12 — add a scope to a project from a stage template (stages can be switched off for this project only). */
@Component({
  selector: 'app-of-add-scope-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, CheckboxModule, SelectModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [header]="'office.scope.addTitle' | translate" [style]="{ width: '860px' }"
      [breakpoints]="{ '960px': '95vw' }" (onShow)="reset()">
      @if (project(); as p) {
        <p class="of-muted of-small mt-0">{{ p.code }} · {{ p.name }}</p>

        <div class="of-field mb-2"><label><span class="of-section-no mr-2">1</span>{{ 'office.scope.pickTemplate' | translate }}</label></div>
        <div class="of-options mb-4">
          @for (t of templates(); track t.id) {
            <button type="button" class="of-option" [class.selected]="templateId() === t.id" (click)="pick(t.id)">
              <div class="of-option-title">{{ t.name }}</div>
              <div class="of-option-sub">{{ 'office.templates.stagesCount' | translate: { n: t.stages.length } }}</div>
            </button>
          }
          <button type="button" class="of-option" [class.selected]="templateId() === null" (click)="pick(null)">
            <div class="of-option-title">{{ 'office.scope.empty' | translate }}</div>
            <div class="of-option-sub">{{ 'office.scope.emptySub' | translate }}</div>
          </button>
        </div>

        <div class="grid">
          <div class="col-12 md:col-7">
            <div class="of-field mb-2">
              <label><span class="of-section-no mr-2">2</span>{{ 'office.scope.stagesOf' | translate: { n: included().length, total: stages().length } }}</label>
              <span class="of-hint">{{ 'office.scope.projectOnlyHint' | translate }}</span>
            </div>
            <div class="flex flex-column gap-2" style="max-height: 320px; overflow-y: auto">
              @for (s of stages(); track $index; let i = $index) {
                <label class="of-option flex align-items-center gap-2" [style.opacity]="off()[i] ? 0.55 : 1">
                  <p-checkbox [binary]="true" [ngModel]="!off()[i]" (ngModelChange)="toggle(i)" />
                  <span class="of-small of-muted" style="width: 1.5rem">{{ i + 1 }}</span>
                  <span class="flex-1 of-strong" style="font-size: .85rem">{{ s.name }}</span>
                  <span class="of-small of-muted">{{ 'office.stageTypes.' + s.type | translate }}</span>
                </label>
              } @empty {
                <div class="of-empty">{{ 'office.scope.emptyHint' | translate }}</div>
              }
            </div>
            <div class="flex gap-2 mt-2">
              <input pInputText class="flex-1" [(ngModel)]="extraStage" [placeholder]="'office.scope.extraStagePh' | translate" (keydown.enter)="addExtra()" />
              <p-button icon="pi pi-plus" [label]="'office.scope.addStage' | translate" [outlined]="true" (onClick)="addExtra()" [disabled]="!extraStage.trim()" />
            </div>
          </div>
          <div class="col-12 md:col-5">
            <div class="of-field mb-2"><label><span class="of-section-no mr-2">3</span>{{ 'office.scope.data' | translate }}</label></div>
            <div class="flex flex-column gap-3">
              <div class="of-field"><label>{{ 'office.scope.name' | translate }}</label><input pInputText [(ngModel)]="form.name" /></div>
              <div class="of-field"><label>{{ 'office.scope.engineer' | translate }}</label><input pInputText [(ngModel)]="form.engineer" /></div>
              <div class="of-field"><label>{{ 'office.scope.value' | translate }}</label><p-inputnumber [(ngModel)]="form.value" [min]="0" inputStyleClass="w-full" /></div>
              <div class="of-field"><label>{{ 'office.project.startDate' | translate }}</label><input type="date" pInputText [(ngModel)]="form.startDate" /></div>
              <label class="flex gap-2 align-items-start of-small">
                <p-checkbox [binary]="true" [(ngModel)]="form.addendum" />
                <span>{{ 'office.scope.addendum' | translate }}</span>
              </label>
              @if (p.contractApproved) {
                <div class="of-note warn"><i class="pi pi-exclamation-triangle"></i><span>{{ 'office.scope.afterApprovalWarn' | translate }}</span></div>
              }
            </div>
          </div>
        </div>
      }
      <ng-template pTemplate="footer">
        <div class="flex justify-content-between align-items-center w-full flex-wrap gap-2">
          <span class="of-small of-muted">{{ 'office.scope.willAdd' | translate: { n: included().length } }}</span>
          <div class="of-dialog-footer">
            <p-button [label]="'office.common.cancel' | translate" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
            <p-button [label]="'office.scope.add' | translate" icon="pi pi-check" [disabled]="!form.name.trim()" [loading]="saving()" (onClick)="save()" />
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class AddScopeDialogComponent {
  private readonly office = inject(OfficeService);

  readonly visible = model(false);
  readonly project = input<Project>();
  readonly added = output<string>();

  readonly templates = this.office.templates;
  readonly templateId = signal<string | null>('tpl-arch');
  readonly off = signal<Record<number, boolean>>({});
  readonly extras = signal<{ name: string; type: 'design' }[]>([]);
  readonly saving = signal(false);

  extraStage = '';
  form: AddScopeForm = this.blank();

  readonly stages = computed(() => [
    ...(this.office.template(this.templateId())?.stages ?? []).map((s) => ({ name: s.name, type: s.type })),
    ...this.extras(),
  ]);
  readonly included = computed(() => this.stages().filter((_, i) => !this.off()[i]));

  reset(): void {
    this.pick(this.templates()[0]?.id ?? null);
  }

  pick(id: string | null): void {
    this.templateId.set(id);
    this.off.set({});
    this.extras.set([]);
    const t = this.office.template(id);
    this.form = { ...this.blank(), templateId: id, name: t?.scopeName ?? '' };
  }

  toggle(i: number): void {
    this.off.update((o) => ({ ...o, [i]: !o[i] }));
  }

  addExtra(): void {
    const name = this.extraStage.trim();
    if (!name) return;
    this.extras.update((e) => [...e, { name, type: 'design' }]);
    this.extraStage = '';
  }

  save(): void {
    const p = this.project();
    if (!p) return;
    this.saving.set(true);
    this.office.addScope(p.id, { ...this.form, stageNames: this.included().map((s) => s.name) }).subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded && res.data) {
        this.visible.set(false);
        this.added.emit(res.data.id);
      }
    });
  }

  private blank(): AddScopeForm {
    return {
      templateId: null, name: '', engineer: this.project()?.manager ?? this.office.settings().currentUser,
      value: 0, startDate: todayIso(), stageNames: [], addendum: true,
    };
  }
}
