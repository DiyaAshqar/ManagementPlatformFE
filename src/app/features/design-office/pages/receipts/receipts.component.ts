import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';

import { OfficeService } from '../../services/office.service';
import { todayIso } from '../../services/office-calc';
import { JodPipe } from '../../shared/office-ui';
import { ReceiptFormComponent } from '../../components/receipt-form.component';
import { PaymentMethod, Receipt } from '../../models/office.models';

/** Screen 06 — receipt vouchers from clients, linked to a project and a claim. */
@Component({
  selector: 'app-office-receipts',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, SelectModule, InputTextModule,
    IconFieldModule, InputIconModule, DialogModule, JodPipe, ReceiptFormComponent,
  ],
  templateUrl: './receipts.component.html',
})
export class OfficeReceiptsComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  readonly methods: PaymentMethod[] = ['cash', 'cheque', 'transfer'];
  readonly search = signal(this.route.snapshot.queryParamMap.get('q') ?? '');
  readonly method = signal<PaymentMethod | null>(null);
  readonly from = signal('');
  readonly to = signal('');
  readonly settings = this.office.settings;

  voucher: Receipt | null = null;

  readonly rows = computed(() =>
    [...this.office.db().receipts]
      .sort((a, b) => b.no.localeCompare(a.no))
      .map((r) => {
        const claim = this.office.claimView(r.claimId);
        const project = this.office.project(r.projectId);
        return { r, client: this.office.clientName(r.clientId), project, claim };
      }),
  );

  readonly filtered = computed(() => {
    const s = this.search().trim().toLowerCase();
    return this.rows().filter(({ r, client, project }) =>
      (!this.method() || r.method === this.method()) &&
      (!this.from() || r.date >= this.from()) &&
      (!this.to() || r.date <= this.to()) &&
      (!s || r.no.toLowerCase().includes(s) || client.toLowerCase().includes(s) || (project?.name ?? '').toLowerCase().includes(s) || (project?.code ?? '').toLowerCase().includes(s)),
    );
  });

  readonly stats = computed(() => {
    const month = todayIso().slice(0, 7);
    const all = this.office.db().receipts;
    return {
      month: all.filter((r) => r.date.startsWith(month)).reduce((s, r) => s + r.amount, 0),
      receivable: this.office.receivablesTotal(),
      cheques: all.filter((r) => r.method === 'cheque' && r.chequeDueDate && r.chequeDueDate > todayIso()).reduce((s, r) => s + r.amount, 0),
    };
  });

  forLabel(row: { r: Receipt; claim?: { claim: { paymentName: string }; stage?: { n: number; name: string } } }): string {
    if (!row.claim) return this.translate.instant('office.receipts.onAccount');
    return row.claim.stage ? `Phase ${row.claim.stage.n} · ${row.claim.stage.name}` : row.claim.claim.paymentName;
  }

  showVoucher(r: Receipt): void {
    this.voucher = r;
  }

  voucherClient(): string {
    return this.office.clientName(this.voucher?.clientId);
  }

  voucherProject(): string {
    const p = this.office.project(this.voucher?.projectId);
    return p ? `${p.code} · ${p.name}` : '';
  }

  voucherClaim(): string {
    const c = this.office.claimView(this.voucher?.claimId);
    return c ? `${c.claim.no} · ${c.claim.paymentName}` : this.translate.instant('office.receipts.onAccount');
  }

  printVoucher(): void {
    window.print();
  }
}
