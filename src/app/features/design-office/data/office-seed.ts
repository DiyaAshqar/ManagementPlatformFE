/**
 * Demo data for the Engineering Office prototype.
 *
 * The data is intentionally coherent: every claim belongs to a project's
 * payment schedule, every receipt pays a claim, stage logs carry the costs
 * shown in the project expenses and reports. Change it here and press
 * "Reset demo data" (or clear localStorage) to reload it.
 */
import {
  Claim, ClaimBaseStatus, Client, ContractTemplate, Drawing, Fees, LandInfo, OfficeDb, PaymentTerm,
  Project, ProjectExpense, Receipt, Scope, Stage, StageStatus, StageTemplate, TemplateStage, AdminExpense,
  Quote, QuoteContent, QuoteScope,
} from '../models/office.models';

export const OFFICE_DB_VERSION = 3;

const ME = 'م. سامر الخطيب';
const ENG_ARCH = 'م. ليث العمري';
const ENG_STR = 'م. رنا الحسن';
const ENG_INT = 'م. دانة يوسف';

// ─── Stage templates ───────────────────────────────────────────────────

let tsId = 0;
function ts(name: string, type: TemplateStage['type'], claimPct: number, extra: Partial<TemplateStage> = {}): TemplateStage {
  return {
    id: `ts-${++tsId}`,
    name,
    type,
    claimPct,
    allowSubcontractors: false,
    requireAttachments: type === 'license',
    allowRecertify: false,
    returnTo: [],
    customFields: [],
    ...extra,
  };
}

const SYNDICATE = 'ترخيص النقابة';
const CIVIL = 'الدفاع المدني';
const MUNICIPALITY = 'أمانة عمّان / البلديات';

export const SEED_TEMPLATES: StageTemplate[] = [
  {
    id: 'tpl-arch',
    name: 'تصميم معماري',
    scopeName: 'التصميم الهندسي الخارجي',
    obligations: [
      'إعداد السكتشات والتصور المبدئي للمشروع وتعديلها حتى موافقة الفريق الأول',
      'إعداد المخططات المعمارية التفصيلية (DD) بعد اعتماد السكتشات',
      'إعداد المخططات الإنشائية والكهربائية والميكانيكية اللازمة للترخيص',
      'تقديم المخططات لنقابة المهندسين الأردنيين ومتابعة تصديقها',
      'متابعة موافقة الدفاع المدني على المخططات',
      'متابعة الترخيص لدى أمانة عمّان / البلدية حتى صدور رخصة البناء',
      'إعداد المخططات التنفيذية (Construction Drawings) لكافة التخصصات',
      'إصدار نسخة IFC للمقاول ومتابعة ملاحظاته',
      'تقديم المخططات اللازمة لإذن الإشغال',
    ],
    stages: [
      ts('سكتشات – CD (Conceptual Drawing)', 'design', 15, { requireAttachments: true }),
      ts('DD (Design Development)', 'design', 20, { allowSubcontractors: true }),
      ts(SYNDICATE, 'license', 10, {
        allowRecertify: true,
        customFields: [
          { id: 'cf-syn-no', label: 'رقم ملف النقابة', type: 'text' },
          { id: 'cf-syn-date', label: 'تاريخ التقديم', type: 'date' },
        ],
      }),
      ts(CIVIL, 'license', 5, { returnTo: [SYNDICATE] }),
      ts(MUNICIPALITY, 'license', 5, {
        returnTo: [SYNDICATE, CIVIL],
        customFields: [{ id: 'cf-permit', label: 'رقم رخصة البناء', type: 'text' }],
      }),
      ts('Construction Drawing – النسخة التنفيذية', 'design', 20, { allowSubcontractors: true }),
      ts('IFC – نسخة تنفيذ للمقاول', 'design', 10),
      ts('Final Drawing – مخططات تنفيذ نهائية', 'design', 5),
      ts('التنفيذ', 'execution', 5),
      ts('إذن إشغال', 'license', 5),
    ],
  },
  {
    id: 'tpl-str',
    name: 'تصميم إنشائي',
    scopeName: 'التصميم الإنشائي',
    obligations: [
      'إعداد التصميم الإنشائي الأولي وتحديد النظام الإنشائي',
      'إعداد الحسابات الإنشائية وفق الكودات المعتمدة',
      'إعداد المخططات الإنشائية التنفيذية',
    ],
    stages: [
      ts('تصميم أولي', 'design', 20),
      ts('حسابات إنشائية', 'design', 20),
      ts('مخططات إنشائية', 'design', 20),
      ts(SYNDICATE, 'license', 15, { allowRecertify: true }),
      ts('مخططات تنفيذية', 'design', 15),
      ts('IFC', 'design', 10),
    ],
  },
  {
    id: 'tpl-int',
    name: 'تصميم داخلي',
    scopeName: 'التصميم الداخلي',
    obligations: [
      'إعداد تصور أولي ثنائي وثلاثي الأبعاد للفراغات الداخلية',
      'إعداد المخططات التنفيذية للتصميم الداخلي',
      'إعداد جداول الكميات والمواصفات للتشطيبات',
    ],
    stages: [
      ts('تصور أولي 2D + 3D', 'design', 30, { requireAttachments: true }),
      ts('اعتماد العميل', 'design', 10),
      ts('مخططات تنفيذية للداخلي', 'design', 30, { allowSubcontractors: true }),
      ts('إظهار 3D للفراغات', 'design', 20),
      ts('حساب الكميات', 'design', 10),
    ],
  },
  {
    id: 'tpl-sup',
    name: 'إشراف',
    scopeName: 'الإشراف',
    obligations: [
      'تكليف مهندس مشرف مقيم لدى النقابة',
      'الإشراف على أعمال التنفيذ حسب المخططات المعتمدة',
      'استلام الأعمال وتقديم ملف إذن الإشغال',
    ],
    stages: [
      ts('تكليف الإشراف (النقابة)', 'license', 25),
      ts('الإشراف على التنفيذ', 'execution', 50, { allowSubcontractors: true }),
      ts('الاستلام', 'execution', 15),
      ts('إذن إشغال', 'license', 10),
    ],
  },
];

