import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

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
import {
  ALL_MILESTONES_STAGE_ID,
  extractMilestoneStageOptions,
  filterSnapshotByStage,
} from '../../utilities/project-report-stage-filter.util';
import { resolveTranslationKey } from '../../utilities/project-report-translate.util';
import { buildDemoSnapshot, buildDemoSnapshotPartialFailure, buildDemoSnapshotRestricted, REAL_STAGE_NAME } from '../project-report-demo-data';
import { buildStageDataTablesHtml } from '../project-report-demo-stage-tables';

interface Option<V> {
  label: string;
  value: V;
}

type DemoScenario = 'rich' | 'restricted' | 'partialFailure';

/** Arabic labels for the report-type select — hardcoded (not `| translate`) so this demo page always renders in Arabic regardless of the app's active UI language. */
const REPORT_TYPE_LABELS_AR: Record<ProjectReportType, string> = {
  full: 'تقرير كامل',
  summary: 'تقرير ملخص',
  progress: 'تقرير التقدم',
  financial: 'تقرير مالي',
  custom: 'تقرير مخصص',
};

/** Arabic labels for the section picker — mirrors `projectReport.sections.*` in ar.json. */
const SECTION_LABELS_AR: Record<ProjectReportSectionKey, string> = {
  cover: 'صفحة الغلاف',
  executiveSummary: 'الملخص التنفيذي',
  agreement: 'معلومات الاتفاقية والعقد',
  scope: 'النطاق والمناطق والمراحل',
  financial: 'التقرير المالي',
  siteActivities: 'أنشطة الموقع والمعاينات',
  documents: 'المستندات وصور سير العمل',
  signatures: 'الملخص الختامي والتوقيعات',
};

/**
 * Standalone playground for the Project Document Report feature — renders the
 * same builder/mapper output the real "Print Report" dialog produces, but
 * against a fixed in-memory snapshot instead of a real project, so it works
 * without a backend connection or project data. Useful for reviewing report
 * layout/translations/RTL behavior and the permission-redaction /
 * partial-failure conventions in isolation.
 *
 * This page's own chrome is Arabic-only by design (hardcoded, not driven by
 * `TranslateService`) — it does not follow the app's active UI language.
 */
@Component({
  selector: 'app-project-report-demo-page',
  standalone: true,
  imports: [FormsModule, ButtonModule, CardModule, SelectModule, CheckboxModule, MultiSelectModule],
  templateUrl: './project-report-demo-page.component.html',
  styleUrl: './project-report-demo-page.component.scss',
})
export class ProjectReportDemoPageComponent {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly printService = inject(PrintService);

  readonly scenarioOptions: Option<DemoScenario>[] = [
    { label: 'بيانات كاملة (مصرح بها)', value: 'rich' },
    { label: 'مقيّد (بدون صلاحية مالية)', value: 'restricted' },
    { label: 'فشل جزئي بالبيانات (تعذّر تحميل الاتفاقية)', value: 'partialFailure' },
  ];

  readonly reportTypeOptions: Option<ProjectReportType>[] = (['full', 'summary', 'progress', 'financial', 'custom'] as ProjectReportType[]).map(
    (value) => ({ label: REPORT_TYPE_LABELS_AR[value], value })
  );
  readonly languageOptions: Option<ProjectReportLanguage>[] = [
    { label: 'العربية', value: 'ar' },
    { label: 'الإنجليزية', value: 'en' },
  ];
  readonly sectionOptions: Option<ProjectReportSectionKey>[] = PROJECT_REPORT_SECTION_KEYS.map((value: ProjectReportSectionKey) => ({
    label: SECTION_LABELS_AR[value],
    value,
  }));

  stageOptions: Option<string>[] = [];

  scenario: DemoScenario = 'rich';
  selectedStageId: string = ALL_MILESTONES_STAGE_ID;
  selectedType: ProjectReportType = 'full';
  asOfDate: Date = new Date();
  selectedLanguage: ProjectReportLanguage = 'ar';
  includeCompanyHeader = true;
  includeFinancial = true;
  includeDocuments = true;
  includePhotos = true;
  includeSignatures = true;
  confidential = false;
  customSections: ProjectReportSectionKey[] = [...PROJECT_REPORT_SECTION_KEYS];

