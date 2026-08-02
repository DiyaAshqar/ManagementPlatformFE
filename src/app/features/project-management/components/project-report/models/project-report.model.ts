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
  | 'scope'
  | 'contractors'
  | 'suppliers'
  | 'financial'
  | 'schedule'
  | 'siteActivities'
  | 'documents'
  | 'risks'
  | 'signatures';

export const PROJECT_REPORT_SECTION_KEYS: readonly ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'agreement',
  'scope',
  'contractors',
  'suppliers',
  'financial',
  'schedule',
  'siteActivities',
  'documents',
  'risks',
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

export interface ReportKeyMilestone {
  order: number;
  name: string;
  statusLabel: string;
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
  keyMilestones: ReportKeyMilestone[];
  /** Plain-text risk/blocker/missing-data notes, already localized. */
  risks: string[];
}

export interface ReportAgreementClientInfo {
  contactPerson: Maybe<string>;
  contactPersonPhone: Maybe<string>;
  representerName: Maybe<string>;
  representerPhone: Maybe<string>;
}

export interface ReportAgreementInfo {
  available: boolean;
  agreementNumber: Maybe<string>;
  agreementDate: Maybe<Date>;
  agreementType: Maybe<string>;
  projectName: Maybe<string>;
  description: Maybe<string>;
  businessSector: Maybe<string>;
  estimatedStartDate: Maybe<Date>;
  estimatedEndDate: Maybe<Date>;
  contractType: Maybe<string>;
  contractModel: Maybe<string>;
  /** `null` when unavailable OR when the current user lacks `Agreements.ViewPaymentDetails`. */
  contractValue: Maybe<number>;
  paymentDetailsAuthorized: boolean;
  selectedServices: string[];
  client: ReportAgreementClientInfo;
  country: Maybe<string>;
  city: Maybe<string>;
  basinName: Maybe<string>;
  basinNumber: Maybe<string>;
  village: Maybe<string>;
  directorate: Maybe<string>;
  plotNumber: Maybe<string>;
  floorNumber: Maybe<string>;
  projectArea: Maybe<number>;
  drillingQuantity: Maybe<number>;
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

export interface ReportContractorDutyRow {
  dutyType: Maybe<string>;
  responsibility: Maybe<string>;
  unit: Maybe<string>;
  quantity: Maybe<number>;
  price: Maybe<number>;
  subTotal: Maybe<number>;
}

export interface ReportContractorPaymentRow {
  date: Maybe<Date>;
  amount: number;
  method: Maybe<string>;
  reference: Maybe<string>;
}

export interface ReportContractorRow {
  name: string;
  classification: Maybe<string>;
  contractorType: Maybe<string>;
  stageName: Maybe<string>;
  contractValue: Maybe<number>;
  startDate: Maybe<Date>;
  endDate: Maybe<Date>;
  totalPaid: number;
  remainingBalance: Maybe<number>;
  duties: ReportContractorDutyRow[];
  payments: ReportContractorPaymentRow[];
}

export interface ReportContractorsSection {
  rows: ReportContractorRow[];
  totalContractValue: number;
  totalPaid: number;
  totalRemaining: number;
}

export interface ReportSupplierAgreementRow {
  supplierName: Maybe<string>;
  materialOrService: Maybe<string>;
  representativeName: Maybe<string>;
}

export interface ReportQuantityBillRow {
  material: Maybe<string>;
  unit: Maybe<string>;
  quantity: Maybe<number>;
  price: Maybe<number>;
  subTotal: number;
  constructorName: Maybe<string>;
  supplierName: Maybe<string>;
  milestoneName: Maybe<string>;
}

export interface ReportBoqRow {
  material: Maybe<string>;
  unit: Maybe<string>;
  expectedQuantity: Maybe<number>;
  actualQuantity: Maybe<number>;
  expectedPrice: Maybe<number>;
  actualPrice: Maybe<number>;
  subTotal: number;
  supplierName: Maybe<string>;
  constructorName: Maybe<string>;
  stageName: Maybe<string>;
}

export interface ReportPurchaseOrderRow {
  poNumber: Maybe<string>;
  supplierName: Maybe<string>;
  description: Maybe<string>;
  unit: Maybe<string>;
  price: Maybe<number>;
  subTotal: number;
  statusLabel: Maybe<string>;
  stageName: Maybe<string>;
}

export interface ReportSuppliersSection {
  agreementSuppliers: ReportSupplierAgreementRow[];
  agreementQuantityBill: { rows: ReportQuantityBillRow[]; total: number };
  projectStageBoq: { rows: ReportBoqRow[]; total: number };
  purchaseOrders: { rows: ReportPurchaseOrderRow[]; total: number };
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
  statusLabel: string;
}

export interface ReportScheduleSection {
  plannedStart: Maybe<Date>;
  plannedEnd: Maybe<Date>;
  asOfDate: Date;
  daysElapsed: Maybe<number>;
  daysRemaining: Maybe<number>;
  taskCounts: ReportTaskCounts;
  stages: ReportStageRow[];
  completedWork: string[];
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
  statusLabel: Maybe<string>;
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

export interface ReportDocumentRow {
  fileName: string;
  typeLabel: string;
  relatedTo: Maybe<string>;
}

export interface ReportDocumentsSection {
  photos: ReportPhoto[];
  photosOmittedCount: number;
  documents: ReportDocumentRow[];
}

export interface ReportRisksSection {
  items: string[];
  missingDataNotes: string[];
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
  agreement: ReportAgreementInfo;
  scope: ReportScopeSection;
  contractors: ReportContractorsSection;
  suppliers: ReportSuppliersSection;
  financial: ReportFinancialSection;
  schedule: ReportScheduleSection;
  siteActivities: ReportSiteActivitiesSection;
  documents: ReportDocumentsSection;
  risks: ReportRisksSection;
  signatures: ReportSignaturesSection;
}