export const SEED_CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: 'ct-ext-int', title: 'عقد تصميم خارجي وداخلي لمشروع إسكان', templateIds: ['tpl-arch', 'tpl-int'], hasInterior: true },
  { id: 'ct-ext', title: 'عقد تصميم خارجي وترخيص', templateIds: ['tpl-arch'], hasInterior: false },
  { id: 'ct-int', title: 'عقد تصميم داخلي', templateIds: ['tpl-int'], hasInterior: true },
  { id: 'ct-sup', title: 'عقد إشراف', templateIds: ['tpl-sup'], hasInterior: false },
];

export const DEFAULT_CLIENT_OBLIGATIONS = [
  'تأمين الأوراق الرسمية (مخطط أراضي، مخطط تنظيمي، سند تسجيل) بتاريخ حديث لسنة 2026',
  'تأمين مخطط مساحة وتثبيت حدود وطبوغرافي من مكتب معتمد',
  'تأمين تقرير فحص التربة',
  'تكاليف فحوصات المواد مع مكتب فحص معتمد',
  'دفع الضرائب والمسقفات ورسوم الترخيص للجهات الرسمية',
  'دفع شيك المقيم ودعم الإشراف بقيمة 5304 دينار لنقابة المهندسين',
  'الالتزام بتعليمات عقدي التصميم والإشراف الصادرة عن النقابة',
  'أي تعديل يتم بأمر تغييري موثّق وموقّع من الفريقين',
  'سداد الدفعات في وقتها حسب جدول الدفعات',
];

export const DEFAULT_GENERAL_TERMS = [
  'أي خدمات إضافية غير متفق عليها تتم بملحق للعقد يوضح الخدمات والأتعاب',
  'عند التوقف بعد الموافقة على السكتشات والبدء بالتفصيلي، تُستحق الأتعاب كاملة',
  'تقديم المخططات اللازمة لإذن الأشغال بشرط عدم تعديلها أثناء التنفيذ',
];

export const INTERIOR_OBLIGATIONS: QuoteScope['obligations'] = [
  { text: 'إعداد تصور أولي للفراغات الداخلية', sub: ['مخططات توزيع ثنائية الأبعاد', 'إظهار ثلاثي الأبعاد للفراغات الرئيسية'] },
  { text: 'إعداد المخططات التنفيذية للتصميم الداخلي', sub: ['مخططات الأسقف والإنارة', 'تفاصيل الأرضيات والجدران', 'تفاصيل النجارة والخزائن'] },
  { text: 'إعداد جداول الكميات والمواصفات للتشطيبات' },
];

// ─── Clients ───────────────────────────────────────────────────────────

export const SEED_CLIENTS: Client[] = [
  { id: 'cl-1', name: 'أحمد محمود العلي', nationalId: '9851012345', phone: '0791234567', address: 'عمّان، الأردن' },
  { id: 'cl-2', name: 'شركة الريان للاستثمار', nationalId: '200145678', phone: '065512345', address: 'عمّان – الشميساني', representative: 'م. باسل الريان', representativeNationalId: '9781100221' },
  { id: 'cl-3', name: 'خالد يوسف النعيمي', nationalId: '9771023456', phone: '0782345678', address: 'عمّان – دابوق' },
  { id: 'cl-4', name: 'سلمى حسن الزعبي', nationalId: '9882034567', phone: '0773456789', address: 'إربد' },
  { id: 'cl-5', name: 'محمد إبراهيم القاسم', nationalId: '9791045678', phone: '0794567890', address: 'الزرقاء' },
  { id: 'cl-6', name: 'شركة الأفق للتطوير العقاري', nationalId: '200298765', phone: '065598765', address: 'عمّان – عبدون', representative: 'رامي الأفق' },
  { id: 'cl-7', name: 'رامي عادل حداد', nationalId: '9901056789', phone: '0785678901', address: 'السلط' },
];

// ─── Builders ──────────────────────────────────────────────────────────

let uid = 0;
const nid = (p: string) => `${p}-${++uid}`;

function tpl(id: string): StageTemplate {
  return SEED_TEMPLATES.find((t) => t.id === id)!;
}

/** Builds a scope's stages from a template: stages before `activeIdx` are completed. */
function buildScope(
  templateId: string,
  value: number,
  engineer: string,
  activeIdx: number,
  opts: { startDate?: string; activeStatus?: StageStatus; name?: string } = {},
): Scope {
  const t = tpl(templateId);
  const stages: Stage[] = t.stages.map((s, i) => {
    const status: StageStatus =
      i < activeIdx ? 'completed' : i === activeIdx ? (opts.activeStatus ?? 'active') : 'notStarted';
    return {
      id: nid('st'),
      n: i + 1,
      name: s.name,
      type: s.type,
      claimPct: s.claimPct,
      allowSubcontractors: s.allowSubcontractors,
      requireAttachments: s.requireAttachments,
      allowRecertify: s.allowRecertify,
      returnTo: [...s.returnTo],
      customFields: s.customFields.map((f) => ({ ...f })),
      customValues: {},
      status,
      owner: engineer,
      startDate: status !== 'notStarted' ? opts.startDate : undefined,
      endDate: status === 'completed' ? opts.startDate : undefined,
      log: status === 'completed'
        ? [{ id: nid('lg'), step: 'إنهاء المرحلة واعتمادها', fileId: 'original', date: opts.startDate ?? '2026-09-01', by: engineer, cost: 0 }]
        : [],
      files: status === 'completed'
        ? [{ id: nid('f'), name: `${s.name.split(' ')[0]} – مخططات معتمدة.pdf`, kind: 'PDF', date: opts.startDate ?? '2026-09-01', by: engineer }]
        : [],
      subcontractors: [],
      licenseFiles: s.allowRecertify && status !== 'notStarted'
        ? [{ id: nid('lf'), kind: 'original', seq: 0, number: '24-' + (1000 + uid), open: status !== 'completed' }]
        : [],
    };
  });
  return {
    id: nid('sc'),
    name: opts.name ?? t.scopeName,
    templateId,
    templateName: t.name,
    engineer,
    value,
    startDate: opts.startDate,
    stages,
  };
}

