import { ProjectReportSnapshot } from '../models/project-report.model';
import { ALL_MILESTONES_STAGE_ID, extractMilestoneStageOptions, filterSnapshotByStage } from './project-report-stage-filter.util';

function snapshot(overrides: Partial<ProjectReportSnapshot> = {}): ProjectReportSnapshot {
  const base: ProjectReportSnapshot = {
    meta: { generatedAt: new Date(2026, 0, 1), generatedByName: 'Tester', failedSections: [], warnings: [] },
    cover: { projectName: 'Project', projectNumber: null, clientName: null, location: null, reportingPeriodLabel: '', asOfDate: new Date(2026, 0, 1) },
    executiveSummary: {
      statusLabel: 'In Progress',
      progressPercent: 50,
      startDate: null,
      endDate: null,
      daysElapsed: null,
      daysRemaining: null,
      budget: null,
      contractValue: null,
      actualExpenditure: null,
      committedAmount: null,
      milestonesTotal: 2,
      milestonesCompleted: null,
      keyMilestones: [
        { order: 1, name: 'Foundation', statusLabel: 'Not tracked' },
        { order: 2, name: 'Structure', statusLabel: 'Not tracked' },
      ],
      risks: [],
    },
    agreement: {
      available: false,
      agreementNumber: null,
      agreementDate: null,
      agreementType: null,
      projectName: null,
      description: null,
      businessSector: null,
      estimatedStartDate: null,
      estimatedEndDate: null,
      contractType: null,
      contractModel: null,
      contractValue: null,
      paymentDetailsAuthorized: false,
      selectedServices: [],
      client: { contactPerson: null, contactPersonPhone: null, representerName: null, representerPhone: null },
      country: null,
      city: null,
      basinName: null,
      basinNumber: null,
      village: null,
      directorate: null,
      plotNumber: null,
      floorNumber: null,
      projectArea: null,
      drillingQuantity: null,
    },
    scope: {
      areas: [],
      milestones: [
        { order: 1, name: 'Foundation', description: null, statusLabel: null, stageLinked: true },
        { order: 2, name: 'Structure', description: null, statusLabel: null, stageLinked: true },
      ],
    },
    contractors: {
      rows: [
        {
          name: 'Contractor A', classification: null, contractorType: null, stageName: 'Foundation',
          contractValue: 1000, startDate: null, endDate: null, totalPaid: 400, remainingBalance: 600, duties: [], payments: [],
        },
        {
          name: 'Contractor B', classification: null, contractorType: null, stageName: 'Structure',
          contractValue: 500, startDate: null, endDate: null, totalPaid: 500, remainingBalance: 0, duties: [], payments: [],
        },
      ],
      totalContractValue: 1500,
      totalPaid: 900,
      totalRemaining: 600,
    },
    suppliers: {
      agreementSuppliers: [],
      agreementQuantityBill: {
        rows: [
          { material: 'Steel', unit: 'ton', quantity: 1, price: 100, subTotal: 100, constructorName: null, supplierName: null, milestoneName: 'Foundation' },
          { material: 'Blocks', unit: 'm²', quantity: 1, price: 50, subTotal: 50, constructorName: null, supplierName: null, milestoneName: 'Structure' },
        ],
        total: 150,
      },
      projectStageBoq: {
        rows: [
          { material: 'Concrete', unit: 'm³', expectedQuantity: 1, actualQuantity: 1, expectedPrice: 40, actualPrice: 40, subTotal: 40, supplierName: null, constructorName: null, stageName: 'Foundation' },
          { material: 'Rebar', unit: 'ton', expectedQuantity: 1, actualQuantity: 1, expectedPrice: 60, actualPrice: 60, subTotal: 60, supplierName: null, constructorName: null, stageName: 'Structure' },
        ],
        total: 100,
      },
      purchaseOrders: {
        rows: [
          { poNumber: 'PO-1', supplierName: null, description: null, unit: null, price: 20, subTotal: 20, statusLabel: null, stageName: 'Foundation' },
          { poNumber: 'PO-2', supplierName: null, description: null, unit: null, price: 30, subTotal: 30, statusLabel: null, stageName: 'Structure' },
        ],
        total: 50,
      },
    },
    financial: {
      authorized: true,
      currencyLabel: 'JOD',
      contractValue: null,
      budget: null,
      boqTotal: 100,
      contractorCommitments: 1500,
      contractorPaid: 900,
      contractorRemaining: 600,
      purchaseOrdersTotal: 50,
      expensesTotal: 0,
      advancesTotal: 0,
      advancesRemaining: 0,
      ownerPaymentsTotal: 0,
      variationOrdersApprovedTotal: 0,
      variationOrdersPendingTotal: 0,
      variationOrdersRejectedTotal: 0,
      paymentClaimAuthorized: false,
      paymentClaimEstimateTotal: null,
      notes: [],
    },
    schedule: {
      plannedStart: null,
      plannedEnd: null,
      asOfDate: new Date(2026, 0, 1),
      daysElapsed: null,
      daysRemaining: null,
      taskCounts: { todo: 0, inProgress: 0, review: 0, completed: 0 },
      stages: [
        { name: 'Foundation', typeLabel: 'Milestone', statusLabel: 'Not tracked' },
        { name: 'Structure', typeLabel: 'Milestone', statusLabel: 'Not tracked' },
      ],
      completedWork: [],
      inProgressWork: [],
      upcomingWork: [],
    },
    siteActivities: { tasks: [], surveyingVisits: [] },
    documents: {
      photos: [
        { fileName: 'foundation.jpg', dataUrl: null, relatedTo: 'Foundation' },
        { fileName: 'structure.jpg', dataUrl: null, relatedTo: 'Structure' },
      ],
      photosOmittedCount: 0,
      documents: [
        { fileName: 'foundation-report.pdf', typeLabel: 'Report', relatedTo: 'Foundation' },
        { fileName: 'unrelated.pdf', typeLabel: 'Report', relatedTo: null },
      ],
    },
    risks: { items: [], missingDataNotes: [] },
    signatures: { preparedByLabel: '', reviewedByLabel: '', approvedByLabel: '' },
  };
  return { ...base, ...overrides };
}

