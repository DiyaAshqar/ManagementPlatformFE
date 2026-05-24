import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  computed,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';

import { buildMockTimeframe } from './timeframe-mock.data';
import {
  ContractorStatus,
  TimelineConflict,
  TimelineContractor,
  TimelineFilters,
  TimelinePhase,
  TimelineRange,
  TimelineScale,
  TimelineSummary,
  TimelineTickColumn,
} from './timeframe.model';
import { TimeframeService } from './timeframe.service';

interface BarLayout {
  contractor: TimelineContractor;
  phaseId: number;
  left: number;
  width: number;
  hasConflict: boolean;
}

interface DependencyLine {
  fromId: number;
  toId: number;
  d: string;
}

@Component({
  selector: 'app-timeframe',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    DrawerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MultiSelectModule,
    PopoverModule,
    ProgressBarModule,
    SelectButtonModule,
    TagModule,
    TooltipModule,
    DatePickerModule,
    ChipModule,
    DividerModule,
  ],
  templateUrl: './timeframe.component.html',
  styleUrl: './timeframe.component.scss',
})
export class TimeframeComponent implements OnInit, AfterViewInit {
  @Input() projectId!: string;

  @ViewChild('chartScroll') chartScrollRef?: ElementRef<HTMLDivElement>;

  // ── State signals ----------------------------------------------------------
  phases = signal<TimelinePhase[]>([]);
  scale = signal<TimelineScale>('week');
  filters = signal<TimelineFilters>({
    search: '',
    contractorIds: [],
    phaseIds: [],
    statuses: [],
  });

  selectedContractor = signal<TimelineContractor | null>(null);
  selectedPhaseId = signal<number | null>(null);
  showDetails = signal(false);
  showConflictsPanel = signal(false);
  isFullscreen = signal(false);

  /** Currently hovered contractor (popover content). */
  hoverContractor: TimelineContractor | null = null;

  // ── Derived data -----------------------------------------------------------
  range = computed<TimelineRange | null>(() =>
    this.timeframeService.computeRange(this.phases())
  );

  columns = computed<TimelineTickColumn[]>(() => {
    const r = this.range();
    if (!r) return [];
    return this.timeframeService.buildColumns(r, this.scale());
  });

  conflicts = computed<TimelineConflict[]>(() =>
    this.timeframeService.detectConflicts(this.phases())
  );

  conflictMap = computed<Map<number, TimelineConflict[]>>(() => {
    const map = new Map<number, TimelineConflict[]>();
    this.conflicts().forEach((c) => {
      const a = map.get(c.contractorAId) ?? [];
      a.push(c);
      map.set(c.contractorAId, a);
      const b = map.get(c.contractorBId) ?? [];
      b.push(c);
      map.set(c.contractorBId, b);
    });
    return map;
  });

  // Apply filters
  filteredPhases = computed<TimelinePhase[]>(() => {
    const f = this.filters();
    const term = f.search.trim().toLowerCase();
    return this.phases()
      .filter((p) => f.phaseIds.length === 0 || f.phaseIds.includes(p.id))
      .map((p) => ({
        ...p,
        contractors: p.contractors.filter((c) => {
          if (f.contractorIds.length > 0 && !f.contractorIds.includes(c.id)) return false;
          if (f.statuses.length > 0 && !f.statuses.includes(c.status)) return false;
          if (term && !c.name.toLowerCase().includes(term) && !c.contractorType.toLowerCase().includes(term)) {
            return false;
          }
          if (f.dateRange && f.dateRange[0] && c.endDate < f.dateRange[0]) return false;
          if (f.dateRange && f.dateRange[1] && c.startDate > f.dateRange[1]) return false;
          return true;
        }),
      }))
      .filter((p) => p.contractors.length > 0);
  });

