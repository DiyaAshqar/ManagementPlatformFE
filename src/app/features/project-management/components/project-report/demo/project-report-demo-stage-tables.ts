import { escapeHtml } from '../../../../reporting/utilities/report-html.utils';
import { formatReportDate, formatReportNumber } from '../utilities/project-report-calculations.util';

/**
 * Renders every raw data category (BOQ, Main Contractors, Purchase Orders,
 * Surveying Visits, Variation Orders, Expenses, Advances) for the demo's one
 * real Milestone Stage ("تحضيرات", project stage #48) as its own
 * color-coded, stacked table — a literal transcription of the real API
 * responses, not folded into the formal report's narrative sections. Demo
 * page only; the shared `ProjectReportSnapshot` model / production mapper
 * are untouched.
 */

const AR = 'ar' as const;

interface Column {
  text: string;
  align?: 'start' | 'end' | 'center';
}

function esc(value: string): string {
  return escapeHtml(value);
}

function n(value: number, decimals = 2): string {
  return formatReportNumber(value, decimals);
}

function d(value: Date): string {
  return formatReportDate(value, AR);
}

function tableBlock(
  color: string,
  badge: string,
  title: string,
  subtitle: string,
  columns: Column[],
  rows: string[][],
  totalLabel: string,
  totalValue: string
): string {
  const head = `<thead><tr>${columns
    .map((c) => `<th style="text-align:${c.align ?? 'start'}">${esc(c.text)}</th>`)
    .join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((value, i) => `<td style="text-align:${columns[i]?.align ?? 'start'}">${value}</td>`).join('')}</tr>`
    )
    .join('')}</tbody>`;

  return `<div class="sdt-block" style="border-inline-start-color:${color}">
    <div class="sdt-head" style="background:${color}1a">
      <span class="sdt-badge" style="background:${color}">${esc(badge)}</span>
      <div class="sdt-head-text">
        <div class="sdt-title" style="color:${color}">${esc(title)}</div>
        <div class="sdt-subtitle">${esc(subtitle)}</div>
      </div>
      <div class="sdt-total" style="color:${color}">
        <span class="sdt-total-label">${esc(totalLabel)}</span>
        <span class="sdt-total-value">${totalValue}</span>
      </div>
    </div>
    <table class="sdt-table">${head}${body}</table>
  </div>`;
}

function buildBoq(): string {
  const rows: string[][] = [
    ['1', esc('Concrete'), esc('باطون تجهيزات غرف العمال والمستودعات'), esc('m³'), esc('شركة محمد ثلجي وشركاؤه'), n(3, 0), n(46), `<b>${n(138)}</b>`],
    ['2', esc('blocks'), esc('بناء طوب غرف العمال والحارس والمستودع'), esc('piece'), esc('شركة محمد ثلجي وشركاؤه'), n(3000, 0), n(0.26), `<b>${n(780)}</b>`],
    ['3', esc('caravan'), esc('توريد وتجهيزات الموقع بالكرفان وطابعة خاصة وتمديداته الكهروميكانيكية بقيمة 1600 دينار'), esc('piece'), esc('شركة محمد ثلجي وشركاؤه'), n(1, 0), n(0), `<b>${n(0)}</b>`],
    ['4', esc('Concrete'), esc('eeeeeeeeeee'), esc('m²'), esc('Darwish Company'), n(2, 0), n(2), `<b>${n(4)}</b>`],
    ['5', esc('Concrete'), esc('twwerwerwe'), esc('m²'), esc('Darwish Company'), n(3, 0), n(3), `<b>${n(9)}</b>`],
    ['6', esc('Concrete'), esc('erere'), esc('m³'), esc('Darwish Company'), n(22, 0), n(4), `<b>${n(88)}</b>`],
  ];
  return tableBlock(
    '#2563eb',
    'BOQ',
    'كشف الكميات — Bill of Quantities',
    'المواد والكميات لهذه المرحلة (6 عناصر)',
    [
      { text: '#', align: 'center' },
      { text: 'المادة' },
      { text: 'الوصف' },
      { text: 'الوحدة' },
      { text: 'المقاول' },
      { text: 'الكمية الفعلية', align: 'end' },
      { text: 'سعر الوحدة', align: 'end' },
      { text: 'المجموع الفرعي', align: 'end' },
    ],
    rows,
    'الإجمالي',
    n(1019)
  );
}

function buildPmc(): string {
  // Master: ProjectMainContractor. Detail: its ProjectMainContractorPayments.
  // Payments are linked by contract ID, since one contractor may hold multiple contracts.
  const contractors = [
    {
      id: 14,
      name: 'شركة محمد ثلجي وشركاؤه',
      type: 'مقاول عظم',
      startDate: new Date(2026, 4, 4),
      endDate: new Date(2026, 4, 9),
      amount: 8000,
      payments: [
        { date: new Date(2026, 4, 9), amount: 8000, method: 'شيك', receiptNo: '541', notes: 'دفعة اولى' },
        { date: new Date(2026, 6, 7), amount: 500, method: 'تحويل بنكي', receiptNo: '898HJU', notes: 'test' },
      ],
    },
    { id: 16, name: 'جهاد الشويكي.', type: 'مقاول كهرباء', startDate: new Date(2026, 5, 24), endDate: new Date(2026, 5, 23), amount: 3, payments: [] },
    { id: 17, name: 'شركة محمد ثلجي وشركاؤه', type: 'مقاول عظم', startDate: new Date(2026, 6, 8), endDate: new Date(2026, 6, 21), amount: 7878, payments: [] },
  ];

  const rows = contractors
    .map((contractor, index) => {
      const totalPaid = contractor.payments.reduce((total, payment) => total + payment.amount, 0);
      const balance = contractor.amount - totalPaid;
      const paymentDetail = contractor.payments.length
        ? `<details class="sdt-master-detail"${index === 0 ? ' open' : ''}>
            <summary>عرض الدفعات (${contractor.payments.length})</summary>
            <div class="sdt-detail-summary">
              <span>إجمالي المدفوع: <b>${n(totalPaid)}</b></span>
              <span class="${balance < 0 ? 'sdt-negative' : ''}">الرصيد المتبقي: <b>${n(balance)}</b></span>
            </div>
            <table class="sdt-detail-table">
              <thead><tr><th>#</th><th>تاريخ الدفعة</th><th>المبلغ المدفوع</th><th>طريقة الدفع</th><th>رقم السند</th><th>ملاحظات</th></tr></thead>
              <tbody>${contractor.payments
                .map(
                  (payment, paymentIndex) =>
                    `<tr><td>${paymentIndex + 1}</td><td>${d(payment.date)}</td><td><b>${n(payment.amount)}</b></td><td>${esc(payment.method)}</td><td>${esc(payment.receiptNo)}</td><td>${esc(payment.notes)}</td></tr>`
                )
                .join('')}</tbody>
            </table>
          </details>`
        : `<span class="sdt-no-details">لا توجد دفعات مسجلة</span>`;

      return `<tr class="sdt-master-row">
          <td style="text-align:center">${index + 1}</td>
          <td>${esc(contractor.name)}</td>
          <td>${esc(contractor.type)}</td>
          <td>${d(contractor.startDate)}</td>
          <td>${d(contractor.endDate)}</td>
          <td style="text-align:end">${n(contractor.amount)}</td>
          <td style="text-align:end"><b>${n(totalPaid)}</b></td>
        </tr>
        <tr class="sdt-detail-row"><td colspan="7">${paymentDetail}</td></tr>`;
    })
    .join('');

  return `<div class="sdt-block" style="border-inline-start-color:#16a34a">
    <div class="sdt-head" style="background:#16a34a1a">
      <span class="sdt-badge" style="background:#16a34a">PMC</span>
      <div class="sdt-head-text">
        <div class="sdt-title" style="color:#16a34a">المقاولون الرئيسيون — Main Contractors</div>
        <div class="sdt-subtitle">العقد هو السجل الرئيسي؛ افتح صف التفاصيل للاطلاع على دفعاته (${contractors.length} عقود)</div>
      </div>
      <div class="sdt-total" style="color:#16a34a"><span class="sdt-total-label">إجمالي قيمة العقود</span><span class="sdt-total-value">${n(15881)}</span></div>
    </div>
    <table class="sdt-table">
      <thead><tr><th>#</th><th>المقاول</th><th>نوع العقد</th><th>تاريخ البدء</th><th>تاريخ الانتهاء</th><th style="text-align:end">قيمة العقد</th><th style="text-align:end">إجمالي المدفوعات</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
