import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';

import { OfficeService } from '../../services/office.service';
import { fileNames } from '../../shared/office-ui';
import { Discipline, Drawing, DrawingSet, RevisionReason } from '../../models/office.models';

/**
 * Screen 18 — every drawing keeps a fixed number; each change is a new revision.
 * Older revisions become "superseded" and are never deleted.
 */
@Component({
  selector: 'app-office-drawings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, TagModule, DialogModule, InputTextModule, SelectModule, CheckboxModule],
  templateUrl: './drawings.component.html',
})
export class OfficeDrawingsComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly reasons: RevisionReason[] = ['contractorNote', 'clientChange', 'coordination', 'errorFix'];
  readonly disciplines: Discipline[] = ['architectural', 'structural', 'electrical', 'mechanical'];
  readonly projectId = this.route.snapshot.paramMap.get('id')!;
  readonly project = computed(() => this.office.project(this.projectId));
  readonly set = signal<DrawingSet>((this.route.snapshot.queryParamMap.get('set') as DrawingSet) || 'ifc');
  readonly selectedId = signal<string | null>(null);
  readonly checked = signal<Record<string, boolean>>({});

  readonly drawings = computed(() =>
    this.office.db().drawings.filter((d) => d.projectId === this.projectId && d.set === this.set()).sort((a, b) => a.no.localeCompare(b.no)),
  );
  readonly selected = computed(() => this.drawings().find((d) => d.id === this.selectedId()) ?? this.drawings()[0]);
  readonly checkedIds = computed(() => Object.keys(this.checked()).filter((k) => this.checked()[k] && this.drawings().some((d) => d.id === k)));

  /** The stage these drawings belong to (IFC or Final Drawing). */
  readonly stage = computed(() => {
    const p = this.project();
    const re = this.set() === 'ifc' ? /IFC/i : /Final/i;
    return p?.scopes.flatMap((s) => s.stages).find((s) => re.test(s.name));
  });

  rev = { reason: 'contractorNote' as RevisionReason, description: '', file: '' };
  newVisible = false;
  newDrawing = { no: '', title: '', discipline: 'architectural' as Discipline, file: '' };

  setSet(s: DrawingSet): void {
    this.set.set(s);
    this.selectedId.set(null);
    this.router.navigate([], { queryParams: { set: s }, replaceUrl: true });
  }

  last(d: Drawing) {
    return d.revisions[d.revisions.length - 1];
  }

  status(d: Drawing): 'pend' | 'fin' | 'cur' {
    if (d.pending) return 'pend';
    return d.set === 'final' ? 'fin' : 'cur';
  }

  nextRev(d: Drawing | undefined): string {
    if (!d) return '';
    return (d.set === 'ifc' ? 'R' : 'F') + d.revisions.length;
  }

  toggleCheck(id: string, value: boolean): void {
    this.checked.update((c) => ({ ...c, [id]: value }));
  }

  pickRevFile(e: Event): void {
    this.rev.file = fileNames(e)[0] ?? '';
  }

  saveRevision(): void {
    const d = this.selected();
    if (!d || !this.rev.description.trim()) return;
    this.office.addDrawingRevision(d.id, this.rev).subscribe((res) => {
      if (res.succeeded) this.rev = { reason: 'contractorNote', description: '', file: '' };
    });
  }

  markPending(): void {
    const d = this.selected();
    if (d) this.office.markDrawingPending(d.id).subscribe();
  }

  transmittal(): void {
    this.office.issueTransmittal(this.projectId, this.checkedIds()).subscribe((res) => {
      if (res.succeeded) this.checked.set({});
    });
  }

  openNew(): void {
    this.newDrawing = { no: '', title: '', discipline: 'architectural', file: '' };
    this.newVisible = true;
  }

  pickNewFile(e: Event): void {
    this.newDrawing.file = fileNames(e)[0] ?? '';
  }

  saveNew(): void {
    if (!this.newDrawing.no.trim() || !this.newDrawing.title.trim()) return;
    this.office.addDrawing(this.projectId, this.set(), this.newDrawing).subscribe((res) => {
      if (res.succeeded && res.data) {
        this.newVisible = false;
        this.selectedId.set(res.data.id);
      }
    });
  }
}