  summary = computed<TimelineSummary>(() => {
    const ph = this.phases();
    const allContractors = ph.flatMap((p) => p.contractors);
    const delayed = allContractors.filter((c) => c.status === 'delayed').length;
    const overall =
      allContractors.length === 0
        ? 0
        : Math.round(
            allContractors.reduce((acc, c) => acc + (c.progress || 0), 0) /
              allContractors.length
          );
    return {
      totalPhases: ph.length,
      totalContractors: allContractors.length,
      totalConflicts: this.conflicts().length,
      overallProgress: overall,
      delayedContractors: delayed,
    };
  });

  todayLeft = computed<number | null>(() => {
    const r = this.range();
    if (!r) return null;
    const today = new Date();
    if (today < r.start || today > r.end) return null;
    return this.timeframeService.ratioForDate(today, r) * 100;
  });

  // ── Filter option lists ---------------------------------------------------
  contractorOptions = computed(() =>
    this.phases().flatMap((p) =>
      p.contractors.map((c) => ({ label: c.name, value: c.id }))
    )
  );
  phaseOptions = computed(() =>
    this.phases().map((p) => ({ label: p.name, value: p.id }))
  );

  statusOptions: { label: string; value: ContractorStatus }[] = [];
  scaleOptions: { label: string; value: TimelineScale }[] = [];

  // ── Bar layouts ----------------------------------------------------------
  contractorBars = computed<Map<number, BarLayout>>(() => {
    const map = new Map<number, BarLayout>();
    const r = this.range();
    if (!r) return map;
    const cm = this.conflictMap();
    this.phases().forEach((p) => {
      p.contractors.forEach((c) => {
        const geo = this.timeframeService.barGeometry(c.startDate, c.endDate, r);
        map.set(c.id, {
          contractor: c,
          phaseId: p.id,
          left: geo.left,
          width: geo.width,
          hasConflict: (cm.get(c.id) || []).length > 0,
        });
      });
    });
    return map;
  });

  phaseBars = computed<Map<number, { left: number; width: number }>>(() => {
    const map = new Map<number, { left: number; width: number }>();
    const r = this.range();
    if (!r) return map;
    this.phases().forEach((p) => {
      const geo = this.timeframeService.barGeometry(p.startDate, p.endDate, r);
      map.set(p.id, geo);
    });
    return map;
  });

  // Dependency arrows (simple horizontal-then-vertical paths)
  dependencyLines = computed<DependencyLine[]>(() => {
    // SVG paths are drawn at the chart-area level (relative positioning).
    // Each contractor row is the same height (--row-h), so we compute
    // rough Y positions from contractor index.
    const lines: DependencyLine[] = [];
    const bars = this.contractorBars();
    const rowHeight = 44; // px (matches CSS)
    const phaseHeaderHeight = 44; // px header per phase
    let rowIndex = 0;
    const rowMap = new Map<number, number>(); // contractorId -> y index

    this.filteredPhases().forEach((p) => {
      rowIndex++; // phase header
      p.contractors.forEach((c) => {
        rowMap.set(c.id, rowIndex);
        rowIndex++;
      });
    });

    this.filteredPhases().forEach((p) => {
      p.contractors.forEach((c) => {
        if (!c.dependsOnIds) return;
        const toBar = bars.get(c.id);
        if (!toBar) return;
        const toY = (rowMap.get(c.id) ?? 0) * rowHeight + rowHeight / 2;
        c.dependsOnIds.forEach((depId) => {
          const fromBar = bars.get(depId);
          if (!fromBar) return;
          if (!rowMap.has(depId)) return;
          const fromY = (rowMap.get(depId) ?? 0) * rowHeight + rowHeight / 2;

          const x1 = fromBar.left + fromBar.width;
          const x2 = toBar.left;
          const midX = Math.min(x1 + 1, x2);
          const d = `M ${x1}% ${fromY} L ${midX}% ${fromY} L ${midX}% ${toY} L ${x2}% ${toY}`;
          lines.push({ fromId: depId, toId: c.id, d });
        });
      });
    });
    return lines;
  });

