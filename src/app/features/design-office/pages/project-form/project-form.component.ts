import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';

import { OfficeService, ProjectForm } from '../../services/office.service';
import { feeTotals, todayIso } from '../../services/office-calc';
import { JodPipe, fileNames } from '../../shared/office-ui';
import { Project, ProjectStatus, ProjectType, Quote } from '../../models/office.models';

@Component({
  selector: 'app-office-project-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, SelectModule, InputTextModule,
    InputNumberModule, TextareaModule, JodPipe,
  ],
  templateUrl: './project-form.component.html',
})
export class OfficeProjectFormComponent implements OnInit {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly projectTypes: ProjectType[] = ['housing', 'villa', 'residentialBuilding', 'commercial'];
  readonly statuses: ProjectStatus[] = ['active', 'onHold', 'completed', 'cancelled'];
  readonly clients = this.office.clients;
  readonly templates = this.office.templates;

  readonly editing = signal<Project | undefined>(undefined);
  readonly source = signal<'quote' | 'manual'>('quote');
  readonly saving = signal(false);

  /** Approved quotes that don't have a project yet. */
  readonly availableQuotes = computed(() => this.office.quotes().filter((q) => q.status === 'approved' && !q.projectId));

  readonly engineers = computed(() => {
    const names = new Set<string>([this.office.settings().currentUser]);
    this.office.db().projects.forEach((p) => {
      names.add(p.manager);
      p.team.forEach((t) => names.add(t.name));
    });
    return [...names].map((n) => ({ label: n, value: n }));
  });

  form!: ProjectForm;
  newMember = { name: '', role: '' };
  manualScopeTemplate: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const project = id ? this.office.project(id) : undefined;
    if (project) {
      this.editing.set(project);
      this.form = {
        name: project.name, clientId: project.clientId, quoteId: project.quoteId, status: project.status,
        land: structuredClone(project.land), location: project.location, manager: project.manager,
        startDate: project.startDate, endDate: project.endDate, team: structuredClone(project.team),
        notes: project.notes, attachments: [...project.attachments], scopes: [],
      };
      return;
    }
    this.form = {
      name: '', clientId: '', status: 'active',
      land: { projectType: 'housing', plotNo: '', basin: '', lands: '', subdivision: '', landArea: 0, buildArea: 0, interiorArea: 0 },
      manager: this.office.settings().currentUser, startDate: todayIso(), team: [], attachments: [], scopes: [],
    };
    const quoteId = this.route.snapshot.queryParamMap.get('quoteId');
    if (quoteId && this.office.quote(quoteId)) this.pickQuote(quoteId);
    else if (!this.availableQuotes().length) this.source.set('manual');
  }

  get quote(): Quote | undefined {
    return this.office.quote(this.form.quoteId);
  }

  get isEdit(): boolean {
    return !!this.editing();
  }

  get quoteScopes() {
    const q = this.quote;
    return q ? this.office.quoteScopeValues(q) : [];
  }

  get contractValue(): number {
    if (this.isEdit) return this.office.projectSummary(this.editing()!.id)?.contractValue ?? 0;
    if (this.quote) return feeTotals(this.quote.fees, this.quote.land).total;
    return this.form.scopes.reduce((s, x) => s + (x.value || 0), 0);
  }

  templateName(id: string): string {
    return this.office.template(id)?.name ?? '—';
  }

  setSource(s: 'quote' | 'manual'): void {
    this.source.set(s);
    if (s === 'manual') this.form.quoteId = undefined;
  }

  quoteLabel(q: Quote): string {
    return `${q.ref} · Rev ${String(q.rev).padStart(2, '0')} · ${this.office.clientName(q.clientId)} · ${feeTotals(q.fees, q.land).total.toLocaleString('en-US')}`;
  }

  /** Carries the client, land, scopes and payments over from the approved quote. */
  pickQuote(id: string): void {
    const q = this.office.quote(id);
    if (!q) return;
    this.source.set('quote');
    this.form.quoteId = q.id;
    this.form.clientId = q.clientId;
    this.form.land = structuredClone(q.land);
    const basin = q.land.basin.replace(/^[\d\s]+/, '').trim();
    if (!this.form.name) {
      this.form.name = `${this.translate.instant('office.projectTypes.' + q.land.projectType)}${basin ? ' – ' + basin : ''}`;
    }
  }

  addManualScope(): void {
    const t = this.office.template(this.manualScopeTemplate);
    if (!t) return;
    this.form.scopes = [...this.form.scopes, { templateId: t.id, name: t.scopeName, value: 0 }];
    this.manualScopeTemplate = null;
  }

  removeManualScope(i: number): void {
    this.form.scopes = this.form.scopes.filter((_, idx) => idx !== i);
  }

  addMember(): void {
    if (!this.newMember.name.trim()) return;
    this.form.team = [...this.form.team, { ...this.newMember }];
    this.newMember = { name: '', role: '' };
  }

  removeMember(i: number): void {
    this.form.team = this.form.team.filter((_, idx) => idx !== i);
  }

  addAttachments(event: Event): void {
    this.form.attachments = [...this.form.attachments, ...fileNames(event)];
  }

  removeAttachment(i: number): void {
    this.form.attachments = this.form.attachments.filter((_, idx) => idx !== i);
  }

  get canSave(): boolean {
    return !!this.form.name.trim() && !!this.form.clientId && !!this.form.manager &&
      (this.isEdit || this.source() === 'manual' || !!this.form.quoteId);
  }

  addScopeLink(): void {
    const p = this.editing();
    if (p) this.router.navigate(['/office/projects', p.id], { queryParams: { addScope: 1 } });
  }

  save(): void {
    if (!this.canSave) return;
    const p = this.editing();
    if (!p) {
      this.saving.set(true);
      this.office.createProject(this.form).subscribe((res) => {
        this.saving.set(false);
        if (res.succeeded && res.data) this.router.navigate(['/office/projects', res.data.id], { replaceUrl: true });
      });
      return;
    }
    const finalChanged = (this.form.land.finalBuildArea || null) !== (p.land.finalBuildArea || null);
    if (finalChanged && p.fees.extMode === 'perSqm') {
      const area = this.form.land.finalBuildArea || this.form.land.buildArea;
      this.confirm.confirm({
        header: this.translate.instant('office.projectForm.recalcTitle'),
        message: this.translate.instant('office.projectForm.recalcMsg', {
          area, fee: (p.fees.rate * area).toLocaleString('en-US'), diff: (p.fees.rate * (area - p.land.buildArea)).toLocaleString('en-US'),
        }),
        icon: 'pi pi-exclamation-circle',
        accept: () => this.doUpdate(p.id),
      });
      return;
    }
    this.doUpdate(p.id);
  }

  private doUpdate(id: string): void {
    this.saving.set(true);
    this.office.updateProject(id, this.form).subscribe((res) => {
      this.saving.set(false);
      if (res.succeeded) this.router.navigate(['/office/projects', id]);
    });
  }

  cancel(): void {
    const p = this.editing();
    this.router.navigate(p ? ['/office/projects', p.id] : ['/office/projects']);
  }
}