function buildPo(): string {
  const rows: string[][] = [
    ['1', `<span class="sdt-code">32432</span>`, esc('Building Materials Inc.'), esc('SSDFSDF'), n(343), `<b>${n(343)}</b>`, esc('قيد الانتظار')],
    ['2', `<span class="sdt-code">3243243333</span>`, esc('Materials Supplier Co.'), esc('SDFSDFSD'), n(45454), `<b>${n(45454)}</b>`, esc('قيد الانتظار')],
    ['3', `<span class="sdt-code">44</span>`, esc('Building Materials Inc.'), esc('werwer'), n(77), `<b>${n(77)}</b>`, esc('قيد الانتظار')],
  ];
  return tableBlock(
    '#d97706',
    'PO',
    'أوامر الشراء — Purchase Orders',
    'أوامر الشراء الصادرة لهذه المرحلة (3 عناصر)',
    [
      { text: '#', align: 'center' },
      { text: 'رقم الأمر' },
      { text: 'المورد' },
      { text: 'الوصف' },
      { text: 'السعر', align: 'end' },
      { text: 'المجموع الفرعي', align: 'end' },
      { text: 'الحالة' },
    ],
    rows,
    'الإجمالي',
    n(45874)
  );
}

function buildSv(): string {
  const rows: string[][] = [
    ['1', d(new Date(2026, 5, 8)), esc('ibrahim'), esc('test'), n(4, 0), n(220), `<b>${n(880)}</b>`, esc('قيد التنفيذ')],
    ['2', d(new Date(2026, 5, 30)), esc('werwe'), esc('wrwewr'), n(3, 0), n(44), `<b>${n(132)}</b>`, esc('مجدولة')],
  ];
  return tableBlock(
    '#9333ea',
    'SV',
    'زيارات المساحة — Surveying Visits',
    'زيارات المساحة المسجّلة لهذه المرحلة (2 عنصر)',
    [
      { text: '#', align: 'center' },
      { text: 'تاريخ الزيارة' },
      { text: 'المساح' },
      { text: 'الغرض' },
      { text: 'الكمية', align: 'end' },
      { text: 'سعر الوحدة', align: 'end' },
      { text: 'المجموع الفرعي', align: 'end' },
      { text: 'الحالة' },
    ],
    rows,
    'الإجمالي',
    n(1012)
  );
}

