// Timeframe / Gantt timeline models

export type TimelineScale = 'day' | 'week' | 'month';

export type ContractorStatus = 'not_started' | 'in_progress' | 'delayed' | 'completed';

export interface TimelineContractor {
  id: number;
  name: string;
  contractorType: string;
  zone?: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: ContractorStatus;
  amount?: number;
  totalPayments?: number;
  notes?: string;
  attachments?: TimelineAttachment[];
  dependsOnIds?: number[];
}

export interface TimelinePhase {
  id: number;
  name: string;
  description?: string;
  order: number;
  startDate: Date;
  endDate: Date;
  progress: number;
  contractors: TimelineContractor[];
  expanded?: boolean;
}

export interface TimelineAttachment {
  id: number;
  name: string;
  url: string;
  size: number;
}

export interface TimelineConflict {
  id: string;
  contractorAId: number;
  contractorAName: string;
  contractorBId: number;
  contractorBName: string;
  overlapStart: Date;
  overlapEnd: Date;
  overlapDays: number;
  zone?: string;
  reason: 'date_overlap' | 'zone_overlap' | 'resource_overlap';
}

export interface TimelineRange {
  start: Date;
  end: Date;
  totalDays: number;
}

export interface TimelineTickColumn {
  label: string;
  subLabel?: string;
  start: Date;
  end: Date;
  isToday: boolean;
  isWeekend: boolean;
  isMonthStart: boolean;
}

export interface TimelineFilters {
  search: string;
  contractorIds: number[];
  phaseIds: number[];
  statuses: ContractorStatus[];
  dateRange?: [Date | null, Date | null];
}

export interface TimelineSummary {
  totalPhases: number;
  totalContractors: number;
  totalConflicts: number;
  overallProgress: number;
  delayedContractors: number;
}
