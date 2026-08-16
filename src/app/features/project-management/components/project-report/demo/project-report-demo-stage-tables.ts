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
  const rows: string[][] = [
    ['1', esc('شركة محمد ثلجي وشركاؤه'), esc('مقاول عظم'), d(new Date(2026, 4, 4)), d(new Date(2026, 4, 9)), n(8000), `<b>${n(8500)}</b>`],
    ['2', esc('جهاد الشويكي.'), esc('مقاول كهرباء'), d(new Date(2026, 5, 24)), d(new Date(2026, 5, 23)), n(3), `<b>${n(0)}</b>`],
    ['3', esc('شركة محمد ثلجي وشركاؤه'), esc('مقاول عظم'), d(new Date(2026, 6, 8)), d(new Date(2026, 6, 21)), n(7878), `<b>${n(0)}</b>`],
  ];
  return tableBlock(
    '#16a34a',
    'PMC',
    'المقاولون الرئيسيون — Main Contractors',
    'عقود المقاولين الرئيسيين لهذه المرحلة (3 عناصر)',
    [
      { text: '#', align: 'center' },
      { text: 'المقاول' },
      { text: 'نوع العقد' },
      { text: 'تاريخ البدء' },
      { text: 'تاريخ الانتهاء' },
      { text: 'قيمة العقد', align: 'end' },
      { text: 'إجمالي المدفوعات', align: 'end' },
    ],
    rows,
    'إجمالي قيمة العقود',
    n(15881)
  );
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
  const rows: string[][] = [
    ['1', `<span class="sdt-code">ADV-2026-005</span>`, d(new Date(2026, 7, 3)), esc('omar'), n(100), n(100), esc('مفتوحة')],
    ['2', `<span class="sdt-code">ADV-2026-004</span>`, d(new Date(2026, 5, 2)), esc('diya'), n(55555), n(55555), esc('مفتوحة')],
    ['3', `<span class="sdt-code">ADV-2026-003</span>`, d(new Date(2026, 6, 28)), esc('omar'), n(22), n(22), esc('مفتوحة')],
    ['4', `<span class="sdt-code">ADV-2026-002</span>`, d(new Date(2026, 6, 20)), esc('omar'), n(500), n(500), esc('مفتوحة')],
    ['5', `<span class="sdt-code">ADV-2026-001</span>`, d(new Date(2026, 6, 20)), esc('omar'), n(300), n(74.8), esc('مفتوحة')],
    ['6', `<span class="sdt-code">10</span>`, d(new Date(2026, 0, 1)), esc('omar'), n(100), n(32), esc('جزئية')],
  ];
  return tableBlock(
    '#4f46e5',
    'ADV',
    'السُلف — Advances',
    'سُلف المشروع (على مستوى المشروع، غير مرتبطة بمرحلة محدّدة في البيانات) — 6 عناصر، منها 5 مفتوحة',
    [
      { text: '#', align: 'center' },
      { text: 'رقم السلفة' },
      { text: 'التاريخ' },
      { text: 'المهندس' },
      { text: 'المبلغ', align: 'end' },
      { text: 'الرصيد المتبقي', align: 'end' },
      { text: 'الحالة' },
    ],
    rows,
    'إجمالي السُلف / المتبقي',
    `<span dir="ltr">${n(56577)} / ${n(56283.8)}</span>`
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
