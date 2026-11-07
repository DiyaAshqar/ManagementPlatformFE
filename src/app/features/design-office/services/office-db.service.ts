import { Injectable, signal } from '@angular/core';
import { OfficeDb } from '../models/office.models';
import { OFFICE_DB_VERSION, buildSeedDb } from '../data/office-seed';

const STORAGE_KEY = 'office_prototype_db';

/**
 * Local "database" for the Engineering Office prototype.
 *
 * Holds the whole dataset in one signal and persists it to localStorage, so a
 * client clicking through the prototype sees their changes survive reloads.
 * Only OfficeService talks to this; screens never do. When the backend
 * exists, OfficeService swaps these calls for the generated API clients.
 */
@Injectable({ providedIn: 'root' })
export class OfficeDbService {
  private readonly state = signal<OfficeDb>(this.load());

  readonly db = this.state.asReadonly();

  /** Applies a change to a deep copy and commits it (keeps signals immutable). */
  mutate<T>(change: (draft: OfficeDb) => T): T {
    const draft: OfficeDb = structuredClone(this.state());
    const result = change(draft);
    this.state.set(draft);
    this.save(draft);
    return result;
  }

  reset(): void {
    const fresh = buildSeedDb();
    this.state.set(fresh);
    this.save(fresh);
  }

  /** Short unique id; prefix keeps ids readable in devtools. */
  newId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Increments a counter on the draft and returns e.g. "CL-0025". */
  nextNo(draft: OfficeDb, counter: string, prefix: string, pad = 4): string {
    const n = (draft.counters[counter] ?? 0) + 1;
    draft.counters[counter] = n;
    return `${prefix}${String(n).padStart(pad, '0')}`;
  }

  private load(): OfficeDb {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OfficeDb;
        if (parsed.version === OFFICE_DB_VERSION) return parsed;
      }
    } catch {
      /* corrupted or unavailable storage: fall back to seed */
    }
    const seed = buildSeedDb();
    this.save(seed);
    return seed;
  }

  private save(db: OfficeDb): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage full/unavailable: state still lives in memory */
    }
  }
}
