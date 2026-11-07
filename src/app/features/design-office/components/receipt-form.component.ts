import { Component, OnChanges, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { OfficeService } from '../services/office.service';
import { RECEIVABLE_STATUSES, todayIso } from '../services/office-calc';
import { JodPipe, fileNames } from '../shared/office-ui';
import { PaymentMethod, Receipt } from '../models/office.models';

/** New receipt voucher — tied to a client, a project and (optionally) a claim. */
@Component({
  selector: 'app-of-receipt-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, TextareaModule, JodPipe],
  template: `
    <div class="flex flex-column gap-3">
      <div class="of-field"><label>{{ 'office.common.client' | translate }} <span class="req">*</span></label>
        <p-select [options]="clients()" optionLabel="name" optionValue="id" [filter]="true" [ngModel]="clientId()" (ngModelChange)="setClient($event)"
          [placeholder]="'office.quoteForm.pickClient' | translate" styleClass="w-full" appendTo="body" [disabled]="locked()" /></div>
      <div class="of-field"><label>{{ 'office.projects.project' | translate }} <span class="req">*</span></label>
        <p-select [options]="projects()" optionLabel="label" optionValue="value" [ngModel]="projectId()" (ngModelChange)="setProject($event)"
          [placeholder]="'office.receipts.pickProject' | translate" styleClass="w-full" appendTo="body" [disabled]="locked()" /></div>
      <div class="of-field"><label>{{ 'office.receipts.linkedClaim' | translate }}</label>
        <p-select [options]="claimOptions()" optionLabel="label" optionValue="value" [ngModel]="claimId()" (ngModelChange)="setClaim($event)"
          styleClass="w-full" appendTo="body" [disabled]="locked()" /></div>
      <div class="of-form-grid">
        <div class="of-field"><label>{{ 'office.common.amount' | translate }} <span class="req">*</span></label>
          <p-inputnumber [(ngModel)]="amount" [min]="0" [maxFractionDigits]="2" inputStyleClass="w-full" />
          @if (rest() !== null) { <span class="of-hint">{{ 'office.receipts.restHint' | translate: { rest: (rest()! | jod) } }}</span> }
        </div>
        <div class="of-field"><label>{{ 'office.common.date' | translate }}</label><input type="date" pInputText [(ngModel)]="date" /></div>
      </div>
      <div class="of-field"><label>{{ 'office.receipts.method' | translate }}</label>
        <div class="of-options">
          @for (m of methods; track m) {
            <button type="button" class="of-option" [class.selected]="method === m" (click)="method = m">
              <div class="of-option-title" style="font-size: .8rem">{{ 'office.methods.' + m | translate }}</div>
            </button>
          }
        </div>
      </div>
      @if (method !== 'cash') {
        <div class="of-form-grid">
          <div class="of-field"><label>{{ 'office.receipts.chequeNo' | translate }}</label><input pInputText [(ngModel)]="chequeNo" /></div>
          @if (method === 'cheque') { <div class="of-field"><label>{{ 'office.receipts.chequeDue' | translate }}</label><input type="date" pInputText [(ngModel)]="chequeDueDate" /></div> }
        </div>
      }
      <div class="of-field"><label>{{ 'office.common.notes' | translate }}</label><textarea pTextarea rows="2" [(ngModel)]="notes"></textarea></div>
      <label class="of-dropzone block">
        <i class="pi pi-image"></i>{{ attachment || ('office.receipts.attachImage' | translate) }}
        <input type="file" accept="image/*,.pdf" hidden (change)="attachment = names($event)[0] || ''" />
      </label>
      <p-button [label]="'office.receipts.saveAndPrint' | translate" icon="pi pi-print" styleClass="w-full" [disabled]="!canSave()" [loading]="saving()" (onClick)="save()" />
    </div>
  `,
})
export class ReceiptFormComponent implements OnChanges {
  private readonly office = inject(OfficeService);
  private readonly translate = inject(TranslateService);

  readonly presetClaimId = input<string | undefined>();
  readonly presetProjectId = input<string | undefined>();
  readonly saved = output<Receipt>();

  readonly methods: PaymentMethod[] = ['cash', 'cheque', 'transfer'];
  readonly clients = this.office.clients;
  readonly clientId = signal<string | null>(null);
  readonly projectId = signal<string | null>(null);
  readonly claimId = signal<string | null>(null);
  readonly saving = signal(false);

  amount = 0;
  date = todayIso();
  method: PaymentMethod = 'transfer';
  chequeNo = '';
  chequeDueDate = '';
  notes = '';
  attachment = '';

  readonly locked = computed(() => !!this.presetClaimId());

  readonly projects = computed(() =>
    this.office.db().projects.filter((p) => !this.clientId() || p.clientId === this.clientId())
      .map((p) => ({ label: `${p.code} · ${p.name}`, value: p.id })),
  );

  readonly claimOptions = computed(() => {
    const opts: { label: string; value: string | null }[] = [{ label: this.translate.instant('office.receipts.onAccount'), value: null }];
    if (!this.projectId()) return opts;
    for (const c of this.office.claimsForProject(this.projectId()!)) {
      if (!RECEIVABLE_STATUSES.includes(c.status) && c.claim.id !== this.claimId()) continue;
      opts.push({ label: `${c.claim.no} · ${c.claim.paymentName} · ${c.rest.toLocaleString('en-US')}`, value: c.claim.id });
    }
    return opts;
  });

  readonly rest = computed(() => (this.claimId() ? this.office.claimView(this.claimId())?.rest ?? null : null));

  ngOnChanges(): void {
    this.reset();
  }

  reset(): void {
    const cv = this.office.claimView(this.presetClaimId());
    const pid = cv?.claim.projectId ?? this.presetProjectId() ?? null;
    const project = this.office.project(pid);
    this.clientId.set(project?.clientId ?? null);
    this.projectId.set(pid);
    this.claimId.set(cv?.claim.id ?? null);
    this.amount = cv?.rest ?? 0;
    this.date = todayIso();
    this.method = 'transfer';
    this.chequeNo = '';
    this.chequeDueDate = '';
    this.notes = '';
    this.attachment = '';
  }

  setClient(id: string): void {
    this.clientId.set(id);
    this.projectId.set(null);
    this.claimId.set(null);
  }

  setProject(id: string): void {
    this.projectId.set(id);
    this.claimId.set(null);
  }

  setClaim(id: string | null): void {
    this.claimId.set(id);
    const rest = this.rest();
    if (rest !== null) this.amount = rest;
  }

  names(e: Event): string[] {
    return fileNames(e);
  }

  canSave(): boolean {
    return !!this.clientId() && !!this.projectId() && this.amount > 0;
  }

  save(): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.office.createReceipt({
      clientId: this.clientId()!, projectId: this.projectId()!, claimId: this.claimId() ?? undefined,
      amount: this.amount, date: this.date, method: this.method, chequeNo: this.chequeNo || undefined,
      chequeDueDate: this.chequeDueDate || undefined, notes: this.notes || undefined, attachment: this.attachment || undefined,
    }).subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded && res.data) {
        this.saved.emit(res.data);
        this.reset();
      }
    });
  }
}
