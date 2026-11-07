/** Pure calculations shared by the office service and the screens. */
import {
  Claim, ClaimStatus, Fees, LandInfo, PaymentTerm, Project, Receipt, Stage, StageTemplate, TemplateStage,
} from '../models/office.models';

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00').getTime();
  const b = new Date(toIso + 'T00:00:00').getTime();
  return Math.round((b - a) / 86_400_000);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Quote / contract fees ─────────────────────────────────────────────

export interface FeeTotals {
  ext: number;
  interior: number;
  total: number;
}

export function feeTotals(fees: Fees, land: LandInfo, useFinalArea = false): FeeTotals {
  const area = useFinalArea && land.finalBuildArea ? land.finalBuildArea : land.buildArea;
  const ext = fees.extMode === 'perSqm' ? round2((fees.rate || 0) * (area || 0)) : fees.extLump || 0;
  const interior = fees.interiorOn ? fees.interior || 0 : 0;
  return { ext, interior, total: round2(ext + interior) };
}

export function paymentsPctSum(payments: PaymentTerm[]): number {
  return round2(payments.reduce((s, p) => s + (Number(p.pct) || 0), 0));
}

// ─── Claims ────────────────────────────────────────────────────────────

export function claimTotal(claim: Claim): number {
  return round2(claim.baseAmount + claim.adjustments.reduce((s, a) => s + a.amount, 0));
}

export function claimPaid(claim: Claim, receipts: Receipt[]): number {
  return round2(receipts.filter((r) => r.claimId === claim.id).reduce((s, r) => s + r.amount, 0));
}

export function claimStatus(claim: Claim, paid: number, today = todayIso()): ClaimStatus {
  if (claim.status === 'cancelled') return 'cancelled';
  const total = claimTotal(claim);
  if (total > 0 && paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  if (claim.status === 'scheduled') return 'scheduled';
  if (claim.dueDate && claim.dueDate < today) return 'late';
  return claim.status;
}

/** Statuses that count as money the client owes now. */
export const RECEIVABLE_STATUSES: ClaimStatus[] = ['due', 'sent', 'partial', 'late'];

// ─── Projects / stages ─────────────────────────────────────────────────

export function projectContractValue(project: Project): number {
  return round2(project.scopes.reduce((s, sc) => s + (sc.value || 0), 0));
}

export function stageStepsCost(stage: Stage): number {
  return round2(stage.log.reduce((s, l) => s + (l.cost || 0), 0));
}

export function projectStepsCost(project: Project): number {
  return round2(project.scopes.reduce((s, sc) => s + sc.stages.reduce((x, st) => x + stageStepsCost(st), 0), 0));
}

export interface CurrentStageRef {
  scopeId: string;
  stage: Stage;
}

/** The stage the project is "at": first active, else first on hold, else first not started. */
export function currentStage(project: Project): CurrentStageRef | null {
  for (const wanted of ['active', 'onHold', 'notStarted'] as const) {
    for (const sc of project.scopes) {
      const st = sc.stages.find((s) => s.status === wanted);
      if (st) return { scopeId: sc.id, stage: st };
    }
  }
  return null;
}

export function stageFromTemplate(t: TemplateStage, id: string, n: number, owner: string): Stage {
  return {
    id,
    n,
    name: t.name,
    type: t.type,
    claimPct: t.claimPct,
    allowSubcontractors: t.allowSubcontractors,
    requireAttachments: t.requireAttachments,
    allowRecertify: t.allowRecertify,
    returnTo: [...t.returnTo],
    customFields: t.customFields.map((f) => ({ ...f })),
    customValues: {},
    status: 'notStarted',
    owner,
    log: [],
    files: [],
    subcontractors: [],
    licenseFiles: [],
  };
}

export function templateStageCount(t: StageTemplate): number {
  return t.stages.length;
}

export function fileKind(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  return ext.length && ext.length <= 4 ? ext : 'FILE';
}
