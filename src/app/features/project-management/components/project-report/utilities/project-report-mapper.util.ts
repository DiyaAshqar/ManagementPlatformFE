import {
  AcceptenceStatus,
  AgreementDto,
  AgreementPaymentDto,
  ClientDto,
  GetProjectDto,
  LandInformationDto,
  LookupDto,
  LookupType,
  MileStonesDto,
  ProjectAreaUnitDto,
  ProjectReportDto,
  ProjectReportStageDto,
  ProjectStageType,
  QuantityBillDto,
  Responsibility,
  StatusTask,
  SupplierServiceDto,
} from '../../../../../../nswag/api-client';
import { AttachmentMetaData } from '../../../../../shared/services/attachment.service';
import { getLookupData } from '../../../../../shared/utils/lookup.util';
import {
  Maybe,
  ProjectReportLanguage,
  ProjectReportSnapshot,
  ReportContractorRow,
  ReportDocumentRow,
  ReportFinancialSection,
  ReportPhoto,
  ReportPurchaseOrderRow,
  ReportQuantityBillRow,
  ReportSiteActivityTaskRow,
  ReportSurveyingVisitRow,
} from '../models/project-report.model';
import {
  clampPercent,
  computeElapsedRemaining,
  computeRemainingBalance,
  formatReportDate,
  sumBy,
} from './project-report-calculations.util';

/** Raw dictionary exactly as returned by `LookupClient.getAllLookups` (`StringLookupDtoListDictionaryResponse.data`). */
export type LookupDictionary = { [key: string]: LookupDto[] } | undefined;

/** The agreement's wizard-step payloads relevant to a project report, fetched independently per step. */
export interface RawAgreementBundle {
  agreementId: number;
  agreementDto: AgreementDto | null;
  clientDto: ClientDto | null;
  landInformationDto: LandInformationDto | null;
  milestones: MileStonesDto[] | null;
  areas: ProjectAreaUnitDto[] | null;
  supplierServices: SupplierServiceDto[] | null;
  quantityBill: QuantityBillDto[] | null;
  /** Only populated when the caller holds `Agreements.ViewPaymentDetails` and the fetch succeeded. */
  payment: AgreementPaymentDto | null;
  selectedServiceIds: number[] | null;
}

export interface ReportPermissionFlags {
  /** Gates the dedicated Financial ledger section (BOQ/PO/expenses/advances/owner payments/variation orders). */
  canViewFinancial: boolean;
  /** `Permissions.Agreements.ViewPaymentDetails` — contract value, payment terms, selected services. */
  canViewAgreementPayments: boolean;
  /** `Permissions.PaymentClaims.Print` — the computed payment-claim estimate figure. */
  canViewPaymentClaims: boolean;
  /** `Permissions.MilestoneTabs.ProjectMainContractor` — contractor identities, contracts, payments. */
  canViewContractors: boolean;
  /** `Permissions.Documents.View` (or project documents tab) — document register and photos. */
  canViewDocuments: boolean;
}

