import { Injectable } from '@angular/core';
import {
  TimelineConflict,
  TimelineContractor,
  TimelinePhase,
  TimelineRange,
  TimelineScale,
  TimelineTickColumn,
} from './timeframe.model';

@Injectable({ providedIn: 'root' })
export class TimeframeService {
  // ── Range -----------------------------------------------------------------

  computeRange(phases: TimelinePhase[]): TimelineRange | null {
    const dates: Date[] = [];
    phases.forEach((p) => {
      p.contractors.forEach((c) => {
        dates.push(c.startDate);
        dates.push(c.endDate);
      });
    });

    if (dates.length === 0) return null;

    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));

    // Pad range by a couple of days for nicer look
    const start = new Date(minTime);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 2);
    const end = new Date(maxTime);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 2);

    const totalDays =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return { start, end, totalDays };
  }

  // ── Columns ---------------------------------------------------------------

  buildColumns(range: TimelineRange, scale: TimelineScale): TimelineTickColumn[] {
    if (scale === 'day') return this.buildDayColumns(range);
    if (scale === 'week') return this.buildWeekColumns(range);
    return this.buildMonthColumns(range);
  }

  private buildDayColumns(range: TimelineRange): TimelineTickColumn[] {
    const cols: TimelineTickColumn[] = [];
    const today = this.stripTime(new Date());
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      const day = new Date(cursor);
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      cols.push({
        label: day.getDate().toString(),
        subLabel: day.toLocaleDateString('ar', { weekday: 'short' }),
        start: day,
        end: next,
        isToday: this.sameDay(day, today),
        isWeekend: day.getDay() === 5 || day.getDay() === 6,
        isMonthStart: day.getDate() === 1,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return cols;
  }

  private buildWeekColumns(range: TimelineRange): TimelineTickColumn[] {
    const cols: TimelineTickColumn[] = [];
    const today = this.stripTime(new Date());
    const cursor = new Date(range.start);

    // Snap to start of week (Saturday in Arabic locales)
    const dayOfWeek = cursor.getDay();
    const diff = (dayOfWeek - 6 + 7) % 7; // 6 = Saturday
    cursor.setDate(cursor.getDate() - diff);

    let weekIndex = 1;
    while (cursor <= range.end) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);
      cols.push({
        label: `أ${weekIndex}`,
        subLabel: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        start: weekStart,
        end: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000),
        isToday: today >= weekStart && today <= weekEnd,
        isWeekend: false,
        isMonthStart: weekStart.getDate() <= 7,
      });
      cursor.setDate(cursor.getDate() + 7);
      weekIndex++;
    }
    return cols;
  }

  private buildMonthColumns(range: TimelineRange): TimelineTickColumn[] {
    const cols: TimelineTickColumn[] = [];
    const today = this.stripTime(new Date());
    const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ];
    while (cursor <= range.end) {
      const monthStart = new Date(cursor);
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      cols.push({
        label: monthNames[monthStart.getMonth()],
        subLabel: monthStart.getFullYear().toString(),
        start: monthStart,
        end: monthEnd,
        isToday: today >= monthStart && today < monthEnd,
        isWeekend: false,
        isMonthStart: true,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return cols;
  }

  // ── Geometry --------------------------------------------------------------

  /** Returns 0..1 ratio of where a date sits in the range. */
  ratioForDate(date: Date, range: TimelineRange): number {
    const ms = date.getTime() - range.start.getTime();
    const total = range.end.getTime() - range.start.getTime();
    return Math.max(0, Math.min(1, ms / total));
  }

  /** Get bar geometry as {left%, width%}. */
  barGeometry(
    start: Date,
    end: Date,
    range: TimelineRange
  ): { left: number; width: number } {
    const left = this.ratioForDate(start, range) * 100;
    const right = this.ratioForDate(end, range) * 100;
    return { left, width: Math.max(right - left, 0.5) };
  }

  durationDays(start: Date, end: Date): number {
    return Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  // ── Conflicts -------------------------------------------------------------

  detectConflicts(phases: TimelinePhase[]): TimelineConflict[] {
    const flat: { phase: TimelinePhase; c: TimelineContractor }[] = [];
    phases.forEach((p) => p.contractors.forEach((c) => flat.push({ phase: p, c })));

    const conflicts: TimelineConflict[] = [];

    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        const a = flat[i].c;
        const b = flat[j].c;
        if (a.id === b.id) continue;

        const overlapStart = new Date(Math.max(a.startDate.getTime(), b.startDate.getTime()));
        const overlapEnd = new Date(Math.min(a.endDate.getTime(), b.endDate.getTime()));
        if (overlapEnd <= overlapStart) continue;

        const sameZone = a.zone && b.zone && a.zone === b.zone;
        const overlapDays = this.durationDays(overlapStart, overlapEnd);

        // Same-zone overlap is the strongest conflict signal
        if (sameZone) {
          conflicts.push({
            id: `c-${a.id}-${b.id}`,
            contractorAId: a.id,
            contractorAName: a.name,
            contractorBId: b.id,
            contractorBName: b.name,
            overlapStart,
            overlapEnd,
            overlapDays,
            zone: a.zone,
            reason: 'zone_overlap',
          });
        } else if (overlapDays >= 7 && flat[i].phase.id === flat[j].phase.id) {
          conflicts.push({
            id: `c-${a.id}-${b.id}`,
            contractorAId: a.id,
            contractorAName: a.name,
            contractorBId: b.id,
            contractorBName: b.name,
            overlapStart,
            overlapEnd,
            overlapDays,
            reason: 'date_overlap',
          });
        }
      }
    }

    return conflicts;
  }

  // ── Helpers ---------------------------------------------------------------

  private stripTime(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