function buildVo(): string {
  const rows: string[][] = [
    [
      '1',
      `<span class="sdt-code">vo-0032026-2</span>`,
      esc('wrwe'),
      esc('werwerew'),
      n(3, 0),
      n(34244),
      `<b>${n(102732)}</b>`,
      `${d(new Date(2026, 6, 21))} → ${d(new Date(2026, 6, 30))}`,
      esc('معتمد'),
    ],
  ];
  return tableBlock(
    '#db2777',
    'VO',
    'أوامر التغيير — Variation Orders',
    'أوامر التغيير المسجّلة لهذه المرحلة (1 عنصر)',
    [
      { text: '#', align: 'center' },
      { text: 'رقم الأمر' },
      { text: 'البند' },
      { text: 'الوصف' },
      { text: 'الكمية', align: 'end' },
      { text: 'السعر', align: 'end' },
      { text: 'المجموع الفرعي', align: 'end' },
      { text: 'فترة التنفيذ' },
      { text: 'الحالة' },
    ],
    rows,
    'الإجمالي',
    n(102732)
  );
}

function buildExp(): string {
  const lockedBadge = `<span class="sdt-lock">مقفلة</span>`;
  const rows: string[][] = [
    ['1', esc('xxxx'), d(new Date(2026, 6, 10)), esc('مؤسسة مهدي عيران المركزية'), esc('Auto generated from project main contractor duty'), n(22, 0), n(324), `<b>${n(7128)}</b>`, esc('متاح')],
    ['2', esc('3434'), d(new Date(2026, 6, 8)), esc('Trade House LLC'), esc('Auto generated from project main contractor duty'), n(34, 0), n(2), `<b>${n(68)}</b>`, `${esc('متاح')} ${lockedBadge}`],
    ['3', esc('2222222'), d(new Date(2026, 6, 5)), esc('المتأهب'), esc('test'), n(1030.123, 3), n(21.01), `<b>${n(21644.94)}</b>`, esc('متاح')],
    ['4', esc('t-255'), d(new Date(2026, 6, 10)), esc('Construction Supply Ltd.'), esc('Auto generated from project main contractor duty'), n(11, 0), n(16), `<b>${n(176)}</b>`, `${esc('متاح')} ${lockedBadge}`],
    ['5', esc('877'), d(new Date(2026, 4, 14)), esc('عمران الحاج'), esc('مياه تعبئة لتجهيزات المشروع'), n(1, 0), n(23), `<b>${n(23)}</b>`, `${esc('متاح')} ${lockedBadge}`],
    ['6', esc('5081'), d(new Date(2026, 5, 24)), esc('عماد محمد عبد اللطيف صالح'), esc('قرطاسية'), n(1, 0), n(26.2), `<b>${n(26.2)}</b>`, `${esc('متاح')} ${lockedBadge}`],
    ['7', esc('1241'), d(new Date(2026, 4, 14)), esc('Materials Supplier Co.'), esc('طوب غرفة العمال, غرفة المقاول,'), n(1350, 0), n(0.26), `<b>${n(351)}</b>`, esc('متاح')],
    ['8', esc('001'), d(new Date(2026, 4, 9)), esc('المملكة'), esc('باطون تجهيزات غرف العمال والمستودعات'), n(3, 0), n(46), `<b>${n(138)}</b>`, esc('متاح')],
    ['9', esc('1216'), d(new Date(2026, 4, 5)), esc('Materials Supplier Co.'), esc('شركة المتأهبة'), n(3000, 0), n(0.26), `<b>${n(780)}</b>`, esc('متاح')],
    ['10', esc('0000'), d(new Date(2026, 4, 4)), esc('Materials Supplier Co.'), esc('كرفان'), n(1, 0), n(0), `<b>${n(0)}</b>`, esc('متاح')],
  ];
  return tableBlock(
    '#dc2626',
    'EXP',
    'المصروفات — Expenses',
    'المصروفات المسجّلة لهذه المرحلة (10 عناصر)، وسم "مقفلة" يعني أنّها مغطاة بسلفة',
    [
      { text: '#', align: 'center' },
      { text: 'رقم المصروف' },
      { text: 'التاريخ' },
      { text: 'المورد' },
      { text: 'الملاحظات' },
      { text: 'الكمية', align: 'end' },
      { text: 'سعر الوحدة', align: 'end' },
      { text: 'المجموع', align: 'end' },
      { text: 'الحالة' },
    ],
    rows,
    'الإجمالي',
    n(30335.14)
  );
}