function stageByName(project: Project, name: string): Stage | undefined {
  for (const sc of project.scopes) {
    const st = sc.stages.find((s) => s.name === name);
    if (st) return st;
  }
  return undefined;
}

function land(partial: Partial<LandInfo>): LandInfo {
  return {
    projectType: 'villa', plotNo: '', basin: '', lands: '', subdivision: '',
    landArea: 0, buildArea: 0, interiorArea: 0, ...partial,
  };
}

function fees(partial: Partial<Fees>): Fees {
  return { extMode: 'perSqm', rate: 4, extLump: 0, interior: 0, interiorOn: false, ...partial };
}

interface ClaimSeed {
  term: PaymentTerm;
  status: ClaimBaseStatus;
  dueDate?: string;
  sentAt?: string;
  receipts?: { no: string; amount: number; date: string; method: Receipt['method']; chequeNo?: string }[];
}

let claimNo = 10;
const claims: Claim[] = [];
const receipts: Receipt[] = [];

function addClaims(project: Project, value: number, seeds: ClaimSeed[]): void {
  for (const s of seeds) {
    const id = nid('cl');
    const base = Math.round((value * s.term.pct) / 100);
    const stage = s.term.stageName ? stageByName(project, s.term.stageName) : undefined;
    const events: Claim['events'] = [{ date: project.createdAt, text: 'created' }];
    if (s.status !== 'scheduled') events.push({ date: s.dueDate ?? project.createdAt, text: 'becameDue' });
    if (s.sentAt) events.push({ date: s.sentAt, text: 'sent', by: ME });
    claims.push({
      id,
      no: `CL-${String(++claimNo).padStart(4, '0')}`,
      projectId: project.id,
      paymentTermId: s.term.id,
      paymentName: s.term.name,
      pct: s.term.pct,
      stageId: stage?.id,
      trigger: s.term.trigger,
      condition: s.term.condition,
      kind: 'scheduled',
      baseAmount: base,
      adjustments: [],
      dueDate: s.dueDate,
      status: s.status,
      sentAt: s.sentAt,
      events,
      createdAt: project.createdAt,
    });
    for (const r of s.receipts ?? []) {
      receipts.push({
        id: nid('rc'),
        no: r.no,
        clientId: project.clientId,
        projectId: project.id,
        claimId: id,
        amount: r.amount,
        date: r.date,
        method: r.method,
        chequeNo: r.chequeNo,
      });
    }
  }
}

function term(name: string, pct: number, trigger: PaymentTerm['trigger'], condition: string, stageName?: string): PaymentTerm {
  return { id: nid('pt'), name, pct, trigger, condition, stageName };
}

// ─── PRJ-007 (from quote DES-CON-26) ───────────────────────────────────

const PRJ7_TERMS: PaymentTerm[] = [
  term('الأولى', 50, 'signing', 'توقيع العقد'),
  term('الثانية', 20, 'stage', 'تسليم المخططات مصدقة من نقابة المهندسين', SYNDICATE),
  term('الثالثة', 20, 'stage', 'تسليم مخططات التصميم الداخلي', 'مخططات تنفيذية للداخلي'),
  term('الرابعة', 10, 'stage', 'صدور رخصة البناء', MUNICIPALITY),
];

const LAND7 = land({
  projectType: 'housing', plotNo: '3574', basin: '08 مرج الأجرب', lands: 'شمال عمّان',
  subdivision: 'إفراز مؤقت 5', landArea: 795, buildArea: 2200, interiorArea: 400,
});
const FEES7 = fees({ rate: 4, interior: 2500, interiorOn: true });

