/**
 * Domain models for the Engineering Office module (quotes → contracts →
 * projects → scopes → stages → claims → receipts).
 *
 * Everything is local for now (see OfficeDbService). The shapes are written
 * so they can map 1:1 to backend DTOs once the API exists.
 */

/** Same envelope as every generated backend `*Response` DTO. */
export interface ApiResponse<T> {
  succeeded: boolean;
  message?: string;
  errors?: string[];
  data?: T;
}

export type Id = string;

// ─── Lookups ──────────────────────────────────────────────────────────

export type StageType = 'design' | 'license' | 'execution';
export type ProjectType = 'housing' | 'villa' | 'residentialBuilding' | 'commercial';
export type ProjectStatus = 'active' | 'onHold' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'cheque' | 'transfer' | 'card';
export type Discipline = 'architectural' | 'structural' | 'electrical' | 'mechanical';

export interface Client {
  id: Id;
  name: string;
  nationalId?: string;
  phone?: string;
  address?: string;
  representative?: string;
  representativeNationalId?: string;
}

// ─── Stage templates (Stages Builder) ──────────────────────────────────

export interface CustomFieldDef {
  id: Id;
  label: string;
  type: 'text' | 'date' | 'number';
}

export interface TemplateStage {
  id: Id;
  name: string;
  type: StageType;
  /** % of the scope value claimed when this stage finishes (informational). */
  claimPct: number;
  allowSubcontractors: boolean;
  requireAttachments: boolean;
  allowRecertify: boolean;
  /** Names of earlier stages this one may return to (e.g. Civil Defense → Syndicate). */
  returnTo: string[];
  customFields: CustomFieldDef[];
}

export interface StageTemplate {
  id: Id;
  name: string;
  /** Default scope name when the template is added to a project/quote. */
  scopeName: string;
  /** Default obligations (contract Article 3) for this scope. */
  obligations: string[];
  stages: TemplateStage[];
}

// ─── Quotes (quote = contract draft) ───────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'revisionRequested' | 'approved' | 'rejected';

export interface ContractTemplate {
  id: Id;
  title: string;
  /** Stage template ids preloaded as scopes. */
  templateIds: Id[];
  hasInterior: boolean;
}

export type PaymentTriggerKind = 'signing' | 'stage' | 'manual';

export interface PaymentTerm {
  id: Id;
  name: string;
  pct: number;
  trigger: PaymentTriggerKind;
  /** Stage name the payment is tied to when trigger = 'stage'. */
  stageName?: string;
  /** Free-text condition printed in the contract ("Delivery of stamped drawings"). */
  condition: string;
}

export interface QuoteScope {
  id: Id;
  templateId: Id;
  name: string;
  note?: string;
  obligations: { text: string; sub?: string[] }[];
}

export interface LandInfo {
  projectType: ProjectType;
  plotNo: string;
  basin: string;
  lands: string;
  subdivision: string;
  landArea: number;
  buildArea: number;
  interiorArea: number;
  finalBuildArea?: number;
}

export interface Fees {
  extMode: 'perSqm' | 'lump';
  rate: number;
  extLump: number;
  interior: number;
  interiorOn: boolean;
}

export interface QuoteRevision {
  rev: number;
  date: string;
  status: QuoteStatus;
  note?: string;
  total: number;
  /** Snapshot of the content at that revision (for preview/compare). */
  snapshot?: QuoteContent;
}

export interface QuoteContent {
  contractTemplateId: Id;
  title: string;
  date: string;
  clientId: Id;
  land: LandInfo;
  scopes: QuoteScope[];
  clientObligations: string[];
  generalTerms: string[];
  fees: Fees;
  payments: PaymentTerm[];
  internalNotes: string;
  attachments: string[];
}

export interface Quote extends QuoteContent {
  id: Id;
  ref: string;
  rev: number;
  status: QuoteStatus;
  revisions: QuoteRevision[];
  projectId?: Id;
  createdAt: string;
}

// ─── Projects / Scopes / Stages ────────────────────────────────────────

export type StageStatus = 'notStarted' | 'active' | 'onHold' | 'completed';

export interface StageLogEntry {
  id: Id;
  step: string;
  note?: string;
  /** 'original' or a recertification file id. */
  fileId: Id | 'original';
  date: string;
  by: string;
  cost: number;
  /** Cost is re-charged to the client (shows as a debit on the client statement). */
  billable?: boolean;
  attachment?: string;
}

export interface Attachment {
  id: Id;
  name: string;
  kind: string;
  date: string;
  by: string;
}

export interface Subcontractor {
  id: Id;
  name: string;
  specialty: string;
  value: number;
  status: 'active' | 'delivered';
  attachments: string[];
}

export interface LicenseFile {
  id: Id;
  kind: 'original' | 'recertify';
  seq: number;
  number: string;
  submittedAt?: string;
  source?: 'civilDefense' | 'municipality' | 'clientChange' | 'syndicateNotes';
  drawings?: Discipline[];
  fees?: number;
  notes?: string;
  open: boolean;
}

