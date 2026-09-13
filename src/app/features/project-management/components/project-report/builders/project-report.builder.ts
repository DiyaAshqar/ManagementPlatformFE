import { escapeHtml } from '../../../../reporting/utilities/report-html.utils';
import { ProjectReportConfig, ProjectReportSectionKey, ProjectReportSnapshot } from '../models/project-report.model';
import { formatReportDate, formatReportNumber, formatReportPercent } from '../utilities/project-report-calculations.util';

export type Translate = (key: string, params?: Record<string, unknown>) => string;

const DASH = '—';

function esc(value: string | null | undefined): string {
  return value ? escapeHtml(value) : '';
}

function cell(value: string | null | undefined): string {
  return value ? escapeHtml(value) : DASH;
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? DASH : formatReportNumber(value);
}

function date(value: Date | null | undefined, language: ProjectReportConfig['language']): string {
  return value ? formatReportDate(value, language) : DASH;
}

function section(id: string, title: string, body: string): string {
  return `<section class="report-section" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
}

function restrictedNotice(t: Translate): string {
  return `<p class="restricted">${esc(t('projectReport.common.restricted'))}</p>`;
}

function kpiCard(label: string, value: string): string {
  return `<div class="kpi-card"><span class="kpi-label">${esc(label)}</span><span class="kpi-value">${value}</span></div>`;
}

function factsTable(rows: Array<[string, string]>): string {
  return `<table class="facts-table">${rows
    .map(([label, value]) => `<tr><th style="text-align:start">${esc(label)}</th><td>${value}</td></tr>`)
    .join('')}</table>`;
}

// ── Section builders ─────────────────────────────────────────────────────────

/** The company logo/name masthead — rendered ahead of the Executive Summary, before the rest of the cover page. */
function buildCoverHeader(config: ProjectReportConfig, t: Translate): string {
  const logo =
    config.includeCompanyHeader && config.companyLogoDataUrl
      ? `<img class="cover-logo" src="${esc(config.companyLogoDataUrl)}" alt="" />`
      : '';
  const companyName = config.includeCompanyHeader ? `<div class="cover-company">${esc(t('projectReport.cover.companyName'))}</div>` : '';

  return `<div class="cover-header-page"><div class="cover-header">${logo}${companyName}</div></div>`;
}

/** The rest of the cover page (title, project name, report type, meta table) — rendered after the Executive Summary. */
function buildCoverBody(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const { cover } = snapshot;
  const confidentialBadge = config.confidential
    ? `<div class="confidential-badge">${esc(t('projectReport.cover.confidential'))}</div>`
    : '';

  const rows: Array<[string, string]> = [
    [t('projectReport.cover.projectNumber'), cell(cover.projectNumber)],
    [t('projectReport.cover.client'), cell(cover.clientName)],
    [t('projectReport.cover.location'), cell(cover.location)],
    [t('projectReport.cover.asOf'), date(cover.asOfDate, config.language)],
    [t('projectReport.cover.generatedAt'), date(snapshot.meta.generatedAt, config.language)],
    [t('projectReport.cover.generatedBy'), cell(snapshot.meta.generatedByName)],
  ];

  return `<div class="cover-page">
    ${confidentialBadge}
    <h1 class="cover-title">${esc(t('projectReport.cover.title'))}</h1>
    <h2 class="cover-project-name">${esc(cover.projectName)}</h2>
    <div class="cover-report-type">${esc(t(`projectReport.reportTypes.${config.type}`))}</div>
    <table class="cover-meta">
      ${rows.map(([label, value]) => `<tr><th style="text-align:start">${esc(label)}</th><td>${value}</td></tr>`).join('')}
    </table>
  </div>`;
}

function buildExecutiveSummary(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const s = snapshot.executiveSummary;
  const cards = [
    kpiCard(t('projectReport.summary.status'), esc(s.statusLabel)),
    kpiCard(t('projectReport.summary.progress'), formatReportPercent(s.progressPercent)),
    kpiCard(t('projectReport.summary.startDate'), date(s.startDate, config.language)),
    kpiCard(t('projectReport.summary.endDate'), date(s.endDate, config.language)),
    kpiCard(t('projectReport.summary.daysElapsed'), s.daysElapsed === null ? DASH : String(s.daysElapsed)),
    kpiCard(t('projectReport.summary.daysRemaining'), s.daysRemaining === null ? DASH : String(s.daysRemaining)),
    kpiCard(t('projectReport.summary.budget'), num(s.budget)),
    kpiCard(t('projectReport.summary.contractValue'), num(s.contractValue)),
    kpiCard(t('projectReport.summary.actualExpenditure'), num(s.actualExpenditure)),
    kpiCard(t('projectReport.summary.committedAmount'), num(s.committedAmount)),
    kpiCard(t('projectReport.summary.milestonesTotal'), String(s.milestonesTotal)),
    kpiCard(t('projectReport.summary.milestonesCompleted'), s.milestonesCompleted === null ? DASH : String(s.milestonesCompleted)),
  ].join('');

  return section(
    'executive-summary',
    t('projectReport.sections.executiveSummary'),
    `<div class="kpi-grid">${cards}</div>`
  );
}

/** Renders the agreement's own facts (steps 1-2 of the wizard) plus the scope areas/milestones (steps 3-4). */
function buildAgreement(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const a = snapshot.agreement;
  const { areas, milestones } = snapshot.scope;

  const facts = factsTable([
    [t('projectReport.agreement.projectNumber'), cell(a.projectNumber)],
    [t('projectReport.agreement.projectName'), cell(a.projectName)],
    [t('projectReport.agreement.agreementDate'), date(a.agreementDate, config.language)],
    [t('projectReport.agreement.agreementType'), cell(a.agreementTypeLabel)],
    [t('projectReport.agreement.businessSector'), cell(a.businessSector)],
    [t('projectReport.agreement.estimatedStartDate'), date(a.estimatedStartDate, config.language)],
    [t('projectReport.agreement.estimatedEndDate'), date(a.estimatedEndDate, config.language)],
    [t('projectReport.agreement.country'), cell(a.country)],
    [t('projectReport.agreement.city'), cell(a.city)],
    [t('projectReport.agreement.projectArea'), num(a.projectArea)],
    [t('projectReport.agreement.drillingQuantity'), num(a.drillingQuantity)],
    [t('projectReport.agreement.description'), cell(a.description)],
  ]);

  const infoGrid = `<div class="ledger-grid">
    <div class="ledger-block">
      <h3>${esc(t('projectReport.agreement.client.title'))}</h3>
      ${factsTable([
        [t('projectReport.agreement.client.contactPerson'), cell(a.client.contactPerson)],
        [t('projectReport.agreement.client.contactPersonPhone'), cell(a.client.contactPersonPhone)],
        [t('projectReport.agreement.client.representerName'), cell(a.client.representerName)],
        [t('projectReport.agreement.client.representerPhone'), cell(a.client.representerPhone)],
      ])}
    </div>
    <div class="ledger-block">
      <h3>${esc(t('projectReport.agreement.land.title'))}</h3>
      ${factsTable([
        [t('projectReport.agreement.land.plotNumber'), a.land.plotNumber === null ? DASH : String(a.land.plotNumber)],
        [t('projectReport.agreement.land.directorate'), cell(a.land.directorate)],
        [t('projectReport.agreement.land.village'), cell(a.land.village)],
        [t('projectReport.agreement.land.basinName'), cell(a.land.basinName)],
        [t('projectReport.agreement.land.basinNumber'), a.land.basinNumber === null ? DASH : String(a.land.basinNumber)],
        [t('projectReport.agreement.land.floorNumber'), a.land.floorNumber === null ? DASH : String(a.land.floorNumber)],
      ])}
    </div>
    <div class="ledger-block">
      <h3>${esc(t('projectReport.agreement.contract.title'))}</h3>
      ${factsTable([
        [t('projectReport.agreement.contract.contractType'), cell(a.contract.contractTypeLabel)],
        [t('projectReport.agreement.contract.contractModel'), cell(a.contract.contractModelLabel)],
        [t('projectReport.agreement.contract.monthlyFees'), num(a.contract.monthlyFees)],
        ...(config.includePercentageFees
          ? ([
              [
                t('projectReport.agreement.contract.percentageFees'),
                a.contract.percentageFees === null ? DASH : `${formatReportNumber(a.contract.percentageFees)}%`,
              ],
            ] as Array<[string, string]>)
          : []),
      ])}
    </div>
  </div>`;

  const servicesBlock =
    a.services.length > 0
      ? `<h3>${esc(t('projectReport.agreement.services'))}</h3><div class="chip-list">${a.services
          .map((s) => `<span class="chip">${esc(s)}</span>`)
          .join('')}</div>`
      : '';

  const areasBlock =
    areas.length > 0
      ? `<h3>${esc(t('projectReport.agreement.areas'))}</h3><table>
        <thead><tr>
          <th>${esc(t('projectReport.agreement.areaColumns.annex'))}</th>
          <th>${esc(t('projectReport.agreement.areaColumns.amount'))}</th>
          <th>${esc(t('projectReport.agreement.areaColumns.unit'))}</th>
        </tr></thead>
        <tbody>${areas
          .map((row) => `<tr><td>${esc(row.annexName)}</td><td>${num(row.amount)}</td><td>${cell(row.unitName)}</td></tr>`)
          .join('')}</tbody>
      </table>`
      : `<h3>${esc(t('projectReport.agreement.areas'))}</h3><p class="empty-state">${esc(t('projectReport.agreement.noAreas'))}</p>`;

  const milestonesBlock =
    milestones.length > 0
      ? `<h3>${esc(t('projectReport.agreement.milestones'))}</h3><table>
        <thead><tr>
          <th>${esc(t('projectReport.agreement.milestoneColumns.order'))}</th>
          <th>${esc(t('projectReport.agreement.milestoneColumns.name'))}</th>
          <th>${esc(t('projectReport.agreement.milestoneColumns.description'))}</th>
        </tr></thead>
        <tbody>${milestones
          .slice()
          .sort((x, y) => x.order - y.order)
          .map((row) => `<tr><td>${row.order}</td><td>${esc(row.name)}</td><td>${cell(row.description)}</td></tr>`)
          .join('')}</tbody>
      </table>`
      : `<h3>${esc(t('projectReport.agreement.milestones'))}</h3><p class="empty-state">${esc(t('projectReport.agreement.noMilestones'))}</p>`;

  return section(
    'agreement',
    t('projectReport.sections.agreement'),
    `${facts}${infoGrid}${servicesBlock}${areasBlock}${milestonesBlock}`
  );
}

function buildFinancial(snapshot: ProjectReportSnapshot, t: Translate): string {
  const f = snapshot.financial;
  if (!f.authorized) {
    return section('financial', t('projectReport.sections.financial'), restrictedNotice(t));
  }

  const currencySuffix = f.currencyLabel ? ` ${esc(f.currencyLabel)}` : '';
  const ledger = (label: string, value: string) =>
    `<div class="ledger-row"><span>${esc(label)}</span><span class="ledger-value">${value}${currencySuffix}</span></div>`;

  const ledgers = `<div class="ledger-grid">
    <div class="ledger-block">
      <h3>${esc(t('projectReport.financial.contractAndBudget'))}</h3>
      ${ledger(t('projectReport.financial.contractValue'), num(f.contractValue))}
      ${ledger(t('projectReport.financial.budget'), num(f.budget))}
    </div>
    <div class="ledger-block">
      <h3>${esc(t('projectReport.financial.procurementAndWork'))}</h3>
      ${ledger(t('projectReport.financial.boqTotal'), num(f.boqTotal))}
      ${ledger(t('projectReport.financial.contractorCommitments'), num(f.contractorCommitments))}
      ${ledger(t('projectReport.financial.contractorPaid'), num(f.contractorPaid))}
      ${ledger(t('projectReport.financial.contractorRemaining'), num(f.contractorRemaining))}
      ${ledger(t('projectReport.financial.purchaseOrdersTotal'), num(f.purchaseOrdersTotal))}
    </div>
    <div class="ledger-block">
      <h3>${esc(t('projectReport.financial.cashAndAdvances'))}</h3>
      ${ledger(t('projectReport.financial.expensesTotal'), num(f.expensesTotal))}
      ${ledger(t('projectReport.financial.advancesTotal'), num(f.advancesTotal))}
      ${ledger(t('projectReport.financial.advancesRemaining'), num(f.advancesRemaining))}
      ${ledger(t('projectReport.financial.ownerPaymentsTotal'), num(f.ownerPaymentsTotal))}
    </div>
    <div class="ledger-block">
      <h3>${esc(t('projectReport.financial.variationOrders'))}</h3>
      ${ledger(t('projectReport.financial.voApproved'), num(f.variationOrdersApprovedTotal))}
      ${ledger(t('projectReport.financial.voPending'), num(f.variationOrdersPendingTotal))}
      ${ledger(t('projectReport.financial.voRejected'), num(f.variationOrdersRejectedTotal))}
    </div>
  </div>`;

  const claimBlock = f.paymentClaimAuthorized
    ? `<div class="ledger-block claim-block">
        <h3>${esc(t('projectReport.financial.paymentClaimEstimate'))}</h3>
        ${ledger(t('projectReport.financial.paymentClaimEstimateTotal'), num(f.paymentClaimEstimateTotal))}
        <p class="note">${esc(t('projectReport.financial.paymentClaimEstimateNote'))}</p>
      </div>`
    : '';

  const notes =
    f.notes.length > 0
      ? `<ul class="notes-list">${f.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
      : '';

  return section('financial', t('projectReport.sections.financial'), `${ledgers}${claimBlock}${notes}`);
}

function buildDocuments(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const d = snapshot.documents;
  const showPhotos = config.includePhotos;

  const photosBlock = showPhotos
    ? d.photos.length > 0
      ? `<div class="photo-grid">${d.photos
          .map(
            (p) =>
              `<figure class="photo-card"><img src="${esc(p.dataUrl ?? '')}" alt="${esc(p.fileName)}" /><figcaption>${esc(p.fileName)}${
                p.relatedTo ? ` — ${esc(p.relatedTo)}` : ''
              }</figcaption></figure>`
          )
          .join('')}</div>${
          d.photosOmittedCount > 0
            ? `<p class="note">${esc(t('projectReport.documents.morePhotosOmitted', { count: d.photosOmittedCount }))}</p>`
            : ''
        }`
      : `<p class="empty-state">${esc(t('projectReport.documents.noPhotos'))}</p>`
    : '';

  return section(
    'documents',
    t('projectReport.sections.documents'),
    `${showPhotos ? `<h3>${esc(t('projectReport.documents.photos'))}</h3>${photosBlock}` : ''}`
  );
}

function buildSignatures(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const sig = snapshot.signatures;
  const block = (label: string) => `<div class="signature-block"><div class="signature-line"></div><span class="signature-label">${esc(label)}</span><span class="signature-date">${esc(t('projectReport.signatures.date'))}</span></div>`;
  return section(
    'signatures',
    t('projectReport.sections.signatures'),
    `<div class="signature-row">
      ${block(sig.preparedByLabel)}
      ${block(sig.reviewedByLabel)}
      ${config.includeSignatures ? block(sig.approvedByLabel) : ''}
    </div>`
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function buildStyles(): string {
  return `
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif; color: #1e293b; margin: 0; font-size: 11px; line-height: 1.5; }
    h1, h2, h3 { color: #0f2f5f; margin: 0 0 8px; }
    h2 { font-size: 15px; border-bottom: 2px solid #1d4ed8; padding-bottom: 4px; margin-top: 0; }
    h3 { font-size: 12px; margin-top: 14px; }
    p { margin: 4px 0; }
    .report-section { page-break-before: always; padding-top: 4px; }
    .report-section:first-of-type { page-break-before: auto; }
    .empty-state { color: #94a3b8; font-style: italic; }
    .restricted { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; }
    .note { color: #64748b; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #e2e8f0; padding: 5px 7px; font-size: 10px; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    tbody tr { page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .facts-table td { font-weight: 600; }
    .facts-table th { width: 32%; background: #fff; border: none; color: #64748b; font-weight: 500; }
    .facts-table td { border: none; border-bottom: 1px solid #f1f5f9; }

    .cover-page { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12mm 0 24mm; page-break-after: always; }
    .cover-header-page { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24mm 0 0; }
    .cover-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .cover-logo { max-height: 56px; max-width: 200px; }
    .cover-company { font-size: 14px; font-weight: 700; color: #0f2f5f; }
    .confidential-badge { background: #fee2e2; color: #991b1b; border-radius: 20px; padding: 3px 14px; font-size: 10px; font-weight: 700; letter-spacing: .05em; margin-bottom: 14px; }
    .cover-title { font-size: 22px; margin-bottom: 4px; }
    .cover-project-name { font-size: 16px; color: #1d4ed8; margin-bottom: 6px; }
    .cover-report-type { color: #64748b; margin-bottom: 26px; font-size: 12px; }
    .cover-meta { width: 70%; margin-top: 10px; }
    .cover-meta th { text-align: start; color: #64748b; font-weight: 500; border: none; width: 40%; }
    .cover-meta td { border: none; border-bottom: 1px solid #f1f5f9; font-weight: 600; }

    .kpi-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 4px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; min-width: 130px; background: #f8fafc; page-break-inside: avoid; }
    .kpi-label { display: block; font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
    .kpi-value { font-size: 14px; font-weight: 700; color: #0f2f5f; }

    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: #eff6ff; color: #1d4ed8; border-radius: 12px; padding: 3px 10px; font-size: 10px; }

    .ledger-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .ledger-block { flex: 1 1 220px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; page-break-inside: avoid; }
    .ledger-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #f1f5f9; }
    .ledger-value { font-weight: 700; }
    .claim-block { border-color: #1d4ed8; background: #eff6ff; }

    .notes-list { margin: 4px 0; padding-inline-start: 18px; }

    .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .photo-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; margin: 0; page-break-inside: avoid; }
    .photo-card img { width: 100%; height: 34mm; object-fit: cover; border-radius: 4px; display: block; }
    .photo-card figcaption { font-size: 9px; color: #64748b; margin-top: 3px; text-align: center; }

    .signature-row { display: flex; justify-content: space-between; gap: 20px; margin-top: 40px; }
    .signature-block { flex: 1; text-align: center; }
    .signature-line { border-top: 1px solid #334155; margin-bottom: 4px; }
    .signature-label { display: block; font-weight: 600; }
    .signature-date { display: block; font-size: 9px; color: #94a3b8; margin-top: 12px; }

    .report-footer { text-align: center; color: #94a3b8; font-size: 9px; padding-top: 8px; border-top: 1px solid #e2e8f0; margin-top: 10px; }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  `;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildProjectReportHtml(
  snapshot: ProjectReportSnapshot,
  config: ProjectReportConfig,
  sections: Set<ProjectReportSectionKey>,
  t: Translate
): string {
  const dir = config.language === 'ar' ? 'rtl' : 'ltr';

  const parts: string[] = [];
  if (sections.has('cover')) {
    parts.push(buildCoverHeader(config, t));
    parts.push(buildCoverBody(snapshot, config, t));
  }
  if (sections.has('executiveSummary')) {
    parts.push(buildExecutiveSummary(snapshot, config, t));
  }
  if (sections.has('agreement')) {
    parts.push(buildAgreement(snapshot, config, t));
  }
  // financial: (config.includeFinancial ? buildFinancial(snapshot, t) : '') — disabled: commented out, not removed — re-enable when ready
  if (sections.has('documents') && config.includePhotos) {
    parts.push(buildDocuments(snapshot, config, t));
  }
  if (sections.has('signatures')) {
    parts.push(buildSignatures(snapshot, config, t));
  }

  const body = parts.join('\n');

  const footer = `<div class="report-footer">${esc(
    t('projectReport.footer.generated', {
      date: formatReportDate(snapshot.meta.generatedAt, config.language),
      user: snapshot.meta.generatedByName,
    })
  )}</div>`;

  return `<!DOCTYPE html>
<html lang="${esc(config.language)}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${esc(t('projectReport.cover.title'))} — ${esc(snapshot.cover.projectName)}</title>
<style>${buildStyles()}</style>
</head>
<body>
${body}
${footer}
</body>
</html>`;
}