const prj7: Project = {
  id: 'prj-7',
  code: 'PRJ-007',
  name: 'إسكان – مرج الأجرب',
  clientId: 'cl-1',
  quoteId: 'q-26',
  status: 'active',
  land: LAND7,
  location: 'مرج الأجرب – شمال عمّان',
  manager: ENG_ARCH,
  startDate: '2026-10-18',
  endDate: '2027-04-30',
  team: [
    { name: ENG_ARCH, role: 'معماري' },
    { name: ENG_STR, role: 'إنشائي' },
    { name: ENG_INT, role: 'داخلي' },
  ],
  notes: '',
  attachments: ['سند التسجيل.pdf', 'مخطط الأراضي.pdf', 'العقد الموقّع.pdf'],
  fees: FEES7,
  scopes: [
    buildScope('tpl-arch', 8800, ENG_ARCH, 3, { startDate: '2026-10-20' }),
    buildScope('tpl-int', 2500, ENG_INT, 0, { startDate: '2026-10-25' }),
  ],
  contractDrafts: [
    { rev: 0, date: '2026-10-12', notes: 'طلب العميل تعديل آلية الدفع', status: 'amended' },
    { rev: 1, date: '2026-10-16', notes: '', status: 'approved' },
  ],
  contractApproved: true,
  activities: [
    { id: nid('ac'), date: '2026-11-03', text: 'تسجيل حالة "استلام موافقة النقابة"', by: ENG_ARCH },
    { id: nid('ac'), date: '2026-10-30', text: 'سند قبض RC-0014 للدفعة الثانية (جزئي)', by: ME },
    { id: nid('ac'), date: '2026-10-18', text: 'اعتماد العقد وإنشاء المشروع من عرض السعر DES-CON-26', by: ME },
  ],
  createdAt: '2026-10-18',
};
// richer log on the syndicate stage (completed)
{
  const syn = prj7.scopes[0].stages[2];
  syn.customValues = { 'cf-syn-no': '24-55120', 'cf-syn-date': '2026-10-24' };
  syn.log = [
    { id: nid('lg'), step: 'تجهيز ملف الترخيص', fileId: 'original', date: '2026-10-22', by: ENG_ARCH, cost: 0 },
    { id: nid('lg'), step: 'تقديم الملف للنقابة', fileId: 'original', date: '2026-10-24', by: ENG_ARCH, cost: 185, attachment: 'إيصال.pdf', billable: true },
    { id: nid('lg'), step: 'استلام موافقة النقابة', fileId: 'original', date: '2026-11-03', by: ENG_ARCH, cost: 0, attachment: 'مخططات مصدقة.pdf' },
  ];
  prj7.scopes[0].stages[3].startDate = '2026-11-04';
}
addClaims(prj7, 11300, [
  { term: PRJ7_TERMS[0], status: 'sent', dueDate: '2026-10-18', sentAt: '2026-10-18',
    receipts: [{ no: 'RC-0013', amount: 5650, date: '2026-10-20', method: 'transfer' }] },
  { term: PRJ7_TERMS[1], status: 'sent', dueDate: '2026-11-17', sentAt: '2026-11-04',
    receipts: [{ no: 'RC-0014', amount: 1000, date: '2026-11-05', method: 'cheque', chequeNo: '00451287' }] },
  { term: PRJ7_TERMS[2], status: 'scheduled' },
  { term: PRJ7_TERMS[3], status: 'scheduled' },
]);

// ─── PRJ-001 Villa ─────────────────────────────────────────────────────

const prj1: Project = {
  id: 'prj-1',
  code: 'PRJ-001',
  name: 'فيلا سكنية – دابوق',
  clientId: 'cl-3',
  status: 'active',
  land: land({ projectType: 'villa', plotNo: '1120', basin: '04 دابوق', lands: 'غرب عمّان', subdivision: '—', landArea: 1000, buildArea: 650 }),
  location: 'دابوق',
  manager: ENG_ARCH,
  startDate: '2026-08-01',
  endDate: '2027-02-28',
  team: [{ name: ENG_ARCH, role: 'معماري' }, { name: ENG_STR, role: 'إنشائي' }],
  attachments: ['سند التسجيل.pdf'],
  fees: fees({ extMode: 'lump', extLump: 13000 }),
  scopes: [
    buildScope('tpl-arch', 9600, ENG_ARCH, 2, { startDate: '2026-08-05' }),
    buildScope('tpl-str', 3400, ENG_STR, 2, { startDate: '2026-08-20' }),
  ],
  contractDrafts: [{ rev: 0, date: '2026-07-28', notes: '', status: 'approved' }],
  contractApproved: true,
  activities: [
    { id: nid('ac'), date: '2026-11-02', text: 'فتح ملف إعادة تصديق #1 بعد ملاحظات الدفاع المدني', by: ENG_ARCH },
    { id: nid('ac'), date: '2026-10-21', text: 'تسجيل حالة "تقديم الملف للنقابة"', by: ENG_ARCH },
    { id: nid('ac'), date: '2026-09-28', text: 'رفع مرفق في DD', by: ENG_ARCH },
  ],
  createdAt: '2026-08-01',
};
{
  const syn = prj1.scopes[0].stages[2];
  syn.customValues = { 'cf-syn-no': '24-48810', 'cf-syn-date': '2026-10-21' };
  syn.licenseFiles = [
    { id: nid('lf'), kind: 'original', seq: 0, number: '24-48810', submittedAt: '2026-10-21', open: false },
    { id: 'lf-p1-r1', kind: 'recertify', seq: 1, number: '24-50214', submittedAt: '2026-11-02', source: 'civilDefense', drawings: ['architectural', 'mechanical'], fees: 120, open: true },
  ];
  syn.log = [
    { id: nid('lg'), step: 'تجهيز ملف الترخيص', fileId: 'original', date: '2026-10-15', by: ENG_ARCH, cost: 0 },
    { id: nid('lg'), step: 'تقديم الملف للنقابة', fileId: 'original', date: '2026-10-21', by: ENG_ARCH, cost: 210, attachment: 'إيصال.pdf' },
    { id: nid('lg'), step: 'ملاحظات النقابة – تعديلات', note: 'إعادة المخططات بعد التعديل', fileId: 'original', date: '2026-10-27', by: ENG_ARCH, cost: 0, attachment: 'كتاب الملاحظات.pdf' },
    { id: nid('lg'), step: 'رجوع من الدفاع المدني', note: 'يتطلب فتح ملف إعادة تصديق', fileId: 'lf-p1-r1', date: '2026-11-01', by: ENG_ARCH, cost: 0 },
    { id: nid('lg'), step: 'دفع رسوم إعادة التصديق', fileId: 'lf-p1-r1', date: '2026-11-02', by: ENG_ARCH, cost: 120, attachment: 'إيصال.pdf', billable: true },
  ];
  syn.files = [
    { id: nid('f'), name: 'مخططات معمارية – ترخيص.pdf', kind: 'PDF', date: '2026-10-15', by: ENG_ARCH },
    { id: nid('f'), name: 'المخطط الموقعي.dwg', kind: 'DWG', date: '2026-10-15', by: ENG_ARCH },
    { id: nid('f'), name: 'كتاب ملاحظات النقابة.pdf', kind: 'PDF', date: '2026-10-27', by: ENG_ARCH },
  ];
  prj1.scopes[0].stages[1].subcontractors = [
    { id: nid('sub'), name: 'مكتب الطاقة للكهروميكانيك', specialty: 'كهروميكانيك', value: 900, status: 'delivered', attachments: ['مخططات MEP.pdf'] },
    { id: nid('sub'), name: 'مكتب المسّاح الأردني', specialty: 'مساحة', value: 250, status: 'delivered', attachments: [] },
  ];
}
const PRJ1_TERMS = [
  term('الأولى', 30, 'signing', 'توقيع العقد'),
  term('الثانية', 20, 'stage', 'اعتماد السكتشات', 'سكتشات – CD (Conceptual Drawing)'),
  term('الثالثة', 20, 'stage', 'تسليم مخططات DD', 'DD (Design Development)'),
  term('الرابعة', 15, 'stage', 'تسليم المخططات مصدقة من النقابة', SYNDICATE),
  term('الخامسة', 15, 'stage', 'صدور رخصة البناء', MUNICIPALITY),
];
addClaims(prj1, 13000, [
  { term: PRJ1_TERMS[0], status: 'sent', dueDate: '2026-08-01', sentAt: '2026-08-01', receipts: [{ no: 'RC-0010', amount: 3900, date: '2026-08-03', method: 'transfer' }] },
  { term: PRJ1_TERMS[1], status: 'sent', dueDate: '2026-09-10', sentAt: '2026-09-02', receipts: [{ no: 'RC-0012', amount: 2600, date: '2026-09-08', method: 'cheque', chequeNo: '00398812' }] },
  { term: PRJ1_TERMS[2], status: 'due', dueDate: '2026-11-20' },
  { term: PRJ1_TERMS[3], status: 'scheduled' },
  { term: PRJ1_TERMS[4], status: 'scheduled' },
]);