export interface RawProjectReportInputs {
  project: GetProjectDto;
  report: ProjectReportDto | null;
  agreement: RawAgreementBundle | null;
  agreementAttachments: AttachmentMetaData[];
  lookups: LookupDictionary;
  permissions: ReportPermissionFlags;
  generatedByName: string;
  asOfDate: Date;
  language: ProjectReportLanguage;
  /** Human-readable labels of data domains whose fetch failed (surfaced verbatim in the report's meta block). */
  failedDomains: string[];
  /** Pre-fetched (best-effort, capped) base64 data URLs for image attachments, keyed by attachment id. */
  photoDataUrls: Record<number, string>;
  translate: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Resolves a lookup id to its display name. Goes through the shared
 * `getLookupData` helper because `/api/Lookup` serializes dictionary keys
 * fully lowercase regardless of the camelCase `LookupType` value requested
 * (e.g. `agreementType` -> `agreementtype`) — a case-insensitive match is
 * required, not a direct property/bracket lookup.
 */
function lookupName(lookups: LookupDictionary, type: LookupType, id: number | undefined | null): string | null {
  if (id === undefined || id === null) {
    return null;
  }
  const match = getLookupData<LookupDto[]>(lookups, type)?.find((item) => item.id === id);
  return match?.name ?? null;
}

function toMaybeDate(value: Date | undefined): Maybe<Date> {
  return value ? new Date(value) : null;
}

function toMaybeNumber(value: number | undefined): Maybe<number> {
  return value === undefined ? null : value;
}

function toMaybeString(value: string | undefined | null): Maybe<string> {
  return value ? value : null;
}

/** Some generated DTO fields (phone/plot/basin/floor numbers) are typed as `number`, not `string`. */
function toMaybeStringFromNumber(value: number | undefined | null): Maybe<string> {
  return value === undefined || value === null ? null : String(value);
}

/** Local mirror of the frontend-only PO status codes (`purchase-orders-tab.component.ts`) — not a backend enum. */
function mapPurchaseOrderStatus(status: number | undefined, translate: RawProjectReportInputs['translate']): Maybe<string> {
  switch (status) {
    case 1:
      return translate('projectReport.purchaseOrders.status.approved');
    case 2:
      return translate('projectReport.purchaseOrders.status.pending');
    case 3:
      return translate('projectReport.purchaseOrders.status.rejected');
    default:
      return null;
  }
}

/** Local mirror of the frontend-only surveying-visit status codes (`surveying-visits-tab.component.ts`). */
function mapVisitStatus(status: number | undefined, translate: RawProjectReportInputs['translate']): Maybe<string> {
  switch (status) {
    case 0:
      return translate('projectReport.surveyingVisits.status.inProgress');
    case 1:
      return translate('projectReport.surveyingVisits.status.scheduled');
    case 2:
      return translate('projectReport.surveyingVisits.status.completed');
    default:
      return null;
  }
}

function mapTaskStatus(status: StatusTask | undefined, translate: RawProjectReportInputs['translate']): string {
  if (!status) {
    return translate('projectReport.common.notAvailable');
  }
  return translate(`projectReport.taskStatus.${status}`);
}

function mapResponsibility(value: Responsibility | undefined, translate: RawProjectReportInputs['translate']): Maybe<string> {
  return value ? translate(`projectReport.responsibility.${value}`) : null;
}

function stageDisplayName(
  stage: Pick<ProjectReportStageDto, 'stageType' | 'milestoneName'> | undefined,
  translate: RawProjectReportInputs['translate']
): string {
  if (!stage) {
    return translate('projectReport.common.notAvailable');
  }
  if (stage.stageType === ProjectStageType.Milestones && stage.milestoneName) {
    return stage.milestoneName;
  }
  return translate(`projectReport.stageType.${stage.stageType}`);
}

function findStageName(
  stages: ProjectReportStageDto[] | undefined,
  stageId: number | undefined,
  translate: RawProjectReportInputs['translate']
): Maybe<string> {
  if (stageId === undefined) {
    return null;
  }
  const stage = stages?.find((s) => s.id === stageId);
  return stage ? stageDisplayName(stage, translate) : null;
}

/** Picks the most frequently occurring currency abbreviation across owner payments/advances; never fabricates a default currency. */
function resolveReportCurrency(report: ProjectReportDto | null): Maybe<string> {
  const counts = new Map<string, number>();
  for (const flow of report?.project?.paymentFlows ?? []) {
    if (flow.currencyAbb) {
      counts.set(flow.currencyAbb, (counts.get(flow.currencyAbb) ?? 0) + 1);
    }
  }
  for (const advance of report?.advances ?? []) {
    if (advance.currency) {
      counts.set(advance.currency, (counts.get(advance.currency) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    return null;
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function buildFinancialSection(input: RawProjectReportInputs): ReportFinancialSection {
  const { report, agreement, permissions, translate } = input;
  const authorized = permissions.canViewFinancial;

  const boqTotal = authorized ? sumBy(report?.boqs ?? [], (b) => b.subTotal) : 0;
  const contractorCommitments = authorized ? sumBy(report?.mainContractors ?? [], (c) => c.amount) : 0;
  const contractorPaid = authorized
    ? sumBy(report?.mainContractors ?? [], (c) => c.totalPayments ?? sumBy(c.payments ?? [], (p) => p.paidAmount))
    : 0;
  const purchaseOrdersTotal = authorized ? sumBy(report?.purchaseOrders ?? [], (po) => po.subTotal) : 0;
  const expensesTotal = authorized ? sumBy(report?.expenses ?? [], (e) => e.totalAmount) : 0;
  const advancesTotal = authorized ? sumBy(report?.advances ?? [], (a) => a.amount) : 0;
  const advancesRemaining = authorized ? sumBy(report?.advances ?? [], (a) => a.remainingBalance) : 0;
  const ownerPaymentsTotal = authorized ? sumBy(report?.project?.paymentFlows ?? [], (p) => p.cash) : 0;

  const variationOrders = authorized ? report?.variationOrders ?? [] : [];
  const variationOrdersApprovedTotal = sumBy(
    variationOrders.filter((vo) => vo.status === AcceptenceStatus.Approved),
    (vo) => vo.subTotal
  );
  const variationOrdersPendingTotal = sumBy(
    variationOrders.filter((vo) => vo.status === AcceptenceStatus.Pending),
    (vo) => vo.subTotal
  );
  const variationOrdersRejectedTotal = sumBy(
    variationOrders.filter((vo) => vo.status === AcceptenceStatus.Rejected),
    (vo) => vo.subTotal
  );

  const paymentClaimAuthorized = authorized && permissions.canViewPaymentClaims;
  let paymentClaimEstimateTotal: Maybe<number> = null;
  const notes: string[] = [];

  if (paymentClaimAuthorized && report) {
    // Mirrors payment-claim-tab.component.ts: BOQ + contractor payments-to-date + surveying visits +
    // approved variation orders + expenses, summed across every stage of the project.
    paymentClaimEstimateTotal =
      boqTotal + contractorPaid + sumBy(report.surveyingVisits ?? [], (v) => v.subTotal) + variationOrdersApprovedTotal + expensesTotal;

    const monthlyPayment = agreement?.payment?.monthlyPaymentDto;
    if (!monthlyPayment?.amount && (monthlyPayment?.percentageFees || monthlyPayment?.monthlyFees)) {
      notes.push(translate('projectReport.financial.notes.engineeringFeeExcluded'));
    }
  }

  if (authorized) {
    notes.push(
      translate('projectReport.financial.notes.ledgersAreSeparate'),
      translate('projectReport.financial.notes.quantityBillVsBoq')
    );
  }

  return {
    authorized,
    currencyLabel: resolveReportCurrency(report),
    contractValue: permissions.canViewAgreementPayments ? toMaybeNumber(agreement?.payment?.monthlyPaymentDto?.amount) : null,
    budget: toMaybeNumber(input.project.budget),
    boqTotal,
    contractorCommitments,
    contractorPaid,
    contractorRemaining: contractorCommitments - contractorPaid,
    purchaseOrdersTotal,
    expensesTotal,
    advancesTotal,
    advancesRemaining,
    ownerPaymentsTotal,
    variationOrdersApprovedTotal,
    variationOrdersPendingTotal,
    variationOrdersRejectedTotal,
    paymentClaimAuthorized,
    paymentClaimEstimateTotal,
    notes,
  };
}

function buildContractorRows(input: RawProjectReportInputs): ReportContractorRow[] {
  const { report, permissions, translate } = input;
  if (!permissions.canViewContractors || !report?.mainContractors) {
    return [];
  }
  return report.mainContractors.map((c) => {
    const totalPaid = c.totalPayments ?? sumBy(c.payments ?? [], (p) => p.paidAmount);
    const contractValue = toMaybeNumber(c.amount);
    return {
      name: c.constructorName ?? translate('projectReport.common.notAvailable'),
      classification: c.classification ? translate(`projectReport.contractors.classification.${c.classification}`) : null,
      contractorType: toMaybeString(c.contractorTypeName),
      stageName: findStageName(report.stages, c.projectStageId, translate),
      contractValue,
      startDate: toMaybeDate(c.startDate),
      endDate: toMaybeDate(c.endDate),
      totalPaid,
      remainingBalance: computeRemainingBalance(contractValue, totalPaid),
      duties: (c.duties ?? []).map((d) => ({
        dutyType: toMaybeString(d.dutyTypeName),
        responsibility: toMaybeString(d.dutyResponsibilityName),
        unit: toMaybeString(d.unitName),
        quantity: toMaybeNumber(d.quantity),
        price: toMaybeNumber(d.price),
        subTotal: toMaybeNumber(d.subTotal),
      })),
      payments: (c.payments ?? []).map((p) => ({
        date: toMaybeDate(p.paymentDate),
        amount: p.paidAmount ?? 0,
        method: null,
        reference: toMaybeString(p.receiptNo ?? p.chequeNo ?? p.transferReferenceNumber),
      })),
    };
  });
}

function buildQuantityBillRows(input: RawProjectReportInputs): { rows: ReportQuantityBillRow[]; total: number } {
  const { agreement, lookups, permissions } = input;
  if (!permissions.canViewFinancial || !agreement?.quantityBill) {
    return { rows: [], total: 0 };
  }
  const milestoneById = new Map((agreement.milestones ?? []).map((m) => [m.id, m.name]));
  const rows: ReportQuantityBillRow[] = agreement.quantityBill.map((q) => {
    const quantity = q.quantity ?? 0;
    const price = q.price ?? 0;
    return {
      material: lookupName(lookups, LookupType.Material, q.materialId),
      unit: lookupName(lookups, LookupType.Unit, q.unitId),
      quantity: toMaybeNumber(q.quantity),
      price: toMaybeNumber(q.price),
      subTotal: quantity * price,
      constructorName: lookupName(lookups, LookupType.Constructor, q.constructorId),
      supplierName: lookupName(lookups, LookupType.Supplier, q.supplierId),
      milestoneName: q.mileStoneId ? toMaybeString(milestoneById.get(q.mileStoneId)) : null,
    };
  });
  return { rows, total: sumBy(rows, (r) => r.subTotal) };
}

function buildBoqRows(input: RawProjectReportInputs) {
  const { report, permissions, translate } = input;
  if (!permissions.canViewFinancial || !report?.boqs) {
    return { rows: [], total: 0 };
  }
  const rows = report.boqs.map((b) => ({
    material: toMaybeString(b.materialName),
    unit: toMaybeString(b.unitName),
    expectedQuantity: toMaybeNumber(b.expectedQuantity),
    actualQuantity: toMaybeNumber(b.actualQuantity),
    expectedPrice: toMaybeNumber(b.expectedPrice),
    actualPrice: toMaybeNumber(b.actualPrice),
    subTotal: b.subTotal ?? 0,
    supplierName: toMaybeString(b.supplierName),
    constructorName: toMaybeString(b.constructorName),
    stageName: findStageName(report.stages, b.projectStageId, translate),
  }));
  return { rows, total: sumBy(rows, (r) => r.subTotal) };
}

function buildPurchaseOrderRows(input: RawProjectReportInputs): { rows: ReportPurchaseOrderRow[]; total: number } {
  const { report, permissions, translate } = input;
  if (!permissions.canViewFinancial || !report?.purchaseOrders) {
    return { rows: [], total: 0 };
  }
  const rows: ReportPurchaseOrderRow[] = report.purchaseOrders.map((po) => ({
    poNumber: toMaybeString(po.poNumber),
    supplierName: toMaybeString(po.supplierName),
    description: toMaybeString(po.description),
    unit: toMaybeString(po.unitName),
    price: toMaybeNumber(po.price),
    subTotal: po.subTotal ?? 0,
    statusLabel: mapPurchaseOrderStatus(po.status, translate),
    stageName: findStageName(report.stages, po.projectStageId, translate),
  }));
  return { rows, total: sumBy(rows, (r) => r.subTotal) };
}

function buildSiteActivityTasks(input: RawProjectReportInputs): ReportSiteActivityTaskRow[] {
  const { report, translate } = input;
  return (report?.tasks ?? []).map((t) => ({
    title: t.title ?? translate('projectReport.common.notAvailable'),
    statusLabel: mapTaskStatus(t.status, translate),
    typeLabel: toMaybeString(t.taskTypeName),
    responsibility: mapResponsibility(t.responsibility, translate),
    startDate: toMaybeDate(t.startDate),
    endDate: toMaybeDate(t.endDate),
    subtaskCount: t.subTasks?.length ?? 0,
  }));
}

function buildSurveyingVisits(input: RawProjectReportInputs): ReportSurveyingVisitRow[] {
  const { report, translate } = input;
  return (report?.surveyingVisits ?? []).map((v) => ({
    date: toMaybeDate(v.visitDate),
    surveyor: toMaybeString(v.surveyor),
    purpose: toMaybeString(v.purpose),
    statusLabel: mapVisitStatus(v.status, translate),
    subTotal: toMaybeNumber(v.subTotal),
  }));
}

const PHOTO_LIMIT = 24;

function buildDocumentsSection(input: RawProjectReportInputs) {
  const { report, agreement, agreementAttachments, permissions, photoDataUrls, translate } = input;
  if (!permissions.canViewDocuments) {
    return { photos: [] as ReportPhoto[], photosOmittedCount: 0, documents: [] as ReportDocumentRow[] };
  }

  const photos: ReportPhoto[] = [];
  const documents: ReportDocumentRow[] = [];
  let photosOmittedCount = 0;

  for (const doc of report?.documents ?? []) {
    const fileName = doc.originalName || doc.fileName || translate('projectReport.common.notAvailable');
    const dataUrl = doc.id !== undefined ? photoDataUrls[doc.id] : undefined;
    if (dataUrl) {
      if (photos.length < PHOTO_LIMIT) {
        photos.push({ fileName, dataUrl, relatedTo: findStageName(report?.stages, doc.relationshipId, translate) });
      } else {
        photosOmittedCount += 1;
      }
    } else {
      documents.push({
        fileName,
        typeLabel: translate(`projectReport.attachmentType.${doc.attachmentType ?? 'other'}`),
        relatedTo: findStageName(report?.stages, doc.relationshipId, translate),
      });
    }
  }

  for (const att of agreementAttachments) {
    const dataUrl = photoDataUrls[att.id];
    if (dataUrl && att.fileType === 'Image') {
      if (photos.length < PHOTO_LIMIT) {
        photos.push({ fileName: att.fileName, dataUrl, relatedTo: translate('projectReport.attachmentType.agreement') });
      } else {
        photosOmittedCount += 1;
      }
    } else {
      documents.push({
        fileName: att.fileName,
        typeLabel: translate('projectReport.attachmentType.agreement'),
        relatedTo: agreement?.agreementDto?.projectName ? toMaybeString(agreement.agreementDto.projectName) : null,
      });
    }
  }

  return { photos, photosOmittedCount, documents };
}

/**
 * Pure mapper: raw DTOs + permissions + i18n → the canonical, section-agnostic
 * `ProjectReportSnapshot`. No HTTP, no Angular DI — everything the caller
 * needs (translate function, resolved locale, pre-fetched photo data URLs)
 * is passed in, so this function is deterministic and unit-testable.
 */
export function buildProjectReportSnapshot(input: RawProjectReportInputs): ProjectReportSnapshot {
  const { project, report, agreement, permissions, translate, language, asOfDate, lookups } = input;

  const startDate = toMaybeDate(project.startDate);
  const endDate = toMaybeDate(project.endDate);
  const { elapsed, remaining } = computeElapsedRemaining(startDate, endDate, asOfDate);

  const totalTaskCount =
    (project.countTodo ?? 0) + (project.countInProgress ?? 0) + (project.countReview ?? 0) + (project.countCompleted ?? 0);
  const progressPercent = totalTaskCount > 0 ? clampPercent(((project.countCompleted ?? 0) / totalTaskCount) * 100) : 0;

  const financial = buildFinancialSection(input);
  const contractorRows = buildContractorRows(input);
  const quantityBill = buildQuantityBillRows(input);
  const boq = buildBoqRows(input);
  const purchaseOrders = buildPurchaseOrderRows(input);
  const siteActivityTasks = buildSiteActivityTasks(input);
  const rawTasks = report?.tasks ?? [];

  const milestoneStages = (report?.stages ?? []).filter((s) => s.stageType === ProjectStageType.Milestones);
  const missingDataNotes: string[] = [];
  if (!agreement) {
    missingDataNotes.push(translate('projectReport.missingData.noAgreement'));
  }
  missingDataNotes.push(translate('projectReport.missingData.milestoneStatus'));
  missingDataNotes.push(translate('projectReport.missingData.blockedTasks'));
  for (const domain of input.failedDomains) {
    missingDataNotes.push(translate('projectReport.missingData.domainFailed', { domain }));
  }

  const committedAmount = financial.authorized ? financial.boqTotal + financial.contractorCommitments + financial.purchaseOrdersTotal : null;
  const actualExpenditure = financial.authorized ? financial.contractorPaid + financial.expensesTotal + financial.purchaseOrdersTotal : null;

  return {
    meta: {
      generatedAt: new Date(),
      generatedByName: input.generatedByName,
      failedSections: input.failedDomains,
      warnings: [],
    },
    cover: {
      projectName: report?.project?.title || project.title || '',
      projectNumber: toMaybeString(project.projectNumber),
      clientName: toMaybeString(report?.project?.clientName ?? project.clinet),
      location: [
        toMaybeString(agreement?.landInformationDto?.village),
        lookupName(lookups, LookupType.City, agreement?.agreementDto?.cityId),
        lookupName(lookups, LookupType.Country, agreement?.agreementDto?.countryId),
      ]
        .filter((part): part is string => !!part)
        .join(', ') || null,
      reportingPeriodLabel: formatReportDate(asOfDate, language),
      asOfDate,
    },
    executiveSummary: {
      statusLabel: translate(`projectReport.status.${project.status}`),
      progressPercent,
      startDate,
      endDate,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      budget: toMaybeNumber(project.budget),
      contractValue: financial.contractValue,
      actualExpenditure,
      committedAmount,
      milestonesTotal: milestoneStages.length || (agreement?.milestones?.length ?? 0),
      milestonesCompleted: null,
      keyMilestones: (agreement?.milestones ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .slice(0, 8)
        .map((m) => ({
          order: m.order ?? 0,
          name: m.name ?? translate('projectReport.common.notAvailable'),
          statusLabel: translate('projectReport.missingData.milestoneStatusShort'),
        })),
      risks: missingDataNotes,
    },
    agreement: {
      available: !!agreement,
      agreementNumber: toMaybeString(agreement?.agreementDto?.projectNumber),
      agreementDate: toMaybeDate(agreement?.agreementDto?.agreementDate),
      agreementType: lookupName(lookups, LookupType.AgreementType, agreement?.agreementDto?.agreementTypeId),
      projectName: toMaybeString(agreement?.agreementDto?.projectName),
      description: toMaybeString(agreement?.agreementDto?.description),
      businessSector: toMaybeString(agreement?.agreementDto?.businessSector),
      estimatedStartDate: toMaybeDate(agreement?.agreementDto?.estimatedStartDate),
      estimatedEndDate: toMaybeDate(agreement?.agreementDto?.estimatedEndDate),
      contractType: permissions.canViewAgreementPayments ? lookupName(lookups, LookupType.ContractType, agreement?.payment?.contractTypeId) : null,
      contractModel: permissions.canViewAgreementPayments ? lookupName(lookups, LookupType.ContractModel, agreement?.payment?.contractModelId) : null,
      contractValue: financial.contractValue,
      paymentDetailsAuthorized: permissions.canViewAgreementPayments,
      selectedServices: permissions.canViewAgreementPayments
        ? (agreement?.selectedServiceIds ?? [])
            .map((id) => lookupName(lookups, LookupType.Service, id))
            .filter((name): name is string => !!name)
        : [],
      client: {
        contactPerson: toMaybeString(agreement?.clientDto?.contactPerson),
        contactPersonPhone: toMaybeStringFromNumber(agreement?.clientDto?.contactPersonNumber),
        representerName: toMaybeString(agreement?.clientDto?.representerName),
        representerPhone: toMaybeStringFromNumber(agreement?.clientDto?.representerNameNumber),
      },
      country: lookupName(lookups, LookupType.Country, agreement?.agreementDto?.countryId),
      city: lookupName(lookups, LookupType.City, agreement?.agreementDto?.cityId),
      basinName: toMaybeString(agreement?.landInformationDto?.basinName),
      basinNumber: toMaybeStringFromNumber(agreement?.landInformationDto?.basinNumber),
      village: toMaybeString(agreement?.landInformationDto?.village),
      directorate: toMaybeString(agreement?.landInformationDto?.directorate),
      plotNumber: toMaybeStringFromNumber(agreement?.landInformationDto?.plotNumber),
      floorNumber: toMaybeStringFromNumber(agreement?.landInformationDto?.floorNumber),
      projectArea: toMaybeNumber(agreement?.agreementDto?.projectArea),
      drillingQuantity: toMaybeNumber(agreement?.agreementDto?.drillingQuantity),
    },
    scope: {
      areas: (agreement?.areas ?? []).map((a) => ({
        annexName: lookupName(lookups, LookupType.Annex, a.annexId) ?? translate('projectReport.common.notAvailable'),
        amount: a.amount,
        unitName: lookupName(lookups, LookupType.Unit, a.unitId),
      })),
      milestones: (agreement?.milestones ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((m) => ({
          order: m.order ?? 0,
          name: m.name ?? translate('projectReport.common.notAvailable'),
          description: toMaybeString(m.description),
          statusLabel: null,
          stageLinked: !!report?.stages?.some((s) => s.milestoneId === m.id),
        })),
    },
    contractors: {
      rows: contractorRows,
      totalContractValue: sumBy(contractorRows, (r) => r.contractValue),
      totalPaid: sumBy(contractorRows, (r) => r.totalPaid),
      totalRemaining: sumBy(contractorRows, (r) => r.remainingBalance),
    },
    suppliers: {
      agreementSuppliers: financial.authorized
        ? (agreement?.supplierServices ?? []).map((s) => ({
            supplierName: lookupName(lookups, LookupType.Supplier, s.supplierId),
            materialOrService: lookupName(lookups, LookupType.Material, s.materialId),
            representativeName: toMaybeString(s.representativeName),
          }))
        : [],
      agreementQuantityBill: quantityBill,
      projectStageBoq: boq,
      purchaseOrders,
    },
    financial,
    schedule: {
      plannedStart: startDate,
      plannedEnd: endDate,
      asOfDate,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      taskCounts: {
        todo: project.countTodo ?? 0,
        inProgress: project.countInProgress ?? 0,
        review: project.countReview ?? 0,
        completed: project.countCompleted ?? 0,
      },
      stages: (report?.stages ?? []).map((s) => ({
        name: stageDisplayName(s, translate),
        typeLabel: translate(`projectReport.stageType.${s.stageType}`),
        statusLabel: translate('projectReport.missingData.milestoneStatusShort'),
      })),
      completedWork: rawTasks.filter((t) => t.status === StatusTask.Completed).map((t) => t.title ?? translate('projectReport.common.notAvailable')),
      inProgressWork: rawTasks.filter((t) => t.status === StatusTask.InProgress).map((t) => t.title ?? translate('projectReport.common.notAvailable')),
      upcomingWork: rawTasks.filter((t) => t.status === StatusTask.ToDO).map((t) => t.title ?? translate('projectReport.common.notAvailable')),
    },
    siteActivities: {
      tasks: siteActivityTasks,
      surveyingVisits: buildSurveyingVisits(input),
    },
    documents: buildDocumentsSection(input),
    risks: {
      items: [],
      missingDataNotes,
    },
    signatures: {
      preparedByLabel: translate('projectReport.signatures.preparedBy'),
      reviewedByLabel: translate('projectReport.signatures.reviewedBy'),
      approvedByLabel: translate('projectReport.signatures.approvedBy'),
    },
  };
}
