import { ReportConfig } from '../models/report-config.model';
import { ReportFilterConfig } from '../models/report-filter.model';
import { ReportPersistenceService } from './report-persistence.service';

function config(): ReportConfig {
  return {
    id: 'unit-report',
    title: 'Unit Report',
    columns: [{ key: 'a', header: 'A' }],
    persistence: {
      enabled: true,
      storage: 'localStorage',
      key: 'unit-report',
      includeColumns: true,
      includeSorting: true,
      includePageSize: true,
      includeFilters: true,
      includeGrouping: true,
    },
  };
}

describe('ReportPersistenceService', () => {
  let service: ReportPersistenceService;

  beforeEach(() => {
    service = new ReportPersistenceService();
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('round-trips report state', () => {
    service.save(config(), {
      columns: [{ key: 'a', visible: true, order: 0 }],
      sort: [{ field: 'a', direction: 'desc' }],
      pageSize: 25,
      filters: { status: 'Paid' },
      groups: ['byStatus'],
    });

    const loaded = service.load(config());
    expect(loaded).not.toBeNull();
    expect(loaded?.pageSize).toBe(25);
    expect(loaded?.sort).toEqual([{ field: 'a', direction: 'desc' }]);
    expect(loaded?.groups).toEqual(['byStatus']);
    expect(loaded?.filters).toEqual({ status: 'Paid' });
  });

  it('ignores an outdated / corrupted blob', () => {
    localStorage.setItem('report-state:unit-report', JSON.stringify({ version: 999 }));
    expect(service.load(config())).toBeNull();

    localStorage.setItem('report-state:unit-report', '{not json');
    expect(service.load(config())).toBeNull();
  });

  it('clears persisted state', () => {
    service.save(config(), { columns: [], sort: [], pageSize: 10, filters: {}, groups: [] });
    service.clear(config());
    expect(service.load(config())).toBeNull();
  });

  it('revives date filter values from ISO strings', () => {
    const filters: ReportFilterConfig[] = [
      { key: 'created', type: 'date', label: 'Created' },
      { key: 'range', type: 'dateRange', label: 'Range' },
    ];
    const revived = service.reviveFilterValues(
      { created: '2026-01-15T00:00:00.000Z', range: ['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'] },
      filters
    );
    expect(revived['created'] instanceof Date).toBeTrue();
    const range = revived['range'] as { from: Date | null; to: Date | null };
    expect(range.from instanceof Date).toBeTrue();
    expect(range.to instanceof Date).toBeTrue();
  });
});
