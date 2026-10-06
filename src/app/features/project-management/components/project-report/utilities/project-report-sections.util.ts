import { ProjectReportConfig, ProjectReportSectionKey } from '../models/project-report.model';

/**
 * Per-variant section sets. `cover` and `executiveSummary` are the report's
 * front matter included by default for the non-custom variants.
 * The overview toggle can omit the summary and agreement in any variant.
 */
const FULL_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'agreement',
  'financial',
  'documents',
  'signatures',
];

const SUMMARY_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'financial',
  'signatures',
];

const PROGRESS_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'executiveSummary',
  'agreement',
  'documents',
];

const FINANCIAL_SECTIONS: ProjectReportSectionKey[] = [
  'cover',
  'financial',
  'signatures',
];

/**
 * Resolve the set of sections to render for a given report configuration.
 * Pure function — no data/permission awareness; the builder still omits a
 * section's *content* when the underlying data is unavailable or redacted.
 */
export function resolveReportSections(config: Pick<ProjectReportConfig, 'type' | 'customSections' | 'hideOverview'>): Set<ProjectReportSectionKey> {
  const sections = resolveVariantSections(config);
  if (config.hideOverview) {
    sections.delete('executiveSummary');
    sections.delete('agreement');
  }
  return sections;
}

function resolveVariantSections(config: Pick<ProjectReportConfig, 'type' | 'customSections'>): Set<ProjectReportSectionKey> {
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