  readonly isRendering = signal(false);
  readonly previewHtml = signal<SafeHtml | null>(null);
  private lastGeneratedHtml = '';

  constructor() {
    this.refresh();
  }

  get isCustom(): boolean {
    return this.selectedType === 'custom';
  }

  /** Rebuilds the Milestone Stage picker from whichever scenario is currently selected, resetting the selection if it no longer exists. */
  private refreshStageOptions(baseSnapshot: ProjectReportSnapshot): void {
    this.stageOptions = [
      { label: 'جميع المراحل (All Milestones)', value: ALL_MILESTONES_STAGE_ID },
      ...extractMilestoneStageOptions(baseSnapshot).map((option) => ({ label: option.name, value: option.id })),
    ];
    const stillValid = this.stageOptions.some((option) => option.value === this.selectedStageId);
    if (!stillValid) {
      this.selectedStageId = ALL_MILESTONES_STAGE_ID;
    }
  }

  refresh(): void {
    if (this.isRendering()) {
      return;
    }
    this.isRendering.set(true);

    const baseSnapshot = this.resolveSnapshot();
    this.refreshStageOptions(baseSnapshot);
    const snapshot = filterSnapshotByStage(baseSnapshot, this.selectedStageId);
    const config: ProjectReportConfig = {
      type: this.selectedType,
      asOfDate: this.asOfDate,
      language: this.selectedLanguage,
      includeCompanyHeader: this.includeCompanyHeader,
      includeFinancial: this.includeFinancial,
      includeDocuments: this.includeDocuments,
      includePhotos: this.includePhotos,
      includeSignatures: this.includeSignatures,
      confidential: this.confidential,
      customSections: this.customSections,
      companyLogoDataUrl: undefined,
    };

    this.http.get<Record<string, unknown>>(`/assets/i18n/${this.selectedLanguage}.json`).subscribe({
      next: (translations) => {
        const t = (key: string, params?: Record<string, unknown>) => resolveTranslationKey(translations, key, params);
        const sections = resolveReportSections(config);
        const reportHtml = buildProjectReportHtml(snapshot, config, sections, t);
        const html = this.injectStageDataTables(reportHtml);
        this.lastGeneratedHtml = html;
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
        this.isRendering.set(false);
      },
      error: () => {
        this.isRendering.set(false);
      },
    });
  }

  print(): void {
    if (this.lastGeneratedHtml) {
      this.printService.openAndPrint(this.lastGeneratedHtml);
    }
  }

  /**
   * Splices the color-coded raw-data tables (BOQ/PMC/PO/SV/VO/EXP/ADV) for
   * the demo's one real Milestone Stage right after the Agreement section,
   * so they read as part of the normal report flow instead of a disconnected
   * block bolted onto the front. Falls back to right after `<body>` when the
   * Agreement section itself is excluded from the current report type/custom
   * selection (its `id="agreement"` marker won't be present).
   */
  private injectStageDataTables(html: string): string {
    const fragment = buildStageDataTablesHtml(REAL_STAGE_NAME);
    const agreementStart = html.indexOf('id="agreement"');
    if (agreementStart === -1) {
      return html.replace('<body>', `<body>\n${fragment}`);
    }
    const sectionEnd = html.indexOf('</section>', agreementStart) + '</section>'.length;
    return `${html.slice(0, sectionEnd)}\n${fragment}${html.slice(sectionEnd)}`;
  }

  private resolveSnapshot(): ProjectReportSnapshot {
    switch (this.scenario) {
      case 'restricted':
        return buildDemoSnapshotRestricted();
      case 'partialFailure':
        return buildDemoSnapshotPartialFailure();
      case 'rich':
      default:
        return buildDemoSnapshot();
    }
  }
}
