/**
 * Scopes a `ProjectReportSnapshot` down to a single Milestone Stage. The
 * report model has no numeric stage id at the row level (only the resolved
 * `stageName`/`milestoneName` text — see `findStageName` in the mapper), so
 * the stage name itself is the join key used to filter and to identify
 * options in the picker.
 */
import { ProjectReportSnapshot } from '../models/project-report.model';

/** Sentinel option id meaning "no stage filter — show every stage combined". */
export const ALL_MILESTONES_STAGE_ID = 'all';

export interface ProjectReportStageOption {
  id: string;
  name: string;
}

/**
 * Distinct stage names found among stage-linked scope milestones, in
 * first-seen order. Never hardcoded — a project with a different set of
 * stages simply produces a different option list.
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

  return names.map((name) => ({ id: name, name }));
}

/**
 * Returns a snapshot scoped to `stageId` (a value from `extractMilestoneStageOptions`).
 * Passing `null`/`ALL_MILESTONES_STAGE_ID` returns the snapshot unchanged —
 * the combined, all-stages view. Sections with no per-row stage identity in
 * the current model (financial ledgers, schedule task counts, site-activity
 * tasks, executive summary progress) are left as project-wide figures since
 * they cannot be attributed to one stage.
 */
export function filterSnapshotByStage(snapshot: ProjectReportSnapshot, stageId: string | null): ProjectReportSnapshot {
  if (!stageId || stageId === ALL_MILESTONES_STAGE_ID) {
    return snapshot;
  }

  const matches = (name: string | null): boolean => name === stageId;

  const milestones = snapshot.scope.milestones.filter((milestone) => milestone.name === stageId);
  const stages = snapshot.schedule.stages.filter((stage) => stage.name === stageId);
  const photos = snapshot.documents.photos.filter((photo) => matches(photo.relatedTo));

  return {
    ...snapshot,
    scope: { ...snapshot.scope, milestones },
    schedule: { ...snapshot.schedule, stages },
    documents: { ...snapshot.documents, photos },
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
