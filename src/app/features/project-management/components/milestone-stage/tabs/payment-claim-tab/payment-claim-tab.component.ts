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

import { ConfirmationService } from 'primeng/api';
import {
  AgreementClient,
  AgreementPaymentDto,
  ConstructorClient,
  ExpenseClient,
  GetExpenseDto,
  GetProjectSurveyingVisitDto,
  IGetProjectBOQDto,
  IGetProjectMainContractorDto,
  IGetProjectVODto,
  LookupClient,
  LookupType,
  ProjectBOQClient,
  ProjectMainContractorClient,
  ProjectSurveyingVisitClient,
  ProjectVOClient,
} from '../../../../../../../nswag/api-client';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';

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

export type EngineeringOfficeFeeType = 'percentage' | 'fixed' | 'monthly';

export interface EngineeringOfficeFee {
  type: EngineeringOfficeFeeType;
  agreedValue: number;
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
    HasPermissionDirective,
  ],
  providers: [
    ConfirmationService,
    ConstructorClient,
    ProjectBOQClient,
    ProjectMainContractorClient,
    ProjectSurveyingVisitClient,
    ProjectVOClient,
    LookupClient,
    ExpenseClient,
    AgreementClient,
  ],
  templateUrl: './payment-claim-tab.component.html',
  styleUrls: ['./payment-claim-tab.component.scss'],
})
export class PaymentClaimTabComponent implements OnInit {
  readonly permissions = Permissions;
  @Input() projectStageId: number = 0;
  @Input() projectId: string = '';
  @Input() agreementId: number = 0;

  step = signal<'select' | 'preview' | 'confirmed'>('select');
  selectedTypes = signal<Set<ClaimType>>(new Set());
  isLoading = signal(false);
  isConfirmed = signal(false);
  claimDate = new Date();

