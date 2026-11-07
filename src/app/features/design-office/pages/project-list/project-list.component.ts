import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateService } from '@ngx-translate/core';

import { OfficeService, ProjectSummary } from '../../services/office.service';
import { JodPipe, PROJECT_SEVERITY } from '../../shared/office-ui';
import { ProjectStatus } from '../../models/office.models';

@Component({
  selector: 'app-office-project-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, TagModule, SelectModule,
    InputTextModule, IconFieldModule, InputIconModule, TooltipModule, JodPipe,
  ],
  templateUrl: './project-list.component.html',
})
export class OfficeProjectListComponent {
  private readonly office = inject(OfficeService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly severity = PROJECT_SEVERITY;
  readonly statuses: ProjectStatus[] = ['active', 'onHold', 'completed', 'cancelled'];

  readonly search = signal('');
  readonly scopeType = signal<string | null>(null);
  readonly stageName = signal<string | null>(null);
  readonly status = signal<ProjectStatus | null>('active');

  readonly templates = this.office.templates;
  readonly stageNames = computed(() => {
    const names = new Set<string>();
    this.office.templates().forEach((t) => t.stages.forEach((s) => names.add(s.name)));
    return [...names].map((n) => ({ label: n, value: n }));
  });

  readonly summaries = this.office.projectSummaries;

  readonly stats = computed(() => {
    const all = this.summaries();
    const quotes = this.office.quotes();
    return {
      active: all.filter((s) => s.project.status === 'active').length,
      awaitingQuote: quotes.filter((q) => q.status === 'sent' || q.status === 'revisionRequested').length,
      licensing: all.filter((s) => s.project.status === 'active' && s.current?.stage.type === 'license').length,
      receivables: this.office.receivablesTotal(),
    };
  });

  readonly filtered = computed(() => {
    const s = this.search().trim().toLowerCase();
    return this.summaries().filter((x) => {
      const p = x.project;
      return (!this.status() || p.status === this.status()) &&
        (!this.scopeType() || p.scopes.some((sc) => sc.templateId === this.scopeType())) &&
        (!this.stageName() || x.current?.stage.name === this.stageName()) &&
        (!s || p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || (x.client?.name ?? '').toLowerCase().includes(s));
    });
  });

  scopesLabel(x: ProjectSummary): string {
    return x.project.scopes.map((s) => s.templateName).join(' · ') || '—';
  }

  stageLabel(x: ProjectSummary): string {
    if (!x.current) return this.translate.instant('office.stage.allDone');
    return `Phase ${x.current.stage.n} · ${x.current.stage.name}`;
  }

  open(x: ProjectSummary): void {
    this.router.navigate(['/office/projects', x.project.id]);
  }

  resetDemo(): void {
    this.confirm.confirm({
      header: this.translate.instant('office.demo.resetTitle'),
      message: this.translate.instant('office.demo.resetMsg'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.office.resetDemoData(),
    });
  }
}