describe('project-report-stage-filter.util', () => {
  describe('extractMilestoneStageOptions', () => {
    it('derives distinct stage-linked names from the snapshot, in first-seen order', () => {
      const options = extractMilestoneStageOptions(snapshot());
      expect(options).toEqual([
        { id: 'Foundation', name: 'Foundation' },
        { id: 'Structure', name: 'Structure' },
      ]);
    });

    it('returns an empty list when nothing is stage-linked (never fabricates options)', () => {
      const options = extractMilestoneStageOptions(
        snapshot({
          scope: { areas: [], milestones: [] },
          contractors: { rows: [], totalContractValue: 0, totalPaid: 0, totalRemaining: 0 },
          suppliers: {
            agreementSuppliers: [],
            agreementQuantityBill: { rows: [], total: 0 },
            projectStageBoq: { rows: [], total: 0 },
            purchaseOrders: { rows: [], total: 0 },
          },
        })
      );
      expect(options).toEqual([]);
    });
  });

  describe('filterSnapshotByStage', () => {
    it('returns the snapshot unchanged for the "all" sentinel or null', () => {
      const source = snapshot();
      expect(filterSnapshotByStage(source, ALL_MILESTONES_STAGE_ID)).toBe(source);
      expect(filterSnapshotByStage(source, null)).toBe(source);
    });

    it('scopes contractors, BOQ, POs and their totals to the selected stage', () => {
      const filtered = filterSnapshotByStage(snapshot(), 'Foundation');
      expect(filtered.contractors.rows.map((r) => r.name)).toEqual(['Contractor A']);
      expect(filtered.contractors.totalContractValue).toBe(1000);
      expect(filtered.suppliers.projectStageBoq.rows.map((r) => r.material)).toEqual(['Concrete']);
      expect(filtered.suppliers.projectStageBoq.total).toBe(40);
      expect(filtered.suppliers.purchaseOrders.rows.map((r) => r.poNumber)).toEqual(['PO-1']);
      expect(filtered.suppliers.purchaseOrders.total).toBe(20);
      expect(filtered.financial.boqTotal).toBe(40);
      expect(filtered.financial.contractorCommitments).toBe(1000);
    });

    it('scopes scope milestones, schedule stages and related documents/photos', () => {
      const filtered = filterSnapshotByStage(snapshot(), 'Structure');
      expect(filtered.scope.milestones.map((m) => m.name)).toEqual(['Structure']);
      expect(filtered.schedule.stages.map((s) => s.name)).toEqual(['Structure']);
      expect(filtered.documents.photos.map((p) => p.fileName)).toEqual(['structure.jpg']);
      expect(filtered.documents.documents).toEqual([]);
    });

    it('produces empty, gracefully-handled sections for a stage with no matching rows', () => {
      const filtered = filterSnapshotByStage(snapshot(), 'Finishing — not in data');
      expect(filtered.contractors.rows).toEqual([]);
      expect(filtered.contractors.totalContractValue).toBe(0);
      expect(filtered.suppliers.projectStageBoq.rows).toEqual([]);
      expect(filtered.suppliers.projectStageBoq.total).toBe(0);
    });
  });
});
