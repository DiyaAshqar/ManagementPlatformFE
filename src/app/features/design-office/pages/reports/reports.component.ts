import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';

import { OfficeService } from '../../services/office.service';
import { RECEIVABLE_STATUSES, daysBetween, round2, todayIso } from '../../services/office-calc';
import { JodPipe } from '../../shared/office-ui';

type Tab = 'profit' | 'aging' | 'receipts';
type GroupBy = 'month' | 'project' | 'client';

/** Screen 15 — project profitability, receivables aging and receipts. */
@Component({
  selector: 'app-office-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, InputTextModule, JodPipe],
  templateUrl: './reports.component.html',
})
export class OfficeReportsComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly tabs: Tab[] = ['profit', 'aging', 'receipts'];
  readonly tab = signal<Tab>((this.route.snapshot.queryParamMap.get('tab') as Tab) || 'profit');
  readonly from = signal(todayIso().slice(0, 4) + '-01-01');
  readonly to = signal(todayIso());
  readonly groupBy = signal<GroupBy>('month');

  // ─── Profit ──────────────────────────────────────────────────────────
  readonly profitRows = computed(() => this.office.projectSummaries());
  readonly adminTotal = computed(() =>
    this.office.db().adminExpenses.filter((e) => e.date >= this.from() && e.date <= this.to()).reduce((s, e) => s + e.amount, 0),
  );
  readonly profitKpis = computed(() => {
    const rows = this.profitRows();
    const revenue = rows.reduce((s, r) => s + r.contractValue, 0);
    const projectCosts = rows.reduce((s, r) => s + r.stepsCost + r.directExpenses + r.subcontractors, 0);
    return { revenue, projectCosts, admin: this.adminTotal(), net: round2(revenue - projectCosts - this.adminTotal()) };
  });

  // ─── Aging ───────────────────────────────────────────────────────────
  readonly agingRows = computed(() => {
    const today = todayIso();
    const byClient = new Map<string, { clientId: string; name: string; projects: Set<string>; a: number; b: number; c: number; d: number; t: number }>();
    for (const v of this.office.claimViews()) {
      if (!RECEIVABLE_STATUSES.includes(v.status) || v.rest <= 0 || !v.client) continue;
      const age = v.claim.dueDate ? Math.max(0, daysBetween(v.claim.dueDate, today)) : 0;
      const row = byClient.get(v.client.id) ?? { clientId: v.client.id, name: v.client.name, projects: new Set<string>(), a: 0, b: 0, c: 0, d: 0, t: 0 };
      row.projects.add(v.project?.code ?? '');
      if (age <= 30) row.a += v.rest;
      else if (age <= 60) row.b += v.rest;
      else if (age <= 90) row.c += v.rest;
      else row.d += v.rest;
      row.t += v.rest;
      byClient.set(v.client.id, row);
    }
    return [...byClient.values()].map((r) => ({ ...r, projectsLabel: [...r.projects].join(', ') })).sort((x, y) => y.t - x.t);
  });
  readonly agingKpis = computed(() => {
    const rows = this.agingRows();
    const s = (k: 'a' | 'b' | 'c' | 'd' | 't') => rows.reduce((x, r) => x + r[k], 0);
    return { a: s('a'), b: s('b'), c: s('c'), d: s('d'), t: s('t') };
  });

  // ─── Receipts ────────────────────────────────────────────────────────
  readonly periodReceipts = computed(() => this.office.db().receipts.filter((r) => r.date >= this.from() && r.date <= this.to()));
  readonly receiptKpis = computed(() => {
    const r = this.periodReceipts();
    const s = (m?: string) => r.filter((x) => !m || x.method === m).reduce((a, x) => a + x.amount, 0);
    return { total: s(), cash: s('cash'), cheque: s('cheque'), transfer: s('transfer') };
  });
  readonly receiptRows = computed(() => {
    const groups = new Map<string, { key: string; count: number; cash: number; cheque: number; transfer: number; total: number }>();
    for (const r of this.periodReceipts()) {
      const key = this.groupBy() === 'month' ? r.date.slice(0, 7)
        : this.groupBy() === 'project' ? (this.office.project(r.projectId)?.code ?? '—') + ' · ' + (this.office.project(r.projectId)?.name ?? '')
        : this.office.clientName(r.clientId);
      const g = groups.get(key) ?? { key, count: 0, cash: 0, cheque: 0, transfer: 0, total: 0 };
      g.count++;
      if (r.method === 'cash') g.cash += r.amount;
      else if (r.method === 'cheque') g.cheque += r.amount;
      else g.transfer += r.amount;
      g.total += r.amount;
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => (this.groupBy() === 'month' ? b.key.localeCompare(a.key) : b.total - a.total));
  });

  setTab(t: Tab): void {
    this.tab.set(t);
    this.router.navigate([], { queryParams: { tab: t }, replaceUrl: true });
  }

  margin(profit: number, value: number): number {
    return value ? Math.round((profit / value) * 100) : 0;
  }

  print(): void {
    window.print();
  }

  /** CSV that Excel opens directly (UTF-8 BOM keeps Arabic readable). */
  exportExcel(): void {
    const t = (k: string) => this.translate.instant(k);
    let header: string[] = [];
    let rows: (string | number)[][] = [];
    if (this.tab() === 'profit') {
      header = [t('office.projects.project'), t('office.projects.contractValue'), t('office.projectDetail.claimed'), t('office.projects.received'),
        t('office.projectDetail.stepsCost'), t('office.reports.projectExpenses'), t('office.projectDetail.subcontractors'), t('office.reports.profit'), t('office.reports.margin')];
      rows = this.profitRows().map((r) => [`${r.project.code} ${r.project.name}`, r.contractValue, r.claimed, r.received, r.stepsCost, r.directExpenses, r.subcontractors, r.profit, r.margin + '%']);
    } else if (this.tab() === 'aging') {
      header = [t('office.common.client'), t('office.projects.title'), '0-30', '31-60', '61-90', '+90', t('office.common.total')];
      rows = this.agingRows().map((r) => [r.name, r.projectsLabel, r.a, r.b, r.c, r.d, r.t]);
    } else {
      header = [t('office.reports.group.' + this.groupBy()), t('office.reports.vouchers'), t('office.methods.cash'), t('office.methods.cheque'), t('office.methods.transfer'), t('office.common.total')];
      rows = this.receiptRows().map((r) => [r.key, r.count, r.cash, r.cheque, r.transfer, r.total]);
    }
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `office-report-${this.tab()}-${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
