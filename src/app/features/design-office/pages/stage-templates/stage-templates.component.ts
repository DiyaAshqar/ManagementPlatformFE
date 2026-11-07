import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { OfficeService } from '../../services/office.service';
import { EditableListComponent } from '../../shared/editable-list.component';
import { CustomFieldDef, StageTemplate, StageType, TemplateStage } from '../../models/office.models';

/** Screen 04 — Stages Builder: one template per scope type, copied into a project when the scope is added. */
@Component({
  selector: 'app-office-stage-templates',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, InputTextModule, InputNumberModule,
    SelectModule, MultiSelectModule, ToggleSwitchModule, TagModule, TooltipModule, EditableListComponent,
  ],
  templateUrl: './stage-templates.component.html',
})
export class OfficeStageTemplatesComponent implements OnInit {
  private readonly office = inject(OfficeService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly stageTypes: StageType[] = ['design', 'license', 'execution'];
  readonly fieldTypes: CustomFieldDef['type'][] = ['text', 'date', 'number'];
  readonly templates = this.office.templates;

  readonly selectedId = signal<string | null>(null);
  readonly selectedStageId = signal<string | null>(null);
  readonly dirty = signal(false);

  draft: StageTemplate | null = null;

  ngOnInit(): void {
    this.select(this.templates()[0]?.id ?? null);
  }

  get stage(): TemplateStage | undefined {
    return this.draft?.stages.find((s) => s.id === this.selectedStageId());
  }

  get stageIndex(): number {
    return this.draft?.stages.findIndex((s) => s.id === this.selectedStageId()) ?? -1;
  }

  get pctSum(): number {
    return this.draft?.stages.reduce((s, x) => s + (Number(x.claimPct) || 0), 0) ?? 0;
  }

  /** A stage may only return to stages before it. */
  get returnOptions(): { label: string; value: string }[] {
    if (!this.draft) return [];
    return this.draft.stages.slice(0, Math.max(this.stageIndex, 0)).map((s) => ({ label: s.name, value: s.name }));
  }

  select(id: string | null): void {
    const go = () => {
      const t = this.office.template(id);
      this.selectedId.set(id);
      this.draft = t ? structuredClone(t) : null;
      this.selectedStageId.set(this.draft?.stages[0]?.id ?? null);
      this.dirty.set(false);
    };
    if (this.dirty() && id !== this.selectedId()) {
      this.confirm.confirm({
        header: this.translate.instant('office.templates.unsavedTitle'),
        message: this.translate.instant('office.templates.unsavedMsg'),
        icon: 'pi pi-exclamation-circle',
        accept: go,
      });
    } else {
      go();
    }
  }

  touch(): void {
    this.dirty.set(true);
  }

  newTemplate(): void {
    const t: StageTemplate = {
      id: this.office.newId('tpl'),
      name: this.translate.instant('office.templates.newName'),
      scopeName: '',
      obligations: [],
      stages: [],
    };
    this.selectedId.set(t.id);
    this.draft = t;
    this.selectedStageId.set(null);
    this.addStage();
  }

  addStage(): void {
    if (!this.draft) return;
    const s: TemplateStage = {
      id: this.office.newId('ts'),
      name: this.translate.instant('office.templates.newStage', { n: this.draft.stages.length + 1 }),
      type: 'design',
      claimPct: 0,
      allowSubcontractors: false,
      requireAttachments: false,
      allowRecertify: false,
      returnTo: [],
      customFields: [],
    };
    this.draft.stages = [...this.draft.stages, s];
    this.selectedStageId.set(s.id);
    this.touch();
  }

  move(i: number, dir: -1 | 1, event: Event): void {
    event.stopPropagation();
    if (!this.draft) return;
    const j = i + dir;
    if (j < 0 || j >= this.draft.stages.length) return;
    const arr = [...this.draft.stages];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.draft.stages = arr;
    this.touch();
  }

  removeStage(): void {
    if (!this.draft || !this.stage) return;
    const name = this.stage.name;
    this.draft.stages = this.draft.stages.filter((s) => s.id !== this.selectedStageId());
    this.draft.stages.forEach((s) => (s.returnTo = s.returnTo.filter((r) => r !== name)));
    this.selectedStageId.set(this.draft.stages[0]?.id ?? null);
    this.touch();
  }

  renameStage(value: string): void {
    const st = this.stage;
    if (!st || !this.draft) return;
    const old = st.name;
    st.name = value;
    // keep "return to" references pointing at the renamed stage
    this.draft.stages.forEach((s) => (s.returnTo = s.returnTo.map((r) => (r === old ? value : r))));
    this.touch();
  }

  addField(): void {
    const st = this.stage;
    if (!st) return;
    st.customFields = [...st.customFields, { id: this.office.newId('cf'), label: '', type: 'text' }];
    this.touch();
  }

  removeField(i: number): void {
    const st = this.stage;
    if (!st) return;
    st.customFields = st.customFields.filter((_, idx) => idx !== i);
    this.touch();
  }

  save(): void {
    if (!this.draft) return;
    this.office.saveTemplate(this.draft).subscribe((res) => {
      if (res.succeeded) this.dirty.set(false);
    });
  }

  remove(): void {
    if (!this.draft) return;
    const id = this.draft.id;
    this.confirm.confirm({
      header: this.translate.instant('office.templates.deleteTitle'),
      message: this.translate.instant('office.templates.deleteMsg'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.office.deleteTemplate(id).subscribe(() => {
        this.dirty.set(false);
        this.select(this.templates()[0]?.id ?? null);
      }),
    });
  }

  isSaved(): boolean {
    return !!this.office.template(this.draft?.id);
  }
}
