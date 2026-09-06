import { ProjectReportConfig, ProjectReportSectionKey, ProjectReportSnapshot } from '../models/project-report.model';
import { buildProjectReportHtml } from './project-report.builder';

function fakeTranslate(key: string, params?: Record<string, unknown>): string {
  return params ? `${key}:${JSON.stringify(params)}` : key;
}

function baseConfig(overrides: Partial<ProjectReportConfig> = {}): ProjectReportConfig {
  return {
    type: 'full',
    asOfDate: new Date(2026, 2, 1),
    language: 'en',
    includeCompanyHeader: false,
    includeFinancial: true,
    includeDocuments: true,
    includePhotos: true,
    includeSignatures: true,
    confidential: false,
    customSections: [],
    ...overrides,
  };
}

function baseSnapshot(overrides: Partial<ProjectReportSnapshot> = {}): ProjectReportSnapshot {
  return {
    meta: { generatedAt: new Date(2026, 2, 1), generatedByName: 'Jane Engineer', failedSections: [], warnings: [] },
    cover: {
      projectName: 'Villa Construction',
      projectNumber: 'PRJ-001',
      clientName: 'Client A',
      location: 'Amman, Jordan',
      reportingPeriodLabel: 'Mar 2026',
      asOfDate: new Date(2026, 2, 1),
    },
    executiveSummary: {
      statusLabel: 'In Progress',
      progressPercent: 42,
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 5, 1),
      daysElapsed: 60,
      daysRemaining: 90,
      budget: 50000,
      contractValue: null,
      actualExpenditure: 12000,
      committedAmount: 0,
      milestonesTotal: 3,
      milestonesCompleted: null,
      risks: ['No agreement linked'],
    },
    agreement: {
      agreementDate: null,
      businessSector: null,
      description: null,
      drillingQuantity: null,
      client: { contactPerson: null, contactPersonPhone: null, representerName: null, representerPhone: null },
      land: { plotNumber: null, directorate: null, village: null, basinName: null, basinNumber: null, floorNumber: null },
      contract: { contractTypeLabel: null, contractModelLabel: null, monthlyFees: null, percentageFees: null },
      services: [],
    },
    scope: { areas: [], milestones: [] },
    financial: {
      authorized: true,
      currencyLabel: null,
      contractValue: null,
      budget: 50000,
      boqTotal: 3000,
      contractorCommitments: 20000,
      contractorPaid: 8000,
      contractorRemaining: 12000,
      purchaseOrdersTotal: 500,
      expensesTotal: 600,
      advancesTotal: 1000,
      advancesRemaining: 400,
      ownerPaymentsTotal: 0,
      variationOrdersApprovedTotal: 300,
      variationOrdersPendingTotal: 150,
      variationOrdersRejectedTotal: 0,
      paymentClaimAuthorized: true,
      paymentClaimEstimateTotal: 12000,
      notes: [],
    },
    schedule: {
      plannedStart: new Date(2026, 0, 1),
      plannedEnd: new Date(2026, 5, 1),
      asOfDate: new Date(2026, 2, 1),
      daysElapsed: 60,
      daysRemaining: 90,
      taskCounts: { todo: 2, inProgress: 3, review: 1, completed: 4 },
      stages: [],
      inProgressWork: [],
      upcomingWork: [],
    },
    siteActivities: { tasks: [], surveyingVisits: [] },
    documents: { photos: [], photosOmittedCount: 0 },
    signatures: { preparedByLabel: 'Prepared By', reviewedByLabel: 'Reviewed By', approvedByLabel: 'Approved By' },
    ...overrides,
  };
}

const ALL_SECTIONS: Set<ProjectReportSectionKey> = new Set([
  'cover',
  'executiveSummary',
  'agreement',
  'financial',
  'documents',
  'signatures',
]);

