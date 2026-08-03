// ─────────────────────────────────────────────────────────────────────────────
// Payment Claim Report Builder
// Pure HTML-generation logic, completely decoupled from Angular.
// ─────────────────────────────────────────────────────────────────────────────

import { formatAppNumber } from '../../../../../../shared/pipes/app-number.pipe';

export interface ClaimReportSection {
  key: string;
  title: string;
  itemCount: number;
  total: number;
  badgeColor: string;
  headers: Array<{ text: string; align: 'left' | 'right' | 'center' }>;
  /** Pre-rendered <tr>…</tr> HTML rows */
  rows: string;
}

export interface ClaimReportLabels {
  reportTitle: string;
  dateLabel: string;
  confirmedLabel: string;
  grandTotalLabel: string;
  itemsLabel: string;
  footerText: string;
}

export interface ClaimReportOptions {
  lang: string;
  isRtl: boolean;
  isConfirmed: boolean;
  date: string;
  grandTotal: number;
  sections: ClaimReportSection[];
  labels: ClaimReportLabels;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function fmt(value: number): string {
  return formatAppNumber(value) ?? '0';
}

function buildSectionHtml(section: ClaimReportSection, itemsLabel: string): string {
  const headerHtml = section.headers
    .map(h => `<th${h.align !== 'left' ? ` class="${h.align}"` : ''}>${h.text}</th>`)
    .join('');

  return `
  <div class="section">
    <div class="section-header">
      <div class="section-header-left">
        <span class="section-badge" style="background:${section.badgeColor}">${section.key}</span>
        <div>
          <div class="section-title">${section.title}</div>
          <div class="section-count">${section.itemCount} ${itemsLabel}</div>
        </div>
      </div>
      <span class="section-total">${fmt(section.total)}</span>
    </div>
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${section.rows}</tbody>
    </table>
  </div>`;
}

function buildStyles(font: string): string {
  return `
@page { margin: 15mm 20mm; size: A4; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: ${font}; color: #1a1a2e; background: #fff; font-size: 11pt; padding: 24px; }

/* ── Header ── */
.report-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px;
  background: linear-gradient(135deg, #0044bb 0%, #0066ff 100%);
  color: #fff; border-radius: 10px; margin-bottom: 20px;
}
.report-company { font-size: 18pt; font-weight: 800; letter-spacing: -0.3px; }
.report-title   { font-size: 10.5pt; font-weight: 500; opacity: 0.85; margin-top: 4px; }
.report-meta    { text-align: end; }
.report-date    { font-size: 9.5pt; opacity: 0.8; }
.confirmed-badge {
  display: inline-block; background: rgba(255,255,255,0.2);
  padding: 4px 12px; border-radius: 20px; font-size: 8.5pt; font-weight: 700; margin-top: 6px;
}

/* ── Sections ── */
.section {
  margin-bottom: 14px; border: 1px solid #e2e8f0;
  border-radius: 8px; overflow: hidden; page-break-inside: avoid;
}
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
}
.section-header-left { display: flex; align-items: center; gap: 10px; }
.section-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  font-size: 7.5pt; font-weight: 900; color: #fff; letter-spacing: 0.02em; flex-shrink: 0;
}
.section-title { font-size: 10pt; font-weight: 700; color: #1a1a2e; }
.section-count { font-size: 7.5pt; color: #64748b; margin-top: 2px; }
.section-total { font-size: 12pt; font-weight: 800; color: #0044bb; }

/* ── Table ── */
table { width: 100%; border-collapse: collapse; font-size: 9pt; }
th {
  background: #f1f5f9; font-weight: 700; font-size: 7.5pt; color: #475569;
  padding: 7px 12px; text-align: start; letter-spacing: 0.04em; text-transform: uppercase;
}
th.right  { text-align: end; }
th.center { text-align: center; }
td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; line-height: 1.5; }
tr:last-child td { border-bottom: none; }
tr.even { background: #fff; }
tr.odd  { background: #fafcff; }
.right  { text-align: end; }
.center { text-align: center; }
.bold   { font-weight: 700; }
.muted  { color: #94a3b8; font-size: 8.5pt; }
.badge  {
  display: inline-block; padding: 2px 7px; border-radius: 4px;
  font-size: 7.5pt; font-weight: 600; background: #f1f5f9; color: #475569;
  border: 1px solid #e2e8f0; font-family: 'Courier New', monospace;
}

/* ── Grand Total ── */
.grand-total {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px;
  background: linear-gradient(135deg, #0044bb 0%, #0066ff 100%);
  color: #fff; border-radius: 10px; margin-top: 10px; margin-bottom: 20px;
}
.grand-total-label { font-size: 12pt; font-weight: 600; }
.grand-total-value { font-size: 20pt; font-weight: 800; }

/* ── Footer ── */
.report-footer {
  text-align: center; font-size: 7.5pt; color: #94a3b8;
  padding-top: 12px; border-top: 1px solid #e2e8f0;
}

/* ── Print overrides ── */
@media print {
  @page { margin: 15mm; }
  body { padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function buildClaimReport(options: ClaimReportOptions): string {
  const { lang, isRtl, isConfirmed, date, grandTotal, sections, labels } = options;

  const font = isRtl ? "'Tajawal', sans-serif" : "'Inter', sans-serif";
  const dir  = isRtl ? 'rtl' : 'ltr';

  const confirmedBadge = isConfirmed
    ? `<div class="confirmed-badge">&#128274; ${labels.confirmedLabel}</div>`
    : '';

  const sectionsHtml = sections
    .map(s => buildSectionHtml(s, labels.itemsLabel))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${labels.reportTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>${buildStyles(font)}</style>
</head>
<body>

  <div class="report-header">
    <div>
      <div class="report-company">&#9632; Construction</div>
      <div class="report-title">${labels.reportTitle}</div>
    </div>
    <div class="report-meta">
      <div class="report-date">${labels.dateLabel}: <strong>${date}</strong></div>
      ${confirmedBadge}
    </div>
  </div>

  ${sectionsHtml}

  <div class="grand-total">
    <span class="grand-total-label">${labels.grandTotalLabel}</span>
    <span class="grand-total-value">${fmt(grandTotal)}</span>
  </div>

  <div class="report-footer">${labels.footerText}</div>

</body>
</html>`;
}
