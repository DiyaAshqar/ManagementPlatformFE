import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

import { OfficeService } from '../../services/office.service';
import { feeTotals, paymentsPctSum, round2, todayIso } from '../../services/office-calc';
import { EditableListComponent } from '../../shared/editable-list.component';
import { JodPipe, QUOTE_SEVERITY, fileNames } from '../../shared/office-ui';
import { Client, PaymentTerm, ProjectType, Quote, QuoteContent, QuoteScope } from '../../models/office.models';
import { DEFAULT_CLIENT_OBLIGATIONS, DEFAULT_GENERAL_TERMS, INTERIOR_OBLIGATIONS } from '../../data/office-seed';

@Component({
  selector: 'app-office-quote-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, SelectModule, InputTextModule,
    InputNumberModule, TextareaModule, ToggleSwitchModule, TagModule, DialogModule, TooltipModule,
    EditableListComponent, JodPipe,
  ],
  templateUrl: './quote-form.component.html',
})
export class OfficeQuoteFormComponent implements OnInit {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly severity = QUOTE_SEVERITY;
  readonly projectTypes: ProjectType[] = ['housing', 'villa', 'residentialBuilding', 'commercial'];
  readonly clients = this.office.clients;
  readonly contractTemplates = this.office.contractTemplates;
  readonly templates = this.office.templates;
  readonly settings = this.office.settings;

  readonly quoteId = signal<string | null>(null);
  readonly quote = computed<Quote | undefined>(() => this.office.quote(this.quoteId()));
  readonly saving = signal(false);

  model!: QuoteContent;

