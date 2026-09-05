import { ProjectReportConfig } from '../models/project-report.model';
import { isFinancialSectionIncluded, resolveReportSections } from './project-report-sections.util';

function config(overrides: Partial<ProjectReportConfig>): Pick<ProjectReportConfig, 'type' | 'customSections' | 'includeFinancial'> {
  return {
    type: 'full',
    customSections: [],
    includeFinancial: true,
    ...overrides,
  };
}

describe('project-report-sections.util', () => {
  describe('resolveReportSections', () => {
    it('includes every section for the full report', () => {
      const sections = resolveReportSections(config({ type: 'full' }));
      expect(sections.has('cover')).toBeTrue();
      expect(sections.has('financial')).toBeTrue();
      expect(sections.has('siteActivities')).toBeTrue();
      expect(sections.has('documents')).toBeTrue();
      expect(sections.has('signatures')).toBeTrue();
    });

    it('limits the summary report to cover/executive/agreement/scope/financial/signatures', () => {
      const sections = resolveReportSections(config({ type: 'summary' }));
      expect(sections.has('cover')).toBeTrue();
      expect(sections.has('executiveSummary')).toBeTrue();
      expect(sections.has('financial')).toBeTrue();
      expect(sections.has('siteActivities')).toBeFalse();
    });

    it('limits the progress report to scope/site-activity concerns', () => {
      const sections = resolveReportSections(config({ type: 'progress' }));
      expect(sections.has('scope')).toBeTrue();
      expect(sections.has('siteActivities')).toBeTrue();
      expect(sections.has('documents')).toBeTrue();
      expect(sections.has('financial')).toBeFalse();
    });

    it('limits the financial report to money-relevant sections', () => {
      const sections = resolveReportSections(config({ type: 'financial' }));
      expect(sections.has('financial')).toBeTrue();
      expect(sections.has('agreement')).toBeTrue();
      expect(sections.has('siteActivities')).toBeFalse();
    });

    it('uses exactly the caller-selected sections for custom, nothing more', () => {
      const sections = resolveReportSections(config({ type: 'custom', customSections: ['cover', 'documents'] }));
      expect(sections.size).toBe(2);
      expect(sections.has('cover')).toBeTrue();
      expect(sections.has('documents')).toBeTrue();
      expect(sections.has('financial')).toBeFalse();
    });

    it('produces an empty set for custom with no selection (never silently falls back to full)', () => {
      const sections = resolveReportSections(config({ type: 'custom', customSections: [] }));
      expect(sections.size).toBe(0);
    });
  });

  describe('isFinancialSectionIncluded', () => {
    it('is false when the financial toggle is off even if the variant would include it', () => {
      expect(isFinancialSectionIncluded(config({ type: 'full', includeFinancial: false }))).toBeFalse();
    });

    it('is false when the variant excludes the financial section even if the toggle is on', () => {
      expect(isFinancialSectionIncluded(config({ type: 'progress', includeFinancial: true }))).toBeFalse();
    });

    it('is true only when both the toggle is on and the variant includes it', () => {
      expect(isFinancialSectionIncluded(config({ type: 'financial', includeFinancial: true }))).toBeTrue();
    });
  });
});
