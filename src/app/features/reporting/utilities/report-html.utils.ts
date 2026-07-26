import { ReportExportCell, ReportExportModel } from '../models/report-export.model';

export interface ReportHtmlOptions {
  /** Best-effort CSS page-number footer (engine dependent). */
  pageNumbers?: boolean;
}

/** Escape text for safe interpolation into HTML (never inject raw report data). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function alignToCss(alignment: string): string {
  if (alignment === 'end') {
    return 'end';
  }
  if (alignment === 'center') {
    return 'center';
  }
  return 'start';
}

function renderCell(cell: ReportExportCell | undefined, alignment: string): string {
  const text = cell ? escapeHtml(cell.text) : '';
  return `<td style="text-align:${alignToCss(alignment)}">${text}</td>`;
}

function renderRows(model: ReportExportModel): string {
  const alignments = model.columns.map((column) => column.alignment);

  if (model.groups && model.groups.length > 0) {
    return model.groups
      .map((group) => {
        const groupHeader =
          `<tr class="group-header"><td colspan="${model.columns.length}">` +
          `${escapeHtml(group.title)}</td></tr>`;
        const body = group.rows
          .map(
            (row) =>
              `<tr>${model.columns
                .map((_, index) => renderCell(row[index], alignments[index]))
                .join('')}</tr>`
          )
          .join('');
        const footer =
          group.summaries && group.summaries.length > 0
            ? `<tr class="group-footer"><td colspan="${model.columns.length}">${group.summaries
                .map((summary) => `${escapeHtml(summary.label)}: <strong>${escapeHtml(summary.value)}</strong>`)
                .join(' &nbsp;•&nbsp; ')}</td></tr>`
            : '';
        return groupHeader + body + footer;
      })
      .join('');
  }

  return model.rows
    .map(
      (row) =>
        `<tr>${model.columns
          .map((_, index) => renderCell(row[index], alignments[index]))
          .join('')}</tr>`
    )
    .join('');
}

/** Build a fully self-contained, print-optimized HTML document for a report. */
export function buildReportHtml(model: ReportExportModel, options: ReportHtmlOptions = {}): string {
  const dir = model.rtl ? 'rtl' : 'ltr';
  const generated = new Intl.DateTimeFormat(model.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(model.generatedAt);

  const companyBlock =
    model.includeCompanyHeader && model.company
      ? `<div class="company">${
          model.company.logoDataUrl
            ? `<img class="logo" src="${escapeHtml(model.company.logoDataUrl)}" alt="" />`
            : ''
        }<span>${escapeHtml(model.company.name ?? '')}</span></div>`
      : '';

  const metaBlock =
    `<div class="meta">` +
    (model.includeGeneratedDate
      ? `<div><span class="label">${escapeHtml('Generated')}</span>: ${escapeHtml(generated)}</div>`
      : '') +
    (model.generatedBy ? `<div><span class="label">By</span>: ${escapeHtml(model.generatedBy)}</div>` : '') +
    `</div>`;

  const filtersBlock =
    model.includeFilters && model.filtersSummary.length > 0
      ? `<div class="filters"><div class="filters-title">Filters</div><ul>${model.filtersSummary
          .map((filter) => `<li><span class="label">${escapeHtml(filter.label)}</span>: ${escapeHtml(filter.value)}</li>`)
          .join('')}</ul></div>`
      : '';

  const summariesBlock =
    model.includeSummaries && model.summaries.length > 0
      ? `<div class="summaries">${model.summaries
          .map(
            (summary) =>
              `<div class="summary-item"><span class="s-label">${escapeHtml(summary.label)}</span>` +
              `<span class="s-value">${escapeHtml(summary.value)}</span></div>`
          )
          .join('')}</div>`
      : '';

  const headerRow = `<tr>${model.columns
    .map(
      (column) =>
        `<th style="text-align:${alignToCss(column.alignment)}">${escapeHtml(column.header)}</th>`
    )
    .join('')}</tr>`;

  const watermark = model.watermark
    ? `<div class="watermark">${escapeHtml(model.watermark)}</div>`
    : '';

  const signature = model.signature
    ? `<div class="signature"><div class="sig-line"></div><div class="sig-label">Signature</div></div>`
    : '';

  const footer = model.footerText ? `<div class="footer-text">${escapeHtml(model.footerText)}</div>` : '';

  const pageNumberCss = options.pageNumbers
    ? '@page { @bottom-center { content: "Page " counter(page) " / " counter(pages); font-size: 9px; color: #64748b; } }'
    : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(model.locale)}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(model.title)}</title>
<style>
  @page { size: A4 ${model.orientation}; margin: 14mm 12mm; }
  ${pageNumberCss}
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-bottom: 12px; }
  .titles h1 { font-size: 18px; margin: 0 0 2px; }
  .titles p { margin: 0; color: #475569; }
  .company { display: flex; align-items: center; gap: 8px; font-weight: 600; }
  .company .logo { max-height: 44px; max-width: 160px; }
  .meta { text-align: end; color: #475569; font-size: 11px; }
  .meta .label, .filters .label { color: #94a3b8; }
  .filters { margin-bottom: 10px; font-size: 11px; }
  .filters-title { font-weight: 600; margin-bottom: 2px; }
  .filters ul { margin: 0; padding-inline-start: 16px; display: flex; flex-wrap: wrap; gap: 2px 18px; list-style: none; }
  .summaries { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .summary-item { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; min-width: 120px; }
  .summary-item .s-label { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  .summary-item .s-value { font-size: 14px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 7px; font-size: 11px; }
  th { background: #f1f5f9; font-weight: 700; }
  tbody tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .group-header td { background: #e0e7ff; font-weight: 700; }
  .group-footer td { background: #f1f5f9; font-style: italic; }
  .footer-text { margin-top: 14px; color: #64748b; font-size: 10px; text-align: center; }
  .signature { margin-top: 40px; width: 200px; }
  .signature .sig-line { border-top: 1px solid #334155; }
  .signature .sig-label { color: #64748b; font-size: 10px; margin-top: 4px; }
  .watermark { position: fixed; top: 45%; left: 0; right: 0; text-align: center; font-size: 90px; font-weight: 800; color: rgba(30, 64, 175, .07); transform: rotate(-24deg); z-index: 0; pointer-events: none; }
  @media print { .watermark { position: fixed; } }
</style>
</head>
<body>
  ${watermark}
  <div class="report-header">
    <div class="titles">
      <h1>${escapeHtml(model.title)}</h1>
      ${model.description ? `<p>${escapeHtml(model.description)}</p>` : ''}
    </div>
    <div>${companyBlock}${metaBlock}</div>
  </div>
  ${filtersBlock}
  ${summariesBlock}
  <table>
    <thead>${headerRow}</thead>
    <tbody>${renderRows(model)}</tbody>
  </table>
  ${signature}
  ${footer}
</body>
</html>`;
}
