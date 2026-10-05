import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

import { AgreementDetailsDto, GetProjectStagesSummaryQuery, ProjectClient, ProjectStagesSummaryDto, ProjectStageDetailsDto, ProjectStageDto, ReportClient } from '../../../../../../../nswag/api-client';
import { HasPermissionDirective } from '../../../../../../core/auth/directives/has-permission.directive';
import { AppNumberPipe, formatAppNumber } from '../../../../../../shared/pipes/app-number.pipe';
import { Permissions } from '../../../../../../core/auth/models/auth.models';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import { PrintService } from '../../../../../../shared/services/print.service';
import { buildProjectReportHtml } from '../../builders/project-report.builder';
import {
  ProjectReportConfig,
  ProjectReportLanguage,
  ProjectReportSectionKey,
  ProjectReportSnapshot,
  ProjectReportType,
  PROJECT_REPORT_SECTION_KEYS,
} from '../../models/project-report.model';
import { resolveReportSections } from '../../utilities/project-report-sections.util';
import { resolveTranslationKey } from '../../utilities/project-report-translate.util';
import { buildStageDataTablesHtml, StageDataTableKey, STAGE_DATA_TABLE_OPTIONS } from '../project-report-demo-stage-tables';

interface Option<V> {
  label: string;
  value: V;
}

type DataTypeCardKey = StageDataTableKey | 'photos';

interface DataTypeCard {
  key: DataTypeCardKey;
  badge: string;
  color: string;
  icon: string;
  titleAr: string;
  subtitleAr: string;
  descriptionAr: string;
}

interface MilestoneSummary {
  id: number;
  name: string;
  boq: number;
  mc: number;
  purchaseOrders: number;
  variationOrders: number;
  surveyingVisits: number;
  savings: number;
  expenses: number;
  budget: number;
  actual: number;
  total: number;
  budgetPercentage: number | null;
}
const PHOTOS_CARD: DataTypeCard = {
  key: 'photos', badge: 'IMG', color: '#e11d48', icon: 'pi-images',
  titleAr: 'صور سير العمل', subtitleAr: 'Progress Photos', descriptionAr: 'صور توثيق تنفيذ الأعمال',
};

const REPORT_TYPE_LABELS_AR: Record<ProjectReportType, string> = {
  full: 'تقرير كامل', summary: 'تقرير ملخص', progress: 'تقرير التقدم', financial: 'تقرير مالي', custom: 'تقرير مخصص',
};

const SECTION_LABELS_AR: Record<ProjectReportSectionKey, string> = {
  cover: 'صفحة الغلاف', executiveSummary: 'الملخص التنفيذي', agreement: 'تفاصيل الاتفاقية',
  financial: 'التقرير المالي', documents: 'المستندات وصور سير العمل', signatures: 'الملخص الختامي والتوقيعات',
};

const STATUS_LABELS: Record<string, string> = {
  toDO: 'لم تبدأ', inProgress: 'قيد التنفيذ', review: 'قيد المراجعة', completed: 'مكتملة', approved: 'معتمد', pending: 'قيد الانتظار', rejected: 'مرفوض',
};

