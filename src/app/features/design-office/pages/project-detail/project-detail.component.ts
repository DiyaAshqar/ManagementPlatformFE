import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { OfficeService } from '../../services/office.service';
import { stageStepsCost } from '../../services/office-calc';
import { CLAIM_SEVERITY, JodPipe, PROJECT_SEVERITY, STAGE_SEVERITY } from '../../shared/office-ui';
import { AddScopeDialogComponent } from '../../components/add-scope-dialog.component';
import { Stage, StageType } from '../../models/office.models';

interface PathStep { key: string; sub: string; state: 'done' | 'current' | 'todo'; }

@Component({
  selector: 'app-office-project-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TagModule, DialogModule, InputTextModule,
    SelectModule, TooltipModule, JodPipe, AddScopeDialogComponent,
  ],
  templateUrl: './project-detail.component.html',
})
export class OfficeProjectDetailComponent implements OnInit {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly stageSeverity = STAGE_SEVERITY;
  readonly claimSeverity = CLAIM_SEVERITY;
  readonly projectSeverity = PROJECT_SEVERITY;
  readonly stageTypes: StageType[] = ['design', 'license', 'execution'];

  readonly projectId = signal(this.route.snapshot.paramMap.get('id'));
  readonly summary = computed(() => this.office.projectSummary(this.projectId()));
  readonly project = computed(() => this.summary()?.project);
  readonly quote = computed(() => this.office.quote(this.project()?.quoteId));
  readonly claims = computed(() => this.office.claimsForProject(this.projectId() ?? ''));
  readonly scopeId = signal<string | null>(null);
  readonly scope = computed(() => {
    const p = this.project();
    return p?.scopes.find((s) => s.id === this.scopeId()) ?? p?.scopes[0];
  });

  readonly subcontractors = computed(() =>
    (this.project()?.scopes ?? []).flatMap((sc) => sc.stages.flatMap((st) => st.subcontractors.map((s) => ({ ...s, stage: st })))),
  );

  readonly hasLoop = computed(() => this.scope()?.stages.some((s) => s.returnTo.length) ?? false);

  readonly path = computed<PathStep[]>(() => {
    const p = this.project();
    const q = this.quote();
    if (!p) return [];
    const signing = this.claims().find((c) => c.claim.trigger === 'signing');
    const draft = p.contractDrafts[p.contractDrafts.length - 1];
    const steps: PathStep[] = [
      { key: 'quote', sub: q ? `Rev ${String(q.rev).padStart(2, '0')} · ${this.t('office.quoteStatus.' + q.status)}` : this.t('office.path.noQuote'), state: q || p.contractApproved ? 'done' : 'todo' },
      { key: 'clientApproval', sub: q?.status === 'approved' || p.contractApproved ? this.t('office.path.done') : '—', state: q?.status === 'approved' || p.contractApproved ? 'done' : 'todo' },
      { key: 'contractDraft', sub: draft ? `Rev ${draft.rev} · ${this.t('office.draftStatus.' + draft.status)}` : '—', state: p.contractApproved ? 'done' : draft ? 'current' : 'todo' },
      { key: 'contractApproval', sub: p.contractApproved ? this.t('office.path.approved') : this.t('office.path.pending'), state: p.contractApproved ? 'done' : 'todo' },
      { key: 'downPayment', sub: signing ? `${signing.claim.pct}% · ${this.t('office.claimStatus.' + signing.status)}` : '—', state: signing?.status === 'paid' ? 'done' : p.contractApproved ? 'current' : 'todo' },
    ];
    // only one "current": the first not-done step
    let seen = false;
    for (const s of steps) {
      if (s.state === 'done') continue;
      s.state = seen ? 'todo' : 'current';
      seen = true;
    }
    return steps;
  });

  // dialogs
  addScopeVisible = false;
  editStagesVisible = false;
  editStages: Stage[] = [];
  newStageName = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((m) => this.projectId.set(m.get('id')));
    if (this.route.snapshot.queryParamMap.get('addScope')) {
      this.addScopeVisible = true;
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  stageCost(st: Stage): number {
    return stageStepsCost(st);
  }

  lastLog(st: Stage): string {
    return st.log[st.log.length - 1]?.step ?? '—';
  }

  stageClaim(st: Stage) {
    return this.claims().find((c) => c.claim.stageId === st.id);
  }

  isDrawingStage(st: Stage): boolean {
    return /IFC|Final/i.test(st.name);
  }

  openStage(st: Stage): void {
    const p = this.project();
    if (!p) return;
    this.router.navigate(['/office/projects', p.id, 'stages', st.id]);
  }

  openDrawings(st: Stage, event: Event): void {
    event.stopPropagation();
    const p = this.project();
    if (!p) return;
    this.router.navigate(['/office/projects', p.id, 'drawings'], { queryParams: { set: /Final/i.test(st.name) ? 'final' : 'ifc' } });
  }

  onScopeAdded(id: string): void {
    this.scopeId.set(id);
  }

  // ─── Edit stages for this project only ───────────────────────────────

  openEditStages(): void {
    this.editStages = structuredClone(this.scope()?.stages ?? []);
    this.newStageName = '';
    this.editStagesVisible = true;
  }

  moveStage(i: number, dir: -1 | 1): void {
    const j = i + dir;
    if (j < 0 || j >= this.editStages.length) return;
    const arr = [...this.editStages];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.editStages = arr;
  }

  removeStage(i: number): void {
    this.editStages = this.editStages.filter((_, idx) => idx !== i);
  }

  addStage(): void {
    const name = this.newStageName.trim();
    if (!name) return;
    this.editStages = [...this.editStages, {
      id: this.office.newId('st'), n: this.editStages.length + 1, name, type: 'design', claimPct: 0,
      allowSubcontractors: false, requireAttachments: false, allowRecertify: false, returnTo: [], customFields: [],
      customValues: {}, status: 'notStarted', owner: this.scope()?.engineer ?? '', log: [], files: [], subcontractors: [], licenseFiles: [],
    }];
    this.newStageName = '';
  }

  saveStages(): void {
    const p = this.project();
    const sc = this.scope();
    if (!p || !sc) return;
    this.office.saveScopeStages(p.id, sc.id, this.editStages).subscribe((res) => {
      if (res.succeeded) this.editStagesVisible = false;
    });
  }

  private t(key: string): string {
    return this.translate.instant(key);
  }
}
