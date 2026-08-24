/**
 * Scopes a `ProjectReportSnapshot` down to a single Milestone Stage. The
 * report model has no numeric stage id at the row level (only the resolved
 * `stageName`/`milestoneName` text — see `findStageName` in the mapper), so
 * the stage name itself is the join key used to filter and to identify
 * options in the picker.
 */
import { sumBy } from './project-report-calculations.util';
import { ProjectReportSnapshot } from '../models/project-report.model';

/** Sentinel option id meaning "no stage filter — show every stage combined". */
export const ALL_MILESTONES_STAGE_ID = 'all';

export interface ProjectReportStageOption {
  id: string;
  name: string;
}

/**
 * Distinct stage names found across every stage-scoped part of the snapshot
 * (contractors, project-stage BOQ, purchase orders, stage-linked scope
 * milestones), in first-seen order. Never hardcoded — a project with a
 * different set of stages simply produces a different option list.
 */
export function extractMilestoneStageOptions(snapshot: ProjectReportSnapshot): ProjectReportStageOption[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (name: string | null | undefined): void => {
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  };

  for (const milestone of snapshot.scope.milestones) {
    if (milestone.stageLinked) {
      add(milestone.name);
    }
  }
  for (const row of snapshot.contractors.rows) {
    add(row.stageName);
  }
  for (const row of snapshot.suppliers.projectStageBoq.rows) {
    add(row.stageName);
  }
  for (const row of snapshot.suppliers.purchaseOrders.rows) {
    add(row.stageName);
  }

  return names.map((name) => ({ id: name, name }));
}

/**
 * Returns a snapshot scoped to `stageId` (a value from `extractMilestoneStageOptions`).
 * Passing `null`/`ALL_MILESTONES_STAGE_ID` returns the snapshot unchanged —
 * the combined, all-stages view. Sections with no per-row stage identity in
 * the current model (financial ledgers beyond BOQ/contractors/POs, schedule
 * task counts, site-activity tasks, executive summary progress) are left as
 * project-wide figures since they cannot be attributed to one stage.
 */
export function filterSnapshotByStage(snapshot: ProjectReportSnapshot, stageId: string | null): ProjectReportSnapshot {
  if (!stageId || stageId === ALL_MILESTONES_STAGE_ID) {
    return snapshot;
  }

  const matches = (name: string | null): boolean => name === stageId;

  const contractorRows = snapshot.contractors.rows.filter((row) => matches(row.stageName));
  const boqRows = snapshot.suppliers.projectStageBoq.rows.filter((row) => matches(row.stageName));
  const poRows = snapshot.suppliers.purchaseOrders.rows.filter((row) => matches(row.stageName));
  const quantityBillRows = snapshot.suppliers.agreementQuantityBill.rows.filter((row) => matches(row.milestoneName));
  const milestones = snapshot.scope.milestones.filter((milestone) => milestone.name === stageId);
  const stages = snapshot.schedule.stages.filter((stage) => stage.name === stageId);
  const photos = snapshot.documents.photos.filter((photo) => matches(photo.relatedTo));
  const documents = snapshot.documents.documents.filter((doc) => matches(doc.relatedTo));

  const totalContractValue = sumBy(contractorRows, (row) => row.contractValue);
  const totalPaid = sumBy(contractorRows, (row) => row.totalPaid);
  const totalRemaining = sumBy(contractorRows, (row) => row.remainingBalance);
  const boqTotal = sumBy(boqRows, (row) => row.subTotal);
  const purchaseOrdersTotal = sumBy(poRows, (row) => row.subTotal);
  const quantityBillTotal = sumBy(quantityBillRows, (row) => row.subTotal);

  return {
    ...snapshot,
    scope: { ...snapshot.scope, milestones },
    contractors: { rows: contractorRows, totalContractValue, totalPaid, totalRemaining },
    suppliers: {
      ...snapshot.suppliers,
      agreementQuantityBill: { rows: quantityBillRows, total: quantityBillTotal },
      projectStageBoq: { rows: boqRows, total: boqTotal },
      purchaseOrders: { rows: poRows, total: purchaseOrdersTotal },
    },
    financial: {
      ...snapshot.financial,
      boqTotal,
      contractorCommitments: totalContractValue,
      contractorPaid: totalPaid,
      contractorRemaining: totalRemaining,
      purchaseOrdersTotal,
    },
    schedule: { ...snapshot.schedule, stages },
    documents: { ...snapshot.documents, photos, documents },
    executiveSummary: {
      ...snapshot.executiveSummary,
      milestonesTotal: milestones.length,
      keyMilestones: milestones.map((milestone) => ({
        order: milestone.order,
        name: milestone.name,
        statusLabel: milestone.statusLabel ?? snapshot.executiveSummary.keyMilestones.find((k) => k.name === milestone.name)?.statusLabel ?? '—',
      })),
    },
  };
}
