import { escapeHtml } from '../../../../reporting/utilities/report-html.utils';
import { formatReportDate, formatReportNumber } from '../utilities/project-report-calculations.util';

/**
 * Renders every raw data category (BOQ, Main Contractors, Purchase Orders,
 * Surveying Visits, Variation Orders, Expenses, Tasks) for the demo's one
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

const DUTY_TYPE_NAMES: Record<number, string> = {
  1: 'جبسوم بورد فلات',
  2: 'جبسوم بورد شراشف',
  3: 'جبسوم بورد قواطع',
  4: 'فولس سيلنج',
  5: 'جبسوم بورد بروفايل',
  6: 'جبسوم بورد ماجناتيك',
  7: 'جبسوم بورد فرزات',
};

const DUTY_RESPONSIBILITY_NAMES: Record<number, string> = {
  1: 'المقاول',
  2: 'المالك',
  3: 'الاستشاري',
  4: 'مشترك',
  5: 'المهندس',
};

const DUTY_UNIT_NAMES: Record<number, string> = {
  1: 'm²',
  2: 'm³',
  3: 'kg',
  4: 'ton',
  5: 'piece',
  6: 'ML',
  7: 'liter',
  8: 'day',
  9: 'hour',
  10: 'set',
};

const DUTY_MATERIAL_NAMES: Record<number, string> = {
  2: 'Steel Rebar',
  19: 'زجاج سيكوريت',
};

const DUTY_SUPPLIER_NAMES: Record<number, string> = {
  1: 'Materials Supplier Co.',
  2: 'Construction Supply Ltd.',
};

function buildPmc(): string {
  // Master: ProjectMainContractor. Detail: its ProjectMainContractorPayments
  // and its ProjectMainContractorDuty line items (the BOQ-like commitments
  // that make up the contract). Both are linked by contract ID, since one
  // contractor may hold multiple contracts.
  interface ContractorDuty {
    dutyTypeId: number;
    dutyResponsibilityId: number;
    unitId: number;
    quantity: number;
    price: number;
    subTotal: number;
    supplierId: number | null;
    materialId: number | null;
    expenseNumber: string | null;
  }

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
      duties: [
        { dutyTypeId: 2, dutyResponsibilityId: 1, unitId: 1, quantity: 11, price: 16, subTotal: 176, supplierId: 2, materialId: 2, expenseNumber: 't-255' },
        { dutyTypeId: 2, dutyResponsibilityId: 3, unitId: 1, quantity: 11, price: 50, subTotal: 550, supplierId: null, materialId: null, expenseNumber: null },
        { dutyTypeId: 4, dutyResponsibilityId: 2, unitId: 2, quantity: 12, price: 11, subTotal: 132, supplierId: null, materialId: null, expenseNumber: null },
        { dutyTypeId: 1, dutyResponsibilityId: 2, unitId: 1, quantity: 3434, price: 2, subTotal: 6868, supplierId: 1, materialId: 19, expenseNumber: '6868NN' },
      ] as ContractorDuty[],
    },
    {
      id: 16,
      name: 'جهاد الشويكي.',
      type: 'مقاول كهرباء',
      startDate: new Date(2026, 5, 24),
      endDate: new Date(2026, 5, 23),
      amount: 3,
      payments: [],
      duties: [
        { dutyTypeId: 2, dutyResponsibilityId: 1, unitId: 2, quantity: 795, price: 461, subTotal: 366495, supplierId: null, materialId: null, expenseNumber: null },
      ] as ContractorDuty[],
    },
    {
      id: 17,
      name: 'شركة محمد ثلجي وشركاؤه',
      type: 'مقاول عظم',
      startDate: new Date(2026, 6, 8),
      endDate: new Date(2026, 6, 21),
      amount: 7878,
      payments: [],
      duties: [] as ContractorDuty[],
    },
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

      const totalDuties = contractor.duties.reduce((total, duty) => total + duty.subTotal, 0);
      const dutyDetail = contractor.duties.length
        ? `<details class="sdt-master-detail">
            <summary>عرض التزامات المقاول (${contractor.duties.length})</summary>
            <div class="sdt-detail-summary">
              <span>إجمالي الالتزامات: <b>${n(totalDuties)}</b></span>
            </div>
            <table class="sdt-detail-table">
              <thead><tr><th>#</th><th>البند</th><th>المسؤولية</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>المجموع الفرعي</th><th>المورد</th><th>المادة</th><th>رقم المصروف المرتبط</th></tr></thead>
              <tbody>${contractor.duties
                .map(
                  (duty, dutyIndex) =>
                    `<tr><td>${dutyIndex + 1}</td><td>${esc(DUTY_TYPE_NAMES[duty.dutyTypeId] ?? String(duty.dutyTypeId))}</td><td>${esc(DUTY_RESPONSIBILITY_NAMES[duty.dutyResponsibilityId] ?? String(duty.dutyResponsibilityId))}</td><td>${esc(DUTY_UNIT_NAMES[duty.unitId] ?? String(duty.unitId))}</td><td>${n(duty.quantity, 0)}</td><td>${n(duty.price)}</td><td><b>${n(duty.subTotal)}</b></td><td>${duty.supplierId === null ? '—' : esc(DUTY_SUPPLIER_NAMES[duty.supplierId] ?? String(duty.supplierId))}</td><td>${duty.materialId === null ? '—' : esc(DUTY_MATERIAL_NAMES[duty.materialId] ?? String(duty.materialId))}</td><td>${duty.expenseNumber ? esc(duty.expenseNumber) : '—'}</td></tr>`
                )
                .join('')}</tbody>
            </table>
          </details>`
        : `<span class="sdt-no-details">لا توجد التزامات مسجلة</span>`;

      return `<tr class="sdt-master-row">
          <td style="text-align:center">${index + 1}</td>
          <td>${esc(contractor.name)}</td>
          <td>${esc(contractor.type)}</td>
          <td>${d(contractor.startDate)}</td>
          <td>${d(contractor.endDate)}</td>
          <td style="text-align:end">${n(contractor.amount)}</td>
          <td style="text-align:end"><b>${n(totalPaid)}</b></td>
        </tr>
        <tr class="sdt-detail-row"><td colspan="7">${paymentDetail}${dutyDetail}</td></tr>`;
    })
    .join('');

  return `<div class="sdt-block" style="border-inline-start-color:#16a34a">
    <div class="sdt-head" style="background:#16a34a1a">
      <span class="sdt-badge" style="background:#16a34a">PMC</span>
      <div class="sdt-head-text">
        <div class="sdt-title" style="color:#16a34a">المقاولون الرئيسيون — Main Contractors</div>
        <div class="sdt-subtitle">العقد هو السجل الرئيسي؛ افتح صف التفاصيل للاطلاع على دفعاته والتزاماته (${contractors.length} عقود)</div>
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

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'لم تبدأ',
  inProgress: 'قيد التنفيذ',
  review: 'قيد المراجعة',
  done: 'مكتملة',
};

const TASK_PRIORITY_LABELS: Record<number, string> = {
  0: 'منخفضة',
  1: 'متوسطة',
  2: 'عالية',
  3: 'حرجة',
};

const TASK_RESPONSIBILITY_LABELS: Record<string, string> = {
  supplier: 'مورّد',
  contractor: 'مقاول',
};

function buildTask(): string {
  interface TaskRow {
    id: number;
    title: string;
    description: string;
    responsibility: string | null;
    assignTo: number | null;
    taskPoint: number;
    startDate: Date;
    endDate: Date;
    priority: number;
    status: string;
  }

  const tasks: TaskRow[] = [
    {
      id: 5,
      title: 'test',
      description: 'test',
      responsibility: 'supplier',
      assignTo: 5,
      taskPoint: 2,
      startDate: new Date('2026-07-20T21:00:00'),
      endDate: new Date('2026-07-27T21:00:00'),
      priority: 1,
      status: 'inProgress',
    },
    {
      id: 6,
      title: 'Dolorum labore rerum',
      description: 'Earum aut ipsam ut r',
      responsibility: null,
      assignTo: null,
      taskPoint: 3,
      startDate: new Date('2026-07-08T21:00:00'),
      endDate: new Date('2026-07-07T21:00:00'),
      priority: 0,
      status: 'review',
    },
  ];

  const rows = tasks.map((task, index) => [
    String(index + 1),
    esc(task.title),
    esc(task.description),
    task.responsibility ? esc(TASK_RESPONSIBILITY_LABELS[task.responsibility] ?? task.responsibility) : '—',
    task.assignTo === null ? '—' : String(task.assignTo),
    n(task.taskPoint, 0),
    d(task.startDate),
    d(task.endDate),
    esc(TASK_PRIORITY_LABELS[task.priority] ?? String(task.priority)),
    esc(TASK_STATUS_LABELS[task.status] ?? task.status),
  ]);

  return tableBlock(
    '#0d9488',
    'TASK',
    'المهام — Tasks',
    'مهام هذه المرحلة المسجّلة في النظام (2 عنصر)',
    [
      { text: '#', align: 'center' },
      { text: 'العنوان' },
      { text: 'الوصف' },
      { text: 'المسؤولية' },
      { text: 'المكلّف' },
      { text: 'نقاط المهمة', align: 'center' },
      { text: 'تاريخ البدء' },
      { text: 'تاريخ الانتهاء' },
      { text: 'الأولوية' },
      { text: 'الحالة' },
    ],
    rows,
    'إجمالي المهام',
    String(tasks.length)
  );
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
 * Surveying Visits, Variation Orders, Expenses, then Tasks, in that
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
    ${buildTask()}
  </div>`;
}
