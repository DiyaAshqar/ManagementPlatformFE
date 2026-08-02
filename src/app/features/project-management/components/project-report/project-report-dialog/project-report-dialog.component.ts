import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';

import { AuthService } from '../../../../../core/auth/services/auth.service';
import { LanguageService } from '../../../../../core/services/language.service';
import { PrintService } from '../../../../../shared/services/print.service';
import { buildProjectReportHtml } from '../builders/project-report.builder';
import {
  ProjectReportConfig,
  ProjectReportLanguage,
  ProjectReportSectionKey,
  ProjectReportType,
  PROJECT_REPORT_SECTION_KEYS,
} from '../models/project-report.model';
import {
  ProjectReportDataService,
  REPORT_DOCUMENTS_VIEW_PERMISSIONS,
  REPORT_FINANCIAL_VIEW_PERMISSIONS,
} from '../services/project-report-data.service';
import { resolveReportSections } from '../utilities/project-report-sections.util';
import { resolveTranslationKey } from '../utilities/project-report-translate.util';

interface Option<V> {
  label: string;
  value: V;
}

const COMPANY_LOGO_PATH = '/assets/logo/LOGO Iconic 1.png';

@Component({
  selector: 'app-project-report-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    DialogModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
    MultiSelectModule,
    ButtonModule,
  ],
  templateUrl: './project-report-dialog.component.html',
  styleUrl: './project-report-dialog.component.scss',
})
export class ProjectReportDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input({ required: true }) projectId!: number;
  @Input() projectName = '';

  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(ProjectReportDataService);
  private readonly printService = inject(PrintService);
  private readonly http = inject(HttpClient);

  reportTypeOptions: Option<ProjectReportType>[] = [];
  languageOptions: Option<ProjectReportLanguage>[] = [];
  sectionOptions: Option<ProjectReportSectionKey>[] = [];

  selectedType: ProjectReportType = 'full';
  asOfDate: Date = new Date();
  selectedLanguage: ProjectReportLanguage = 'en';
  includeCompanyHeader = true;
  includeFinancial = true;
  includeDocuments = true;
  includePhotos = true;
  includeSignatures = true;
  confidential = false;
  customSections: ProjectReportSectionKey[] = [...PROJECT_REPORT_SECTION_KEYS];

  readonly isGenerating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly warningMessage = signal<string | null>(null);

  readonly canViewFinancial = this.authService.hasAnyPermission(REPORT_FINANCIAL_VIEW_PERMISSIONS);
  readonly canViewDocuments = this.authService.hasAnyPermission(REPORT_DOCUMENTS_VIEW_PERMISSIONS);

  private wasVisible = false;

  ngOnChanges(): void {
    const opening = this.visible && !this.wasVisible;
    this.wasVisible = this.visible;
    if (!opening) {
      return;
    }
    this.resetState();
    this.buildOptions();
  }

  get isCustom(): boolean {
    return this.selectedType === 'custom';
  }

  print(): void {
    this.generate();
  }

  downloadPdf(): void {
    this.generate();
  }

  cancel(): void {
    this.close();
  }

  onVisibleChange(value: boolean): void {
    this.visible = value;
    this.visibleChange.emit(value);
  }

  private resetState(): void {
    this.selectedType = 'full';
    this.asOfDate = new Date();
    this.selectedLanguage = (this.languageService.getCurrentLanguage() as ProjectReportLanguage) || 'en';
    this.includeCompanyHeader = true;
    this.includeFinancial = this.canViewFinancial;
    this.includeDocuments = this.canViewDocuments;
    this.includePhotos = this.canViewDocuments;
    this.includeSignatures = true;
    this.confidential = false;
    this.customSections = [...PROJECT_REPORT_SECTION_KEYS];
    this.errorMessage.set(null);
    this.warningMessage.set(null);
  }

  private buildOptions(): void {
    this.reportTypeOptions = (['full', 'summary', 'progress', 'financial', 'custom'] as ProjectReportType[]).map((value) => ({
      label: this.translate.instant(`projectDetail.printDialog.reportTypes.${value}`),
      value,
    }));
    this.languageOptions = [
      { label: this.translate.instant('projectDetail.printDialog.languageEnglish'), value: 'en' },
      { label: this.translate.instant('projectDetail.printDialog.languageArabic'), value: 'ar' },
    ];
    this.sectionOptions = PROJECT_REPORT_SECTION_KEYS.map((value) => ({
      label: this.translate.instant(`projectReport.sections.${value}`),
      value,
    }));
  }

  private close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private generate(): void {
    if (this.isGenerating() || !this.projectId) {
      return;
    }
    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.warningMessage.set(null);

    const baseConfig: Omit<ProjectReportConfig, 'companyLogoDataUrl'> = {
      type: this.selectedType,
      asOfDate: this.asOfDate,
      language: this.selectedLanguage,
      includeCompanyHeader: this.includeCompanyHeader,
      includeFinancial: this.includeFinancial && this.canViewFinancial,
      includeDocuments: this.includeDocuments && this.canViewDocuments,
      includePhotos: this.includePhotos && this.canViewDocuments,
      includeSignatures: this.includeSignatures,
      confidential: this.confidential,
      customSections: this.customSections,
    };

    this.fetchTranslations(this.selectedLanguage)
      .pipe(
        switchMap((translations) => {
          const t = (key: string, params?: Record<string, unknown>) => resolveTranslationKey(translations, key, params);
          return (this.includeCompanyHeader ? this.fetchLogoDataUrl() : of(undefined)).pipe(
            switchMap((logoDataUrl) => {
              const config: ProjectReportConfig = { ...baseConfig, companyLogoDataUrl: logoDataUrl };
              return this.dataService
                .loadSnapshot(this.projectId, { asOfDate: config.asOfDate, language: config.language, translate: t })
                .pipe(map((snapshot) => ({ snapshot, config, t })));
            })
          );
        })
      )
      .subscribe({
        next: ({ snapshot, config, t }) => {
          const sections = resolveReportSections(config);
          const html = buildProjectReportHtml(snapshot, config, sections, t);
          this.isGenerating.set(false);
          if (snapshot.meta.failedSections.length > 0) {
            this.warningMessage.set(this.translate.instant('projectDetail.printDialog.partialDataWarning'));
          }
          this.printService.openAndPrint(html);
          this.close();
        },
        error: () => {
          this.isGenerating.set(false);
          this.errorMessage.set(this.translate.instant('projectDetail.printDialog.loadFailed'));
        },
      });
  }

  /**
   * Fetches the raw translation JSON for a specific language (same convention
   * as the app's `TranslateHttpLoader` — see `createTranslateLoader` in
   * `app.config.ts`) without switching `TranslateService`'s active language.
   * The report language is independent of the current UI language, and
   * `TranslateService` in this ngx-translate version only exposes a specific
   * language's translations via `use()`, which would also switch the whole
   * app's UI language — not acceptable here.
   */
  private fetchTranslations(language: ProjectReportLanguage): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`/assets/i18n/${language}.json`);
  }

  private fetchLogoDataUrl(): Observable<string | undefined> {
    return this.http.get(COMPANY_LOGO_PATH, { responseType: 'blob' }).pipe(
      switchMap(
        (blob) =>
          new Observable<string>((observer) => {
            const reader = new FileReader();
            reader.onload = () => {
              observer.next(reader.result as string);
              observer.complete();
            };
            reader.onerror = (err) => observer.error(err);
            reader.readAsDataURL(blob);
          })
      ),
      catchError(() => of(undefined))
    );
  }
}