export interface Stage {
  id: Id;
  n: number;
  name: string;
  type: StageType;
  claimPct: number;
  allowSubcontractors: boolean;
  requireAttachments: boolean;
  allowRecertify: boolean;
  returnTo: string[];
  customFields: CustomFieldDef[];
  customValues: Record<string, string>;
  status: StageStatus;
  owner: string;
  startDate?: string;
  endDate?: string;
  log: StageLogEntry[];
  files: Attachment[];
  subcontractors: Subcontractor[];
  licenseFiles: LicenseFile[];
}

export interface Scope {
  id: Id;
  name: string;
  templateId: Id;
  templateName: string;
  engineer: string;
  value: number;
  startDate?: string;
  stages: Stage[];
}

export type ContractStep = 'quote' | 'clientApproval' | 'contractDraft' | 'contractApproval' | 'downPayment';

export interface ContractDraft {
  rev: number;
  date: string;
  notes: string;
  status: 'amended' | 'pendingApproval' | 'approved';
}

export interface Activity {
  id: Id;
  date: string;
  text: string;
  by: string;
}

export interface TeamMember {
  name: string;
  role: string;
}

export interface Project {
  id: Id;
  code: string;
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
  fees: Fees;
  scopes: Scope[];
  contractDrafts: ContractDraft[];
  contractApproved: boolean;
  activities: Activity[];
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ─── Claims / Receipts / Expenses ──────────────────────────────────────

/** Stored state; 'partial', 'paid' and 'late' are derived from receipts and dates. */
export type ClaimBaseStatus = 'scheduled' | 'due' | 'sent' | 'cancelled';
export type ClaimStatus = ClaimBaseStatus | 'partial' | 'paid' | 'late';
export type ManualClaimType = 'billableFees' | 'changeOrder' | 'addendum';

export interface ClaimAdjustment {
  id: Id;
  kind: 'areaDiff' | 'changeOrder' | 'discount';
  label: string;
  amount: number;
}

/** `text` is an event key (office.claimEvents.<key>) rendered with `params`. */
export interface ClaimEvent {
  date: string;
  text: string;
  params?: Record<string, string | number>;
  by?: string;
}

export interface Claim {
  id: Id;
  no: string;
  projectId: Id;
  paymentTermId?: Id;
  paymentName: string;
  pct: number;
  /** Stage the claim becomes due on (scheduled claims). */
  stageId?: Id;
  trigger: PaymentTriggerKind;
  condition: string;
  kind: 'scheduled' | 'manual';
  manualType?: ManualClaimType;
  description?: string;
  /** Base amount: contract value × pct for scheduled, typed amount for manual. */
  baseAmount: number;
  adjustments: ClaimAdjustment[];
  dueDate?: string;
  status: ClaimBaseStatus;
  sentAt?: string;
  attachDrawings?: boolean;
  events: ClaimEvent[];
  createdAt: string;
}

export interface Receipt {
  id: Id;
  no: string;
  clientId: Id;
  projectId: Id;
  claimId?: Id;
  amount: number;
  date: string;
  method: PaymentMethod;
  chequeNo?: string;
  chequeDueDate?: string;
  notes?: string;
  attachment?: string;
}

export type AdminExpenseCategory =
  | 'salaries' | 'rent' | 'utilities' | 'internet' | 'stationery' | 'software' | 'transport' | 'other';

export interface AdminExpense {
  id: Id;
  category: AdminExpenseCategory;
  description: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  supplier?: string;
  recurring: boolean;
  attachment?: string;
}

export type ProjectExpenseCategory =
  | 'officialFees' | 'printing' | 'surveyor' | 'subcontractor' | 'transport' | 'other' | 'stageStep';

export interface ProjectExpense {
  id: Id;
  projectId: Id;
  scopeId?: Id;
  stageId?: Id;
  category: ProjectExpenseCategory;
  description: string;
  amount: number;
  date: string;
  billable: boolean;
  attachment?: string;
}

// ─── Drawings (IFC / Final) ────────────────────────────────────────────

export type DrawingSet = 'ifc' | 'final';
export type RevisionReason = 'contractorNote' | 'clientChange' | 'coordination' | 'errorFix';

export interface DrawingRevision {
  rev: string;
  reason?: RevisionReason;
  description: string;
  date: string;
  by: string;
  file: string;
  superseded: boolean;
}

export interface Drawing {
  id: Id;
  projectId: Id;
  set: DrawingSet;
  no: string;
  title: string;
  discipline: Discipline;
  pending: boolean;
  revisions: DrawingRevision[];
  transmittal?: { no: string; date: string };
}

export interface Transmittal {
  id: Id;
  no: string;
  projectId: Id;
  date: string;
  drawingIds: Id[];
}

// ─── Settings ──────────────────────────────────────────────────────────

export interface OfficeSettings {
  companyName: string;
  registrationNo: string;
  signatory: string;
  address: string;
  phone: string;
  currentUser: string;
}

/** The whole local database. */
export interface OfficeDb {
  version: number;
  settings: OfficeSettings;
  clients: Client[];
  templates: StageTemplate[];
  contractTemplates: ContractTemplate[];
  quotes: Quote[];
  projects: Project[];
  claims: Claim[];
  receipts: Receipt[];
  adminExpenses: AdminExpense[];
  projectExpenses: ProjectExpense[];
  drawings: Drawing[];
  transmittals: Transmittal[];
  counters: Record<string, number>;
}