  claimData = signal<ClaimData>({ boq: [], pmc: [], sv: [], vo: [], exp: [] });
  engineeringOfficeFee = signal<EngineeringOfficeFee | null>(null);
  materialMap: Record<number, string> = {};
  unitMap: Record<number, string> = {};
  contractorMap: Record<number, string> = {};

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
    private lookupClient: LookupClient,
    private constructorClient: ConstructorClient,
    private agreementClient: AgreementClient,
    private confirmationService: ConfirmationService,
    private translate: TranslateService,
    private authService: AuthService
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
      ? this.pmcClient.getByStageId(this.projectStageId, undefined, undefined, 1, 500, undefined).pipe(
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
      ? this.expClient.getByProjectId(this.projectStageId, Number(this.projectId), 1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    const lookups$ = selected.has('BOQ') || selected.has('SV')
      ? this.lookupClient.getAllLookups([LookupType.Material, LookupType.Unit]).pipe(
          map((r) => r.data as Record<string, { id: number; name: string }[]> | undefined),
          catchError(() => of(undefined))
        )
      : of(undefined);

    const constructors$ = selected.has('BOQ') || selected.has('PMC')
      ? this.constructorClient.getAll(1, 500, undefined).pipe(
          map((r) => r.data?.data ?? []),
          catchError(() => of([]))
        )
      : of([]);

    const engineeringOfficeFee$ = this.agreementId > 0
      ? this.agreementClient.getAgreementById(this.agreementId, 2).pipe(
          map((r) => this.extractEngineeringOfficeFee(r.data?.secondStepDto?.agreementPaymentDto)),
          catchError(() => of(null))
        )
      : of(null);

    forkJoin({
      boq: boq$,
      pmc: pmc$,
      sv: sv$,
      vo: vo$,
      exp: exp$,
      lookups: lookups$,
      constructors: constructors$,
      engineeringOfficeFee: engineeringOfficeFee$,
    }).subscribe({
      next: (data) => {
        this.materialMap = this.buildLookupMap(data.lookups?.['material']);
        this.unitMap = this.buildLookupMap(data.lookups?.['unit']);
        this.contractorMap = Object.fromEntries(
          data.constructors
            .filter((contractor) => contractor.id != null && contractor.name)
            .map((contractor) => [contractor.id!, contractor.name!])
        );
        this.claimData.set({
          boq: data.boq,
          pmc: data.pmc,
          sv: data.sv,
          vo: data.vo,
          exp: data.exp,
        } as ClaimData);
        this.engineeringOfficeFee.set(data.engineeringOfficeFee);
        this.claimDate = new Date();
        this.step.set('preview');
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  // ── Confirm Step ────────────────────────────────────────────────────────────

  confirmClaim(): void {
    if (!this.canLock()) return;
    this.confirmationService.confirm({
      message: this.translate.instant('ownerPayment.confirm.message'),
      header: this.translate.instant('ownerPayment.confirm.header'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('ownerPayment.confirm.accept'),
      rejectLabel: this.translate.instant('ownerPayment.confirm.reject'),
      accept: () => {
        this.isConfirmed.set(true);
        this.step.set('confirmed');
      },
    });
  }

  backToSelect(): void {
    if (this.isConfirmed()) return;
    this.step.set('select');
    this.claimData.set({ boq: [], pmc: [], sv: [], vo: [], exp: [] });
    this.engineeringOfficeFee.set(null);
  }

  printClaim(): void {
    if (!this.canPrint()) return;
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
          { text: t('ownerPayment.cols.material'), align: 'left' },
          { text: t('ownerPayment.cols.description'), align: 'left' },
          { text: t('ownerPayment.cols.unit'), align: 'left' },
          { text: t('ownerPayment.cols.qty'),          align: 'right' },
          { text: t('ownerPayment.cols.unitPrice'),    align: 'right' },
          { text: t('ownerPayment.cols.subtotal'),     align: 'right' },
        ],
        rows: data.boq.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td dir="auto">${this.getMaterialName(item)}</td>
           <td dir="auto">${item.description || '—'}</td>
           <td dir="auto">${this.getUnitName(item)}</td>
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
          { text: t('ownerPayment.cols.contractor'), align: 'left' },
          { text: t('ownerPayment.cols.startDate'), align: 'left' },
          { text: t('ownerPayment.cols.endDate'),   align: 'left' },
          { text: t('ownerPayment.cols.amount'),    align: 'right' },
        ],
        rows: data.pmc.map((item, i) => row(i,
          `<td class="center">${i + 1}</td>
           <td dir="auto">${this.getContractorName(item)}</td>
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

    const engineeringFee = this.engineeringOfficeFee();
    if (engineeringFee) {
      const isPercentage = engineeringFee.type === 'percentage';
      sections.push({
        key: 'EOF', title: t('ownerPayment.engineeringOfficeFees.title'),
        itemCount: 1, total: this.engineeringOfficeFeeTotal, badgeColor: '#0891b2',
        headers: [
          { text: t('ownerPayment.engineeringOfficeFees.feeType'), align: 'left' },
          { text: t('ownerPayment.engineeringOfficeFees.agreedValue'), align: 'right' },
          { text: t('ownerPayment.engineeringOfficeFees.calculationBase'), align: 'right' },
          { text: t('ownerPayment.engineeringOfficeFees.feeAmount'), align: 'right' },
        ],
        rows: row(0,
          `<td>${t(this.engineeringOfficeFeeTypeKey)}</td>
           <td class="right bold">${isPercentage ? `${fmtN(engineeringFee.agreedValue)}%` : fmtN(engineeringFee.agreedValue)}</td>
           <td class="right">${isPercentage ? fmtN(this.engineeringOfficeFeeBase) : '&mdash;'}</td>
           <td class="right bold">${fmtN(this.engineeringOfficeFeeTotal)}</td>`
        ),
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

  canLock(): boolean {
    return this.authService.hasPermission(Permissions.PaymentClaims.Lock);
  }

  canPrint(): boolean {
    return this.authService.hasPermission(Permissions.PaymentClaims.Print);
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

  get engineeringOfficeFeeBase(): number {
    return this.pmcTotal + this.expTotal;
  }

  get engineeringOfficeFeeTotal(): number {
    const fee = this.engineeringOfficeFee();
    if (!fee) return 0;

    return fee.type === 'percentage'
      ? this.engineeringOfficeFeeBase * fee.agreedValue / 100
      : fee.agreedValue;
  }

  get engineeringOfficeFeeTypeKey(): string {
    const type = this.engineeringOfficeFee()?.type;
    return `ownerPayment.engineeringOfficeFees.types.${type ?? 'fixed'}`;
  }

  get grandTotal(): number {
    return this.boqTotal + this.pmcTotal + this.svTotal + this.voTotal + this.expTotal + this.engineeringOfficeFeeTotal;
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

  getMaterialName(item: IGetProjectBOQDto): string {
    return this.materialMap[item.materialId ?? 0] || this.readStringProp(item, 'materialName') || '-';
  }

  getUnitName(item: IGetProjectBOQDto | GetProjectSurveyingVisitDto): string {
    return this.unitMap[item.unitId ?? 0] || this.readStringProp(item, 'unitName') || '-';
  }

  getContractorName(item: IGetProjectMainContractorDto | IGetProjectBOQDto): string {
    return this.contractorMap[item.constructorId ?? 0] || this.readStringProp(item, 'constructorName') || this.readStringProp(item, 'contractorName') || '-';
  }

  private buildLookupMap(items?: { id: number; name: string }[]): Record<number, string> {
    return Object.fromEntries((items ?? []).filter((item) => item.id != null && item.name).map((item) => [item.id, item.name]));
  }

  private extractEngineeringOfficeFee(payment?: AgreementPaymentDto): EngineeringOfficeFee | null {
    const fees = payment?.monthlyPaymentDto;
    if (!fees) return null;

    const percentage = this.positiveNumber(fees.percentageFees);
    if (percentage !== null) return { type: 'percentage', agreedValue: percentage };

    const fixed = this.positiveNumber(fees.amount);
    if (fixed !== null) return { type: 'fixed', agreedValue: fixed };

    const monthly = this.positiveNumber(fees.monthlyFees);
    return monthly !== null ? { type: 'monthly', agreedValue: monthly } : null;
  }

  private positiveNumber(value: number | null | undefined): number | null {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
  }

  private readStringProp(item: unknown, prop: string): string {
    const value = (item as Record<string, unknown>)?.[prop];
    return typeof value === 'string' && value.trim() ? value : '';
  }
}
