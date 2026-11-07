import { Injectable, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Observable, defer, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

import {
  AdminExpense, ApiResponse, Claim, ClaimAdjustment, ClaimStatus, Client, Discipline, Drawing, DrawingSet,
  Fees, Id, LandInfo, LicenseFile, ManualClaimType, OfficeDb, Project, ProjectExpense, ProjectStatus, ProjectType,
  Quote, QuoteContent, Receipt, RevisionReason, Scope, Stage, StageLogEntry, StageTemplate, TeamMember,
  PaymentMethod, Subcontractor,
} from '../models/office.models';
import { OfficeDbService } from './office-db.service';
import {
  RECEIVABLE_STATUSES, addDays, claimPaid, claimStatus, claimTotal, currentStage, feeTotals, fileKind,
  paymentsPctSum, projectContractValue, projectStepsCost, round2, stageFromTemplate, todayIso,
} from './office-calc';

/** Business-rule failure; `key` is an i18n key under office.errors. */
export class OfficeError extends Error {
  constructor(public key: string, public params?: Record<string, unknown>) {
    super(key);
  }
}

export interface ClaimView {
  claim: Claim;
  project?: Project;
  client?: Client;
  total: number;
  paid: number;
  rest: number;
  status: ClaimStatus;
  stage?: Stage;
}

export interface ProjectSummary {
  project: Project;
  client?: Client;
  contractValue: number;
  claimed: number;
  received: number;
  stepsCost: number;
  directExpenses: number;
  subcontractors: number;
  billable: number;
  profit: number;
  margin: number;
  current: ReturnType<typeof currentStage>;
}

export interface ProjectForm {
  name: string;
  clientId: Id;
  quoteId?: Id;
  status: ProjectStatus;
  land: LandInfo;
  location?: string;
  manager: string;
  startDate?: string;
  endDate?: string;
  team: TeamMember[];
  notes?: string;
  attachments: string[];
  /** Manual projects only: scopes picked in the form. */
  scopes: { templateId: Id; name: string; value: number }[];
}

export interface AddScopeForm {
  templateId: Id | null;
  name: string;
  engineer: string;
  value: number;
  startDate?: string;
  stageNames: string[];
  addendum: boolean;
}

/**
 * Engineering Office API.
 *
 * Reads are exposed as signals/helpers; every write returns the standard
 * `ApiResponse<T>` envelope as an Observable (with a small latency), exactly
 * like the generated clients — so screens won't change when this is switched
 * to the real backend. Success/error toasts live here because there is no
 * HTTP call for the interceptors to see.
 */
@Injectable({ providedIn: 'root' })
export class OfficeService {
  private readonly store = inject(OfficeDbService);
  private readonly translate = inject(TranslateService);
  private readonly messages = inject(MessageService);

  readonly db = this.store.db;

  // ─── Read helpers ────────────────────────────────────────────────────

  readonly clients = computed(() => this.db().clients);
  readonly templates = computed(() => this.db().templates);
  readonly contractTemplates = computed(() => this.db().contractTemplates);
  readonly settings = computed(() => this.db().settings);
  readonly quotes = computed(() => [...this.db().quotes].sort((a, b) => b.ref.localeCompare(a.ref)));

  readonly claimViews = computed<ClaimView[]>(() => {
    const db = this.db();
    const today = todayIso();
    return db.claims.map((claim) => {
      const total = claimTotal(claim);
      const paid = claimPaid(claim, db.receipts);
      const project = db.projects.find((p) => p.id === claim.projectId);
      return {
        claim,
        project,
        client: db.clients.find((c) => c.id === project?.clientId),
        total,
        paid,
        rest: round2(Math.max(total - paid, 0)),
        status: claimStatus(claim, paid, today),
        stage: project ? this.findStage(project, claim.stageId) : undefined,
      };
    });
  });

  readonly projectSummaries = computed<ProjectSummary[]>(() => {
    const db = this.db();
    const views = this.claimViews();
    return db.projects
      .map((project) => {
        const pViews = views.filter((v) => v.claim.projectId === project.id && v.status !== 'cancelled');
        const contractValue = projectContractValue(project);
        const stepsCost = projectStepsCost(project);
        const expenses = db.projectExpenses.filter((e) => e.projectId === project.id);
        const subcontractors = round2(expenses.filter((e) => e.category === 'subcontractor').reduce((s, e) => s + e.amount, 0));
        const directExpenses = round2(expenses.filter((e) => e.category !== 'subcontractor').reduce((s, e) => s + e.amount, 0));
        const billableSteps = project.scopes.flatMap((s) => s.stages).flatMap((s) => s.log)
          .filter((l) => l.billable).reduce((s, l) => s + l.cost, 0);
        const billable = round2(expenses.filter((e) => e.billable).reduce((s, e) => s + e.amount, 0) + billableSteps);
        const profit = round2(contractValue - (stepsCost + directExpenses + subcontractors));
        return {
          project,
          client: db.clients.find((c) => c.id === project.clientId),
          contractValue,
          claimed: round2(pViews.filter((v) => v.status !== 'scheduled').reduce((s, v) => s + v.total, 0)),
          received: round2(db.receipts.filter((r) => r.projectId === project.id).reduce((s, r) => s + r.amount, 0)),
          stepsCost,
          directExpenses,
          subcontractors,
          billable,
          profit,
          margin: contractValue ? Math.round((profit / contractValue) * 100) : 0,
          current: currentStage(project),
        };
      })
      .sort((a, b) => b.project.code.localeCompare(a.project.code));
  });

  readonly receivablesTotal = computed(() =>
    round2(this.claimViews().filter((v) => RECEIVABLE_STATUSES.includes(v.status)).reduce((s, v) => s + v.rest, 0)),
  );

  client(id: Id | undefined): Client | undefined {
    return this.db().clients.find((c) => c.id === id);
  }

  clientName(id: Id | undefined): string {
    return this.client(id)?.name ?? '—';
  }

  project(id: Id | null | undefined): Project | undefined {
    return this.db().projects.find((p) => p.id === id);
  }

  projectSummary(id: Id | null | undefined): ProjectSummary | undefined {
    return this.projectSummaries().find((s) => s.project.id === id);
  }

  quote(id: Id | null | undefined): Quote | undefined {
    return this.db().quotes.find((q) => q.id === id);
  }

  template(id: Id | null | undefined): StageTemplate | undefined {
    return this.db().templates.find((t) => t.id === id);
  }

  claimView(id: Id | null | undefined): ClaimView | undefined {
    return this.claimViews().find((v) => v.claim.id === id);
  }

  claimsForProject(projectId: Id): ClaimView[] {
    return this.claimViews()
      .filter((v) => v.claim.projectId === projectId)
      .sort((a, b) => a.claim.no.localeCompare(b.claim.no));
  }

  receiptsForClaim(claimId: Id): Receipt[] {
    return this.db().receipts.filter((r) => r.claimId === claimId);
  }

  findStage(project: Project, stageId: Id | undefined): Stage | undefined {
    if (!stageId) return undefined;
    for (const sc of project.scopes) {
      const st = sc.stages.find((s) => s.id === stageId);
      if (st) return st;
    }
    return undefined;
  }

  findScopeOfStage(project: Project, stageId: Id): Scope | undefined {
    return project.scopes.find((sc) => sc.stages.some((s) => s.id === stageId));
  }

  // ─── Quotes ──────────────────────────────────────────────────────────

  saveQuote(content: QuoteContent, id: Id | null, send: boolean): Observable<ApiResponse<Quote>> {
    return this.run(send ? 'office.toast.quoteSent' : 'office.toast.quoteSaved', () => {
      const sum = paymentsPctSum(content.payments);
      if (send && sum !== 100) throw new OfficeError('office.errors.paymentsNot100', { sum });
      return this.store.mutate((db) => {
        const total = feeTotals(content.fees, content.land).total;
        const snapshot = structuredClone(content);
        if (!id) {
          const ref = this.store.nextNo(db, 'quote', 'DES-CON-', 2);
          const status = send ? 'sent' : 'draft';
          const q: Quote = {
            ...structuredClone(content), id: this.store.newId('q'), ref, rev: 0, status,
            revisions: [{ rev: 0, date: todayIso(), status, total, snapshot }], createdAt: todayIso(),
          };
          db.quotes.push(q);
          return q;
        }
        const q = db.quotes.find((x) => x.id === id)!;
        if (q.status === 'approved') throw new OfficeError('office.errors.quoteLocked');
        Object.assign(q, structuredClone(content));
        if (send) q.status = 'sent';
        const cur = q.revisions.find((r) => r.rev === q.rev)!;
        cur.total = total;
        cur.snapshot = snapshot;
        cur.status = q.status;
        if (send) cur.date = todayIso();
        return q;
      });
    });
  }

  newQuoteRevision(id: Id): Observable<ApiResponse<Quote>> {
    return this.run('office.toast.revisionCreated', () =>
      this.store.mutate((db) => {
        const q = db.quotes.find((x) => x.id === id)!;
        if (q.status === 'approved') throw new OfficeError('office.errors.quoteLocked');
        const { id: _i, ref: _r, rev: _v, status: _s, revisions: _rv, projectId: _p, createdAt: _c, ...content } = q;
        q.rev += 1;
        q.status = 'draft';
        q.revisions.push({
          rev: q.rev, date: todayIso(), status: 'draft',
          total: feeTotals(q.fees, q.land).total, snapshot: structuredClone(content as QuoteContent),
        });
        return q;
      }),
    );
  }

  quoteResponse(id: Id, response: 'revisionRequested' | 'rejected', note: string): Observable<ApiResponse<Quote>> {
    return this.run('office.toast.responseRecorded', () =>
      this.store.mutate((db) => {
        const q = db.quotes.find((x) => x.id === id)!;
        q.status = response;
        const cur = q.revisions.find((r) => r.rev === q.rev)!;
        cur.status = response;
        cur.note = note;
        return q;
      }),
    );
  }

  /** Client approved: the quote is locked and becomes the basis of a project/contract. */
  approveQuote(id: Id): Observable<ApiResponse<Quote>> {
    return this.run('office.toast.quoteApproved', () =>
      this.store.mutate((db) => {
        const q = db.quotes.find((x) => x.id === id)!;
        const sum = paymentsPctSum(q.payments);
        if (sum !== 100) throw new OfficeError('office.errors.paymentsNot100', { sum });
        q.status = 'approved';
        const cur = q.revisions.find((r) => r.rev === q.rev)!;
        cur.status = 'approved';
        return q;
      }),
    );
  }

  addClient(client: Omit<Client, 'id'>): Observable<ApiResponse<Client>> {
    return this.run('office.toast.clientAdded', () =>
      this.store.mutate((db) => {
        const c: Client = { ...client, id: this.store.newId('cl') };
        db.clients.push(c);
        return c;
      }),
    );
  }

  // ─── Projects ────────────────────────────────────────────────────────

  createProject(form: ProjectForm): Observable<ApiResponse<Project>> {
    return this.run('office.toast.projectCreated', () =>
      this.store.mutate((db) => {
        const me = db.settings.currentUser;
        const quote = form.quoteId ? db.quotes.find((q) => q.id === form.quoteId) : undefined;
        if (quote?.projectId) throw new OfficeError('office.errors.quoteHasProject');
        const code = this.store.nextNo(db, 'project', 'PRJ-', 3);
        const fees: Fees = quote ? structuredClone(quote.fees) : { extMode: 'lump', rate: 0, extLump: 0, interior: 0, interiorOn: false };

        const scopes: Scope[] = [];
        const scopeDefs = quote
          ? this.quoteScopeValues(quote).map((s) => ({ templateId: s.templateId, name: s.name, value: s.value }))
          : form.scopes;
        for (const def of scopeDefs) {
          const t = db.templates.find((x) => x.id === def.templateId);
          if (!t) continue;
          scopes.push({
            id: this.store.newId('sc'),
            name: def.name || t.scopeName,
            templateId: t.id,
            templateName: t.name,
            engineer: form.manager,
            value: def.value,
            startDate: form.startDate,
            stages: t.stages.map((s, i) => stageFromTemplate(s, this.store.newId('st'), i + 1, form.manager)),
          });
        }
        // first stage of every scope starts right away
        for (const sc of scopes) {
          if (sc.stages[0]) {
            sc.stages[0].status = 'active';
            sc.stages[0].startDate = form.startDate || todayIso();
          }
        }

        const project: Project = {
          id: this.store.newId('prj'),
          code,
          name: form.name,
          clientId: form.clientId,
          quoteId: quote?.id,
          status: form.status,
          land: structuredClone(form.land),
          location: form.location,
          manager: form.manager,
          startDate: form.startDate,
          endDate: form.endDate,
          team: structuredClone(form.team),
          notes: form.notes,
          attachments: [...form.attachments],
          fees,
          scopes,
          contractDrafts: quote ? [{ rev: 0, date: todayIso(), notes: '', status: 'pendingApproval' }] : [],
          contractApproved: false,
          activities: [{ id: this.store.newId('ac'), date: todayIso(), by: me, text: this.t('office.activity.projectCreated', { ref: quote?.ref ?? '—' }) }],
          createdAt: todayIso(),
        };
        db.projects.push(project);

        if (quote) {
          quote.projectId = project.id;
          const value = projectContractValue(project);
          for (const term of quote.payments) {
            const stage = term.stageName ? this.stageByName(project, term.stageName) : undefined;
            db.claims.push({
              id: this.store.newId('cl'),
              no: this.store.nextNo(db, 'claim', 'CL-'),
              projectId: project.id,
              paymentTermId: term.id,
              paymentName: term.name,
              pct: term.pct,
              stageId: stage?.id,
              trigger: term.trigger,
              condition: term.condition,
              kind: 'scheduled',
              baseAmount: round2((value * term.pct) / 100),
              adjustments: [],
              status: 'scheduled',
              events: [{ date: todayIso(), text: 'created' }],
              createdAt: todayIso(),
            });
          }
        }
        return project;
      }),
    );
  }

  /** Splits the quote fees over its scopes: interior fee → interior scope, external fee → first other scope. */
  quoteScopeValues(quote: QuoteContent): { templateId: Id; name: string; value: number }[] {
    const totals = feeTotals(quote.fees, quote.land);
    let extAssigned = false;
    return quote.scopes.map((s) => {
      let value = 0;
      if (s.templateId === 'tpl-int') value = totals.interior;
      else if (!extAssigned) {
        value = totals.ext;
        extAssigned = true;
      }
      return { templateId: s.templateId, name: s.name, value };
    });
  }

  /**
   * Saves project edits. When the final build area changes on a per-m² contract,
   * the external design fee and every not-yet-paid scheduled claim are recalculated
   * (as an "area difference" adjustment).
   */
  updateProject(id: Id, form: ProjectForm): Observable<ApiResponse<Project>> {
    return this.run('office.toast.projectUpdated', () => {
      const receipts = this.db().receipts;
      return this.store.mutate((db) => {
        const p = db.projects.find((x) => x.id === id)!;
        const prevFinal = p.land.finalBuildArea;
        Object.assign(p, {
          name: form.name, clientId: form.clientId, status: form.status, land: structuredClone(form.land),
          location: form.location, manager: form.manager, startDate: form.startDate, endDate: form.endDate,
          team: structuredClone(form.team), notes: form.notes, attachments: [...form.attachments],
          updatedAt: todayIso(), updatedBy: db.settings.currentUser,
        });
        if (p.fees.extMode === 'perSqm' && (form.land.finalBuildArea || null) !== (prevFinal || null)) {
          this.applyFinalArea(db, p, receipts);
        }
        return p;
      });
    });
  }

  private applyFinalArea(db: OfficeDb, p: Project, receipts: Receipt[]): void {
    const finalArea = p.land.finalBuildArea || p.land.buildArea;
    const diffArea = finalArea - p.land.buildArea;
    const extDiff = round2(diffArea * p.fees.rate);
    // external scope = first non-interior scope
    const ext = p.scopes.find((s) => s.templateId !== 'tpl-int');
    const initialExt = round2(p.fees.rate * p.land.buildArea);
    if (ext) ext.value = round2(initialExt + extDiff);
    for (const c of db.claims.filter((x) => x.projectId === p.id && x.kind === 'scheduled' && x.status !== 'cancelled')) {
      if (claimPaid(c, receipts) >= claimTotal(c)) continue;
      c.adjustments = c.adjustments.filter((a) => a.kind !== 'areaDiff');
      const amount = round2((extDiff * c.pct) / 100);
      if (amount !== 0) {
        c.adjustments.push({ id: this.store.newId('adj'), kind: 'areaDiff', label: this.t('office.claim.areaDiff'), amount });
      }
    }
    p.activities.unshift({
      id: this.store.newId('ac'), date: todayIso(), by: db.settings.currentUser,
      text: this.t('office.activity.finalArea', { area: finalArea }),
    });
  }

  addScope(projectId: Id, form: AddScopeForm): Observable<ApiResponse<Scope>> {
    return this.run('office.toast.scopeAdded', () =>
      this.store.mutate((db) => {
        const p = db.projects.find((x) => x.id === projectId)!;
        const t = db.templates.find((x) => x.id === form.templateId);
        const stages: Stage[] = form.stageNames.map((name, i) => {
          const ts = t?.stages.find((s) => s.name === name);
          const base = ts ?? {
            id: '', name, type: 'design' as const, claimPct: 0, allowSubcontractors: false,
            requireAttachments: false, allowRecertify: false, returnTo: [], customFields: [],
          };
          return stageFromTemplate(base, this.store.newId('st'), i + 1, form.engineer);
        });
        const scope: Scope = {
          id: this.store.newId('sc'),
          name: form.name,
          templateId: t?.id ?? 'custom',
          templateName: t?.name ?? this.t('office.scope.custom'),
          engineer: form.engineer,
          value: form.value || 0,
          startDate: form.startDate,
          stages,
        };
        p.scopes.push(scope);
        if (form.addendum && form.value > 0) {
          const last = stages[stages.length - 1];
          db.claims.push({
            id: this.store.newId('cl'),
            no: this.store.nextNo(db, 'claim', 'CL-'),
            projectId,
            paymentName: this.t('office.claim.addendumPayment', { name: form.name }),
            pct: 100,
            stageId: last?.id,
            trigger: last ? 'stage' : 'manual',
            condition: this.t('office.claim.addendumCondition', { name: form.name }),
            kind: 'manual',
            manualType: 'addendum',
            baseAmount: form.value,
            adjustments: [],
            status: last ? 'scheduled' : 'due',
            events: [{ date: todayIso(), text: 'created' }],
            createdAt: todayIso(),
          });
        }
        p.activities.unshift({
          id: this.store.newId('ac'), date: todayIso(), by: db.settings.currentUser,
          text: this.t('office.activity.scopeAdded', { name: form.name }),
        });
        return scope;
      }),
    );
  }

  addContractDraft(projectId: Id, notes: string): Observable<ApiResponse<Project>> {
    return this.run('office.toast.draftAdded', () =>
      this.store.mutate((db) => {
        const p = db.projects.find((x) => x.id === projectId)!;
        if (p.contractApproved) throw new OfficeError('office.errors.contractLocked');
        p.contractDrafts.forEach((d) => {
          if (d.status === 'pendingApproval') d.status = 'amended';
        });
        const last = p.contractDrafts[p.contractDrafts.length - 1];
        if (last && notes) last.notes = notes;
        p.contractDrafts.push({ rev: (last?.rev ?? -1) + 1, date: todayIso(), notes: '', status: 'pendingApproval' });
        return p;
      }),
    );
  }

  /** Contract approved: the signing payment becomes due immediately. */
  approveContract(projectId: Id): Observable<ApiResponse<Project>> {
    return this.run('office.toast.contractApproved', () =>
      this.store.mutate((db) => {
        const p = db.projects.find((x) => x.id === projectId)!;
        if (!p.contractDrafts.length) p.contractDrafts.push({ rev: 0, date: todayIso(), notes: '', status: 'pendingApproval' });
        p.contractDrafts[p.contractDrafts.length - 1].status = 'approved';
        p.contractApproved = true;
        for (const c of db.claims.filter((x) => x.projectId === projectId && x.trigger === 'signing' && x.status === 'scheduled')) {
          c.status = 'due';
          c.dueDate = todayIso();
          c.events.push({ date: todayIso(), text: 'becameDueSigning' });
        }
        p.activities.unshift({ id: this.store.newId('ac'), date: todayIso(), by: db.settings.currentUser, text: this.t('office.activity.contractApproved') });
        return p;
      }),
    );
  }

  // ─── Stages ──────────────────────────────────────────────────────────

  private withStage<T>(db: OfficeDb, projectId: Id, stageId: Id, fn: (p: Project, sc: Scope, st: Stage) => T): T {
    const p = db.projects.find((x) => x.id === projectId)!;
    const sc = p.scopes.find((s) => s.stages.some((x) => x.id === stageId))!;
    const st = sc.stages.find((x) => x.id === stageId)!;
    return fn(p, sc, st);
  }

  addStageLog(projectId: Id, stageId: Id, entry: Omit<StageLogEntry, 'id' | 'by'>): Observable<ApiResponse<StageLogEntry>> {
    return this.run('office.toast.logAdded', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (p, _sc, st) => {
          const e: StageLogEntry = { ...entry, id: this.store.newId('lg'), by: db.settings.currentUser };
          st.log.push(e);
          if (e.attachment) st.files.push({ id: this.store.newId('f'), name: e.attachment, kind: fileKind(e.attachment), date: e.date, by: e.by });
          p.activities.unshift({ id: this.store.newId('ac'), date: e.date, by: e.by, text: this.t('office.activity.logAdded', { step: e.step, stage: st.name }) });
          return e;
        }),
      ),
    );
  }

  startStage(projectId: Id, stageId: Id): Observable<ApiResponse<Stage>> {
    return this.run('office.toast.stageStarted', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (_p, _sc, st) => {
          st.status = 'active';
          st.startDate = todayIso();
          return st;
        }),
      ),
    );
  }

  /** Finishes a stage: next stage starts and claims tied to this stage become due. */
  completeStage(projectId: Id, stageId: Id): Observable<ApiResponse<{ next?: Stage; claimsDue: number }>> {
    return this.run('office.toast.stageCompleted', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (p, sc, st) => {
          if (st.requireAttachments && !st.files.length) throw new OfficeError('office.errors.attachmentsRequired');
          const me = db.settings.currentUser;
          st.status = 'completed';
          st.endDate = todayIso();
          st.log.push({ id: this.store.newId('lg'), step: this.t('office.stage.completedStep'), fileId: 'original', date: todayIso(), by: me, cost: 0 });
          st.licenseFiles.forEach((f) => (f.open = false));
          const next = sc.stages.find((s) => s.n > st.n && s.status !== 'completed');
          if (next) {
            next.status = 'active';
            next.startDate = next.startDate ?? todayIso();
          }
          let claimsDue = 0;
          for (const c of db.claims.filter((x) => x.projectId === projectId && x.stageId === stageId && x.status === 'scheduled')) {
            c.status = 'due';
            c.dueDate = addDays(todayIso(), 14);
            c.events.push({ date: todayIso(), text: 'becameDue', params: { stage: st.name } });
            claimsDue++;
          }
          p.activities.unshift({ id: this.store.newId('ac'), date: todayIso(), by: me, text: this.t('office.activity.stageCompleted', { stage: st.name }) });
          if (sc.stages.every((s) => s.status === 'completed') && p.scopes.every((s) => s.stages.every((x) => x.status === 'completed'))) {
            p.status = 'completed';
          }
          return { next, claimsDue };
        }),
      ),
    );
  }

  /**
   * Sends the file back to an earlier stage. The current stage goes on hold,
   * the reason is logged on both, and returning to the Syndicate opens a
   * "re-certification" file instead of a new license item. Claims are untouched.
   */
  returnStage(projectId: Id, stageId: Id, targetName: string, reason: string, details: string, attachment?: string): Observable<ApiResponse<Stage>> {
    return this.run('office.toast.stageReturned', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (p, sc, st) => {
          const target = sc.stages.find((s) => s.name === targetName);
          if (!target) throw new OfficeError('office.errors.returnTargetMissing');
          const me = db.settings.currentUser;
          const today = todayIso();
          const reasonText = this.t('office.returnReasons.' + reason);
          st.status = 'onHold';
          st.log.push({ id: this.store.newId('lg'), step: this.t('office.stage.returnedTo', { stage: target.name }), note: `${reasonText} – ${details}`, fileId: 'original', date: today, by: me, cost: 0, attachment });
          target.status = 'active';
          let fileId: Id | 'original' = 'original';
          if (target.allowRecertify) {
            target.licenseFiles.forEach((f) => (f.open = false));
            const seq = target.licenseFiles.filter((f) => f.kind === 'recertify').length + 1;
            const file: LicenseFile = {
              id: this.store.newId('lf'), kind: 'recertify', seq, number: '', open: true,
              source: this.sourceFromStage(st.name), notes: details,
            };
            target.licenseFiles.push(file);
            fileId = file.id;
          }
          target.log.push({ id: this.store.newId('lg'), step: this.t('office.stage.returnedFrom', { stage: st.name }), note: `${reasonText} – ${details}`, fileId, date: today, by: me, cost: 0, attachment });
          if (attachment) target.files.push({ id: this.store.newId('f'), name: attachment, kind: fileKind(attachment), date: today, by: me });
          p.activities.unshift({ id: this.store.newId('ac'), date: today, by: me, text: this.t('office.activity.stageReturned', { from: st.name, to: target.name }) });
          return target;
        }),
      ),
    );
  }

  private sourceFromStage(name: string): LicenseFile['source'] {
    if (name.includes('الدفاع')) return 'civilDefense';
    if (name.includes('أمانة') || name.includes('البلدي')) return 'municipality';
    return 'syndicateNotes';
  }

  openRecertify(projectId: Id, stageId: Id, form: Omit<LicenseFile, 'id' | 'kind' | 'seq' | 'open'>): Observable<ApiResponse<LicenseFile>> {
    return this.run('office.toast.recertifyOpened', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (p, _sc, st) => {
          const me = db.settings.currentUser;
          st.licenseFiles.forEach((f) => (f.open = false));
          const seq = st.licenseFiles.filter((f) => f.kind === 'recertify').length + 1;
          const file: LicenseFile = { ...form, id: this.store.newId('lf'), kind: 'recertify', seq, open: true };
          st.licenseFiles.push(file);
          st.log.push({ id: this.store.newId('lg'), step: this.t('office.stage.recertifyOpenedStep', { n: seq }), note: form.notes, fileId: file.id, date: form.submittedAt || todayIso(), by: me, cost: 0 });
          if (form.fees && form.fees > 0) {
            st.log.push({ id: this.store.newId('lg'), step: this.t('office.stage.recertifyFeesStep'), fileId: file.id, date: form.submittedAt || todayIso(), by: me, cost: form.fees, billable: true });
          }
          if (st.status !== 'active') st.status = 'active';
          p.activities.unshift({ id: this.store.newId('ac'), date: todayIso(), by: me, text: this.t('office.activity.recertifyOpened', { n: seq }) });
          return file;
        }),
      ),
    );
  }

  addStageFiles(projectId: Id, stageId: Id, names: string[]): Observable<ApiResponse<Stage>> {
    return this.run('office.toast.filesUploaded', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (_p, _sc, st) => {
          for (const name of names) {
            st.files.push({ id: this.store.newId('f'), name, kind: fileKind(name), date: todayIso(), by: db.settings.currentUser });
          }
          return st;
        }),
      ),
    );
  }

  removeStageFile(projectId: Id, stageId: Id, fileId: Id): Observable<ApiResponse<Stage>> {
    return this.run('office.toast.fileRemoved', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (_p, _sc, st) => {
          st.files = st.files.filter((f) => f.id !== fileId);
          return st;
        }),
      ),
    );
  }

  addSubcontractor(projectId: Id, stageId: Id, sub: Omit<Subcontractor, 'id'>): Observable<ApiResponse<Subcontractor>> {
    return this.run('office.toast.subcontractorAdded', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (_p, sc, st) => {
          const s: Subcontractor = { ...sub, id: this.store.newId('sub') };
          st.subcontractors.push(s);
          if (s.value > 0) {
            db.projectExpenses.push({
              id: this.store.newId('pe'), projectId, scopeId: sc.id, stageId, category: 'subcontractor',
              description: `${s.name} – ${s.specialty}`, amount: s.value, date: todayIso(), billable: false,
            });
          }
          return s;
        }),
      ),
    );
  }

  setSubcontractorStatus(projectId: Id, stageId: Id, subId: Id, status: Subcontractor['status']): Observable<ApiResponse<Stage>> {
    return this.run('office.toast.saved', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (_p, _sc, st) => {
          const s = st.subcontractors.find((x) => x.id === subId);
          if (s) s.status = status;
          return st;
        }),
      ),
    );
  }

  saveStageFields(projectId: Id, stageId: Id, values: Record<string, string>, owner: string): Observable<ApiResponse<Stage>> {
    return this.run('office.toast.saved', () =>
      this.store.mutate((db) =>
        this.withStage(db, projectId, stageId, (_p, _sc, st) => {
          st.customValues = { ...values };
          st.owner = owner;
          return st;
        }),
      ),
    );
  }

  /** Project-level edit of a scope's stages (does not touch the template). */
  saveScopeStages(projectId: Id, scopeId: Id, stages: Stage[]): Observable<ApiResponse<Scope>> {
    return this.run('office.toast.saved', () =>
      this.store.mutate((db) => {
        const sc = db.projects.find((p) => p.id === projectId)!.scopes.find((s) => s.id === scopeId)!;
        sc.stages = stages.map((s, i) => ({ ...s, n: i + 1 }));
        return sc;
      }),
    );
  }

  // ─── Claims ──────────────────────────────────────────────────────────

  /** Issues the scheduled claim linked to a stage (optionally with an area adjustment). */
  issueScheduledClaim(claimId: Id, opts: { adjustment: number; dueDate: string; attachDrawings: boolean; send: boolean }): Observable<ApiResponse<Claim>> {
    return this.run(opts.send ? 'office.toast.claimSent' : 'office.toast.claimCreated', () =>
      this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === claimId)!;
        if (opts.adjustment) {
          c.adjustments = c.adjustments.filter((a) => a.kind !== 'areaDiff');
          c.adjustments.push({ id: this.store.newId('adj'), kind: 'areaDiff', label: this.t('office.claim.areaDiff'), amount: opts.adjustment });
        }
        c.status = opts.send ? 'sent' : 'due';
        c.dueDate = opts.dueDate;
        c.attachDrawings = opts.attachDrawings;
        c.events.push({ date: todayIso(), text: 'issued', by: db.settings.currentUser });
        if (opts.send) {
          c.sentAt = todayIso();
          c.events.push({ date: todayIso(), text: 'sent', by: db.settings.currentUser });
        }
        return c;
      }),
    );
  }

  createManualClaim(form: {
    projectId: Id; stageId?: Id; manualType: ManualClaimType; description: string; amount: number;
    dueDate: string; attachDrawings: boolean; send: boolean;
  }): Observable<ApiResponse<Claim>> {
    return this.run(form.send ? 'office.toast.claimSent' : 'office.toast.claimCreated', () => {
      if (!(form.amount > 0)) throw new OfficeError('office.errors.amountRequired');
      return this.store.mutate((db) => {
        const me = db.settings.currentUser;
        const c: Claim = {
          id: this.store.newId('cl'),
          no: this.store.nextNo(db, 'claim', 'CL-'),
          projectId: form.projectId,
          paymentName: this.t('office.manualTypes.' + form.manualType),
          pct: 0,
          stageId: form.stageId,
          trigger: 'manual',
          condition: form.description,
          kind: 'manual',
          manualType: form.manualType,
          description: form.description,
          baseAmount: form.amount,
          adjustments: [],
          dueDate: form.dueDate,
          status: form.send ? 'sent' : 'due',
          sentAt: form.send ? todayIso() : undefined,
          attachDrawings: form.attachDrawings,
          events: [{ date: todayIso(), text: 'createdManual', by: me }],
          createdAt: todayIso(),
        };
        if (form.send) c.events.push({ date: todayIso(), text: 'sent', by: me });
        db.claims.push(c);
        return c;
      });
    });
  }

  sendClaim(id: Id): Observable<ApiResponse<Claim>> {
    return this.run('office.toast.claimSent', () =>
      this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === id)!;
        if (c.status === 'scheduled') throw new OfficeError('office.errors.claimNotDue');
        c.status = 'sent';
        c.sentAt = todayIso();
        c.events.push({ date: todayIso(), text: 'sent', by: db.settings.currentUser });
        return c;
      }),
    );
  }

  sendReminder(id: Id): Observable<ApiResponse<Claim>> {
    return this.run('office.toast.reminderSent', () =>
      this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === id)!;
        c.events.push({ date: todayIso(), text: 'reminder', by: db.settings.currentUser });
        return c;
      }),
    );
  }

  addClaimAdjustment(id: Id, adj: Omit<ClaimAdjustment, 'id'>): Observable<ApiResponse<Claim>> {
    return this.run('office.toast.adjustmentAdded', () =>
      this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === id)!;
        const amount = adj.kind === 'discount' ? -Math.abs(adj.amount) : adj.amount;
        c.adjustments.push({ ...adj, amount, id: this.store.newId('adj') });
        c.events.push({ date: todayIso(), text: 'adjustment', params: { label: adj.label, amount }, by: db.settings.currentUser });
        return c;
      }),
    );
  }

  updateClaimDueDate(id: Id, dueDate: string): Observable<ApiResponse<Claim>> {
    return this.run('office.toast.saved', () =>
      this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === id)!;
        c.dueDate = dueDate;
        c.events.push({ date: todayIso(), text: 'dueDateChanged', params: { date: dueDate }, by: db.settings.currentUser });
        return c;
      }),
    );
  }

  attachClaimDrawings(id: Id): Observable<ApiResponse<Claim>> {
    return this.run('office.toast.saved', () =>
      this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === id)!;
        c.attachDrawings = true;
        c.events.push({ date: todayIso(), text: 'drawingsAttached', by: db.settings.currentUser });
        return c;
      }),
    );
  }

  cancelClaim(id: Id): Observable<ApiResponse<Claim>> {
    return this.run('office.toast.claimCancelled', () => {
      if (this.receiptsForClaim(id).length) throw new OfficeError('office.errors.claimHasReceipts');
      return this.store.mutate((db) => {
        const c = db.claims.find((x) => x.id === id)!;
        c.status = 'cancelled';
        c.events.push({ date: todayIso(), text: 'cancelled', by: db.settings.currentUser });
        return c;
      });
    });
  }

  // ─── Receipts ────────────────────────────────────────────────────────

  createReceipt(form: Omit<Receipt, 'id' | 'no'>): Observable<ApiResponse<Receipt>> {
    return this.run('office.toast.receiptSaved', () => {
      if (!(form.amount > 0)) throw new OfficeError('office.errors.amountRequired');
      const view = form.claimId ? this.claimView(form.claimId) : undefined;
      if (view && form.amount > view.rest + 0.001) throw new OfficeError('office.errors.amountExceedsRest', { rest: view.rest });
      return this.store.mutate((db) => {
        const r: Receipt = { ...form, id: this.store.newId('rc'), no: this.store.nextNo(db, 'receipt', 'RC-') };
        db.receipts.push(r);
        const p = db.projects.find((x) => x.id === r.projectId);
        if (view) {
          const c = db.claims.find((x) => x.id === r.claimId)!;
          const fully = r.amount >= view.rest - 0.001;
          c.events.push({ date: r.date, text: fully ? 'paidFully' : 'partialReceipt', params: { amount: r.amount.toLocaleString('en-US'), no: r.no } });
          if (c.status === 'due' || c.status === 'scheduled') c.status = 'sent';
        }
        p?.activities.unshift({ id: this.store.newId('ac'), date: r.date, by: db.settings.currentUser, text: this.t('office.activity.receipt', { no: r.no, amount: r.amount.toLocaleString('en-US') }) });
        return r;
      });
    });
  }

  // ─── Expenses ────────────────────────────────────────────────────────

  addAdminExpense(e: Omit<AdminExpense, 'id'>): Observable<ApiResponse<AdminExpense>> {
    return this.run('office.toast.expenseSaved', () => {
      if (!(e.amount > 0)) throw new OfficeError('office.errors.amountRequired');
      return this.store.mutate((db) => {
        const x: AdminExpense = { ...e, id: this.store.newId('ae') };
        db.adminExpenses.push(x);
        return x;
      });
    });
  }

  deleteAdminExpense(id: Id): Observable<ApiResponse<boolean>> {
    return this.run('office.toast.deleted', () =>
      this.store.mutate((db) => {
        db.adminExpenses = db.adminExpenses.filter((x) => x.id !== id);
        return true;
      }),
    );
  }

  addProjectExpense(e: Omit<ProjectExpense, 'id'>): Observable<ApiResponse<ProjectExpense>> {
    return this.run('office.toast.expenseSaved', () => {
      if (!(e.amount > 0)) throw new OfficeError('office.errors.amountRequired');
      return this.store.mutate((db) => {
        const x: ProjectExpense = { ...e, id: this.store.newId('pe') };
        db.projectExpenses.push(x);
        return x;
      });
    });
  }

  deleteProjectExpense(id: Id): Observable<ApiResponse<boolean>> {
    return this.run('office.toast.deleted', () =>
      this.store.mutate((db) => {
        db.projectExpenses = db.projectExpenses.filter((x) => x.id !== id);
        return true;
      }),
    );
  }

  // ─── Drawings ────────────────────────────────────────────────────────

  addDrawing(projectId: Id, set: DrawingSet, form: { no: string; title: string; discipline: Discipline; file: string }): Observable<ApiResponse<Drawing>> {
    return this.run('office.toast.drawingAdded', () => {
      if (this.db().drawings.some((d) => d.projectId === projectId && d.set === set && d.no === form.no)) {
        throw new OfficeError('office.errors.drawingExists');
      }
      return this.store.mutate((db) => {
        const prefix = set === 'ifc' ? 'R' : 'F';
        const d: Drawing = {
          id: this.store.newId('dw'), projectId, set, no: form.no, title: form.title, discipline: form.discipline, pending: false,
          revisions: [{ rev: `${prefix}0`, description: this.t('office.drawings.firstIssue'), date: todayIso(), by: db.settings.currentUser, file: form.file || `${form.no}-${prefix}0.pdf`, superseded: false }],
        };
        db.drawings.push(d);
        return d;
      });
    });
  }

  /** New revision: older ones become superseded (never deleted). */
  addDrawingRevision(drawingId: Id, form: { reason: RevisionReason; description: string; file: string }): Observable<ApiResponse<Drawing>> {
    return this.run('office.toast.revisionSaved', () =>
      this.store.mutate((db) => {
        const d = db.drawings.find((x) => x.id === drawingId)!;
        const prefix = d.set === 'ifc' ? 'R' : 'F';
        const rev = `${prefix}${d.revisions.length}`;
        d.revisions.forEach((r) => (r.superseded = true));
        d.revisions.push({ rev, reason: form.reason, description: form.description, date: todayIso(), by: db.settings.currentUser, file: form.file || `${d.no}-${rev}.pdf`, superseded: false });
        d.pending = false;
        d.transmittal = undefined;
        return d;
      }),
    );
  }

  markDrawingPending(drawingId: Id): Observable<ApiResponse<Drawing>> {
    return this.run('office.toast.saved', () =>
      this.store.mutate((db) => {
        const d = db.drawings.find((x) => x.id === drawingId)!;
        d.pending = true;
        return d;
      }),
    );
  }

  issueTransmittal(projectId: Id, drawingIds: Id[]): Observable<ApiResponse<string>> {
    return this.run('office.toast.transmittalIssued', () => {
      if (!drawingIds.length) throw new OfficeError('office.errors.selectDrawings');
      return this.store.mutate((db) => {
        const no = this.store.nextNo(db, 'transmittal', 'TR-', 3);
        const date = todayIso();
        db.transmittals.push({ id: this.store.newId('tr'), no, projectId, date, drawingIds: [...drawingIds] });
        db.drawings.filter((d) => drawingIds.includes(d.id)).forEach((d) => (d.transmittal = { no, date }));
        db.projects.find((p) => p.id === projectId)?.activities.unshift({
          id: this.store.newId('ac'), date, by: db.settings.currentUser, text: this.t('office.activity.transmittal', { no }),
        });
        return no;
      });
    });
  }

  // ─── Stage templates ─────────────────────────────────────────────────

  saveTemplate(template: StageTemplate): Observable<ApiResponse<StageTemplate>> {
    return this.run('office.toast.templateSaved', () => {
      if (!template.name.trim()) throw new OfficeError('office.errors.nameRequired');
      return this.store.mutate((db) => {
        const copy = structuredClone(template);
        const i = db.templates.findIndex((t) => t.id === copy.id);
        if (i >= 0) db.templates[i] = copy;
        else db.templates.push(copy);
        return copy;
      });
    });
  }

  deleteTemplate(id: Id): Observable<ApiResponse<boolean>> {
    return this.run('office.toast.deleted', () =>
      this.store.mutate((db) => {
        db.templates = db.templates.filter((t) => t.id !== id);
        return true;
      }),
    );
  }

  newId(prefix: string): string {
    return this.store.newId(prefix);
  }

  resetDemoData(): void {
    this.store.reset();
    this.toast('success', 'office.toast.demoReset');
  }

  // ─── Internals ───────────────────────────────────────────────────────

  private stageByName(project: Project, name: string): Stage | undefined {
    for (const sc of project.scopes) {
      const st = sc.stages.find((s) => s.name === name);
      if (st) return st;
    }
    return undefined;
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private toast(severity: 'success' | 'error', key: string, params?: Record<string, unknown>): void {
    this.messages.add({
      severity,
      summary: this.t(severity === 'success' ? 'office.toast.successTitle' : 'office.toast.errorTitle'),
      detail: this.t(key, params),
      life: 3500,
    });
  }

  /** Wraps a write in the API envelope, with latency and a single toast. */
  private run<T>(successKey: string, work: () => T): Observable<ApiResponse<T>> {
    // deferred like an HTTP call: nothing happens until subscribed
    return defer(() => {
      try {
        const response: ApiResponse<T> = { succeeded: true, data: work() };
        return of(response).pipe(delay(250), tap(() => this.toast('success', successKey)));
      } catch (e) {
        const err = e instanceof OfficeError ? e : new OfficeError('office.errors.generic');
        if (!(e instanceof OfficeError)) console.error(e);
        this.toast('error', err.key, err.params);
        const response: ApiResponse<T> = { succeeded: false, message: this.t(err.key, err.params), errors: [err.key] };
        return of(response).pipe(delay(150));
      }
    });
  }
}

export type { ProjectType, PaymentMethod };
