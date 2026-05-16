import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
    window.print();
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
