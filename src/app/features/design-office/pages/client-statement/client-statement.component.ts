import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';

import { OfficeService } from '../../services/office.service';
import { round2 } from '../../services/office-calc';
import { JodPipe } from '../../shared/office-ui';

interface Line {
  date: string;
  ref: string;
  link?: (string | undefined)[];
  query?: Record<string, string>;
  text: string;
  debit: number;
  credit: number;
  balance: number;
}

/** Screen 17 — client statement: claims (debit), billable expenses (debit), receipts (credit). */
@Component({
  selector: 'app-office-client-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, SelectModule, InputTextModule, JodPipe],
  templateUrl: './client-statement.component.html',
})
export class OfficeClientStatementComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly messages = inject(MessageService);

  readonly clients = this.office.clients;
  readonly clientId = signal(this.route.snapshot.paramMap.get('id')!);
  readonly projectId = signal<string | null>(this.route.snapshot.queryParamMap.get('project'));
  readonly from = signal('');
  readonly to = signal('');

  readonly client = computed(() => this.office.client(this.clientId()));
  readonly projects = computed(() => this.office.db().projects.filter((p) => p.clientId === this.clientId()));
  readonly projectCodes = computed(() => this.projects().map((p) => p.code).join(', '));
  readonly projectOptions = computed(() => this.projects().map((p) => ({ label: `${p.code} · ${p.name}`, value: p.id })));
  readonly scopeProjects = computed(() => this.projects().filter((p) => !this.projectId() || p.id === this.projectId()));

  readonly contractsValue = computed(() =>
    this.scopeProjects().reduce((s, p) => s + (this.office.projectSummary(p.id)?.contractValue ?? 0), 0),
  );

  readonly lines = computed<Line[]>(() => {
    const ids = new Set(this.scopeProjects().map((p) => p.id));
    const raw: Omit<Line, 'balance'>[] = [];
    for (const v of this.office.claimViews()) {
      if (!ids.has(v.claim.projectId) || v.status === 'scheduled' || v.status === 'cancelled') continue;
      raw.push({
        date: v.claim.sentAt ?? v.claim.dueDate ?? v.claim.createdAt,
        ref: v.claim.no,
        link: ['/office/claims', v.claim.id],
        text: this.translate.instant('office.statement.claimLine', { name: v.claim.paymentName, pct: v.claim.pct ? v.claim.pct + '%' : '', code: v.project?.code }) + (v.claim.condition ? ' · ' + v.claim.condition : ''),
        debit: v.total,
        credit: 0,
      });
    }
    for (const r of this.office.db().receipts) {
      if (!ids.has(r.projectId)) continue;
      raw.push({
        date: r.date, ref: r.no, link: ['/office/receipts'], query: { q: r.no },
        text: this.translate.instant('office.statement.receiptLine', { method: this.translate.instant('office.methods.' + r.method) }) + (r.chequeNo ? ' ' + r.chequeNo : ''),
        debit: 0, credit: r.amount,
      });
    }
    for (const e of this.office.db().projectExpenses) {
      if (!ids.has(e.projectId) || !e.billable) continue;
      raw.push({ date: e.date, ref: '—', link: ['/office/projects', e.projectId, 'expenses'], text: this.translate.instant('office.statement.expenseLine', { desc: e.description }), debit: e.amount, credit: 0 });
    }
    for (const p of this.scopeProjects()) {
      for (const st of p.scopes.flatMap((s) => s.stages)) {
        for (const l of st.log.filter((x) => x.billable && x.cost > 0)) {
          raw.push({ date: l.date, ref: '—', link: ['/office/projects', p.id, 'stages', st.id], text: this.translate.instant('office.statement.expenseLine', { desc: l.step }), debit: l.cost, credit: 0 });
        }
      }
    }
    raw.sort((a, b) => a.date.localeCompare(b.date) || b.debit - a.debit);
    let bal = 0;
    return raw
      .map((l) => {
        bal = round2(bal + l.debit - l.credit);
        return { ...l, balance: bal };
      })
      .filter((l) => (!this.from() || l.date >= this.from()) && (!this.to() || l.date <= this.to()));
  });

  readonly totals = computed(() => {
    const d = this.lines().reduce((s, l) => s + l.debit, 0);
    const c = this.lines().reduce((s, l) => s + l.credit, 0);
    return { debit: round2(d), credit: round2(c), balance: round2(d - c) };
  });

  readonly upcoming = computed(() => {
    const ids = new Set(this.scopeProjects().map((p) => p.id));
    return this.office.claimViews().filter((v) => ids.has(v.claim.projectId) && v.status === 'scheduled');
  });

  setClient(id: string): void {
    this.clientId.set(id);
    this.projectId.set(null);
  }

  print(): void {
    window.print();
  }

  send(): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('office.toast.successTitle'),
      detail: this.translate.instant('office.statement.sent', { name: this.client()?.name }),
    });
  }
}
