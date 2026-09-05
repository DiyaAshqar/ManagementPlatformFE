import { ProjectReportConfig, ProjectReportSectionKey } from '../models/project-report.model';

/**
 * Per-variant section sets. `cover` and `executiveSummary` are the report's
 * front matter and are always included for the non-custom variants — a
 * document without a cover/summary isn't a usable report. `custom` is the
 * only variant where the caller's selection is authoritative.
 */
const FULL_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'agreement',
  'scope',
  'financial',
  'schedule',
  'siteActivities',
  'documents',
  'signatures',
];

const SUMMARY_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'agreement',
  'scope',
  'financial',
  'signatures',
];

const PROGRESS_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'scope',
  'schedule',
  'siteActivities',
  'documents',
];

const FINANCIAL_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'agreement',
  'financial',
  'signatures',
];

/**
 * Resolve the set of sections to render for a given report configuration.
 * Pure function — no data/permission awareness; the builder still omits a
 * section's *content* when the underlying data is unavailable or redacted.
 */
export function resolveReportSections(config: Pick<ProjectReportConfig, 'type' | 'customSections'>): Set<ProjectReportSectionKey> {
  switch (config.type) {
    case 'summary':
      return new Set(SUMMARY_SECTIONS);
    case 'progress':
      return new Set(PROGRESS_SECTIONS);
    case 'financial':
      return new Set(FINANCIAL_SECTIONS);
    case 'custom':
      return new Set(config.customSections);
    case 'full':
    default:
      return new Set(FULL_SECTIONS);
  }
}

/** Whether the financial section's content should render at all (data-eligible AND selected). */
export function isFinancialSectionIncluded(
  config: Pick<ProjectReportConfig, 'type' | 'customSections' | 'includeFinancial'>
): boolean {
  return config.includeFinancial && resolveReportSections(config).has('financial');
}