// ─── PRJ-002 Residential building ──────────────────────────────────────

const prj2: Project = {
  id: 'prj-2',
  code: 'PRJ-002',
  name: 'عمارة سكنية – إربد',
  clientId: 'cl-4',
  status: 'active',
  land: land({ projectType: 'residentialBuilding', plotNo: '552', basin: '12 الحي الشرقي', lands: 'إربد', landArea: 750, buildArea: 1750 }),
  location: 'إربد',
  manager: ENG_ARCH,
  startDate: '2026-07-10',
  team: [{ name: ENG_ARCH, role: 'معماري' }],
  attachments: [],
  fees: fees({ rate: 4 }),
  scopes: [buildScope('tpl-arch', 7000, ENG_ARCH, 2, { startDate: '2026-07-15' })],
  contractDrafts: [{ rev: 0, date: '2026-07-08', notes: '', status: 'approved' }],
  contractApproved: true,
  activities: [{ id: nid('ac'), date: '2026-10-05', text: 'إرسال المطالبة CL-0019 للعميل', by: ME }],
  createdAt: '2026-07-10',
};
const PRJ2_TERMS = [
  term('الأولى', 40, 'signing', 'توقيع العقد'),
  term('الثانية', 30, 'stage', 'تسليم مخططات DD', 'DD (Design Development)'),
  term('الثالثة', 30, 'stage', 'صدور رخصة البناء', MUNICIPALITY),
];
addClaims(prj2, 7000, [
  { term: PRJ2_TERMS[0], status: 'sent', dueDate: '2026-07-10', sentAt: '2026-07-10', receipts: [{ no: 'RC-0009', amount: 2800, date: '2026-07-12', method: 'cash' }] },
  { term: PRJ2_TERMS[1], status: 'sent', dueDate: '2026-09-15', sentAt: '2026-09-05' },
  { term: PRJ2_TERMS[2], status: 'scheduled' },
]);

// ─── PRJ-003 Commercial complex ────────────────────────────────────────

const prj3: Project = {
  id: 'prj-3',
  code: 'PRJ-003',
  name: 'مجمع تجاري – الشميساني',
  clientId: 'cl-2',
  status: 'active',
  land: land({ projectType: 'commercial', plotNo: '88', basin: '02 الشميساني', lands: 'عمّان', landArea: 1500, buildArea: 4200 }),
  location: 'الشميساني',
  manager: ENG_ARCH,
  startDate: '2026-03-01',
  team: [{ name: ENG_ARCH, role: 'معماري' }, { name: ENG_STR, role: 'إنشائي' }],
  attachments: ['العقد الموقّع.pdf'],
  fees: fees({ extMode: 'lump', extLump: 24000 }),
  scopes: [
    buildScope('tpl-arch', 16000, ENG_ARCH, 6, { startDate: '2026-03-05' }),
    buildScope('tpl-str', 6000, ENG_STR, 5, { startDate: '2026-03-20' }),
    buildScope('tpl-sup', 2000, ENG_STR, 0, { startDate: '2026-11-01', activeStatus: 'notStarted' }),
  ],
  contractDrafts: [{ rev: 0, date: '2026-02-25', notes: '', status: 'approved' }],
  contractApproved: true,
  activities: [
    { id: nid('ac'), date: '2026-10-28', text: 'إصدار كتاب تسليم TR-004 للمقاول', by: ENG_ARCH },
    { id: nid('ac'), date: '2026-10-20', text: 'رفع Revision R2 للمخطط A-101', by: ENG_ARCH },
  ],
  createdAt: '2026-03-01',
};
const PRJ3_TERMS = [
  term('الأولى', 25, 'signing', 'توقيع العقد'),
  term('الثانية', 25, 'stage', 'تسليم مخططات DD', 'DD (Design Development)'),
  term('الثالثة', 25, 'stage', 'تسليم المخططات مصدقة من النقابة', SYNDICATE),
  term('الرابعة', 25, 'stage', 'تسليم المخططات التنفيذية', 'Construction Drawing – النسخة التنفيذية'),
];
addClaims(prj3, 24000, [
  { term: PRJ3_TERMS[0], status: 'sent', dueDate: '2026-03-01', sentAt: '2026-03-01', receipts: [{ no: 'RC-0005', amount: 6000, date: '2026-03-04', method: 'transfer' }] },
  { term: PRJ3_TERMS[1], status: 'sent', dueDate: '2026-05-10', sentAt: '2026-05-02', receipts: [{ no: 'RC-0007', amount: 6000, date: '2026-05-09', method: 'transfer' }] },
  { term: PRJ3_TERMS[2], status: 'sent', dueDate: '2026-07-01', sentAt: '2026-06-25', receipts: [{ no: 'RC-0011', amount: 6000, date: '2026-06-30', method: 'transfer' }] },
  { term: PRJ3_TERMS[3], status: 'sent', dueDate: '2026-11-25', sentAt: '2026-10-26' },
]);

