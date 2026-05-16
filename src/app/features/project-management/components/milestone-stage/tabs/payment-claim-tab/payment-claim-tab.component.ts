import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { buildClaimReport, ClaimReportSection } from './payment-claim-report.builder';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ExpenseClient,
  GetExpenseDto,
  GetProjectSurveyingVisitDto,
  IGetProjectBOQDto,
  IGetProjectMainContractorDto,
  IGetProjectVODto,
  ProjectBOQClient,
  ProjectMainContractorClient,
  ProjectSurveyingVisitClient,
  ProjectVOClient,
} from '../../../../../../../nswag/api-client';

export type ClaimType = 'BOQ' | 'PMC' | 'SV' | 'VO' | 'EXP';

export interface ClaimTypeCard {
  key: ClaimType;
  labelKey: string;
  descKey: string;
  icon: string;
  color: string;
}

export interface ClaimData {
  boq: IGetProjectBOQDto[];
  pmc: IGetProjectMainContractorDto[];
  sv: GetProjectSurveyingVisitDto[];
  vo: IGetProjectVODto[];
  exp: GetExpenseDto[];
}

@Component({
  selector: 'app-payment-claim-tab',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    DividerModule,
    TableModule,
    TagModule,
    TooltipModule,
    ConfirmDialogModule,
  ],
  providers: [
    ConfirmationService,
    ProjectBOQClient,
    ProjectMainContractorClient,
    ProjectSurveyingVisitClient,
    ProjectVOClient,
    ExpenseClient,
  ],
  templateUrl: './payment-claim-tab.component.html',
  styleUrls: ['./payment-claim-tab.component.scss'],
})
export class PaymentClaimTabComponent implements OnInit {
  @Input() projectStageId: number = 0;
  @Input() projectId: string = '';

  step = signal<'select' | 'preview' | 'confirmed'>('select');
  selectedTypes = signal<Set<ClaimType>>(new Set());
  isLoading = signal(false);
  isConfirmed = signal(false);
  claimDate = new Date();

  claimData = signal<ClaimData>({ boq: [], pmc: [], sv: [], vo: [], exp: [] });

  typeCards: ClaimTypeCard[] = [
    {
      key: 'BOQ',
      labelKey: 'ownerPayment.types.boq.label',
      descKey: 'ownerPayment.types.boq.desc',
      icon: 'pi pi-list',
      color: 'blue',
    },
    {
      key: 'PMC',
      labelKey: 'ownerPayment.types.pmc.label',
      descKey: 'ownerPayment.types.pmc.desc',
      icon: 'pi pi-building',
      color: 'green',
    },
    {
      key: 'SV',
      labelKey: 'ownerPayment.types.sv.label',
      descKey: 'ownerPayment.types.sv.desc',
      icon: 'pi pi-map-marker',
      color: 'orange',
    },
    {
      key: 'VO',
      labelKey: 'ownerPayment.types.vo.label',
      descKey: 'ownerPayment.types.vo.desc',
      icon: 'pi pi-receipt',
      color: 'purple',
    },
    {
      key: 'EXP',
      labelKey: 'ownerPayment.types.exp.label',
      descKey: 'ownerPayment.types.exp.desc',
      icon: 'pi pi-wallet',
      color: 'red',
    },
  ];

