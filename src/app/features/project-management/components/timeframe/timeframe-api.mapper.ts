import {
  AgreementDetailsDto,
  ProjectStageDetailsDto,
  StageMainContractorDetailsDto,
  StatusTask,
  TaskDetailsDto,
} from '../../../../../nswag/api-client';
import { ContractorStatus, TimelineContractor, TimelinePhase, TimelineTask } from './timeframe.model';

/** Id offset for the synthetic "tasks without contractor" row, keeps it clear of real contractor ids. */
const UNASSIGNED_ID_OFFSET = -1_000_000;

/**
 * Maps `Report/project-stages-details` to the Gantt model: stage → main contractors → tasks.
 * A stage spans from its first contractor's start date to its last contractor's end date.
 */
export function mapProjectStagesToTimeline(details: AgreementDetailsDto | undefined, unassignedLabel: string): TimelinePhase[] {
  return (details?.project?.stages ?? [])
    .map((stage) => mapStage(stage, unassignedLabel))
    .filter((phase): phase is TimelinePhase => phase !== null)
    .sort((a, b) => a.order - b.order);
}

function mapStage(stage: ProjectStageDetailsDto, unassignedLabel: string): TimelinePhase | null {
  const tasksById = new Map<number, TaskDetailsDto>();
  (stage.tasks ?? []).forEach((task) => task.id != null && tasksById.set(task.id, task));
  (stage.mainContractors ?? []).forEach((mc) => (mc.tasks ?? []).forEach((task) => task.id != null && tasksById.set(task.id, task)));
  const allTasks = [...tasksById.values()];

  const contractors = (stage.mainContractors ?? [])
    .map((mc) => mapContractor(mc, allTasks.filter((task) => task.projectMainContractorId === mc.id)))
    .filter((c): c is TimelineContractor => c !== null);

  const contractorIds = new Set(contractors.map((c) => c.id));
  const unassigned = allTasks.filter((task) => task.projectMainContractorId == null || !contractorIds.has(task.projectMainContractorId));
  const unassignedRow = buildUnassignedRow(stage, unassigned, unassignedLabel);

  const real = contractors.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const rows = unassignedRow ? [...real, unassignedRow] : real;
  if (!rows.length) return null;

  const spanSource = real.length ? real : rows;
  const startDate = new Date(Math.min(...spanSource.map((c) => c.startDate.getTime())));
  const endDate = new Date(Math.max(...spanSource.map((c) => c.endDate.getTime())));

  return {
    id: stage.id ?? 0,
    name: stage.milestone?.name || `#${stage.id}`,
    description: stage.milestone?.description,
    order: stage.milestone?.order ?? 0,
    startDate,
    endDate,
    progress: average(real.map((c) => c.progress)),
    contractors: rows,
    expanded: true,
  };
}

function mapContractor(mc: StageMainContractorDetailsDto, tasks: TaskDetailsDto[]): TimelineContractor | null {
  const startDate = toDate(mc.startDate);
  const endDate = toDate(mc.endDate);
  if (mc.id == null || !startDate || !endDate) return null;

  const timelineTasks = mapTasks(tasks);
  const progress = timelineTasks.length ? completedRatio(timelineTasks) : 0;
  return {
    id: mc.id,
    name: mc.constructorName || `#${mc.id}`,
    contractorType: mc.contractorTypeName ?? '',
    startDate,
    endDate,
    progress,
    status: deriveStatus(startDate, endDate, progress),
    amount: mc.amount,
    totalPayments: mc.totalPayments,
    tasks: timelineTasks,
    expanded: false,
  };
}

function buildUnassignedRow(stage: ProjectStageDetailsDto, tasks: TaskDetailsDto[], label: string): TimelineContractor | null {
  const timelineTasks = mapTasks(tasks);
  const dated = timelineTasks.filter((t) => t.startDate && t.endDate);
  if (!dated.length) return null;
  const startDate = new Date(Math.min(...dated.map((t) => t.startDate!.getTime())));
  const endDate = new Date(Math.max(...dated.map((t) => t.endDate!.getTime())));
  const progress = completedRatio(timelineTasks);
  return {
    id: UNASSIGNED_ID_OFFSET - (stage.id ?? 0),
    name: label,
    contractorType: '',
    startDate,
    endDate,
    progress,
    status: deriveStatus(startDate, endDate, progress),
    tasks: timelineTasks,
    expanded: false,
    isUnassigned: true,
  };
}

function mapTasks(tasks: TaskDetailsDto[]): TimelineTask[] {
  return tasks
    .map((task) => {
      const startDate = toDate(task.startDate);
      const endDate = toDate(task.endDate);
      const progress = String(task.status) === StatusTask.Completed ? 100 : 0;
      return {
        id: task.id!,
        name: task.title || `#${task.id}`,
        assignee: task.assignToName || task.supplierName || undefined,
        startDate,
        endDate,
        progress,
        status: taskStatus(task.status, startDate, endDate),
      };
    })
    .sort((a, b) => (a.startDate?.getTime() ?? Infinity) - (b.startDate?.getTime() ?? Infinity));
}

function taskStatus(status: StatusTask | undefined, start: Date | null, end: Date | null): ContractorStatus {
  if (String(status) === StatusTask.Completed) return 'completed';
  if (end && end < today()) return 'delayed';
  if (String(status) === StatusTask.InProgress || String(status) === StatusTask.Review) return 'in_progress';
  if (start && start <= today()) return 'in_progress';
  return 'not_started';
}

function deriveStatus(start: Date, end: Date, progress: number): ContractorStatus {
  if (progress >= 100) return 'completed';
  const now = today();
  if (now < start) return 'not_started';
  if (now > end) return 'delayed';
  return 'in_progress';
}

function completedRatio(tasks: TimelineTask[]): number {
  return Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100);
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime()) || date.getFullYear() < 1900) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}