@Component({
  selector: 'app-project-report-demo-page',
  standalone: true,
  imports: [FormsModule, ButtonModule, CardModule, SelectModule, CheckboxModule, MultiSelectModule, HasPermissionDirective, AppNumberPipe],
  templateUrl: './project-report-demo-page.component.html',
  styleUrl: './project-report-demo-page.component.scss',
})
export class ProjectReportDemoPageComponent {
  private readonly http = inject(HttpClient);
  private readonly projectClient = inject(ProjectClient);
  private readonly reportClient = inject(ReportClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly printService = inject(PrintService);
  private readonly authService = inject(AuthService);
  readonly Permissions = Permissions;

  get canViewFinanceDetails(): boolean {
    return this.authService.hasPermission(Permissions.ProjectReport.ViewFinanceDetails);
  }

  readonly reportTypeOptions: Option<ProjectReportType>[] = (['full', 'summary', 'progress', 'financial', 'custom'] as ProjectReportType[])
    .map((value) => ({ label: REPORT_TYPE_LABELS_AR[value], value }));
  readonly languageOptions: Option<ProjectReportLanguage>[] = [{ label: 'العربية', value: 'ar' }, { label: 'الإنجليزية', value: 'en' }];
  readonly sectionOptions: Option<ProjectReportSectionKey>[] = PROJECT_REPORT_SECTION_KEYS.map((value) => ({ label: SECTION_LABELS_AR[value], value }));
  readonly dataTypeCards: DataTypeCard[] = [...STAGE_DATA_TABLE_OPTIONS, PHOTOS_CARD];
  enabledStageTables = new Set<StageDataTableKey>(STAGE_DATA_TABLE_OPTIONS.map((option) => option.key));

  projectOptions: Option<number>[] = [];
  stageOptions: Option<number>[] = [];
  selectedProjectId: number | null = null;
  selectedStageIds: number[] = [];
  viewMode: 'detailed' | 'summary' = 'detailed';
  selectedType: ProjectReportType = 'full';
  asOfDate = new Date();
  selectedLanguage: ProjectReportLanguage = 'ar';
  includeCompanyHeader = true;
  includeFinancial = true;
  includeDocuments = true;
  includePhotos = true;
  includeSignatures = true;
  includePercentageFees = true;
  confidential = false;
  customSections: ProjectReportSectionKey[] = [...PROJECT_REPORT_SECTION_KEYS];

  readonly isRendering = signal(false);
  readonly isLoadingProjects = signal(false);
  readonly isLoadingStages = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly previewHtml = signal<SafeHtml | null>(null);
  private details: AgreementDetailsDto | null = null;
  private stage: ProjectStageDetailsDto | null = null;
  private stagesSummary: ProjectStagesSummaryDto[] = [];
  private summaryOwnerPayments: number | null = null;
  private lastGeneratedHtml = '';
  private stageLoadVersion = 0;
  private reportLoadVersion = 0;

  constructor() {
    this.loadProjects();
  }

  get isCustom(): boolean {
    return this.selectedType === 'custom';
  }

  get hasSelectedMilestones(): boolean {
    return this.selectedStageIds.length > 0;
  }

  get milestoneSummaries(): MilestoneSummary[] {
    if (!this.stagesSummary.length && this.stage) {
      const stage = this.stage;
      const sum = (values: (number | undefined)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
      const budget = sum((stage.boqs ?? []).map((item) => item.subTotal));
      const actual = sum((stage.expenses ?? []).map((item) => item.totalAmount));
      return [this.fromStagesSummary(new ProjectStagesSummaryDto({
        id: stage.id, milestone: stage.milestone,
        boqsTotal: budget, expensesTotal: actual,
        mCsTotal: sum((stage.mainContractors ?? []).map((item) => item.amount)),
        pOsTotal: sum((stage.purchaseOrders ?? []).map((item) => item.subTotal)),
        vOsTotal: sum((stage.variationOrders ?? []).map((item) => item.subTotal)),
        sVsTotal: sum((stage.surveyingVisits ?? []).map((item) => item.subTotal)),
        taskSavingsTotal: sum((stage.savingItemTasks ?? []).flatMap((item) => (item.subTasks ?? []).map((subtask) => subtask.cost))),
        budgetPercentage: this.ratio(actual, budget) ?? undefined,
      }))];
    }
    return this.stagesSummary.map((item) => this.fromStagesSummary(item));
  }

  get grandTotal(): MilestoneSummary | null {
    const summaries = this.milestoneSummaries;
    if (!summaries.length) return null;
    const sum = (key: keyof Omit<MilestoneSummary, 'id' | 'name'>) => summaries.reduce((total, item) => total + (item[key] as number), 0);
    const budget = sum('budget');
    const actual = sum('actual');
    return { id: 0, name: 'الإجمالي العام', boq: sum('boq'), mc: sum('mc'), purchaseOrders: sum('purchaseOrders'), variationOrders: sum('variationOrders'), surveyingVisits: sum('surveyingVisits'), savings: sum('savings'), expenses: sum('expenses'), budget, actual, total: sum('total'), budgetPercentage: this.ratio(actual, budget) };
  }

  /** Brief project header shown above the summary (screen + print). */
  get projectInfo(): { label: string; value: string }[] {
    const data = this.details;
    if (!data) return [];
    const date = (value?: Date) => (value ? value.toLocaleDateString('en-GB') : '—');
    const ownerPayments = this.summaryOwnerPayments ?? data.project?.totalOfOwnerPayments ?? 0;
    return [
      { label: 'اسم المشروع', value: data.project?.title ?? data.projectName ?? '—' },
      { label: 'رقم المشروع', value: data.project?.projectNumber ?? data.projectNumber ?? '—' },
      { label: 'المالك', value: data.client?.contactPerson ?? '—' },
      { label: 'تاريخ البداية', value: date(data.project?.startDate ?? data.estimatedStartDate) },
      { label: 'تاريخ النهاية', value: date(data.project?.endDate ?? data.estimatedEndDate) },
      { label: 'دفعات المالك', value: formatAppNumber(ownerPayments) ?? '0' },
    ];
  }

  get percentageFees(): number | null {
    return this.details?.agreementPayment?.monthlyPayment?.percentageFees ?? null;
  }

  /** Engineering office fees = percentageFees% × grand total. */
  get engineeringFees(): number | null {
    if (!this.includePercentageFees || !this.canViewFinanceDetails) return null;
    const total = this.grandTotal;
    const pct = this.percentageFees;
    return total && pct !== null ? (total.total * pct) / 100 : null;
  }

  ratio(actual: number, budget: number): number | null {
    return budget > 0 ? (actual / budget) * 100 : null;
  }

  isCardSelected(key: DataTypeCardKey): boolean {
    return key === 'photos' ? this.includePhotos : this.enabledStageTables.has(key);
  }

  toggleCard(key: DataTypeCardKey): void {
    if (key === 'photos') {
      this.includePhotos = !this.includePhotos;
    } else if (this.enabledStageTables.has(key)) {
      this.enabledStageTables.delete(key);
    } else {
      this.enabledStageTables.add(key);
    }
    this.refresh();
  }

  refresh(): void {
    if (!this.details || !this.stage || this.isRendering()) {
      return;
    }
    this.isRendering.set(true);
    const config: ProjectReportConfig = {
      type: this.selectedType, asOfDate: this.asOfDate, language: this.selectedLanguage,
      includeCompanyHeader: this.includeCompanyHeader, includeFinancial: this.includeFinancial,
      includeDocuments: this.includeDocuments, includePhotos: this.includePhotos,
      includeSignatures: this.includeSignatures, includePercentageFees: this.includePercentageFees && this.canViewFinanceDetails,
      confidential: this.confidential, customSections: this.customSections, companyLogoDataUrl: undefined,
    };

    this.http.get<Record<string, unknown>>(`/assets/i18n/${this.selectedLanguage}.json`).subscribe({
      next: (translations) => {
        const translate = (key: string, params?: Record<string, unknown>) => resolveTranslationKey(translations, key, params);
        const sections = resolveReportSections(config);
        if (!config.includeSignatures) {
          sections.delete('signatures');
        }
        const reportHtml = buildProjectReportHtml(this.buildSnapshot(), config, sections, translate);
        this.lastGeneratedHtml = this.injectStageDataTables(reportHtml);
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(this.lastGeneratedHtml));
        this.isRendering.set(false);
      },
      error: () => {
        this.loadError.set('تعذّر تحميل ترجمات التقرير.');
        this.isRendering.set(false);
      },
    });
  }

  print(): void {
    if (this.lastGeneratedHtml) {
      this.printService.openAndPrint(this.lastGeneratedHtml);
    }
  }

  printSummary(): void {
    const summaries = this.milestoneSummaries;
    const total = this.grandTotal;
    if (!summaries.length || !total) return;

    const escape = (value: string) => value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
    const num = (value: number) => formatAppNumber(value) ?? '0';
    const pct = (value: number | null) => (value === null ? '—' : value.toFixed(2) + '%');
    const projectName = this.projectOptions.find((option) => option.value === this.selectedProjectId)?.label ?? '';
    const rows: [string, (item: MilestoneSummary) => string][] = [
      ['BOQ', (item) => num(item.boq)],
      ['MC', (item) => num(item.mc)],
      ['أوامر الشراء', (item) => num(item.purchaseOrders)],
      ['أوامر التعديل', (item) => num(item.variationOrders)],
      ['زيارات المساحة', (item) => num(item.surveyingVisits)],
      ['بند التوفير', (item) => num(item.savings)],
      ['المصروفات', (item) => num(item.expenses)],
      ['نسبة الفعلي من الميزانية', (item) => pct(item.budgetPercentage)],
    ];
    // Same card layout as the on-screen summary view.
    const cards = summaries
      .map((item) => `<section class="card"><h3>${escape(item.name)}</h3><dl>${rows
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${value(item)}</dd></div>`)
        .join('')}</dl><div class="card-total"><span>Total</span><strong>${num(item.total)}</strong></div></section>`)
      .join('');

    this.printService.openAndPrint(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>ملخص المراحل</title>
<style>
  @page{size:A4;margin:10mm}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#111}
  h1{font-size:18px;margin:0 0 4px} p{margin:0 0 12px;color:#555;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .card{border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;break-inside:avoid}
  .card h3{margin:0 0 8px;font-size:13px;color:#1d4ed8}
  dl{margin:0} dl div{display:flex;justify-content:space-between;gap:6px;padding:4px 0;border-bottom:1px solid #e5e7eb;font-size:11px}
  dt{color:#444} dd{margin:0;font-weight:bold;direction:ltr}
  .card-total{display:flex;justify-content:space-between;margin-top:8px;font-size:12px}
  .card-total strong{color:#1d4ed8;direction:ltr}
  .info{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:11px}
  .info div{display:flex;justify-content:space-between;gap:6px} .info span{color:#555}
  .claim{width:100%;margin-top:12px;border-collapse:collapse;font-size:12px;break-inside:avoid}
  .claim th,.claim td{border:1px solid #cbd5e1;padding:6px 10px;text-align:right} .claim td{text-align:left;font-weight:700;width:35%}
  .claim .sum{background:#eff6ff;color:#1d4ed8}
</style></head><body>
<h1>ملخص المراحل</h1><p>${escape(projectName)} — ${new Date().toLocaleDateString('en-GB')}</p>
<div class="info">${this.projectInfo.map((info) => `<div><span>${info.label}</span><strong>${escape(info.value)}</strong></div>`).join('')}</div>
<div class="grid">${cards}</div>
<table class="claim"><tr><th>BOQ</th><td>${num(total.boq)}</td></tr><tr><th>MC</th><td>${num(total.mc)}</td></tr><tr><th>أوامر التعديل</th><td>${num(total.variationOrders)}</td></tr><tr><th>زيارات المساحة</th><td>${num(total.surveyingVisits)}</td></tr><tr><th>المصروفات</th><td>${num(total.expenses)}</td></tr><tr><th>نسبة الفعلي من إجمالي الميزانية</th><td>${pct(this.ratio(total.actual, total.budget))}</td></tr><tr><th>Grand Total</th><td>${num(total.total)}</td></tr>${!this.includePercentageFees || !this.canViewFinanceDetails || this.engineeringFees === null ? '' : `<tr><th>أتعاب المكتب الهندسي (${this.percentageFees}%)</th><td>${num(this.engineeringFees)}</td></tr><tr class="sum"><th>قيمة المطالبة كاملة</th><td>${num(total.total + this.engineeringFees)}</td></tr>`}</table>
</body></html>`);
  }

  onProjectChange(): void {
    const projectId = this.selectedProjectId;
    this.selectedStageIds = [];
    this.stageOptions = [];
    this.clearReport();
    if (!projectId) return;

    const requestVersion = ++this.stageLoadVersion;
    this.isLoadingStages.set(true);
    this.projectClient.getProjectById(projectId).subscribe({
      next: (response) => {
        if (requestVersion !== this.stageLoadVersion) return;
        this.stageOptions = (response.data?.projectStages ?? [])
          .filter((stage) => stage.id != null && stage.mileStone != null)
          .map((stage) => ({ label: this.getStageLabel(stage), value: stage.id! }));
        this.isLoadingStages.set(false);
        if (!this.stageOptions.length) this.loadError.set('No milestone stages are available for the selected project.');
      },
      error: () => {
        if (requestVersion !== this.stageLoadVersion) return;
        this.isLoadingStages.set(false);
        this.loadError.set('Unable to load the selected project stages.');
      },
    });
  }

  onStageChange(): void {
    if (!this.selectedStageIds.length) {
      this.clearReport();
      return;
    }
    this.viewMode = this.selectedStageIds.length === 1 ? 'detailed' : 'summary';
  }

  // Stage data is fetched only on the "تحديث المعاينة" button, not on every stage pick.
  loadReport(): void {
    const projectId = this.selectedProjectId;
    const projectStageIds = [...this.selectedStageIds];
    if (!projectId || !projectStageIds.length || this.isRendering()) return;
    const requestVersion = ++this.reportLoadVersion;
    this.isRendering.set(true);
    const isSingleStage = projectStageIds.length === 1;
    const request = isSingleStage
      ? this.reportClient.getProjectStageDetails(projectId, projectStageIds[0])
      : this.reportClient.getProjectStagesSummary(new GetProjectStagesSummaryQuery({ projectId, projectStageIds }));
    request.subscribe({
      next: (response) => {
        if (requestVersion !== this.reportLoadVersion) return;
        if (!response.succeeded || !response.data?.project || (isSingleStage && !response.data.project.stage)) {
          this.loadError.set('لم تُرجع الواجهة بيانات إحدى المراحل المطلوبة.');
          this.isRendering.set(false);
          return;
        }
        this.stagesSummary = response.data.project.projectStagesSummary ?? [];
        this.summaryOwnerPayments = response.data.project.totalOfOwnerPayments ?? null;
        this.details = response.data;
        this.stage = isSingleStage ? response.data.project.stage! : null;
        this.lastGeneratedHtml = '';
        this.previewHtml.set(null);
        this.viewMode = isSingleStage ? 'detailed' : 'summary';
        this.loadError.set(null);
        this.isRendering.set(false);
        this.refresh();
      },
      error: () => {
        if (requestVersion !== this.reportLoadVersion) return;
        this.loadError.set('تعذّر تحميل بيانات التقرير من الخادم.');
        this.isRendering.set(false);
      },
    });
  }
  private loadProjects(): void {
    this.isLoadingProjects.set(true);
    this.projectClient.getAllProjects(1, 100, undefined).subscribe({
      next: (response) => {
        this.projectOptions = (response.data?.data ?? [])
          .filter((project) => project.id != null)
          .map((project) => ({ label: project.title || `Project #${project.id}`, value: project.id! }));
        this.isLoadingProjects.set(false);
        if (!this.projectOptions.length) this.loadError.set('No projects are available.');
      },
      error: () => {
        this.isLoadingProjects.set(false);
        this.loadError.set('Unable to load projects.');
      },
    });
  }

  private clearReport(): void {
    this.reportLoadVersion++;
    this.details = null;
    this.stage = null;
    this.stagesSummary = [];
    this.summaryOwnerPayments = null;
    this.lastGeneratedHtml = '';
    this.previewHtml.set(null);
    this.loadError.set(null);
  }

  private getStageLabel(stage: ProjectStageDto): string {
    return stage.mileStone?.name || `Milestone stage #${stage.id}`;
  }

  private fromStagesSummary(item: ProjectStagesSummaryDto): MilestoneSummary {
    const boq = item.boqsTotal ?? 0;
    const expenses = item.expensesTotal ?? 0;
    const mc = item.mCsTotal ?? 0;
    const variationOrders = item.vOsTotal ?? 0;
    const surveyingVisits = item.sVsTotal ?? 0;
    return {
      id: item.id ?? 0, name: item.milestone?.name ?? 'المرحلة رقم ' + (item.id ?? '—'),
      boq, mc, purchaseOrders: item.pOsTotal ?? 0, variationOrders,
      surveyingVisits, savings: item.taskSavingsTotal ?? 0, expenses,
      // Total = MC + VOs + SV + Expenses (savings are not added)
      budget: boq, actual: expenses, total: mc + variationOrders + surveyingVisits + expenses, budgetPercentage: item.budgetPercentage ?? null,
    };
  }

  private buildSnapshot(): ProjectReportSnapshot {
    const data = this.details!;
    const stage = this.stage!;
    const project = data.project;
    const tasks = stage.tasks ?? [];
    const mainContractors = stage.mainContractors ?? [];
    const variationOrders = stage.variationOrders ?? [];
    const advances = stage.advances ?? [];
    const images = [
      ...(data.images ?? []), ...(project?.images ?? []), ...(stage.images ?? []),
      ...tasks.flatMap((task) => task.images ?? []),
    ].filter((image) => !!image.fileUrl);
    const number = (items: Array<number | undefined>) => items.reduce<number>((sum, item) => sum + (item ?? 0), 0);
    const now = this.asOfDate;
    const startDate = project?.startDate ?? data.estimatedStartDate;
    const endDate = project?.endDate ?? data.estimatedEndDate;
    const elapsed = startDate ? Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 86_400_000)) : null;
    const remaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000)) : null;
    const taskCounts = {
      todo: tasks.filter((task) => String(task.status) === 'toDO').length,
      inProgress: tasks.filter((task) => String(task.status) === 'inProgress').length,
      review: tasks.filter((task) => String(task.status) === 'review').length,
      completed: tasks.filter((task) => String(task.status) === 'completed').length,
    };
    const currency = advances.find((advance) => advance.currency)?.currency ?? null;
    const monthlyPayment = data.agreementPayment?.monthlyPayment;
    const milestoneOrders = (data.milestones ?? [])
      .map((milestone) => milestone.order ?? 0)
      .filter((order) => order > 0);
    const currentMilestoneOrder = stage.milestone?.order ?? 0;
    const lastMilestoneOrder = Math.max(0, ...milestoneOrders);
    const milestoneProgressPercent = lastMilestoneOrder > 0 && currentMilestoneOrder > 0
      ? Math.min(100, (currentMilestoneOrder / lastMilestoneOrder) * 100)
      : 0;

    return {
      meta: { generatedAt: new Date(), generatedByName: 'System Administrator', failedSections: [], warnings: [] },
      cover: {
        projectName: project?.title ?? data.projectName ?? '—', projectNumber: project?.projectNumber ?? data.projectNumber ?? null,
        clientName: data.client?.contactPerson ?? null, location: [data.cityName, data.countryName].filter(Boolean).join(', ') || null,
        reportingPeriodLabel: stage.milestone?.name ?? `المرحلة رقم ${stage.id ?? '—'}`, asOfDate: now,
      },
      executiveSummary: {
        statusLabel: STATUS_LABELS[String(project?.status)] ?? String(project?.status ?? '—'), progressPercent: milestoneProgressPercent,
        startDate: startDate ?? null, endDate: endDate ?? null, daysElapsed: elapsed, daysRemaining: remaining,
        budget: project?.budget ?? null, contractValue: monthlyPayment?.amount ?? null,
        actualExpenditure: number((stage.expenses ?? []).map((expense) => expense.totalAmount)),
        committedAmount: number(mainContractors.map((contractor) => contractor.amount)),
        milestonesTotal: data.milestones?.length ?? 0, milestonesCompleted: null, risks: [],
      },
      agreement: {
        projectNumber: data.projectNumber ?? null, projectName: data.projectName ?? null, agreementDate: data.agreementDate ?? null,
        agreementTypeLabel: data.agreementTypeName ?? null, businessSector: data.businessSector ?? null,
        estimatedStartDate: data.estimatedStartDate ?? null, estimatedEndDate: data.estimatedEndDate ?? null,
        country: data.countryName ?? null, city: data.cityName ?? null, projectArea: data.projectArea ?? null,
        description: data.description ?? null, drillingQuantity: data.drillingQuantity ?? null,
        client: {
          contactPerson: data.client?.contactPerson ?? null, contactPersonPhone: data.client?.contactPersonNumber?.toString() ?? null,
          representerName: data.client?.representerName ?? null, representerPhone: data.client?.representerNameNumber?.toString() ?? null,
        },
        land: {
          plotNumber: data.landInformation?.plotNumber ?? null, directorate: data.landInformation?.directorate ?? null,
          village: data.landInformation?.village ?? null, basinName: data.landInformation?.basinName ?? null,
          basinNumber: data.landInformation?.basinNumber ?? null, floorNumber: data.landInformation?.floorNumber ?? null,
        },
        contract: {
          contractTypeLabel: data.agreementPayment?.contractTypeName ?? null, contractModelLabel: data.agreementPayment?.contractModelName ?? null,
          monthlyFees: monthlyPayment?.monthlyFees ?? null, percentageFees: monthlyPayment?.percentageFees ?? null,
        },
        services: (data.services ?? []).map((service) => service.serviceName).filter((name): name is string => !!name),
      },
      scope: {
        areas: (data.projectAreaUnits ?? []).map((area) => ({ annexName: area.annexName ?? '—', amount: area.amount ?? 0, unitName: area.unitName ?? null })),
        milestones: (data.milestones ?? []).map((milestone) => ({ order: milestone.order ?? 0, name: milestone.name ?? '—', description: milestone.description ?? null, statusLabel: null, stageLinked: milestone.id === stage.milestoneId })),
      },
      financial: {
        authorized: true, currencyLabel: currency, contractValue: monthlyPayment?.amount ?? null, budget: project?.budget ?? null,
        boqTotal: number((stage.boqs ?? []).map((boq) => boq.subTotal)), contractorCommitments: number(mainContractors.map((contractor) => contractor.amount)),
        contractorPaid: number(mainContractors.map((contractor) => contractor.totalPayments)), contractorRemaining: number(mainContractors.map((contractor) => (contractor.amount ?? 0) - (contractor.totalPayments ?? 0))),
        purchaseOrdersTotal: number((stage.purchaseOrders ?? []).map((order) => order.subTotal)), expensesTotal: number((stage.expenses ?? []).map((expense) => expense.totalAmount)),
        advancesTotal: number(advances.map((advance) => advance.amount)), advancesRemaining: number(advances.map((advance) => advance.remainingBalance)), ownerPaymentsTotal: project?.totalOfOwnerPayments ?? 0,
        variationOrdersApprovedTotal: number(variationOrders.filter((order) => String(order.status) === 'approved').map((order) => order.subTotal)),
        variationOrdersPendingTotal: number(variationOrders.filter((order) => String(order.status) === 'pending').map((order) => order.subTotal)),
        variationOrdersRejectedTotal: number(variationOrders.filter((order) => String(order.status) === 'rejected').map((order) => order.subTotal)),
        paymentClaimAuthorized: false, paymentClaimEstimateTotal: null, notes: [],
      },
      schedule: {
        plannedStart: startDate ?? null, plannedEnd: endDate ?? null, asOfDate: now, daysElapsed: elapsed, daysRemaining: remaining,
        taskCounts, stages: [{ name: stage.milestone?.name ?? `المرحلة رقم ${stage.id ?? '—'}`, typeLabel: String(stage.stageType ?? '—') }],
        inProgressWork: tasks.filter((task) => String(task.status) === 'inProgress').map((task) => task.title ?? '—'),
        upcomingWork: tasks.filter((task) => String(task.status) === 'toDO').map((task) => task.title ?? '—'),
      },
      siteActivities: {
        tasks: tasks.map((task) => ({ title: task.title ?? '—', statusLabel: STATUS_LABELS[String(task.status)] ?? String(task.status ?? '—'), typeLabel: task.taskTypeName ?? null, responsibility: task.responsibility ? String(task.responsibility) : null, startDate: task.startDate ?? null, endDate: task.endDate ?? null, subtaskCount: task.subTasks?.length ?? 0 })),
        surveyingVisits: (stage.surveyingVisits ?? []).map((visit) => ({ date: visit.visitDate ?? null, surveyor: visit.surveyor ?? null, purpose: visit.purpose ?? null, subTotal: visit.subTotal ?? null })),
      },
      documents: { photos: images.map((image) => ({ fileName: image.originalName ?? image.fileName ?? 'صورة', dataUrl: image.fileUrl ?? null, relatedTo: stage.milestone?.name ?? null })), photosOmittedCount: 0 },
      signatures: { preparedByLabel: 'إعداد التقرير', reviewedByLabel: 'مراجعة التقرير', approvedByLabel: 'اعتماد التقرير' },
    };
  }

  private injectStageDataTables(html: string): string {
    const fragment = `<div style="margin-top:36px;padding-top:22px;">${buildStageDataTablesHtml(this.stage!, this.enabledStageTables, this.details?.project?.paymentFlows ?? [])}</div>`;
    const candidates = [html.indexOf('<section class="report-section" id="signatures"'), html.indexOf('<section class="report-section" id="documents"')].filter((index) => index !== -1);
    const insertAt = candidates.length ? Math.min(...candidates) : html.indexOf('<div class="report-footer">');
    return insertAt === -1 ? html.replace('</body>', `${fragment}</body>`) : `${html.slice(0, insertAt)}${fragment}${html.slice(insertAt)}`;
  }
}
