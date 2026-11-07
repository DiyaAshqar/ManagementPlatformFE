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

import { OfficeService } from '../services/office.service';
import { addDays, round2, todayIso } from '../services/office-calc';
import { JodPipe } from '../shared/office-ui';
import { ManualClaimType, Stage } from '../models/office.models';

/**
 * Screen 21 — create a claim: either the payment the contract schedule ties to
 * this stage, or an extra claim (addendum, change order, billable fees).
 */
@Component({
  selector: 'app-of-create-claim-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, CheckboxModule, SelectModule, JodPipe],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [header]="'office.createClaim.title' | translate" [style]="{ width: '640px' }"
      [breakpoints]="{ '640px': '95vw' }" (onShow)="reset()">
      @if (!projectId()) {
        <div class="of-field mb-3">
          <label>{{ 'office.projects.project' | translate }} <span class="req">*</span></label>
          <p-select [options]="projects()" optionLabel="label" optionValue="value" [filter]="true" [(ngModel)]="pickedProject" styleClass="w-full" appendTo="body" />
        </div>
      } @else {
        <p class="of-muted of-small mt-0">
          @if (stage(); as st) { Phase {{ st.n }} · {{ st.name }} · }{{ projectLabel() }}
        </p>
      }

      @if (scheduled()) {
        <div class="of-options mb-3">
          <button type="button" class="of-option" [class.selected]="mode() === 'sched'" (click)="mode.set('sched')">
            <div class="of-option-title">{{ 'office.createClaim.fromSchedule' | translate }}</div>
            <div class="of-option-sub">{{ 'office.createClaim.fromScheduleSub' | translate }}</div>
          </button>
          <button type="button" class="of-option" [class.selected]="mode() === 'manual'" (click)="mode.set('manual')">
            <div class="of-option-title">{{ 'office.createClaim.extra' | translate }}</div>
            <div class="of-option-sub">{{ 'office.createClaim.extraSub' | translate }}</div>
          </button>
        </div>
      }

      @if (mode() === 'sched' && scheduled(); as c) {
        <div class="of-card mb-3" style="background: var(--surface-ground)">
          <div class="of-rows">
            <div class="row"><span>{{ 'office.claim.payment' | translate }}</span><span class="of-strong">{{ c.claim.paymentName }} · {{ c.claim.pct }}%</span></div>
            <div class="row"><span>{{ 'office.claim.condition' | translate }}</span><span>{{ c.claim.condition }}</span></div>
            <div class="row"><span>{{ 'office.createClaim.calc' | translate }}</span>
              <span class="of-num">{{ contractValue() | jod: 0 : true }} × {{ c.claim.pct }}% = {{ c.claim.baseAmount | jod }}</span></div>
          </div>
        </div>
        <div class="of-form-grid mb-3">
          <div class="of-field"><label>{{ 'office.createClaim.areaAdjustment' | translate }}</label>
            <p-inputnumber [(ngModel)]="adjustment" inputStyleClass="w-full" [placeholder]="'0'" /></div>
          <div class="of-field"><label>{{ 'office.claim.dueDate' | translate }}</label><input type="date" pInputText [(ngModel)]="dueDate" /></div>
        </div>
      } @else {
        <div class="of-form-grid mb-3">
          <div class="of-field span-all">
            <label>{{ 'office.createClaim.type' | translate }}</label>
            <div class="of-options">
              @for (t of manualTypes; track t) {
                <button type="button" class="of-option" [class.selected]="manualType === t" (click)="manualType = t">
                  <div class="of-option-title">{{ 'office.manualTypes.' + t | translate }}</div>
                </button>
              }
            </div>
          </div>
          <div class="of-field span-all"><label>{{ 'office.common.description' | translate }} <span class="req">*</span></label><input pInputText [(ngModel)]="description" /></div>
          <div class="of-field"><label>{{ 'office.common.amount' | translate }} <span class="req">*</span></label><p-inputnumber [(ngModel)]="amount" [min]="0" inputStyleClass="w-full" /></div>
          <div class="of-field"><label>{{ 'office.claim.dueDate' | translate }}</label><input type="date" pInputText [(ngModel)]="dueDate" /></div>
        </div>
      }

      <div class="of-total-box mb-3">
        <span>{{ 'office.claim.value' | translate }}</span><span class="amount of-num">{{ total() | jod }}</span>
      </div>
      <div class="flex flex-column gap-2">
        @if (stage()) {
          <label class="flex gap-2 align-items-center of-small"><p-checkbox [binary]="true" [(ngModel)]="attachDrawings" />{{ 'office.createClaim.attachDrawings' | translate }}</label>
        }
        <label class="flex gap-2 align-items-center of-small"><p-checkbox [binary]="true" [(ngModel)]="send" />{{ 'office.createClaim.sendNow' | translate }}</label>
      </div>

      <ng-template pTemplate="footer">
        <div class="of-dialog-footer">
          <p-button [label]="'office.common.cancel' | translate" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
          <p-button [label]="'office.createClaim.create' | translate" icon="pi pi-check" [disabled]="!canSave()" [loading]="saving()" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class CreateClaimDialogComponent {
  private readonly office = inject(OfficeService);

  readonly visible = model(false);
  readonly projectId = input<string | undefined>();
  readonly stage = input<Stage | undefined>();
  readonly created = output<string>();

  readonly manualTypes: ManualClaimType[] = ['billableFees', 'changeOrder', 'addendum'];
  readonly mode = signal<'sched' | 'manual'>('sched');
  readonly saving = signal(false);

  pickedProject: string | null = null;
  adjustment = 0;
  dueDate = addDays(todayIso(), 14);
  manualType: ManualClaimType = 'billableFees';
  description = '';
  amount = 0;
  attachDrawings = true;
  send = false;

  readonly projects = computed(() => this.office.projectSummaries().map((s) => ({ label: `${s.project.code} · ${s.project.name}`, value: s.project.id })));

  readonly effectiveProject = computed(() => this.projectId());

  /** The not-yet-issued scheduled claim tied to this stage, if any. */
  readonly scheduled = computed(() => {
    const st = this.stage();
    const pid = this.projectId();
    if (!st || !pid) return undefined;
    return this.office.claimsForProject(pid).find((c) => c.claim.stageId === st.id && c.claim.status === 'scheduled');
  });

  readonly contractValue = computed(() => this.office.projectSummary(this.projectId())?.contractValue ?? 0);

  projectLabel(): string {
    const p = this.office.project(this.projectId());
    return p ? `${p.code} · ${this.office.clientName(p.clientId)}` : '';
  }

  total(): number {
    const c = this.scheduled();
    if (this.mode() === 'sched' && c) return round2(c.claim.baseAmount + (Number(this.adjustment) || 0));
    return Number(this.amount) || 0;
  }

  canSave(): boolean {
    if (!this.projectId() && !this.pickedProject) return false;
    if (this.mode() === 'sched' && this.scheduled()) return !!this.dueDate;
    return !!this.description.trim() && this.amount > 0;
  }

  reset(): void {
    this.mode.set(this.scheduled() ? 'sched' : 'manual');
    this.pickedProject = null;
    this.adjustment = 0;
    this.dueDate = addDays(todayIso(), 14);
    this.manualType = 'billableFees';
    this.description = '';
    this.amount = 0;
    this.attachDrawings = !!this.stage();
    this.send = false;
  }

  save(): void {
    this.saving.set(true);
    const c = this.scheduled();
    const req$ = this.mode() === 'sched' && c
      ? this.office.issueScheduledClaim(c.claim.id, { adjustment: Number(this.adjustment) || 0, dueDate: this.dueDate, attachDrawings: this.attachDrawings, send: this.send })
      : this.office.createManualClaim({
          projectId: (this.projectId() ?? this.pickedProject)!, stageId: this.stage()?.id, manualType: this.manualType,
          description: this.description, amount: this.amount, dueDate: this.dueDate, attachDrawings: this.attachDrawings, send: this.send,
        });
    req$.subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded && res.data) {
        this.visible.set(false);
        this.created.emit(res.data.id);
      }
    });
  }
}