// ─── PRJ-005 Villa 2 (from quote DES-CON-23) ───────────────────────────

const prj5: Project = {
  id: 'prj-5',
  code: 'PRJ-005',
  name: 'فيلا سكنية – الزرقاء',
  clientId: 'cl-5',
  quoteId: 'q-23',
  status: 'active',
  land: land({ projectType: 'villa', plotNo: '412', basin: '07 الهاشمية', lands: 'الزرقاء', landArea: 800, buildArea: 1500 }),
  location: 'الزرقاء',
  manager: ENG_ARCH,
  startDate: '2026-06-01',
  team: [{ name: ENG_ARCH, role: 'معماري' }],
  attachments: [],
  fees: fees({ rate: 4 }),
  scopes: [buildScope('tpl-arch', 6000, ENG_ARCH, 4, { startDate: '2026-06-05' })],
  contractDrafts: [{ rev: 0, date: '2026-05-30', notes: '', status: 'approved' }],
  contractApproved: true,
  activities: [{ id: nid('ac'), date: '2026-10-29', text: 'إنهاء مرحلة الدفاع المدني', by: ENG_ARCH }],
  createdAt: '2026-06-01',
};
const PRJ5_TERMS = [
  term('الأولى', 40, 'signing', 'توقيع العقد'),
  term('الثانية', 30, 'stage', 'تسليم المخططات مصدقة من النقابة', SYNDICATE),
  term('الثالثة', 30, 'stage', 'موافقة الدفاع المدني', CIVIL),
];
addClaims(prj5, 6000, [
  { term: PRJ5_TERMS[0], status: 'sent', dueDate: '2026-06-01', sentAt: '2026-06-01', receipts: [{ no: 'RC-0004', amount: 2400, date: '2026-06-02', method: 'cash' }] },
  { term: PRJ5_TERMS[1], status: 'sent', dueDate: '2026-09-01', sentAt: '2026-08-25', receipts: [{ no: 'RC-0008', amount: 1800, date: '2026-08-30', method: 'cheque', chequeNo: '00377120' }] },
  { term: PRJ5_TERMS[2], status: 'due', dueDate: '2026-11-12' },
]);

// ─── PRJ-006 Warehouse (completed) ─────────────────────────────────────

const prj6: Project = {
  id: 'prj-6',
  code: 'PRJ-006',
  name: 'مستودع – سحاب',
  clientId: 'cl-2',
  status: 'completed',
  land: land({ projectType: 'commercial', plotNo: '901', basin: '15 سحاب', lands: 'عمّان', landArea: 2000, buildArea: 1200 }),
  location: 'سحاب',
  manager: ENG_STR,
  startDate: '2026-01-10',
  endDate: '2026-06-30',
  team: [{ name: ENG_STR, role: 'إنشائي' }],
  attachments: [],
  fees: fees({ extMode: 'lump', extLump: 3000 }),
  scopes: [buildScope('tpl-str', 3000, ENG_STR, 6, { startDate: '2026-01-12' })],
  contractDrafts: [{ rev: 0, date: '2026-01-08', notes: '', status: 'approved' }],
  contractApproved: true,
  activities: [{ id: nid('ac'), date: '2026-06-30', text: 'إغلاق المشروع', by: ME }],
  createdAt: '2026-01-10',
};
const PRJ6_TERMS = [term('الأولى', 50, 'signing', 'توقيع العقد'), term('الثانية', 50, 'stage', 'تسليم IFC', 'IFC')];
addClaims(prj6, 3000, [
  { term: PRJ6_TERMS[0], status: 'sent', dueDate: '2026-01-10', sentAt: '2026-01-10', receipts: [{ no: 'RC-0001', amount: 1500, date: '2026-01-11', method: 'cash' }] },
  { term: PRJ6_TERMS[1], status: 'sent', dueDate: '2026-06-30', sentAt: '2026-06-25', receipts: [{ no: 'RC-0002', amount: 1500, date: '2026-06-28', method: 'transfer' }] },
]);

// ─── Quotes ────────────────────────────────────────────────────────────

function scopesFor(templateIds: string[]): QuoteScope[] {
  return templateIds.map((tid) => {
    const t = tpl(tid);
    return {
      id: nid('qs'),
      templateId: tid,
      name: t.scopeName,
      note: tid === 'tpl-int' ? 'الطابق الأرضي · 400 م² تقريبًا' : undefined,
      obligations: tid === 'tpl-int' ? INTERIOR_OBLIGATIONS.map((o) => ({ ...o })) : t.obligations.map((text) => ({ text })),
    };
  });
}