  // ── Lifecycle ------------------------------------------------------------
  constructor(
    private timeframeService: TimeframeService,
    private translate: TranslateService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.phases.set(buildMockTimeframe(this.projectId));
    this.buildStaticOptions();
    this.translate.onLangChange.subscribe(() => this.buildStaticOptions());
  }

  ngAfterViewInit(): void {
    // Scroll to today indicator if possible
    setTimeout(() => this.scrollToToday(), 300);
  }

  // ── Static options -------------------------------------------------------
  private buildStaticOptions(): void {
    this.statusOptions = [
      { label: this.translate.instant('timeframe.status.not_started'), value: 'not_started' },
      { label: this.translate.instant('timeframe.status.in_progress'), value: 'in_progress' },
      { label: this.translate.instant('timeframe.status.delayed'), value: 'delayed' },
      { label: this.translate.instant('timeframe.status.completed'), value: 'completed' },
    ];
    this.scaleOptions = [
      { label: this.translate.instant('timeframe.scale.day'), value: 'day' },
      { label: this.translate.instant('timeframe.scale.week'), value: 'week' },
      { label: this.translate.instant('timeframe.scale.month'), value: 'month' },
    ];
  }

  // ── Drag scroll ----------------------------------------------------------
  private dragState: { active: boolean; startX: number; scrollLeft: number } = {
    active: false,
    startX: 0,
    scrollLeft: 0,
  };

