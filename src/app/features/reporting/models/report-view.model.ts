import { ReportRow } from './report-common.model';
import { ComputedSummary } from './report-summary.model';

/** A togglable column entry for the column selector. */
export interface ColumnToggle {
  key: string;
  header: string;
  visible: boolean;
  mandatory: boolean;
}

/** A materialized group (client-side grouping) ready for the table. */
export interface ReportGroupView {
  key: string;
  title: string;
  count: number;
  summaries: ComputedSummary[];
  rows: ReportRow[];
}

/** Which dataset the visible summaries were computed over. */
export type SummaryScope = 'page' | 'filtered' | 'all';