function quote(
  id: string, ref: string, rev: number, status: Quote['status'], ctId: string, clientId: string,
  date: string, l: LandInfo, f: Fees, payments: PaymentTerm[], revisionNotes: string[], projectId?: string,
): Quote {
  const ct = SEED_CONTRACT_TEMPLATES.find((c) => c.id === ctId)!;
  const content: QuoteContent = {
    contractTemplateId: ctId,
    title: ct.title,
    date,
    clientId,
    land: l,
    scopes: scopesFor(ct.templateIds),
    clientObligations: [...DEFAULT_CLIENT_OBLIGATIONS],
    generalTerms: [...DEFAULT_GENERAL_TERMS],
    fees: f,
    payments,
    internalNotes: '',
    attachments: [],
  };
  const total = (f.extMode === 'perSqm' ? f.rate * l.buildArea : f.extLump) + (f.interiorOn ? f.interior : 0);
  const revisions = Array.from({ length: rev + 1 }, (_, i) => ({
    rev: i,
    date,
    status: i < rev ? ('revisionRequested' as const) : status,
    note: i < rev ? revisionNotes[i] : undefined,
    total,
    snapshot: JSON.parse(JSON.stringify(content)),
  }));
  return { ...content, id, ref, rev, status, revisions, projectId, createdAt: date };
}

const SEED_QUOTES: Quote[] = [
  quote('q-27', 'DES-CON-27', 1, 'sent', 'ct-ext', 'cl-6', '2026-11-02',
    land({ projectType: 'residentialBuilding', plotNo: '2210', basin: '03 خلدا', lands: 'غرب عمّان', landArea: 900, buildArea: 1500 }),
    fees({ rate: 4.5 }),
    [term('الأولى', 40, 'signing', 'توقيع العقد'), term('الثانية', 30, 'stage', 'تسليم المخططات مصدقة من النقابة', SYNDICATE), term('الثالثة', 30, 'stage', 'صدور رخصة البناء', MUNICIPALITY)],
    ['تخفيض سعر المتر']),
  quote('q-26', 'DES-CON-26', 2, 'approved', 'ct-ext-int', 'cl-1', '2026-10-18', LAND7, FEES7, PRJ7_TERMS,
    ['إضافة التصميم الداخلي', 'تعديل آلية الدفع'], 'prj-7'),
  quote('q-25', 'DES-CON-25', 1, 'revisionRequested', 'ct-ext', 'cl-7', '2026-10-25',
    land({ projectType: 'villa', plotNo: '640', basin: '09 السلط', lands: 'السلط', landArea: 700, buildArea: 900 }),
    fees({ rate: 4 }),
    [term('الأولى', 50, 'signing', 'توقيع العقد'), term('الثانية', 50, 'stage', 'صدور رخصة البناء', MUNICIPALITY)],
    ['تغيير مساحة البناء']),
  quote('q-24', 'DES-CON-24', 0, 'draft', 'ct-int', 'cl-7', '2026-11-05',
    land({ projectType: 'villa', interiorArea: 350 }),
    fees({ extMode: 'lump', extLump: 0, interior: 3200, interiorOn: true }),
    [term('الأولى', 50, 'signing', 'توقيع العقد'), term('الثانية', 50, 'stage', 'تسليم مخططات التصميم الداخلي', 'مخططات تنفيذية للداخلي')],
    []),
  quote('q-23', 'DES-CON-23', 3, 'approved', 'ct-ext', 'cl-5', '2026-05-28',
    land({ projectType: 'villa', plotNo: '412', basin: '07 الهاشمية', lands: 'الزرقاء', landArea: 800, buildArea: 1500 }),
    fees({ rate: 4 }), PRJ5_TERMS, ['تعديل السعر', 'إضافة بند الإشراف', 'حذف بند الإشراف'], 'prj-5'),
  quote('q-22', 'DES-CON-22', 0, 'rejected', 'ct-sup', 'cl-6', '2026-09-14',
    land({ projectType: 'commercial', plotNo: '77', basin: '11 عبدون', lands: 'عمّان', landArea: 1200, buildArea: 3000 }),
    fees({ extMode: 'lump', extLump: 9000 }),
    [term('الأولى', 30, 'signing', 'توقيع العقد'), term('الثانية', 70, 'manual', 'شهريًا خلال فترة الإشراف')],
    []),
];

// ─── Expenses ──────────────────────────────────────────────────────────

const SEED_ADMIN_EXPENSES: AdminExpense[] = [
  { id: nid('ae'), category: 'rent', description: 'إيجار المكتب – تشرين الثاني', amount: 650, date: '2026-11-01', method: 'cheque', supplier: 'مالك العقار', recurring: true, attachment: 'عقد الإيجار.pdf' },
  { id: nid('ae'), category: 'salaries', description: 'رواتب الموظفين – تشرين الأول', amount: 6200, date: '2026-10-31', method: 'transfer', recurring: true, attachment: 'كشف الرواتب.pdf' },
  { id: nid('ae'), category: 'utilities', description: 'فاتورة الكهرباء', amount: 145, date: '2026-10-28', method: 'cash', supplier: 'شركة الكهرباء الأردنية', recurring: false, attachment: 'فاتورة.pdf' },
  { id: nid('ae'), category: 'software', description: 'ترخيص برامج التصميم', amount: 420, date: '2026-10-15', method: 'card', supplier: 'Autodesk', recurring: false, attachment: 'فاتورة.pdf' },
  { id: nid('ae'), category: 'stationery', description: 'طباعة مخططات', amount: 85, date: '2026-10-12', method: 'cash', recurring: false, attachment: 'فاتورة.pdf' },
  { id: nid('ae'), category: 'transport', description: 'مراجعات الجهات الرسمية', amount: 60, date: '2026-10-08', method: 'cash', recurring: false },
  { id: nid('ae'), category: 'rent', description: 'إيجار المكتب – تشرين الأول', amount: 650, date: '2026-10-01', method: 'cheque', supplier: 'مالك العقار', recurring: true },
  { id: nid('ae'), category: 'internet', description: 'اشتراك الإنترنت', amount: 45, date: '2026-10-01', method: 'card', supplier: 'Orange', recurring: true },
];

