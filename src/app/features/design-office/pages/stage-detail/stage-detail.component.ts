import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';

import { OfficeService } from '../../services/office.service';
import { stageStepsCost, todayIso } from '../../services/office-calc';
import { CLAIM_SEVERITY, JodPipe, STAGE_SEVERITY, fileNames } from '../../shared/office-ui';
import { CreateClaimDialogComponent } from '../../components/create-claim-dialog.component';
import { ReturnStageDialogComponent } from '../../components/return-stage-dialog.component';
import { RecertifyDialogComponent } from '../../components/recertify-dialog.component';
import { LicenseFile, Subcontractor } from '../../models/office.models';

@Component({
  selector: 'app-office-stage-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TagModule, TableModule, InputTextModule,
    InputNumberModule, SelectModule, DialogModule, TooltipModule, CheckboxModule, JodPipe,
    CreateClaimDialogComponent, ReturnStageDialogComponent, RecertifyDialogComponent,
  ],
  templateUrl: './stage-detail.component.html',
})
export class OfficeStageDetailComponent implements OnInit {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly stageSeverity = STAGE_SEVERITY;
  readonly claimSeverity = CLAIM_SEVERITY;

  readonly projectId = signal('');
  readonly stageId = signal('');
  readonly project = computed(() => this.office.project(this.projectId()));
  readonly scope = computed(() => {
    const p = this.project();
    return p ? this.office.findScopeOfStage(p, this.stageId()) : undefined;
  });
  readonly stage = computed(() => this.scope()?.stages.find((s) => s.id === this.stageId()));
  readonly prevStage = computed(() => this.scope()?.stages.find((s) => s.n === (this.stage()?.n ?? 0) - 1));
  readonly nextStage = computed(() => this.scope()?.stages.find((s) => s.n === (this.stage()?.n ?? 0) + 1));
  readonly totalCost = computed(() => (this.stage() ? stageStepsCost(this.stage()!) : 0));
  readonly claims = computed(() => this.office.claimsForProject(this.projectId()).filter((c) => c.claim.stageId === this.stageId()));
  readonly fileOptions = computed(() => {
    const st = this.stage();
    const opts = [{ label: this.translate.instant('office.stage.originalFile'), value: 'original' }];
    st?.licenseFiles.filter((f) => f.kind === 'recertify').forEach((f) =>
      opts.push({ label: this.translate.instant('office.recertify.recertifyN', { n: f.seq }), value: f.id }));
    return opts;
  });
  readonly isDrawingStage = computed(() => /IFC|Final/i.test(this.stage()?.name ?? ''));
  readonly saving = signal(false);

  // forms
  entry = this.blankEntry();
  customValues: Record<string, string> = {};
  owner = '';
  claimVisible = false;
  returnVisible = false;
  recertifyVisible = false;
  subVisible = false;
  sub: Omit<Subcontractor, 'id'> = this.blankSub();

  ngOnInit(): void {
    this.route.paramMap.subscribe((m) => {
      this.projectId.set(m.get('id') ?? '');
      this.stageId.set(m.get('stageId') ?? '');
      const st = this.stage();
      this.customValues = { ...(st?.customValues ?? {}) };
      this.owner = st?.owner ?? '';
      this.entry = this.blankEntry();
    });
  }

  fileLabel(fileId: string): string {
    if (fileId === 'original') return this.translate.instant('office.stage.originalFile');
    const f = this.stage()?.licenseFiles.find((x) => x.id === fileId);
    return f ? this.translate.instant('office.recertify.recertifyN', { n: f.seq }) : '—';
  }

  licenseTitle(f: LicenseFile): string {
    return f.kind === 'original'
      ? this.translate.instant('office.recertify.licenseItem')
      : this.translate.instant('office.recertify.recertifyN', { n: f.seq });
  }

  licenseSteps(f: LicenseFile): { count: number; cost: number } {
    const logs = this.stage()?.log.filter((l) => l.fileId === (f.kind === 'original' ? 'original' : f.id)) ?? [];
    return { count: logs.length, cost: logs.reduce((s, l) => s + l.cost, 0) };
  }

  // ─── Actions ─────────────────────────────────────────────────────────

  addEntry(): void {
    if (!this.entry.step.trim()) return;
    this.office.addStageLog(this.projectId(), this.stageId(), {
      step: this.entry.step, note: this.entry.note, date: this.entry.date, cost: Number(this.entry.cost) || 0,
      fileId: this.entry.fileId as string, attachment: this.entry.attachment || undefined, billable: this.entry.billable,
    }).subscribe((res) => {
      if (res.succeeded) this.entry = this.blankEntry();
    });
  }

  pickEntryFile(event: Event): void {
    this.entry.attachment = fileNames(event)[0] ?? '';
  }

  uploadFiles(event: Event): void {
    const names = fileNames(event);
    if (names.length) this.office.addStageFiles(this.projectId(), this.stageId(), names).subscribe();
  }

  removeFile(id: string): void {
    this.office.removeStageFile(this.projectId(), this.stageId(), id).subscribe();
  }

  start(): void {
    this.office.startStage(this.projectId(), this.stageId()).subscribe();
  }

  complete(): void {
    const st = this.stage();
    if (!st) return;
    const linked = this.claims().filter((c) => c.claim.status === 'scheduled').length;
    this.confirm.confirm({
      header: this.translate.instant('office.stage.completeTitle'),
      message: this.translate.instant(linked ? 'office.stage.completeMsgClaims' : 'office.stage.completeMsg', { next: this.nextStage()?.name ?? '—', n: linked }),
      icon: 'pi pi-check-circle',
      accept: () => {
        this.office.completeStage(this.projectId(), st.id).subscribe((res) => {
          const next = res.data?.next;
          if (res.succeeded && next) this.router.navigate(['/office/projects', this.projectId(), 'stages', next.id]);
        });
      },
    });
  }

  saveFields(): void {
    this.office.saveStageFields(this.projectId(), this.stageId(), this.customValues, this.owner).subscribe();
  }

  openSub(): void {
    this.sub = this.blankSub();
    this.subVisible = true;
  }

  pickSubFile(event: Event): void {
    this.sub.attachments = [...this.sub.attachments, ...fileNames(event)];
  }

  saveSub(): void {
    if (!this.sub.name.trim()) return;
    this.office.addSubcontractor(this.projectId(), this.stageId(), this.sub).subscribe((res) => {
      if (res.succeeded) this.subVisible = false;
    });
  }

  toggleSubStatus(s: Subcontractor): void {
    this.office.setSubcontractorStatus(this.projectId(), this.stageId(), s.id, s.status === 'active' ? 'delivered' : 'active').subscribe();
  }

  onClaimCreated(id: string): void {
    this.router.navigate(['/office/claims', id]);
  }

  goStage(id: string | undefined): void {
    if (id) this.router.navigate(['/office/projects', this.projectId(), 'stages', id]);
  }

  openDrawings(): void {
    this.router.navigate(['/office/projects', this.projectId(), 'drawings'], {
      queryParams: { set: /Final/i.test(this.stage()?.name ?? '') ? 'final' : 'ifc' },
    });
  }

  private blankEntry() {
    return { step: '', note: '', date: todayIso(), cost: 0, fileId: this.currentFileId(), attachment: '', billable: false };
  }

  private currentFileId(): string {
    const open = this.stage?.()?.licenseFiles.find((f) => f.open && f.kind === 'recertify');
    return open?.id ?? 'original';
  }

  private blankSub(): Omit<Subcontractor, 'id'> {
    return { name: '', specialty: '', value: 0, status: 'active', attachments: [] };
  }
}