  // dialogs
  clientDialog = false;
  newClient: Omit<Client, 'id'> = { name: '' };
  responseDialog: 'revisionRequested' | 'rejected' | null = null;
  responseNote = '';
  addScopeTemplate: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const existing = id ? this.office.quote(id) : undefined;
    if (existing) {
      this.quoteId.set(existing.id);
      this.model = this.contentOf(existing);
    } else {
      this.model = this.blank();
      this.applyContractTemplate(this.contractTemplates()[0]?.id);
    }
  }

  get locked(): boolean {
    return this.quote()?.status === 'approved';
  }

  get totals() {
    return feeTotals(this.model.fees, this.model.land);
  }

  get pctSum(): number {
    return paymentsPctSum(this.model.payments);
  }

  get firstPayment(): number {
    const first = this.model.payments[0];
    return first ? round2((this.totals.total * first.pct) / 100) : 0;
  }

  get client(): Client | undefined {
    return this.office.client(this.model.clientId);
  }

  amountOf(p: PaymentTerm): number {
    return round2((this.totals.total * (Number(p.pct) || 0)) / 100);
  }

  /** Trigger options: signing, any stage of the chosen scopes, or a manual event. */
  get triggerOptions(): { label: string; value: string }[] {
    const opts = [{ label: this.translate.instant('office.quoteForm.onSigning'), value: 'signing' }];
    for (const sc of this.model.scopes) {
      const t = this.office.template(sc.templateId);
      for (const st of t?.stages ?? []) {
        const value = 'stage::' + st.name;
        if (!opts.some((o) => o.value === value)) {
          opts.push({ label: this.translate.instant('office.quoteForm.onStage', { stage: st.name }), value });
        }
      }
    }
    opts.push({ label: this.translate.instant('office.quoteForm.manualEvent'), value: 'manual' });
    return opts;
  }

  triggerValue(p: PaymentTerm): string {
    return p.trigger === 'stage' ? 'stage::' + p.stageName : p.trigger;
  }

  setTrigger(p: PaymentTerm, value: string): void {
    if (value.startsWith('stage::')) {
      p.trigger = 'stage';
      p.stageName = value.slice(7);
    } else {
      p.trigger = value as PaymentTerm['trigger'];
      p.stageName = undefined;
    }
  }

  stagesOf(scope: QuoteScope): string {
    return (this.office.template(scope.templateId)?.stages ?? []).map((s) => s.name.split(' (')[0]).join(' · ');
  }

  // ─── Template / scopes ───────────────────────────────────────────────

  onContractTemplateChange(id: string): void {
    if (this.locked || id === this.model.contractTemplateId) return;
    const prev = this.model.contractTemplateId;
    this.model.contractTemplateId = id;
    this.confirm.confirm({
      header: this.translate.instant('office.quoteForm.applyTemplateTitle'),
      message: this.translate.instant('office.quoteForm.applyTemplateMsg'),
      icon: 'pi pi-info-circle',
      accept: () => this.applyContractTemplate(id),
      reject: () => (this.model.contractTemplateId = prev),
    });
  }

  applyContractTemplate(id: string | undefined): void {
    const ct = this.contractTemplates().find((c) => c.id === id);
    if (!ct) return;
    this.model.contractTemplateId = ct.id;
    this.model.title = ct.title;
    this.model.scopes = ct.templateIds.map((tid) => this.scopeFromTemplate(tid)).filter((s): s is QuoteScope => !!s);
    this.model.clientObligations = [...DEFAULT_CLIENT_OBLIGATIONS];
    this.model.generalTerms = [...DEFAULT_GENERAL_TERMS];
    this.model.fees.interiorOn = ct.hasInterior;
    if (ct.hasInterior && !this.model.fees.interior) this.model.fees.interior = 2500;
    if (!ct.templateIds.some((t) => t !== 'tpl-int')) {
      this.model.fees.extMode = 'lump';
      this.model.fees.extLump = 0;
    }
    this.model.payments = this.defaultPayments(ct.templateIds);
  }

  private scopeFromTemplate(templateId: string): QuoteScope | undefined {
    const t = this.office.template(templateId);
    if (!t) return undefined;
    return {
      id: this.office.newId('qs'),
      templateId,
      name: t.scopeName,
      note: templateId === 'tpl-int' ? this.translate.instant('office.quoteForm.interiorNote', { area: this.model?.land?.interiorArea || 0 }) : undefined,
      obligations: templateId === 'tpl-int' ? INTERIOR_OBLIGATIONS.map((o) => ({ ...o, sub: o.sub ? [...o.sub] : undefined })) : t.obligations.map((text) => ({ text })),
    };
  }

  private defaultPayments(templateIds: string[]): PaymentTerm[] {
    const t = (name: string, pct: number, trigger: PaymentTerm['trigger'], condition: string, stageName?: string): PaymentTerm =>
      ({ id: this.office.newId('pt'), name, pct, trigger, condition, stageName });
    const n = (k: string) => this.translate.instant('office.ordinals.' + k);
    if (templateIds.includes('tpl-arch') && templateIds.includes('tpl-int')) {
      return [
        t(n('1'), 50, 'signing', this.translate.instant('office.quoteForm.condSigning')),
        t(n('2'), 20, 'stage', this.translate.instant('office.quoteForm.condSyndicate'), 'ترخيص النقابة'),
        t(n('3'), 20, 'stage', this.translate.instant('office.quoteForm.condInterior'), 'مخططات تنفيذية للداخلي'),
        t(n('4'), 10, 'stage', this.translate.instant('office.quoteForm.condPermit'), 'أمانة عمّان / البلديات'),
      ];
    }
    if (templateIds.includes('tpl-arch')) {
      return [
        t(n('1'), 40, 'signing', this.translate.instant('office.quoteForm.condSigning')),
        t(n('2'), 30, 'stage', this.translate.instant('office.quoteForm.condSyndicate'), 'ترخيص النقابة'),
        t(n('3'), 30, 'stage', this.translate.instant('office.quoteForm.condPermit'), 'أمانة عمّان / البلديات'),
      ];
    }
    return [
      t(n('1'), 50, 'signing', this.translate.instant('office.quoteForm.condSigning')),
      t(n('2'), 50, 'manual', this.translate.instant('office.quoteForm.condDelivery')),
    ];
  }

  addScope(): void {
    if (!this.addScopeTemplate) return;
    const s = this.scopeFromTemplate(this.addScopeTemplate);
    if (s) this.model.scopes = [...this.model.scopes, s];
    if (this.addScopeTemplate === 'tpl-int') this.model.fees.interiorOn = true;
    this.addScopeTemplate = null;
  }

  removeScope(i: number): void {
    const removed = this.model.scopes[i];
    this.model.scopes = this.model.scopes.filter((_, idx) => idx !== i);
    if (removed.templateId === 'tpl-int') this.model.fees.interiorOn = false;
  }

  scopeObligations(scope: QuoteScope): string[] {
    return scope.obligations.map((o) => o.text);
  }

  setScopeObligations(scope: QuoteScope, texts: string[]): void {
    scope.obligations = texts.map((text, i) => ({ text, sub: scope.obligations[i]?.text === text ? scope.obligations[i].sub : undefined }));
  }

  addPayment(): void {
    const idx = this.model.payments.length + 1;
    this.model.payments = [...this.model.payments, {
      id: this.office.newId('pt'),
      name: this.translate.instant('office.ordinals.' + idx) || `#${idx}`,
      pct: Math.max(0, round2(100 - this.pctSum)),
      trigger: 'manual',
      condition: '',
    }];
  }

  removePayment(i: number): void {
    this.model.payments = this.model.payments.filter((_, idx) => idx !== i);
  }

  addAttachments(event: Event): void {
    this.model.attachments = [...this.model.attachments, ...fileNames(event)];
  }

  removeAttachment(i: number): void {
    this.model.attachments = this.model.attachments.filter((_, idx) => idx !== i);
  }

  // ─── Client ──────────────────────────────────────────────────────────

  openClientDialog(): void {
    this.newClient = { name: '', nationalId: '', phone: '', address: '', representative: '', representativeNationalId: '' };
    this.clientDialog = true;
  }

  saveClient(): void {
    if (!this.newClient.name.trim()) return;
    this.office.addClient(this.newClient).subscribe((res) => {
      if (res.succeeded && res.data) {
        this.model.clientId = res.data.id;
        this.clientDialog = false;
      }
    });
  }

  // ─── Save / workflow ─────────────────────────────────────────────────

  save(send: boolean): void {
    if (!this.model.clientId) {
      this.confirm.confirm({
        header: this.translate.instant('office.quoteForm.clientRequiredTitle'),
        message: this.translate.instant('office.quoteForm.clientRequiredMsg'),
        icon: 'pi pi-exclamation-circle',
        rejectVisible: false,
        acceptLabel: this.translate.instant('office.common.ok'),
      });
      return;
    }
    this.saving.set(true);
    this.office.saveQuote(this.model, this.quoteId(), send).subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded && res.data && !this.quoteId()) {
        this.quoteId.set(res.data.id);
        this.router.navigate(['/office/quotes', res.data.id], { replaceUrl: true });
      }
    });
  }

  preview(): void {
    const id = this.quoteId();
    if (!id) return;
    if (!this.locked) {
      this.office.saveQuote(this.model, id, false).subscribe(() => this.router.navigate(['/office/quotes', id, 'preview']));
    } else {
      this.router.navigate(['/office/quotes', id, 'preview']);
    }
  }

  newRevision(): void {
    const id = this.quoteId();
    if (!id) return;
    this.office.saveQuote(this.model, id, false).subscribe((r) => {
      if (!r.succeeded) return;
      this.office.newQuoteRevision(id).subscribe((res) => {
        if (res.succeeded && res.data) this.model = this.contentOf(res.data);
      });
    });
  }

  openResponse(kind: 'revisionRequested' | 'rejected'): void {
    this.responseNote = '';
    this.responseDialog = kind;
  }

  saveResponse(): void {
    const id = this.quoteId();
    if (!id || !this.responseDialog) return;
    this.office.quoteResponse(id, this.responseDialog, this.responseNote).subscribe((res) => {
      if (res.succeeded) this.responseDialog = null;
    });
  }

  approve(): void {
    const id = this.quoteId();
    if (!id) return;
    this.confirm.confirm({
      header: this.translate.instant('office.quoteForm.approveTitle'),
      message: this.translate.instant('office.quoteForm.approveMsg'),
      icon: 'pi pi-check-circle',
      accept: () => {
        this.office.saveQuote(this.model, id, false).subscribe((r) => {
          if (!r.succeeded) return;
          this.office.approveQuote(id).subscribe((res) => {
            if (res.succeeded) this.router.navigate(['/office/projects/new'], { queryParams: { quoteId: id } });
          });
        });
      },
    });
  }

  goProject(): void {
    const q = this.quote();
    if (!q) return;
    if (q.projectId) this.router.navigate(['/office/projects', q.projectId]);
    else this.router.navigate(['/office/projects/new'], { queryParams: { quoteId: q.id } });
  }

  revLabel(rev: number): string {
    return 'Rev ' + String(rev).padStart(2, '0');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private contentOf(q: Quote): QuoteContent {
    const { id: _i, ref: _r, rev: _v, status: _s, revisions: _rv, projectId: _p, createdAt: _c, ...content } = structuredClone(q);
    return content;
  }

  private blank(): QuoteContent {
    return {
      contractTemplateId: '',
      title: '',
      date: todayIso(),
      clientId: '',
      land: { projectType: 'housing', plotNo: '', basin: '', lands: '', subdivision: '', landArea: 0, buildArea: 0, interiorArea: 0 },
      scopes: [],
      clientObligations: [],
      generalTerms: [],
      fees: { extMode: 'perSqm', rate: 4, extLump: 0, interior: 0, interiorOn: false },
      payments: [],
      internalNotes: '',
      attachments: [],
    };
  }
}
