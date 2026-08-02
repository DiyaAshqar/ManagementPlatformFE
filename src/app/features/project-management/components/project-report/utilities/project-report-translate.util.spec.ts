import { resolveTranslationKey } from './project-report-translate.util';

describe('project-report-translate.util', () => {
  const translations = {
    projectReport: {
      common: { notAvailable: 'Not available' },
      missingData: { domainFailed: 'Failed to load {{domain}}' },
    },
  };

  it('resolves a nested dot-notation key', () => {
    expect(resolveTranslationKey(translations, 'projectReport.common.notAvailable')).toBe('Not available');
  });

  it('falls back to the raw key when missing, matching ngx-translate default behavior', () => {
    expect(resolveTranslationKey(translations, 'projectReport.does.not.exist')).toBe('projectReport.does.not.exist');
  });

  it('falls back to the key when the translation object itself is missing', () => {
    expect(resolveTranslationKey(null, 'projectReport.common.notAvailable')).toBe('projectReport.common.notAvailable');
  });

  it('interpolates {{param}} placeholders', () => {
    expect(resolveTranslationKey(translations, 'projectReport.missingData.domainFailed', { domain: 'Agreement' })).toBe(
      'Failed to load Agreement'
    );
  });

  it('leaves unmatched placeholders untouched rather than rendering "undefined"', () => {
    expect(resolveTranslationKey(translations, 'projectReport.missingData.domainFailed', {})).toBe('Failed to load {{domain}}');
  });
});
