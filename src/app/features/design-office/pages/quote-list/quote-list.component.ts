import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { OfficeService } from '../../services/office.service';
import { feeTotals } from '../../services/office-calc';
import { JodPipe, QUOTE_SEVERITY } from '../../shared/office-ui';
import { Quote, QuoteStatus } from '../../models/office.models';

type Tab = 'all' | QuoteStatus;

@Component({
  selector: 'app-office-quote-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, TagModule,
    SelectModule, InputTextModule, IconFieldModule, InputIconModule, JodPipe,
  ],
  templateUrl: './quote-list.component.html',
})
export class OfficeQuoteListComponent {
  private readonly office = inject(OfficeService);
  private readonly router = inject(Router);

  readonly severity = QUOTE_SEVERITY;
  readonly tabs: Tab[] = ['all', 'draft', 'sent', 'revisionRequested', 'approved', 'rejected'];
  readonly tab = signal<Tab>('all');
  readonly search = signal('');
  readonly contractType = signal<string | null>(null);
  readonly from = signal('');
  readonly to = signal('');

  readonly contractTemplates = this.office.contractTemplates;

  readonly rows = computed(() =>
    this.office.quotes().map((q) => ({
      q,
      client: this.office.clientName(q.clientId),
      total: feeTotals(q.fees, q.land).total,
      land: q.land.plotNo ? `${q.land.plotNo} · ${q.land.basin}` : '',
    })),
  );

  readonly counts = computed(() => {
    const c: Record<string, number> = { all: this.rows().length };
    for (const r of this.rows()) c[r.q.status] = (c[r.q.status] ?? 0) + 1;
    return c;
  });

  readonly filtered = computed(() => {
    const s = this.search().trim().toLowerCase();
    return this.rows().filter(({ q, client, land }) =>
      (this.tab() === 'all' || q.status === this.tab()) &&
      (!this.contractType() || q.contractTemplateId === this.contractType()) &&
      (!this.from() || q.date >= this.from()) &&
      (!this.to() || q.date <= this.to()) &&
      (!s || q.ref.toLowerCase().includes(s) || client.toLowerCase().includes(s) || land.toLowerCase().includes(s)),
    );
  });

  open(q: Quote): void {
    this.router.navigate(['/office/quotes', q.id]);
  }

  preview(q: Quote, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/office/quotes', q.id, 'preview']);
  }

  goProject(q: Quote, event: Event): void {
    event.stopPropagation();
    if (q.projectId) this.router.navigate(['/office/projects', q.projectId]);
    else this.router.navigate(['/office/projects/new'], { queryParams: { quoteId: q.id } });
  }

  revLabel(rev: number): string {
    return 'Rev ' + String(rev).padStart(2, '0');
  }
}