describe('project-report.builder', () => {
  describe('HTML escaping', () => {
    it('escapes HTML-unsafe characters from dynamic report data instead of injecting them raw', () => {
      const snapshot = baseSnapshot({
        cover: {
          ...baseSnapshot().cover,
          projectName: '<script>alert(1)</script>',
          clientName: 'A & B "Client"',
        },
      });
      const html = buildProjectReportHtml(snapshot, baseConfig(), ALL_SECTIONS, fakeTranslate);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('A &amp; B &quot;Client&quot;');
    });
  });

  describe('RTL / LTR output', () => {
    it('sets dir="rtl" and lang="ar" for the Arabic report language', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig({ language: 'ar' }), ALL_SECTIONS, fakeTranslate);
      expect(html).toContain('<html lang="ar" dir="rtl">');
    });

    it('sets dir="ltr" and lang="en" for the English report language', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig({ language: 'en' }), ALL_SECTIONS, fakeTranslate);
      expect(html).toContain('<html lang="en" dir="ltr">');
    });
  });

  describe('section selection', () => {
    it('renders only the sections present in the sections set', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig(), new Set(['cover', 'documents']), fakeTranslate);
      expect(html).toContain('cover-page');
      expect(html).toContain('id="documents"');
      expect(html).not.toContain('id="financial"');
      expect(html).not.toContain('id="schedule"');
    });

    it('renders an empty document body (no sections) when the set is empty, without throwing', () => {
      expect(() => buildProjectReportHtml(baseSnapshot(), baseConfig(), new Set(), fakeTranslate)).not.toThrow();
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig(), new Set(), fakeTranslate);
      // The stylesheet always defines `.cover-page` — assert the *element* is absent, not the class name.
      expect(html).not.toContain('<div class="cover-page">');
    });
  });

  describe('agreement section', () => {
    it('renders agreement facts and the scope areas/milestones tables', () => {
      const snapshot = baseSnapshot({
        agreement: {
          agreementDate: new Date(2026, 4, 4),
          businessSector: 'Residential',
          description: 'A 3-storey villa',
          drillingQuantity: 1000,
          client: { contactPerson: 'John Doe', contactPersonPhone: '5551234', representerName: null, representerPhone: null },
          land: { plotNumber: 2553, directorate: 'North Amman', village: 'Jubaiha', basinName: null, basinNumber: null, floorNumber: 4 },
          contract: { contractTypeLabel: 'Management', contractModelLabel: 'Cost Plus', monthlyFees: 0, percentageFees: 8.9 },
          services: ['Excavation', 'Construction'],
        },
        scope: {
          areas: [{ annexName: 'Roof Floor', amount: 200, unitName: 'm²' }],
          milestones: [{ order: 1, name: 'Prep', description: null, statusLabel: null, stageLinked: true }],
        },
      });
      const html = buildProjectReportHtml(snapshot, baseConfig(), ALL_SECTIONS, fakeTranslate);
      expect(html).toContain('id="agreement"');
      expect(html).toContain('Residential');
      expect(html).toContain('John Doe');
      expect(html).toContain('2553');
      expect(html).toContain('Cost Plus');
      expect(html).toContain('Excavation');
      expect(html).toContain('Roof Floor');
      expect(html).toContain('Prep');
    });

    it('omits the agreement section when not selected', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig(), new Set(['cover']), fakeTranslate);
      expect(html).not.toContain('id="agreement"');
    });
  });

  describe('permission-based financial redaction', () => {
    // The financial section render is currently disabled (see project-report.builder.ts) — it renders
    // no content, authorized or not, until it's re-enabled.
    it('renders no financial content — the section is disabled regardless of authorization', () => {
      const snapshot = baseSnapshot({ financial: { ...baseSnapshot().financial, authorized: false } });
      const html = buildProjectReportHtml(snapshot, baseConfig(), ALL_SECTIONS, fakeTranslate);
      expect(html).not.toContain('projectReport.common.restricted');
      expect(html).not.toContain('projectReport.financial.contractAndBudget');
    });
  });

  describe('report-type/config gating', () => {
    it('omits the financial ledger content — the section is disabled regardless of includeFinancial', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig({ includeFinancial: false }), ALL_SECTIONS, fakeTranslate);
      expect(html).not.toContain('projectReport.financial.contractAndBudget');
    });
  });

  describe('zero vs. unavailable rendering', () => {
    it('renders a genuine zero as "0.00" and an unavailable value as the dash placeholder', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig(), ALL_SECTIONS, fakeTranslate);
      // executiveSummary.committedAmount = 0 (genuine zero)
      expect(html).toContain('0.00');
      // executiveSummary.contractValue = null (unavailable) must render as the dash, never "0.00"
      expect(html).toContain('—');
    });
  });

  describe('date and number formatting', () => {
    it('formats currency-like figures with two decimals and thousands separators', () => {
      const html = buildProjectReportHtml(baseSnapshot(), baseConfig(), ALL_SECTIONS, fakeTranslate);
      expect(html).toContain('50,000.00'); // executiveSummary.budget
    });
  });
});