  onChartMouseDown(e: MouseEvent): void {
    const el = this.chartScrollRef?.nativeElement;
    if (!el) return;
    // Only when not clicking a bar (let bar handle its own click)
    const target = e.target as HTMLElement;
    if (target.closest('.tf-bar')) return;
    this.dragState = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.classList.add('tf-grabbing');
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.dragState.active) {
      this.dragState.active = false;
      this.chartScrollRef?.nativeElement.classList.remove('tf-grabbing');
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.dragState.active) return;
    const el = this.chartScrollRef?.nativeElement;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - this.dragState.startX) * 1.2;
    el.scrollLeft = this.dragState.scrollLeft - walk;
  }

  // ── Public actions -------------------------------------------------------

  setScale(s: TimelineScale): void {
    this.scale.set(s);
  }

  zoomIn(): void {
    const s = this.scale();
    if (s === 'month') this.scale.set('week');
    else if (s === 'week') this.scale.set('day');
  }
  zoomOut(): void {
    const s = this.scale();
    if (s === 'day') this.scale.set('week');
    else if (s === 'week') this.scale.set('month');
  }

  scrollToToday(): void {
    const el = this.chartScrollRef?.nativeElement;
    const tl = this.todayLeft();
    if (!el || tl === null) return;
    const width = el.scrollWidth;
    el.scrollTo({ left: width * (tl / 100) - el.clientWidth / 2, behavior: 'smooth' });
  }

  togglePhase(phaseId: number): void {
    this.phases.update((arr) =>
      arr.map((p) => (p.id === phaseId ? { ...p, expanded: !p.expanded } : p))
    );
  }

  selectContractor(c: TimelineContractor, phaseId: number): void {
    this.selectedContractor.set(c);
    this.selectedPhaseId.set(phaseId);
    this.showDetails.set(true);
  }

  closeDetails(): void {
    this.showDetails.set(false);
  }

  toggleFullscreen(): void {
    const el = this.host.nativeElement.querySelector('.tf-shell') as HTMLElement | null;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen?.();
      this.isFullscreen.set(false);
    }
  }

  clearFilters(): void {
    this.filters.set({ search: '', contractorIds: [], phaseIds: [], statuses: [] });
  }

  // ── Filter setters (template-friendly) ─────────────────────────────────
  setSearchFilter(v: string): void {
    this.filters.update((f) => ({ ...f, search: v }));
  }
  setPhaseFilter(v: number[]): void {
    this.filters.update((f) => ({ ...f, phaseIds: v ?? [] }));
  }
  setContractorFilter(v: number[]): void {
    this.filters.update((f) => ({ ...f, contractorIds: v ?? [] }));
  }
  setStatusFilter(v: ContractorStatus[]): void {
    this.filters.update((f) => ({ ...f, statuses: v ?? [] }));
  }
  setDateRangeFilter(v: [Date | null, Date | null] | null): void {
    this.filters.update((f) => ({ ...f, dateRange: v ?? undefined }));
  }

  exportExcel(): void {
    // Simple CSV export
    const phases = this.filteredPhases();
    const rows: string[] = [
      ['Phase', 'Contractor', 'Type', 'Zone', 'Start', 'End', 'Duration (days)', 'Progress', 'Status'].join(','),
    ];
    phases.forEach((p) => {
      p.contractors.forEach((c) => {
        rows.push(
          [
            this.csv(p.name),
            this.csv(c.name),
            this.csv(c.contractorType),
            this.csv(c.zone || ''),
            this.formatDate(c.startDate),
            this.formatDate(c.endDate),
            this.timeframeService.durationDays(c.startDate, c.endDate),
            c.progress + '%',
            c.status,
          ].join(',')
        );
      });
    });
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeframe-project-${this.projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPdf(): void {
    window.print();
  }

  private csv(s: string): string {
    if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  // ── View helpers ---------------------------------------------------------

  statusSeverity(status: ContractorStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'delayed':
        return 'danger';
      case 'not_started':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  statusColor(status: ContractorStatus): string {
    switch (status) {
      case 'completed':
        return 'var(--p-green-500, #10b981)';
      case 'in_progress':
        return 'var(--p-blue-500, #3b82f6)';
      case 'delayed':
        return 'var(--p-red-500, #ef4444)';
      case 'not_started':
        return 'var(--p-gray-400, #9ca3af)';
    }
  }

  statusBg(status: ContractorStatus): string {
    switch (status) {
      case 'completed':
        return 'linear-gradient(180deg, #34d399, #10b981)';
      case 'in_progress':
        return 'linear-gradient(180deg, #60a5fa, #3b82f6)';
      case 'delayed':
        return 'linear-gradient(180deg, #fca5a5, #ef4444)';
      case 'not_started':
        return 'linear-gradient(180deg, #d1d5db, #9ca3af)';
    }
  }

  formatDate(date: Date | undefined | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('ar', { minimumFractionDigits: 0 }).format(value);
  }

  durationDays(c: TimelineContractor): number {
    return this.timeframeService.durationDays(c.startDate, c.endDate);
  }

  contractorConflicts(id: number): TimelineConflict[] {
    return this.conflictMap().get(id) || [];
  }

  // Mini-map: rectangles for each contractor on a small overview
  miniMapBars = computed<{ left: number; width: number; color: string }[]>(() => {
    const r = this.range();
    if (!r) return [];
    return this.phases().flatMap((p) =>
      p.contractors.map((c) => {
        const g = this.timeframeService.barGeometry(c.startDate, c.endDate, r);
        return { left: g.left, width: g.width, color: this.statusColor(c.status) };
      })
    );
  });

  goToConflict(conflict: TimelineConflict): void {
    const el = this.chartScrollRef?.nativeElement;
    const r = this.range();
    if (!el || !r) return;
    const ratio = this.timeframeService.ratioForDate(conflict.overlapStart, r);
    el.scrollTo({ left: el.scrollWidth * ratio - el.clientWidth / 3, behavior: 'smooth' });
    this.showConflictsPanel.set(false);
  }

  trackByPhaseId = (_: number, p: TimelinePhase) => p.id;
  trackByContractorId = (_: number, c: TimelineContractor) => c.id;
  trackByConflictId = (_: number, c: TimelineConflict) => c.id;
  trackByColIndex = (i: number) => i;
}