function stageId(project: Project, name: string): { scopeId?: string; stageId?: string } {
  for (const sc of project.scopes) {
    const st = sc.stages.find((s) => s.name === name);
    if (st) return { scopeId: sc.id, stageId: st.id };
  }
  return {};
}

const SEED_PROJECT_EXPENSES: ProjectExpense[] = [
  { id: nid('pe'), projectId: 'prj-7', ...stageId(prj7, SYNDICATE), category: 'printing', description: 'نسخ ورقية للترخيص', amount: 40, date: '2026-10-23', billable: false },
  { id: nid('pe'), projectId: 'prj-7', category: 'surveyor', description: 'متابعة الإفراز مع المساح', amount: 150, date: '2026-10-21', billable: true },
  { id: nid('pe'), projectId: 'prj-7', ...stageId(prj7, MUNICIPALITY), category: 'transport', description: 'مراجعات أمانة عمّان', amount: 25, date: '2026-11-05', billable: false },
  { id: nid('pe'), projectId: 'prj-1', ...stageId(prj1, 'DD (Design Development)'), category: 'subcontractor', description: 'مكتب الطاقة – كهروميكانيك', amount: 900, date: '2026-09-25', billable: false },
  { id: nid('pe'), projectId: 'prj-1', ...stageId(prj1, 'DD (Design Development)'), category: 'subcontractor', description: 'مكتب المسّاح الأردني – مساحة', amount: 250, date: '2026-09-12', billable: false },
  { id: nid('pe'), projectId: 'prj-1', ...stageId(prj1, SYNDICATE), category: 'printing', description: 'نسخ ورقية للترخيص', amount: 35, date: '2026-10-20', billable: false },
  { id: nid('pe'), projectId: 'prj-3', category: 'officialFees', description: 'رسوم تنظيم', amount: 300, date: '2026-04-02', billable: true },
  { id: nid('pe'), projectId: 'prj-3', category: 'subcontractor', description: 'فحص تربة', amount: 1200, date: '2026-03-15', billable: false },
  { id: nid('pe'), projectId: 'prj-2', category: 'printing', description: 'طباعة مخططات DD', amount: 60, date: '2026-09-01', billable: false },
  { id: nid('pe'), projectId: 'prj-5', category: 'officialFees', description: 'رسوم الدفاع المدني', amount: 95, date: '2026-10-10', billable: true },
];

// ─── Drawings ──────────────────────────────────────────────────────────

function dwg(projectId: string, set: Drawing['set'], no: string, title: string, discipline: Drawing['discipline'],
  revs: number, pending = false, transmittal?: { no: string; date: string }): Drawing {
  const prefix = set === 'ifc' ? 'R' : 'F';
  const reasons: Drawing['revisions'][number]['reason'][] = ['contractorNote', 'coordination', 'clientChange'];
  return {
    id: nid('dw'),
    projectId,
    set,
    no,
    title,
    discipline,
    pending,
    transmittal,
    revisions: Array.from({ length: revs + 1 }, (_, i) => ({
      rev: `${prefix}${i}`,
      reason: i === 0 ? undefined : reasons[(i - 1) % reasons.length],
      description: i === 0 ? 'الإصدار الأول' : 'تعديل حسب الملاحظات',
      date: `2026-${String(8 + i).padStart(2, '0')}-1${i}`,
      by: ENG_ARCH,
      file: `${no}-${prefix}${i}.pdf`,
      superseded: i < revs,
    })),
  };
}

const SEED_DRAWINGS: Drawing[] = [
  dwg('prj-3', 'ifc', 'A-101', 'مسقط الطابق الأرضي', 'architectural', 2, false, { no: 'TR-004', date: '2026-10-28' }),
  dwg('prj-3', 'ifc', 'A-102', 'مسقط الطابق الأول', 'architectural', 1, false, { no: 'TR-003', date: '2026-10-05' }),
  dwg('prj-3', 'ifc', 'A-201', 'الواجهات', 'architectural', 3, true),
  dwg('prj-3', 'ifc', 'S-101', 'مخطط الأساسات', 'structural', 1, false, { no: 'TR-002', date: '2026-09-20' }),
  dwg('prj-3', 'ifc', 'E-101', 'الإنارة والقوى', 'electrical', 0, false, { no: 'TR-001', date: '2026-09-02' }),
  dwg('prj-3', 'ifc', 'M-101', 'التمديدات الصحية', 'mechanical', 0, false, { no: 'TR-001', date: '2026-09-02' }),
  dwg('prj-6', 'final', 'S-101', 'مخطط الأساسات', 'structural', 0, false, { no: 'TR-002', date: '2026-06-25' }),
  dwg('prj-6', 'final', 'S-201', 'مخطط الأعمدة والجسور', 'structural', 0, false, { no: 'TR-002', date: '2026-06-25' }),
];

// ─── Assemble ──────────────────────────────────────────────────────────

export function buildSeedDb(): OfficeDb {
  const projects = [prj7, prj1, prj2, prj3, prj5, prj6];
  return JSON.parse(JSON.stringify({
    version: OFFICE_DB_VERSION,
    settings: {
      companyName: 'شركة البناء الإيقوني للاستشارات الهندسية',
      registrationNo: '200345612',
      signatory: ME,
      address: 'عمّان، الأردن – شارع المدينة المنورة',
      phone: '065600123',
      currentUser: ME,
    },
    clients: SEED_CLIENTS,
    templates: SEED_TEMPLATES,
    contractTemplates: SEED_CONTRACT_TEMPLATES,
    quotes: SEED_QUOTES,
    projects,
    claims,
    receipts,
    adminExpenses: SEED_ADMIN_EXPENSES,
    projectExpenses: SEED_PROJECT_EXPENSES,
    drawings: SEED_DRAWINGS,
    transmittals: [],
    counters: { project: 7, quote: 27, claim: claimNo, receipt: 14, transmittal: 4, uid: 10000 },
  } satisfies OfficeDb));
}
