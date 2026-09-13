/**
 * Typed data contracts for the Project Document Report feature.
 *
 * `Maybe<T>` distinguishes "unavailable" (`null`) from a real, possibly-zero
 * value — callers must never substitute a fabricated default for `null`.
 */
export type Maybe<T> = T | null;

export type ProjectReportType = 'full' | 'summary' | 'progress' | 'financial' | 'custom';
export type ProjectReportLanguage = 'en' | 'ar';

export type ProjectReportSectionKey =
  | 'cover'
  | 'executiveSummary'
  | 'agreement'
  | 'financial'
  | 'documents'
  | 'signatures';

export const PROJECT_REPORT_SECTION_KEYS: readonly ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'agreement',
  'financial',
  'documents',
  'signatures',
];

/** User-facing configuration collected by the report dialog. */
export interface ProjectReportConfig {
  type: ProjectReportType;
  /** Reporting cutoff — schedule/progress figures are computed "as of" this date. */
  asOfDate: Date;
  language: ProjectReportLanguage;
  includeCompanyHeader: boolean;
  includeFinancial: boolean;
  includeDocuments: boolean;
  includePhotos: boolean;
  includeSignatures: boolean;
  /** Shows/hides the contract's percentage-fees figure within the Agreement Details section. */
  includePercentageFees: boolean;
  confidential: boolean;
  /** Only consulted when `type === 'custom'`. */
  customSections: ProjectReportSectionKey[];
  /** Pre-fetched base64 data URL for the app logo; set by the dialog only when `includeCompanyHeader` is true. */
  companyLogoDataUrl?: string;
}

export interface ReportMetaInfo {
  generatedAt: Date;
  generatedByName: string;
  /** Human-readable labels of data domains that failed to load (partial-failure transparency). */
  failedSections: string[];
  /** Additional non-fatal notes (e.g. permission redactions, mock-data warnings). */
  warnings: string[];
}

export interface ReportCoverData {
  projectName: string;
  projectNumber: Maybe<string>;
  clientName: Maybe<string>;
  location: Maybe<string>;
  reportingPeriodLabel: string;
  asOfDate: Date;
}

export interface ReportExecutiveSummary {
  statusLabel: string;
  progressPercent: number;
  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  daysElapsed: Maybe<number>;
  daysRemaining: Maybe<number>;
  budget: Maybe<number>;
  contractValue: Maybe<number>;
  actualExpenditure: Maybe<number>;
  committedAmount: Maybe<number>;
  milestonesTotal: number;
  /** `null` — the backend does not currently expose per-milestone completion status; never fabricated as 0. */
  milestonesCompleted: Maybe<number>;
  /** Plain-text risk/blocker/missing-data notes, already localized. */
  risks: string[];
}

export interface ReportAreaUnitRow {
  annexName: string;
  amount: number;
  unitName: Maybe<string>;
}

export interface ReportMilestoneRow {
  order: number;
  name: string;
  description: Maybe<string>;
  statusLabel: Maybe<string>;
  stageLinked: boolean;
}

export interface ReportScopeSection {
  areas: ReportAreaUnitRow[];
  milestones: ReportMilestoneRow[];
}

export interface ReportAgreementClientInfo {
  contactPerson: Maybe<string>;
  contactPersonPhone: Maybe<string>;
  representerName: Maybe<string>;
  representerPhone: Maybe<string>;
}

export interface ReportAgreementLandInfo {
  plotNumber: Maybe<number>;
  directorate: Maybe<string>;
  village: Maybe<string>;
  basinName: Maybe<string>;
  basinNumber: Maybe<number>;
  floorNumber: Maybe<number>;
}

export interface ReportAgreementContractInfo {
  contractTypeLabel: Maybe<string>;
  contractModelLabel: Maybe<string>;
  monthlyFees: Maybe<number>;
  percentageFees: Maybe<number>;
}

/** The agreement's own facts (wizard steps 1-2) — areas/milestones (steps 3-4) live in `ReportScopeSection`. */
export interface ReportAgreementSection {
  projectNumber: Maybe<string>;
  projectName: Maybe<string>;
  agreementDate: Maybe<Date>;
  agreementTypeLabel: Maybe<string>;
  businessSector: Maybe<string>;
  estimatedStartDate: Maybe<Date>;
  estimatedEndDate: Maybe<Date>;
  country: Maybe<string>;
  city: Maybe<string>;
  projectArea: Maybe<number>;
  description: Maybe<string>;
  drillingQuantity: Maybe<number>;
  client: ReportAgreementClientInfo;
  land: ReportAgreementLandInfo;
  contract: ReportAgreementContractInfo;
  services: string[];
}

export interface ReportFinancialSection {
  authorized: boolean;
  currencyLabel: Maybe<string>;
  contractValue: Maybe<number>;
  budget: Maybe<number>;
  boqTotal: number;
  contractorCommitments: number;
  contractorPaid: number;
  contractorRemaining: number;
  purchaseOrdersTotal: number;
  expensesTotal: number;
  advancesTotal: number;
  advancesRemaining: number;
  ownerPaymentsTotal: number;
  variationOrdersApprovedTotal: number;
  variationOrdersPendingTotal: number;
  variationOrdersRejectedTotal: number;
  paymentClaimAuthorized: boolean;
  paymentClaimEstimateTotal: Maybe<number>;
  /** Localized calculation-rule notes rendered under the ledgers (double-counting guardrails). */
  notes: string[];
}

export interface ReportTaskCounts {
  todo: number;
  inProgress: number;
  review: number;
  completed: number;
}

export interface ReportStageRow {
  name: string;
  typeLabel: string;
}

export interface ReportScheduleSection {
  plannedStart: Maybe<Date>;
  plannedEnd: Maybe<Date>;
  asOfDate: Date;
  daysElapsed: Maybe<number>;
  daysRemaining: Maybe<number>;
  taskCounts: ReportTaskCounts;
  stages: ReportStageRow[];
  inProgressWork: string[];
  upcomingWork: string[];
}

export interface ReportSiteActivityTaskRow {
  title: string;
  statusLabel: string;
  typeLabel: Maybe<string>;
  responsibility: Maybe<string>;
  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  subtaskCount: number;
}

export interface ReportSurveyingVisitRow {
  date: Maybe<Date>;
  surveyor: Maybe<string>;
  purpose: Maybe<string>;
  subTotal: Maybe<number>;
}

export interface ReportSiteActivitiesSection {
  tasks: ReportSiteActivityTaskRow[];
  surveyingVisits: ReportSurveyingVisitRow[];
}

export interface ReportPhoto {
  fileName: string;
  dataUrl: Maybe<string>;
  relatedTo: Maybe<string>;
}

export interface ReportDocumentsSection {
  photos: ReportPhoto[];
  photosOmittedCount: number;
}

export interface ReportSignaturesSection {
  preparedByLabel: string;
  reviewedByLabel: string;
  approvedByLabel: string;
}

/** The canonical, immutable snapshot every report variant is derived (filtered) from. */
export interface ProjectReportSnapshot {
  meta: ReportMetaInfo;
  cover: ReportCoverData;
  executiveSummary: ReportExecutiveSummary;
  agreement: ReportAgreementSection;
  scope: ReportScopeSection;
  financial: ReportFinancialSection;
  schedule: ReportScheduleSection;
  siteActivities: ReportSiteActivitiesSection;
  documents: ReportDocumentsSection;
  signatures: ReportSignaturesSection;
}