  constructor(
    private boqClient: ProjectBOQClient,
    private pmcClient: ProjectMainContractorClient,
    private svClient: ProjectSurveyingVisitClient,
    private voClient: ProjectVOClient,
    private expClient: ExpenseClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {}

  // ── Selection Step ──────────────────────────────────────────────────────────

  isTypeSelected(key: ClaimType): boolean {
    return this.selectedTypes().has(key);
  }

  toggleType(key: ClaimType): void {
    if (this.isConfirmed()) return;
    const current = new Set(this.selectedTypes());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedTypes.set(current);
  }

  get hasSelection(): boolean {
    return this.selectedTypes().size > 0;
  }

  // ── Data Loading Step ───────────────────────────────────────────────────────

  generateClaim(): void {
    this.isLoading.set(true);
    const selected = this.selectedTypes();

    const boq$ = selected.has('BOQ')
      ? this.boqClient.getByStageId(this.projectStageId, 1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    const pmc$ = selected.has('PMC')
      ? this.pmcClient.getByStageId(this.projectStageId, 1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    const sv$ = selected.has('SV')
      ? this.svClient.getByStageId(this.projectStageId, 1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    const vo$ = selected.has('VO')
      ? this.voClient.getByStageId(this.projectStageId, 1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    const exp$ = selected.has('EXP')
      ? this.expClient.getByProjectId(Number(this.projectId), 1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    forkJoin({ boq: boq$, pmc: pmc$, sv: sv$, vo: vo$, exp: exp$ }).subscribe({
      next: (data) => {
        this.claimData.set(data as ClaimData);
        this.claimDate = new Date();
        this.step.set('preview');
        this.isLoading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('ownerPayment.errors.loadFailed'),
        });
        this.isLoading.set(false);
      },
    });
  }

  // ── Confirm Step ────────────────────────────────────────────────────────────

  confirmClaim(): void {
    this.confirmationService.confirm({
      message: this.translate.instant('ownerPayment.confirm.message'),
      header: this.translate.instant('ownerPayment.confirm.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('ownerPayment.confirm.accept'),
      rejectLabel: this.translate.instant('ownerPayment.confirm.reject'),
      accept: () => {
        this.isConfirmed.set(true);
        this.step.set('confirmed');
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('ownerPayment.confirm.successTitle'),
          detail: this.translate.instant('ownerPayment.confirm.successMsg'),
        });
      },
    });
  }

  backToSelect(): void {
    if (this.isConfirmed()) return;
    this.step.set('select');
    this.claimData.set({ boq: [], pmc: [], sv: [], vo: [], exp: [] });
  }

  printClaim(): void {
    const t    = (key: string) => this.translate.instant(key);
    const lang = this.translate.currentLang || 'en';
    const isRtl = lang === 'ar';
    const data = this.claimData();
    const sel  = this.selectedTypes();

    const fmtN = (v: number | null | undefined, dec = 2): string =>
      (v ?? 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

    const row = (i: number, cells: string): string =>
      `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${cells}</tr>`;

    const sections: ClaimReportSection[] = [];

    if (sel.has('BOQ') && data.boq.length > 0) {
      sections.push({
        key: 'BOQ', title: t('ownerPayment.types.boq.label'),
        itemCount: data.boq.length, total: this.boqTotal, badgeColor: '#3b82f6',
        headers: [
          { text: '#', align: 'center' },
          { text: t('ownerPayment.cols.description'), align: 'left' },
          { text: t('ownerPayment.cols.qty'),          align: 'right' },
          { text: t('ownerPayment.cols.unitPrice'),    align: 'right' },
          { text: t('ownerPayment.cols.subtotal'),     align: 'right' },
        ],
        rows: data.boq.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td dir="auto">${item.description || '—'}</td>
           <td class="right">${fmtN(item.actualQuantity, 0)}</td>
           <td class="right">${fmtN(item.price)}</td>
           <td class="right bold">${fmtN(item.subTotal)}</td>`
        )).join(''),
      });
    }

    if (sel.has('PMC') && data.pmc.length > 0) {
      sections.push({
        key: 'PMC', title: t('ownerPayment.types.pmc.label'),
        itemCount: data.pmc.length, total: this.pmcTotal, badgeColor: '#22c55e',
        headers: [
          { text: '#', align: 'center' },
          { text: t('ownerPayment.cols.startDate'), align: 'left' },
          { text: t('ownerPayment.cols.endDate'),   align: 'left' },
          { text: t('ownerPayment.cols.amount'),    align: 'right' },
        ],
        rows: data.pmc.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td>${this.formatDate(item.startDate)}</td>
           <td>${this.formatDate(item.endDate)}</td>
           <td class="right bold">${fmtN(item.amount)}</td>`
        )).join(''),
      });
    }

    if (sel.has('SV') && data.sv.length > 0) {
      sections.push({
        key: 'SV', title: t('ownerPayment.types.sv.label'),
        itemCount: data.sv.length, total: this.svTotal, badgeColor: '#f97316',
        headers: [
          { text: '#', align: 'center' },
          { text: t('ownerPayment.cols.visitDate'),  align: 'left' },
          { text: t('ownerPayment.cols.surveyor'),   align: 'left' },
          { text: t('ownerPayment.cols.purpose'),    align: 'left' },
          { text: t('ownerPayment.cols.qty'),        align: 'right' },
          { text: t('ownerPayment.cols.unitPrice'),  align: 'right' },
          { text: t('ownerPayment.cols.subtotal'),   align: 'right' },
        ],
        rows: data.sv.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td>${this.formatDate(item.visitDate)}</td>
           <td dir="auto">${item.surveyor || '—'}</td>
           <td dir="auto">${item.purpose  || '—'}</td>
           <td class="right">${fmtN(item.quantity, 0)}</td>
           <td class="right">${fmtN(item.price)}</td>
           <td class="right bold">${fmtN(item.subTotal)}</td>`
        )).join(''),
      });
    }

    if (sel.has('VO') && data.vo.length > 0) {
      sections.push({
        key: 'VO', title: t('ownerPayment.types.vo.label'),
        itemCount: data.vo.length, total: this.voTotal, badgeColor: '#a855f7',
        headers: [
          { text: '#', align: 'center' },
          { text: t('ownerPayment.cols.voNumber'),   align: 'left' },
          { text: t('ownerPayment.cols.description'), align: 'left' },
          { text: t('ownerPayment.cols.qty'),         align: 'right' },
          { text: t('ownerPayment.cols.unitPrice'),   align: 'right' },
          { text: t('ownerPayment.cols.subtotal'),    align: 'right' },
        ],
        rows: data.vo.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td><span class="badge">${item.voNumber || '—'}</span></td>
           <td dir="auto">${item.description || '—'}</td>
           <td class="right">${fmtN(item.quantity, 0)}</td>
           <td class="right">${fmtN(item.price)}</td>
           <td class="right bold">${fmtN(item.subTotal)}</td>`
        )).join(''),
      });
    }

    if (sel.has('EXP') && data.exp.length > 0) {
      sections.push({
        key: 'EXP', title: t('ownerPayment.types.exp.label'),
        itemCount: data.exp.length, total: this.expTotal, badgeColor: '#ef4444',
        headers: [
          { text: '#', align: 'center' },
          { text: t('ownerPayment.cols.expenseNo'), align: 'left' },
          { text: t('ownerPayment.cols.supplier'),  align: 'left' },
          { text: t('ownerPayment.cols.date'),      align: 'left' },
          { text: t('ownerPayment.cols.notes'),     align: 'left' },
          { text: t('ownerPayment.cols.amount'),    align: 'right' },
        ],
        rows: data.exp.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td><span class="badge">${item.expenseNo || '—'}</span></td>
           <td dir="auto">${item.supplierName || '—'}</td>
           <td>${this.formatDate(item.expenseDate)}</td>
           <td class="muted" dir="auto">${item.notes || '—'}</td>
           <td class="right bold">${fmtN(item.totalAmount)}</td>`
        )).join(''),
      });
    }

    const html = buildClaimReport({
      lang, isRtl,
      isConfirmed: this.isConfirmed(),
      date: this.formatDate(this.claimDate),
      grandTotal: this.grandTotal,
      sections,
      labels: {
        reportTitle:      t('ownerPayment.printHeader'),
        dateLabel:        t('ownerPayment.printDate'),
        confirmedLabel:   t('ownerPayment.confirmed'),
        grandTotalLabel:  t('ownerPayment.grandTotal'),
        itemsLabel:       t('ownerPayment.items'),
        footerText:       `Construction Management Platform \u2014 ${new Date().toLocaleString(lang)}`,
      },
    });

    const win = window.open('', '_blank', 'width=1024,height=800');
    if (!win) { window.print(); return; }
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => setTimeout(() => win.print(), 400));
  }

  // ── Totals ──────────────────────────────────────────────────────────────────

  get boqTotal(): number {
    return this.claimData().boq.reduce((s, i) => s + (i.subTotal ?? 0), 0);
  }

  get pmcTotal(): number {
    return this.claimData().pmc.reduce((s, i) => s + (i.amount ?? 0), 0);
  }

  get svTotal(): number {
    return this.claimData().sv.reduce((s, i) => s + (i.subTotal ?? 0), 0);
  }

  get voTotal(): number {
    return this.claimData().vo.reduce((s, i) => s + (i.subTotal ?? 0), 0);
  }

  get expTotal(): number {
    return this.claimData().exp.reduce((s, i) => s + (i.totalAmount ?? 0), 0);
  }

  get grandTotal(): number {
    return this.boqTotal + this.pmcTotal + this.svTotal + this.voTotal + this.expTotal;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  selectedTypesList(): ClaimType[] {
    return this.typeCards.filter((c) => this.selectedTypes().has(c.key)).map((c) => c.key);
  }
}
