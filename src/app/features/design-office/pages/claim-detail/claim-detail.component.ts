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
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

import { OfficeService } from '../../services/office.service';
import { CLAIM_SEVERITY, JodPipe } from '../../shared/office-ui';
import { ReceiptFormComponent } from '../../components/receipt-form.component';
import { ClaimAdjustment } from '../../models/office.models';

/** Screen 14 — claim basis, calculation, receipts against it and its history. */
@Component({
  selector: 'app-office-claim-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TagModule, TableModule, DialogModule,
    InputTextModule, InputNumberModule, JodPipe, ReceiptFormComponent,
  ],
  templateUrl: './claim-detail.component.html',
})
export class OfficeClaimDetailComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly severity = CLAIM_SEVERITY;
  readonly claimId = signal(this.route.snapshot.paramMap.get('id'));
  readonly view = computed(() => this.office.claimView(this.claimId()));
  readonly quote = computed(() => this.office.quote(this.view()?.project?.quoteId));
  readonly contractValue = computed(() => this.office.projectSummary(this.view()?.claim.projectId)?.contractValue ?? 0);
  readonly receipts = computed(() => this.office.receiptsForClaim(this.claimId() ?? ''));
  readonly siblings = computed(() => {
    const v = this.view();
    return v ? this.office.claimsForProject(v.claim.projectId) : [];
  });
  readonly adjTotals = computed(() => {
    const a = this.view()?.claim.adjustments ?? [];
    const sum = (k: ClaimAdjustment['kind']) => a.filter((x) => x.kind === k).reduce((s, x) => s + x.amount, 0);
    return { area: sum('areaDiff'), change: sum('changeOrder'), discount: sum('discount') };
  });

  /** Lifecycle: created → due → sent → partial → paid; done/now/todo per step. */
  readonly timeline = computed(() => {
    const v = this.view();
    if (!v) return [];
    return [
      ...v.claim.events.map((e) => ({ ...e, state: 'done' as const })),
      ...(v.status !== 'paid' && v.status !== 'cancelled'
        ? [{ date: '', text: 'awaitingFull', params: { rest: v.rest.toLocaleString('en-US') } as Record<string, string | number>, by: undefined as string | undefined, state: 'todo' as const }]
        : []),
    ];
  });

  receiptVisible = false;
  adjVisible = false;
  adj: Omit<ClaimAdjustment, 'id'> = { kind: 'changeOrder', label: '', amount: 0 };
  dueVisible = false;
  newDue = '';

  print(): void {
    window.print();
  }

  send(): void {
    const v = this.view();
    if (!v) return;
    if (v.status === 'sent' || v.status === 'partial' || v.status === 'late') {
      this.office.sendReminder(v.claim.id).subscribe();
    } else {
      this.office.sendClaim(v.claim.id).subscribe();
    }
  }

  openAdj(): void {
    this.adj = { kind: 'changeOrder', label: '', amount: 0 };
    this.adjVisible = true;
  }

  saveAdj(): void {
    const v = this.view();
    if (!v || !this.adj.amount) return;
    const label = this.adj.label || this.translate.instant('office.adjKinds.' + this.adj.kind);
    this.office.addClaimAdjustment(v.claim.id, { ...this.adj, label }).subscribe((res) => {
      if (res.succeeded) this.adjVisible = false;
    });
  }

  openDue(): void {
    this.newDue = this.view()?.claim.dueDate ?? '';
    this.dueVisible = true;
  }

  saveDue(): void {
    const v = this.view();
    if (!v || !this.newDue) return;
    this.office.updateClaimDueDate(v.claim.id, this.newDue).subscribe((res) => {
      if (res.succeeded) this.dueVisible = false;
    });
  }

  attachDrawings(): void {
    const v = this.view();
    if (v) this.office.attachClaimDrawings(v.claim.id).subscribe();
  }

  cancel(): void {
    const v = this.view();
    if (!v) return;
    this.confirm.confirm({
      header: this.translate.instant('office.claimDetail.cancelTitle'),
      message: this.translate.instant('office.claimDetail.cancelMsg', { no: v.claim.no }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.office.cancelClaim(v.claim.id).subscribe(),
    });
  }

  onReceipt(): void {
    this.receiptVisible = false;
  }

  goSibling(id: string): void {
    this.claimId.set(id);
    this.router.navigate(['/office/claims', id]);
  }
}
