import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

import { OfficeService } from '../../services/office.service';
import { feeTotals, round2 } from '../../services/office-calc';
import { JodPipe } from '../../shared/office-ui';
import { QuoteContent } from '../../models/office.models';

@Component({
  selector: 'app-office-quote-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, SelectModule, TagModule, JodPipe],
  templateUrl: './quote-preview.component.html',
  styleUrl: './quote-preview.component.scss',
})
export class OfficeQuotePreviewComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);

  readonly quote = computed(() => this.office.quote(this.route.snapshot.paramMap.get('id')));
  readonly settings = this.office.settings;
  readonly selectedRev = signal<number | null>(null);

  readonly revOptions = computed(() =>
    [...(this.quote()?.revisions ?? [])].reverse().map((r) => ({ label: 'Rev ' + String(r.rev).padStart(2, '0'), value: r.rev })),
  );

  /** Content of the selected revision (snapshot) — defaults to the current one. */
  readonly content = computed<QuoteContent | undefined>(() => {
    const q = this.quote();
    if (!q) return undefined;
    const rev = this.selectedRev() ?? q.rev;
    return q.revisions.find((r) => r.rev === rev)?.snapshot ?? q;
  });

  readonly rev = computed(() => this.selectedRev() ?? this.quote()?.rev ?? 0);
  readonly client = computed(() => this.office.client(this.content()?.clientId));
  readonly totals = computed(() => {
    const c = this.content();
    return c ? feeTotals(c.fees, c.land) : { ext: 0, interior: 0, total: 0 };
  });

  /** What changed versus the previous revision (for the compare banner). */
  readonly diff = computed(() => {
    const q = this.quote();
    const cur = this.content();
    if (!q || !cur) return [];
    const prev = q.revisions.find((r) => r.rev === this.rev() - 1)?.snapshot;
    if (!prev) return [];
    const out: string[] = [];
    const pt = feeTotals(prev.fees, prev.land).total;
    const ct = this.totals().total;
    if (pt !== ct) out.push(`total:${pt}:${ct}`);
    if (prev.land.buildArea !== cur.land.buildArea) out.push(`area:${prev.land.buildArea}:${cur.land.buildArea}`);
    if (prev.scopes.length !== cur.scopes.length) out.push(`scopes:${prev.scopes.length}:${cur.scopes.length}`);
    if (JSON.stringify(prev.payments.map((p) => p.pct)) !== JSON.stringify(cur.payments.map((p) => p.pct))) out.push('payments');
    return out;
  });

  revLabel(rev: number): string {
    return 'Rev ' + String(rev).padStart(2, '0');
  }

  amount(pct: number): number {
    return round2((this.totals().total * pct) / 100);
  }

  diffParts(d: string): string[] {
    return d.split(':');
  }

  print(): void {
    window.print();
  }
}
