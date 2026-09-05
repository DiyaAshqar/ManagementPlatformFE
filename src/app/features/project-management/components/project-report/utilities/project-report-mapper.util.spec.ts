import {
  AcceptenceStatus,
  AgreementPaymentDto,
  ClassificationProjectMainContractor,
  GetProjectDto,
  MileStonesDto,
  ProjectReportDto,
  ProjectStageType,
  ProjectStatus,
  StatusTask,
} from '../../../../../../nswag/api-client';
import { buildProjectReportSnapshot, RawProjectReportInputs, ReportPermissionFlags } from './project-report-mapper.util';

function fakeTranslate(key: string, params?: Record<string, unknown>): string {
  return params ? `${key}:${JSON.stringify(params)}` : key;
}

const FULL_PERMISSIONS: ReportPermissionFlags = {
  canViewFinancial: true,
  canViewAgreementPayments: true,
  canViewPaymentClaims: true,
  canViewDocuments: true,
};

function baseProject(overrides: Partial<GetProjectDto> = {}): GetProjectDto {
  return {
    id: 1,
    title: 'Villa Construction',
    projectNumber: 'PRJ-001',
    status: ProjectStatus.InProgress,
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 5, 1),
    budget: 50000,
    countTodo: 2,
    countInProgress: 3,
    countReview: 1,
    countCompleted: 4,
    clinet: 'Client A',
    agreementId: 10,
    ...overrides,
  } as unknown as GetProjectDto;
}

function baseReport(overrides: Partial<ProjectReportDto> = {}): ProjectReportDto {
  return {
    project: { id: 1, title: 'Villa Construction', clientName: 'Client A', paymentFlows: [] },
    stages: [{ id: 100, stageType: ProjectStageType.Milestones, milestoneId: 1, milestoneName: 'Foundation' }],
    boqs: [
      { id: 1, projectStageId: 100, materialName: 'Cement', unitName: 'ton', subTotal: 1000, expectedQuantity: 10, actualQuantity: 10, expectedPrice: 100, actualPrice: 100 },
      { id: 2, projectStageId: 100, materialName: 'Steel', unitName: 'ton', subTotal: 2000, expectedQuantity: 5, actualQuantity: 5, expectedPrice: 400, actualPrice: 400 },
    ],
    mainContractors: [
      {
        id: 1,
        projectStageId: 100,
        constructorName: 'ABC Contracting',
        classification: ClassificationProjectMainContractor.MainContractor,
        amount: 20000,
        totalPayments: 8000,
        payments: [{ id: 1, paidAmount: 8000, paymentDate: new Date(2026, 1, 1), receiptNo: 'R-1' }],
        duties: [{ id: 1, dutyTypeName: 'Excavation', unitName: 'm3', quantity: 10, price: 50, subTotal: 500 }],
      },
    ],
    purchaseOrders: [{ id: 1, projectStageId: 100, poNumber: 'PO-1', supplierName: 'Supplier X', subTotal: 500, status: 1 }],
    surveyingVisits: [{ id: 1, projectStageId: 100, surveyor: 'Eng. A', subTotal: 100, status: 2 }],
    variationOrders: [
      { id: 1, projectStageId: 100, voNumber: 'VO-1', subTotal: 300, status: AcceptenceStatus.Approved },
      { id: 2, projectStageId: 100, voNumber: 'VO-2', subTotal: 150, status: AcceptenceStatus.Pending },
    ],
    expenses: [{ id: 1, projectStageId: 100, totalAmount: 600, expenseNo: 'EXP-1' }],
    advances: [{ id: 1, projectStageId: 100, amount: 1000, remainingBalance: 400 }],
    tasks: [
      { id: 1, projectStageId: 100, title: 'Pour foundation', status: StatusTask.Completed },
      { id: 2, projectStageId: 100, title: 'Frame walls', status: StatusTask.InProgress },
      { id: 3, projectStageId: 100, title: 'Plan roofing', status: StatusTask.ToDO },
    ],
    documents: [],
    ...overrides,
  } as unknown as ProjectReportDto;
}

function baseInput(overrides: Partial<RawProjectReportInputs> = {}): RawProjectReportInputs {
  return {
    project: baseProject(),
    report: baseReport(),
    agreement: null,
    agreementAttachments: [],
    lookups: {},
    permissions: FULL_PERMISSIONS,
    generatedByName: 'Jane Engineer',
    asOfDate: new Date(2026, 2, 1),
    language: 'en',
    failedDomains: [],
    photoDataUrls: {},
    translate: fakeTranslate,
    ...overrides,
  };
}

