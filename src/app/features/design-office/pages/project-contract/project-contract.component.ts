import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';

import { OfficeService } from '../../services/office.service';
import { feeTotals, todayIso } from '../../services/office-calc';
import { CLAIM_SEVERITY, JodPipe, QUOTE_SEVERITY } from '../../shared/office-ui';

/** Screen 05 — quote revisions, contract drafts, contract approval and the down payment. */
@Component({
  selector: 'app-office-project-contract',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TagModule, TableModule, DialogModule, TextareaModule, JodPipe],
  templateUrl: './project-contract.component.html',
})
export class OfficeProjectContractComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly quoteSeverity = QUOTE_SEVERITY;
  readonly claimSeverity = CLAIM_SEVERITY;

  readonly projectId = this.route.snapshot.paramMap.get('id')!;
  readonly summary = computed(() => this.office.projectSummary(this.projectId));
  readonly project = computed(() => this.summary()?.project);
  readonly quote = computed(() => this.office.quote(this.project()?.quoteId));
  readonly claims = computed(() => this.office.claimsForProject(this.projectId));
  readonly signingClaim = computed(() => this.claims().find((c) => c.claim.trigger === 'signing'));
  readonly scheduleTotalPct = computed(() => this.claims().filter((c) => c.claim.kind === 'scheduled').reduce((s, c) => s + c.claim.pct, 0));
  readonly scheduleTotal = computed(() => this.claims().filter((c) => c.status !== 'cancelled').reduce((s, c) => s + c.total, 0));

  readonly step = computed(() => {
    const p = this.project();
    if (!p) return 1;
    if (!p.contractApproved) return 3;
    return this.signingClaim()?.status === 'paid' ? 6 : 5;
  });

  draftDialog = false;
  draftNotes = '';

  revTotal(rev: { total: number }): number {
    return rev.total;
  }

  revScopes(rev: { snapshot?: { scopes: { name: string }[] } }): string {
    return rev.snapshot?.scopes.map((s) => s.name).join(' · ') ?? '—';
  }

  quoteTotal(): number {
    const q = this.quote();
    return q ? feeTotals(q.fees, q.land).total : 0;
  }

  openDraftDialog(): void {
    this.draftNotes = '';
    this.draftDialog = true;
  }

  addDraft(): void {
    this.office.addContractDraft(this.projectId, this.draftNotes).subscribe((res) => {
      if (res.succeeded) this.draftDialog = false;
    });
  }

  approveContract(): void {
    this.confirm.confirm({
      header: this.translate.instant('office.contract.approveTitle'),
      message: this.translate.instant('office.contract.approveMsg'),
      icon: 'pi pi-check-circle',
      accept: () => this.office.approveContract(this.projectId).subscribe(),
    });
  }

  /** Down payment: send the signing claim to the client (or open it if it already went out). */
  downPayment(): void {
    const c = this.signingClaim();
    if (!c) return;
    if (c.status === 'due' || c.status === 'late') {
      this.office.sendClaim(c.claim.id).subscribe((res) => {
        if (res.succeeded) this.router.navigate(['/office/claims', c.claim.id]);
      });
    } else {
      this.router.navigate(['/office/claims', c.claim.id]);
    }
  }

  print(): void {
    const q = this.quote();
    if (q) this.router.navigate(['/office/quotes', q.id, 'preview']);
  }

  today = todayIso();
}
