import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';

import { OfficeService } from '../../services/office.service';
import { todayIso } from '../../services/office-calc';
import { JodPipe, fileNames } from '../../shared/office-ui';
import { ProjectExpense, ProjectExpenseCategory } from '../../models/office.models';

type Filter = 'all' | 'project' | 'stage' | 'step';

interface Row {
  id: string;
  date: string;
  category: ProjectExpenseCategory;
  description: string;
  where: string;
  billable: boolean;
  amount: number;
  kind: Exclude<Filter, 'all'>;
  expense?: ProjectExpense;
}

/** Screen 16 — direct project/stage expenses, separate from the office's admin expenses. */
@Component({
  selector: 'app-office-project-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, TableModule, SelectModule, InputTextModule, InputNumberModule, CheckboxModule, TagModule, JodPipe],
  templateUrl: './project-expenses.component.html',
})
export class OfficeProjectExpensesComponent {
  private readonly office = inject(OfficeService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly categories: ProjectExpenseCategory[] = ['officialFees', 'printing', 'surveyor', 'subcontractor', 'transport', 'other'];
  readonly filters: Filter[] = ['all', 'project', 'stage', 'step'];
  readonly projectId = this.route.snapshot.paramMap.get('id')!;
  readonly summary = computed(() => this.office.projectSummary(this.projectId));
  readonly project = computed(() => this.summary()?.project);
  readonly filter = signal<Filter>('all');

  form = this.blank();

  readonly rows = computed<Row[]>(() => {
    const p = this.project();
    if (!p) return [];
    const where = (scopeId?: string, stageId?: string) => {
      const sc = p.scopes.find((s) => s.id === scopeId) ?? (stageId ? this.office.findScopeOfStage(p, stageId) : undefined);
      const st = stageId ? this.office.findStage(p, stageId) : undefined;
      if (!sc) return this.translate.instant('office.projectExpenses.wholeProject');
      return st ? `${sc.templateName} · ${st.name}` : sc.templateName;
    };
    const out: Row[] = this.office.db().projectExpenses.filter((e) => e.projectId === p.id).map((e) => ({
      id: e.id, date: e.date, category: e.category, description: e.description, where: where(e.scopeId, e.stageId),
      billable: e.billable, amount: e.amount, kind: e.stageId ? 'stage' : 'project', expense: e,
    }));
    for (const sc of p.scopes) {
      for (const st of sc.stages) {
        for (const l of st.log.filter((x) => x.cost > 0)) {
          out.push({
            id: l.id, date: l.date, category: 'stageStep', description: l.step, where: `${sc.templateName} · ${st.name}`,
            billable: !!l.billable, amount: l.cost, kind: 'step',
          });
        }
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly filtered = computed(() => this.rows().filter((r) => this.filter() === 'all' || r.kind === this.filter()));
  readonly total = computed(() => this.filtered().reduce((s, r) => s + r.amount, 0));

  get stagesOfScope() {
    const sc = this.project()?.scopes.find((s) => s.id === this.form.scopeId);
    return sc?.stages ?? [];
  }

  setLevel(level: 'project' | 'stage'): void {
    this.form.level = level;
    if (level === 'project') {
      this.form.scopeId = undefined;
      this.form.stageId = undefined;
    } else if (!this.form.scopeId) {
      this.form.scopeId = this.project()?.scopes[0]?.id;
    }
  }

  pickFile(event: Event): void {
    this.form.attachment = fileNames(event)[0];
  }

  save(): void {
    const { level, ...rest } = this.form;
    this.office.addProjectExpense({
      ...rest, projectId: this.projectId,
      scopeId: level === 'stage' ? rest.scopeId : undefined,
      stageId: level === 'stage' ? rest.stageId : undefined,
    }).subscribe((res) => {
      if (res.succeeded) this.form = this.blank();
    });
  }

  remove(r: Row): void {
    if (!r.expense) return;
    this.confirm.confirm({
      header: this.translate.instant('office.common.deleteTitle'),
      message: this.translate.instant('office.common.deleteMsg', { name: r.description }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.office.deleteProjectExpense(r.expense!.id).subscribe(),
    });
  }

  private blank() {
    return {
      level: 'stage' as 'project' | 'stage',
      scopeId: undefined as string | undefined,
      stageId: undefined as string | undefined,
      category: 'officialFees' as ProjectExpenseCategory,
      description: '',
      amount: 0,
      date: todayIso(),
      billable: false,
      attachment: undefined as string | undefined,
    };
  }
}