function buildAdv(): string {
  // Master: an advance (السلفة). Detail: expenses available to settle
  // against it (from "GET available expenses" per advance — same open
  // pool of unlocked expenses, offered per-advance in the real UI).
  interface AdvanceExpense {
    expenseNo: string;
    type: string;
    amount: number;
    date: Date;
    status: string;
  }
  interface Advance {
    code: string;
    date: Date;
    engineer: string;
    amount: number;
    remaining: number;
    status: string;
    expenses: AdvanceExpense[];
  }

  const availableExpenses: AdvanceExpense[] = [
    { expenseNo: '6868NN', type: 'Auto generated from project main contractor duty', amount: 6868, date: new Date('2026-08-30T13:44:43.224169'), status: 'متاح' },
    { expenseNo: 'xxxx', type: 'Auto generated from project main contractor duty', amount: 7128, date: new Date('2026-07-10T18:57:52.7561861'), status: 'متاح' },
    { expenseNo: '2222', type: '', amount: 21642.88, date: new Date('2026-07-05T08:33:36.568'), status: 'متاح' },
  ];

  const advances: Advance[] = [
    { code: 'ADV-2026-005', date: new Date(2026, 7, 3), engineer: 'omar', amount: 100, remaining: 100, status: 'مفتوحة', expenses: availableExpenses },
    { code: 'ADV-2026-004', date: new Date(2026, 5, 2), engineer: 'diya', amount: 55555, remaining: 55555, status: 'مفتوحة', expenses: availableExpenses },
    { code: 'ADV-2026-003', date: new Date(2026, 6, 28), engineer: 'omar', amount: 22, remaining: 22, status: 'مفتوحة', expenses: [] },
    { code: 'ADV-2026-002', date: new Date(2026, 6, 20), engineer: 'omar', amount: 500, remaining: 500, status: 'مفتوحة', expenses: [] },
    { code: 'ADV-2026-001', date: new Date(2026, 6, 20), engineer: 'omar', amount: 300, remaining: 74.8, status: 'مفتوحة', expenses: [] },
    { code: '10', date: new Date(2026, 0, 1), engineer: 'omar', amount: 100, remaining: 32, status: 'جزئية', expenses: [] },
  ];

  const rows = advances
    .map((advance, index) => {
      const totalAvailable = advance.expenses.reduce((total, expense) => total + expense.amount, 0);
      const expensesDetail = advance.expenses.length
        ? `<details class="sdt-master-detail"${index === 0 ? ' open' : ''}>
            <summary>عرض المصروفات المتاحة للتسوية (${advance.expenses.length})</summary>
            <div class="sdt-detail-summary">
              <span>إجمالي المصروفات المتاحة: <b>${n(totalAvailable)}</b></span>
            </div>
            <table class="sdt-detail-table">
              <thead><tr><th>#</th><th>رقم المصروف</th><th>الملاحظات</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
              <tbody>${advance.expenses
                .map(
                  (expense, expenseIndex) =>
                    `<tr><td>${expenseIndex + 1}</td><td>${esc(expense.expenseNo)}</td><td>${esc(expense.type)}</td><td>${d(expense.date)}</td><td><b>${n(expense.amount)}</b></td><td>${esc(expense.status)}</td></tr>`
                )
                .join('')}</tbody>
            </table>
          </details>`
        : `<span class="sdt-no-details">لا توجد مصروفات متاحة للتسوية</span>`;

      return `<tr class="sdt-master-row">
          <td style="text-align:center">${index + 1}</td>
          <td><span class="sdt-code">${esc(advance.code)}</span></td>
          <td>${d(advance.date)}</td>
          <td>${esc(advance.engineer)}</td>
          <td style="text-align:end">${n(advance.amount)}</td>
          <td style="text-align:end">${n(advance.remaining)}</td>
          <td>${esc(advance.status)}</td>
        </tr>
        <tr class="sdt-detail-row"><td colspan="7">${expensesDetail}</td></tr>`;
    })
    .join('');

  return `<div class="sdt-block" style="border-inline-start-color:#4f46e5">
    <div class="sdt-head" style="background:#4f46e51a">
      <span class="sdt-badge" style="background:#4f46e5">ADV</span>
      <div class="sdt-head-text">
        <div class="sdt-title" style="color:#4f46e5">السُلف — Advances</div>
        <div class="sdt-subtitle">سُلف المشروع (على مستوى المشروع، غير مرتبطة بمرحلة محدّدة في البيانات)؛ افتح صف التفاصيل للاطلاع على المصروفات المتاحة للتسوية — 6 عناصر، منها 5 مفتوحة</div>
      </div>
      <div class="sdt-total" style="color:#4f46e5"><span class="sdt-total-label">إجمالي السُلف / المتبقي</span><span class="sdt-total-value"><span dir="ltr">${n(56577)} / ${n(56283.8)}</span></span></div>
    </div>
    <table class="sdt-table">
      <thead><tr><th>#</th><th>رقم السلفة</th><th>التاريخ</th><th>المهندس</th><th style="text-align:end">المبلغ</th><th style="text-align:end">الرصيد المتبقي</th><th>الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

const STYLES = `
.sdt-wrap { margin: 0 0 18px; }
.sdt-wrap h1 { font-size: 16px; color: #0f2f5f; margin: 0 0 2px; }
.sdt-wrap .sdt-wrap-subtitle { font-size: 10px; color: #64748b; margin: 0 0 12px; }
.sdt-block { border: 1px solid #e2e8f0; border-inline-start-width: 5px; border-inline-start-style: solid; border-radius: 8px; margin-bottom: 12px; overflow: hidden; page-break-inside: avoid; }
.sdt-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px; }
.sdt-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 22px; padding: 0 8px; border-radius: 11px; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: .03em; flex-shrink: 0; }
.sdt-head-text { flex: 1; }
.sdt-title { font-size: 12px; font-weight: 700; }
.sdt-subtitle { font-size: 9px; color: #64748b; margin-top: 1px; }
.sdt-total { text-align: end; }
.sdt-total-label { display: block; font-size: 8.5px; color: #64748b; }
.sdt-total-value { font-size: 13px; font-weight: 800; }
.sdt-table { width: 100%; border-collapse: collapse; margin: 0; }
.sdt-table th, .sdt-table td { border: 1px solid #e2e8f0; padding: 5px 7px; font-size: 9.5px; }
.sdt-table th { background: #f8fafc; font-weight: 700; color: #334155; }
.sdt-table tbody tr:nth-child(even) { background: #fafcff; }
.sdt-master-row { background: #fff; }
.sdt-detail-row td { padding: 0; background: #f8fffa; }
.sdt-master-detail { padding: 6px 10px; }
.sdt-master-detail summary { cursor: pointer; color: #15803d; font-weight: 700; font-size: 9px; }
.sdt-detail-summary { display: flex; gap: 18px; margin: 7px 0 5px; color: #334155; font-size: 8.5px; }
.sdt-negative { color: #dc2626; }
.sdt-detail-table { width: 100%; border-collapse: collapse; background: #fff; }
.sdt-detail-table th, .sdt-detail-table td { border: 1px solid #dbe7df; padding: 4px 6px; font-size: 8.5px; }
.sdt-detail-table th { background: #eaf7ee; color: #166534; }
.sdt-no-details { display: block; padding: 7px 10px; color: #64748b; font-size: 8.5px; }
.sdt-code { font-family: 'Courier New', monospace; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 6px; font-size: 9px; }
.sdt-lock { display: inline-block; margin-inline-start: 4px; background: #fee2e2; color: #991b1b; border-radius: 4px; padding: 1px 5px; font-size: 8px; font-weight: 700; }
`;

/**
 * Full raw-data breakdown for the demo's one real Milestone Stage, as
 * color-coded stacked tables — BOQ, Main Contractors, Purchase Orders,
 * Surveying Visits, Variation Orders, Expenses, then Advances, in that
 * order. Returned as a self-contained fragment (its own `<style>` plus a
 * wrapper `<div>`) meant to be spliced into the generated report HTML.
 */
export function buildStageDataTablesHtml(stageName: string): string {
  return `<style>${STYLES}</style>
  <div class="sdt-wrap">
    <h1>بيانات مرحلة "${esc(stageName)}" الكاملة — كل الأقسام</h1>
    <p class="sdt-wrap-subtitle">نقل حرفي للبيانات الحقيقية من الخادم لمرحلة المشروع رقم 48، مقسّمة كجداول ملوّنة لكل تبويب على حدة.</p>
    ${buildBoq()}
    ${buildPmc()}
    ${buildPo()}
    ${buildSv()}
    ${buildVo()}
    ${buildExp()}
    ${buildAdv()}
  </div>`;
}
