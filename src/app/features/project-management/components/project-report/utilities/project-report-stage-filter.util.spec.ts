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
        { name: 'Foundation', typeLabel: 'Milestone' },
        { name: 'Structure', typeLabel: 'Milestone' },
      ],
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
    },
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
      const options = extractMilestoneStageOptions(snapshot({ scope: { areas: [], milestones: [] } }));
      expect(options).toEqual([]);
    });
  });

  describe('filterSnapshotByStage', () => {
    it('returns the snapshot unchanged for the "all" sentinel or null', () => {
      const source = snapshot();
      expect(filterSnapshotByStage(source, ALL_MILESTONES_STAGE_ID)).toBe(source);
      expect(filterSnapshotByStage(source, null)).toBe(source);
    });

    it('leaves financial ledgers as project-wide figures when scoping to a stage', () => {
      const filtered = filterSnapshotByStage(snapshot(), 'Foundation');
      expect(filtered.financial.boqTotal).toBe(100);
      expect(filtered.financial.contractorCommitments).toBe(1500);
    });

    it('scopes scope milestones, schedule stages and related documents/photos', () => {
      const filtered = filterSnapshotByStage(snapshot(), 'Structure');
      expect(filtered.scope.milestones.map((m) => m.name)).toEqual(['Structure']);
      expect(filtered.schedule.stages.map((s) => s.name)).toEqual(['Structure']);
      expect(filtered.documents.photos.map((p) => p.fileName)).toEqual(['structure.jpg']);
    });

    it('produces empty, gracefully-handled milestones/stages for a stage with no matching rows', () => {
      const filtered = filterSnapshotByStage(snapshot(), 'Finishing — not in data');
      expect(filtered.scope.milestones).toEqual([]);
      expect(filtered.schedule.stages).toEqual([]);
    });
  });
});
