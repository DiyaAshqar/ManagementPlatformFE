import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

import { AgreementDetailsDto, ProjectStageDetailsDto, ReportClient } from '../../../../../../../nswag/api-client';
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

const PROJECT_ID = 4;
const PROJECT_STAGE_ID = 9;

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
  imports: [FormsModule, ButtonModule, CardModule, SelectModule, CheckboxModule, MultiSelectModule],
  templateUrl: './project-report-demo-page.component.html',
  styleUrl: './project-report-demo-page.component.scss',
})
export class ProjectReportDemoPageComponent {
  private readonly http = inject(HttpClient);
  private readonly reportClient = inject(ReportClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly printService = inject(PrintService);

  readonly reportTypeOptions: Option<ProjectReportType>[] = (['full', 'summary', 'progress', 'financial', 'custom'] as ProjectReportType[])
    .map((value) => ({ label: REPORT_TYPE_LABELS_AR[value], value }));
  readonly languageOptions: Option<ProjectReportLanguage>[] = [{ label: 'العربية', value: 'ar' }, { label: 'الإنجليزية', value: 'en' }];
  readonly sectionOptions: Option<ProjectReportSectionKey>[] = PROJECT_REPORT_SECTION_KEYS.map((value) => ({ label: SECTION_LABELS_AR[value], value }));
  readonly dataTypeCards: DataTypeCard[] = [...STAGE_DATA_TABLE_OPTIONS, PHOTOS_CARD];
  enabledStageTables = new Set<StageDataTableKey>(STAGE_DATA_TABLE_OPTIONS.map((option) => option.key));

  stageOptions: Option<string>[] = [];
  selectedStageId = String(PROJECT_STAGE_ID);
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
  readonly loadError = signal<string | null>(null);
  readonly previewHtml = signal<SafeHtml | null>(null);
  private details: AgreementDetailsDto | null = null;
  private stage: ProjectStageDetailsDto | null = null;
  private lastGeneratedHtml = '';

  constructor() {
    this.loadReport();
  }

  get isCustom(): boolean {
    return this.selectedType === 'custom';
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
      includeSignatures: this.includeSignatures, includePercentageFees: this.includePercentageFees,
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

  private loadReport(): void {
    this.isRendering.set(true);
    this.reportClient.getProjectStageDetails(PROJECT_ID, PROJECT_STAGE_ID).subscribe({
      next: (response) => {
        const stage = response.data?.project?.stage;
        if (!response.succeeded || !response.data || !stage) {
          this.loadError.set(response.message || 'لم تُرجع الواجهة بيانات المرحلة المطلوبة.');
          this.isRendering.set(false);
          return;
        }
        this.details = response.data;
        this.stage = stage;
        this.stageOptions = [{ label: stage.milestone?.name ?? `المرحلة رقم ${stage.id ?? PROJECT_STAGE_ID}`, value: String(stage.id ?? PROJECT_STAGE_ID) }];
        this.selectedStageId = this.stageOptions[0].value;
        this.loadError.set(null);
        this.isRendering.set(false);
        this.refresh();
      },
      error: () => {
        this.loadError.set('تعذّر تحميل بيانات التقرير من الخادم.');
        this.isRendering.set(false);
      },
    });
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
    const totalTasks = tasks.length;
    const completedTasks = taskCounts.completed;
    const currency = advances.find((advance) => advance.currency)?.currency ?? null;
    const monthlyPayment = data.agreementPayment?.monthlyPayment;

    return {
      meta: { generatedAt: new Date(), generatedByName: 'System Administrator', failedSections: [], warnings: [] },
      cover: {
        projectName: project?.title ?? data.projectName ?? '—', projectNumber: project?.projectNumber ?? data.projectNumber ?? null,
        clientName: data.client?.contactPerson ?? null, location: [data.cityName, data.countryName].filter(Boolean).join(', ') || null,
        reportingPeriodLabel: stage.milestone?.name ?? `المرحلة رقم ${stage.id ?? '—'}`, asOfDate: now,
      },
      executiveSummary: {
        statusLabel: STATUS_LABELS[String(project?.status)] ?? String(project?.status ?? '—'), progressPercent: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
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
        advancesTotal: number(advances.map((advance) => advance.amount)), advancesRemaining: number(advances.map((advance) => advance.remainingBalance)), ownerPaymentsTotal: number((project?.paymentFlows ?? []).map((payment) => payment.cash)),
        variationOrdersApprovedTotal: number(variationOrders.filter((order) => String(order.status) === 'approved').map((order) => order.subTotal)),
        variationOrdersPendingTotal: number(variationOrders.filter((order) => String(order.status) === 'pending').map((order) => order.subTotal)),
        variationOrdersRejectedTotal: number(variationOrders.filter((order) => String(order.status) === 'rejected').map((order) => order.subTotal)),
        paymentClaimAuthorized: false, paymentClaimEstimateTotal: null, notes: ['بنود التوفير ومساحات الاهتمام ما زالت بيانات ثابتة مؤقتًا.'],
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