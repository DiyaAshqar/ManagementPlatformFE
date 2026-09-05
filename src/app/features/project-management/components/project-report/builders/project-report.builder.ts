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

interface TableColumn {
  text: string;
  align?: 'start' | 'center' | 'end';
}

/** Renders a semantic `<table>` with a repeating `<thead>` — browsers natively repeat `<thead>` rows across printed pages. */
function table(columns: TableColumn[], rows: string[][], emptyLabel: string): string {
  if (rows.length === 0) {
    return `<p class="empty-state">${esc(emptyLabel)}</p>`;
  }
  const head = `<thead><tr>${columns
    .map((c) => `<th style="text-align:${c.align ?? 'start'}">${esc(c.text)}</th>`)
    .join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((value, i) => `<td style="text-align:${columns[i]?.align ?? 'start'}">${value}</td>`).join('')}</tr>`
    )
    .join('')}</tbody>`;
  return `<table>${head}${body}</table>`;
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

// ── Section builders ─────────────────────────────────────────────────────────

function buildCover(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const { cover } = snapshot;
  const confidentialBadge = config.confidential
    ? `<div class="confidential-badge">${esc(t('projectReport.cover.confidential'))}</div>`
    : '';
  const logo =
    config.includeCompanyHeader && config.companyLogoDataUrl
      ? `<img class="cover-logo" src="${esc(config.companyLogoDataUrl)}" alt="" />`
      : '';
  const companyName = config.includeCompanyHeader ? `<div class="cover-company">${esc(t('projectReport.cover.companyName'))}</div>` : '';

  const rows: Array<[string, string]> = [
    [t('projectReport.cover.projectNumber'), cell(cover.projectNumber)],
    [t('projectReport.cover.client'), cell(cover.clientName)],
    [t('projectReport.cover.location'), cell(cover.location)],
    [t('projectReport.cover.asOf'), date(cover.asOfDate, config.language)],
    [t('projectReport.cover.generatedAt'), date(snapshot.meta.generatedAt, config.language)],
    [t('projectReport.cover.generatedBy'), cell(snapshot.meta.generatedByName)],
  ];

  return `<div class="cover-page">
    <div class="cover-header">${logo}${companyName}</div>
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

  const milestonesRows = s.keyMilestones.map((m) => [String(m.order), cell(m.name), cell(m.statusLabel)]);
  const milestonesTable = table(
    [
      { text: t('projectReport.summary.milestoneOrder'), align: 'center' },
      { text: t('projectReport.summary.milestoneName') },
      { text: t('projectReport.summary.milestoneStatus') },
    ],
    milestonesRows,
    t('projectReport.common.noData')
  );

  const risks =
    s.risks.length > 0
      ? `<ul class="notes-list">${s.risks.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
      : `<p class="empty-state">${esc(t('projectReport.summary.noRisks'))}</p>`;

  return section(
    'executive-summary',
    t('projectReport.sections.executiveSummary'),
    `<div class="kpi-grid">${cards}</div>
     <h3>${esc(t('projectReport.summary.keyMilestones'))}</h3>
     ${milestonesTable}
     <h3>${esc(t('projectReport.summary.risksAndNotes'))}</h3>
     ${risks}`
  );
}

function buildAgreement(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const a = snapshot.agreement;
  if (!a.available) {
    return section('agreement', t('projectReport.sections.agreement'), `<p class="empty-state">${esc(t('projectReport.missingData.noAgreement'))}</p>`);
  }

  const facts: Array<[string, string]> = [
    [t('projectReport.agreement.number'), cell(a.agreementNumber)],
    [t('projectReport.agreement.date'), date(a.agreementDate, config.language)],
    [t('projectReport.agreement.type'), cell(a.agreementType)],
    [t('projectReport.agreement.projectName'), cell(a.projectName)],
    [t('projectReport.agreement.businessSector'), cell(a.businessSector)],
    [t('projectReport.agreement.estimatedStart'), date(a.estimatedStartDate, config.language)],
    [t('projectReport.agreement.estimatedEnd'), date(a.estimatedEndDate, config.language)],
    [t('projectReport.agreement.country'), cell(a.country)],
    [t('projectReport.agreement.city'), cell(a.city)],
    [t('projectReport.agreement.basin'), a.basinName || a.basinNumber ? `${cell(a.basinName)} ${cell(a.basinNumber)}` : DASH],
    [t('projectReport.agreement.village'), cell(a.village)],
    [t('projectReport.agreement.directorate'), cell(a.directorate)],
    [t('projectReport.agreement.plotNumber'), cell(a.plotNumber)],
    [t('projectReport.agreement.floorNumber'), cell(a.floorNumber)],
    [t('projectReport.agreement.projectArea'), num(a.projectArea)],
    [t('projectReport.agreement.drillingQuantity'), num(a.drillingQuantity)],
  ];

  const paymentFacts = a.paymentDetailsAuthorized
    ? [
        [t('projectReport.agreement.contractType'), cell(a.contractType)],
        [t('projectReport.agreement.contractModel'), cell(a.contractModel)],
        [t('projectReport.agreement.contractValue'), num(a.contractValue)],
      ]
    : [[t('projectReport.agreement.contractValue'), t('projectReport.common.restricted')]];

  const factsTable = `<table class="facts-table">${[...facts, ...paymentFacts]
    .map(([label, value]) => `<tr><th style="text-align:start">${esc(label)}</th><td>${value}</td></tr>`)
    .join('')}</table>`;

  const description = a.description
    ? `<p class="description">${esc(a.description)}</p>`
    : '';

  const services =
    a.selectedServices.length > 0
      ? `<div class="chip-list">${a.selectedServices.map((sName) => `<span class="chip">${esc(sName)}</span>`).join('')}</div>`
      : `<p class="empty-state">${esc(t('projectReport.common.noData'))}</p>`;

  const client = a.client;
  const clientTable = `<table class="facts-table">
    <tr><th style="text-align:start">${esc(t('projectReport.agreement.contactPerson'))}</th><td>${cell(client.contactPerson)}${client.contactPersonPhone ? ` — ${cell(client.contactPersonPhone)}` : ''}</td></tr>
    <tr><th style="text-align:start">${esc(t('projectReport.agreement.representative'))}</th><td>${cell(client.representerName)}${client.representerPhone ? ` — ${cell(client.representerPhone)}` : ''}</td></tr>
  </table>`;

  return section(
    'agreement',
    t('projectReport.sections.agreement'),
    `${description}
     ${factsTable}
     <h3>${esc(t('projectReport.agreement.client'))}</h3>
     ${clientTable}
     <h3>${esc(t('projectReport.agreement.services'))}</h3>
     ${services}`
  );
}

function buildScope(snapshot: ProjectReportSnapshot, t: Translate): string {
  const { scope } = snapshot;
  const areaRows = scope.areas.map((a) => [cell(a.annexName), num(a.amount), cell(a.unitName)]);
  const areasTable = table(
    [
      { text: t('projectReport.scope.annex') },
      { text: t('projectReport.scope.amount'), align: 'end' },
      { text: t('projectReport.scope.unit') },
    ],
    areaRows,
    t('projectReport.common.noData')
  );

  return section(
    'scope',
    t('projectReport.sections.scope'),
    `<h3>${esc(t('projectReport.scope.areas'))}</h3>
     ${areasTable}`
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

function buildSiteActivities(snapshot: ProjectReportSnapshot, config: ProjectReportConfig, t: Translate): string {
  const s = snapshot.siteActivities;
  const taskRows = s.tasks.map((task) => [
    cell(task.title),
    cell(task.statusLabel),
    cell(task.typeLabel),
    cell(task.responsibility),
    date(task.startDate, config.language),
    date(task.endDate, config.language),
    String(task.subtaskCount),
  ]);
  const tasksTable = table(
    [
      { text: t('projectReport.siteActivities.task') },
      { text: t('projectReport.siteActivities.status') },
      { text: t('projectReport.siteActivities.type') },
      { text: t('projectReport.siteActivities.responsibility') },
      { text: t('projectReport.siteActivities.startDate') },
      { text: t('projectReport.siteActivities.endDate') },
      { text: t('projectReport.siteActivities.subtasks'), align: 'center' },
    ],
    taskRows,
    t('projectReport.common.noData')
  );

  return section(
    'site-activities',
    t('projectReport.sections.siteActivities'),
    `<h3>${esc(t('projectReport.siteActivities.tasks'))}</h3>
     ${tasksTable}`
  );
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

    .cover-page { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24mm 0; page-break-after: always; }
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

  const builders: Partial<Record<ProjectReportSectionKey, () => string>> = {
    cover: () => buildCover(snapshot, config, t),
    executiveSummary: () => buildExecutiveSummary(snapshot, config, t),
    agreement: () => buildAgreement(snapshot, config, t),
    scope: () => buildScope(snapshot, t),
    // financial: () => (config.includeFinancial ? buildFinancial(snapshot, t) : ''), // disabled: commented out, not removed — re-enable when ready
    siteActivities: () => buildSiteActivities(snapshot, config, t),
    documents: () => (config.includePhotos ? buildDocuments(snapshot, config, t) : ''),
    signatures: () => buildSignatures(snapshot, config, t),
  };

  const orderedKeys: ProjectReportSectionKey[] = [
    'cover',
    'executiveSummary',
    'agreement',
    'scope',
    'financial',
    'siteActivities',
    'documents',
    'signatures',
  ];

  const body = orderedKeys
    .filter((key) => sections.has(key))
    .map((key) => builders[key]?.() ?? '')
    .join('\n');

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
