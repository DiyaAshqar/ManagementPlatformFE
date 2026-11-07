import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';


export type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** Formats an amount in Jordanian dinars: "11,300 JOD" / "11,300 د.أ". */
@Pipe({ name: 'jod', standalone: true, pure: false })
export class JodPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: number | null | undefined, digits = 0, bare = false): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const n = Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) });
    return bare ? n : `${n} ${this.translate.instant('office.currency')}`;
  }
}

export const CLAIM_SEVERITY: Record<string, TagSeverity> = {
  scheduled: 'secondary',
  due: 'info',
  sent: 'contrast',
  partial: 'warn',
  paid: 'success',
  late: 'danger',
  cancelled: 'secondary',
};

export const QUOTE_SEVERITY: Record<string, TagSeverity> = {
  draft: 'secondary',
  sent: 'info',
  revisionRequested: 'warn',
  approved: 'success',
  rejected: 'danger',
};

export const STAGE_SEVERITY: Record<string, TagSeverity> = {
  notStarted: 'secondary',
  active: 'info',
  onHold: 'warn',
  completed: 'success',
};

export const PROJECT_SEVERITY: Record<string, TagSeverity> = {
  active: 'info',
  onHold: 'warn',
  completed: 'success',
  cancelled: 'secondary',
};

/** Reads picked files' names — the prototype stores names only, no upload. */
export function fileNames(event: Event): string[] {
  const input = event.target as HTMLInputElement;
  const names = Array.from(input.files ?? []).map((f) => f.name);
  input.value = '';
  return names;
}
