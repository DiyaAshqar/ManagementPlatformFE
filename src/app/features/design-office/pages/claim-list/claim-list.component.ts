import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { ClaimView, OfficeService } from '../../services/office.service';
import { CLAIM_SEVERITY, JodPipe } from '../../shared/office-ui';
import { CreateClaimDialogComponent } from '../../components/create-claim-dialog.component';
import { ClaimStatus } from '../../models/office.models';

type Tab = 'all' | ClaimStatus;

/** Screen 13 — claims come from the contract payment schedule and become due when their stage finishes. */
@Component({
  selector: 'app-office-claim-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, TagModule, SelectModule,
    InputTextModule, IconFieldModule, InputIconModule, JodPipe, CreateClaimDialogComponent,
  ],
  templateUrl: './claim-list.component.html',
})
export class OfficeClaimListComponent {
  private readonly office = inject(OfficeService);
  readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly severity = CLAIM_SEVERITY;
  readonly tabs: Tab[] = ['all', 'scheduled', 'due', 'sent', 'partial', 'late', 'paid'];
  readonly tab = signal<Tab>('all');
  readonly search = signal('');
  readonly project = signal<string | null>(this.route.snapshot.queryParamMap.get('project'));
  readonly from = signal('');
  readonly to = signal('');
  manualVisible = false;

  readonly projects = computed(() => this.office.projectSummaries().map((s) => ({ label: `${s.project.code} · ${s.project.name}`, value: s.project.id })));

  readonly views = computed(() => this.office.claimViews().filter((v) => v.status !== 'cancelled' || this.tab() === 'all'));

  readonly stats = computed(() => {
    const v = this.office.claimViews();
    const sum = (f: (x: ClaimView) => boolean, rest = true) => v.filter(f).reduce((s, x) => s + (rest ? x.rest : x.total), 0);
    return {
      due: sum((x) => x.status === 'due'),
      sent: sum((x) => x.status === 'sent' || x.status === 'partial'),
      late: sum((x) => x.status === 'late'),
      scheduled: sum((x) => x.status === 'scheduled', false),
    };
  });

  readonly counts = computed(() => {
    const c: Record<string, number> = { all: 0 };
    for (const v of this.office.claimViews()) {
      if (this.project() && v.claim.projectId !== this.project()) continue;
      c['all']++;
      c[v.status] = (c[v.status] ?? 0) + 1;
    }
    return c;
  });

  readonly filtered = computed(() => {
    const s = this.search().trim().toLowerCase();
    return this.views()
      .filter((v) =>
        (this.tab() === 'all' || v.status === this.tab()) &&
        (!this.project() || v.claim.projectId === this.project()) &&
        (!this.from() || (v.claim.dueDate ?? '') >= this.from()) &&
        (!this.to() || (v.claim.dueDate ?? '9999') <= this.to()) &&
        (!s || v.claim.no.toLowerCase().includes(s) || (v.client?.name ?? '').toLowerCase().includes(s) || (v.project?.name ?? '').toLowerCase().includes(s)),
      )
      .sort((a, b) => b.claim.no.localeCompare(a.claim.no));
  });

  open(v: ClaimView): void {
    this.router.navigate(['/office/claims', v.claim.id]);
  }

  linkLabel(v: ClaimView): string {
    if (v.stage) return v.stage.name;
    return v.claim.condition;
  }
}