describe('project-report-mapper.util', () => {
  describe('financial totals and double-counting prevention', () => {
    it('computes contractor commitments, paid, and remaining without conflating them with BOQ', () => {
      const snapshot = buildProjectReportSnapshot(baseInput());
      expect(snapshot.financial.boqTotal).toBe(3000); // 1000 + 2000 from baseReport boqs
      expect(snapshot.financial.contractorCommitments).toBe(20000);
      expect(snapshot.financial.contractorPaid).toBe(8000);
      expect(snapshot.financial.contractorRemaining).toBe(12000);
    });

    it('buckets variation orders by status instead of a single blended total', () => {
      const snapshot = buildProjectReportSnapshot(baseInput());
      expect(snapshot.financial.variationOrdersApprovedTotal).toBe(300);
      expect(snapshot.financial.variationOrdersPendingTotal).toBe(150);
      expect(snapshot.financial.variationOrdersRejectedTotal).toBe(0);
    });

    it('includes a payment-claim estimate that documents itself as a computed figure, not a stored entity', () => {
      const snapshot = buildProjectReportSnapshot(baseInput());
      // boq(3000) + contractorPaid(8000) + surveying(100) + approvedVO(300) + expenses(600)
      expect(snapshot.financial.paymentClaimEstimateTotal).toBe(12000);
    });
  });

  describe('zero vs. unavailable', () => {
    it('reports a genuine zero budget as 0, not null', () => {
      const snapshot = buildProjectReportSnapshot(baseInput({ project: baseProject({ budget: 0 }) }));
      expect(snapshot.executiveSummary.budget).toBe(0);
    });

    it('reports an absent budget as null, never coerced to 0', () => {
      const project = baseProject();
      delete (project as { budget?: number }).budget;
      const snapshot = buildProjectReportSnapshot(baseInput({ project }));
      expect(snapshot.executiveSummary.budget).toBeNull();
    });

    it('financial ledgers are a genuine 0 (not null) when the report has no matching rows', () => {
      const snapshot = buildProjectReportSnapshot(baseInput({ report: baseReport({ boqs: [] }) }));
      expect(snapshot.financial.boqTotal).toBe(0);
    });
  });

  describe('agreement contract value', () => {
    it('surfaces the monthly-payment amount as the contract value when the user is authorized', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({
          agreement: {
            agreementId: 10,
            agreementDto: null,
            clientDto: null,
            landInformationDto: null,
            milestones: [],
            areas: null,
            payment: { id: 1, monthlyPaymentDto: { amount: 15000 } } as unknown as AgreementPaymentDto,
            selectedServiceIds: null,
          },
        })
      );
      expect(snapshot.financial.contractValue).toBe(15000);
      expect(snapshot.agreement.contractValue).toBe(15000);
    });
  });

  describe('permission-based redaction', () => {
    it('nulls out contract value and payment-derived fields without Agreements.ViewPaymentDetails', () => {
      const input = baseInput({
        agreement: {
          agreementId: 10,
          agreementDto: null,
          clientDto: null,
          landInformationDto: null,
          milestones: [],
          areas: null,
          payment: { id: 1, monthlyPaymentDto: { amount: 15000 } } as unknown as AgreementPaymentDto,
          selectedServiceIds: [1, 2],
        },
        permissions: { ...FULL_PERMISSIONS, canViewAgreementPayments: false },
      });
      const snapshot = buildProjectReportSnapshot(input);
      expect(snapshot.agreement.contractValue).toBeNull();
      expect(snapshot.agreement.paymentDetailsAuthorized).toBeFalse();
      expect(snapshot.agreement.selectedServices).toEqual([]);
      expect(snapshot.financial.contractValue).toBeNull();
    });

    it('zeroes the financial ledgers without financial view rights', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({ permissions: { ...FULL_PERMISSIONS, canViewFinancial: false } })
      );
      expect(snapshot.financial.authorized).toBeFalse();
      expect(snapshot.financial.boqTotal).toBe(0);
    });

    it('excludes the payment-claim estimate without PaymentClaims.Print even when financial is authorized', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({ permissions: { ...FULL_PERMISSIONS, canViewPaymentClaims: false } })
      );
      expect(snapshot.financial.paymentClaimAuthorized).toBeFalse();
      expect(snapshot.financial.paymentClaimEstimateTotal).toBeNull();
    });

    it('empties the documents/photos section without documents view rights', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({ permissions: { ...FULL_PERMISSIONS, canViewDocuments: false } })
      );
      expect(snapshot.documents.photos).toEqual([]);
    });
  });

  describe('partial API failures', () => {
    it('surfaces failed domains in meta and still produces a usable snapshot from what did load', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({ agreement: null, failedDomains: ['Agreement'] })
      );
      expect(snapshot.meta.failedSections).toContain('Agreement');
      expect(snapshot.agreement.available).toBeFalse();
      // Project-level data (fetched independently) is still present.
      expect(snapshot.cover.projectName).toBe('Villa Construction');
      expect(snapshot.financial.boqTotal).toBe(3000);
    });

    it('degrades gracefully to an empty financial picture when the report bundle itself failed', () => {
      const snapshot = buildProjectReportSnapshot(baseInput({ report: null, failedDomains: ['ProjectReport'] }));
      expect(snapshot.financial.boqTotal).toBe(0);
      expect(snapshot.meta.failedSections).toContain('ProjectReport');
    });
  });

  describe('project status mapping', () => {
    it('maps a completed project status to the completed translation key', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({ project: baseProject({ status: ProjectStatus.Completed }) })
      );
      expect(snapshot.executiveSummary.statusLabel).toBe('projectReport.status.completed');
    });

    it('derives progress percent from task counts (completed / total)', () => {
      // 4 completed out of 10 total (2 todo + 3 inProgress + 1 review + 4 completed) = 40%
      const snapshot = buildProjectReportSnapshot(baseInput());
      expect(snapshot.executiveSummary.progressPercent).toBe(40);
    });
  });

  describe('never fabricates unavailable data', () => {
    it('never invents milestone completion status when the backend does not expose it', () => {
      const snapshot = buildProjectReportSnapshot(
        baseInput({
          agreement: {
            agreementId: 10,
            agreementDto: null,
            clientDto: null,
            landInformationDto: null,
            milestones: [{ id: 1, name: 'Foundation', order: 1 }] as unknown as MileStonesDto[],
            areas: null,
            payment: null,
            selectedServiceIds: null,
          },
        })
      );
      expect(snapshot.scope.milestones[0].statusLabel).toBeNull();
    });

    it('flags that blocked-task tracking is unavailable rather than reporting a fabricated 0', () => {
      const snapshot = buildProjectReportSnapshot(baseInput());
      expect(snapshot.executiveSummary.risks).toContain('projectReport.missingData.blockedTasks');
    });
  });
});
