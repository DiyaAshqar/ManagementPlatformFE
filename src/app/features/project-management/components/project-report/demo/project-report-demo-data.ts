import { computeRemainingBalance, sumBy } from '../utilities/project-report-calculations.util';
import { ProjectReportSnapshot } from '../models/project-report.model';

/**
 * Name of the one Milestone Stage in this demo populated from real backend
 * responses (project stage #48, "تحضيرات") rather than fabricated figures —
 * every BOQ/contractor/PO/surveying-visit row below tagged with this name is
 * copied verbatim (quantities, prices, names) from those responses, joined
 * against the accompanying Constructors/Units/Suppliers lookups. The
 * Expenses/Advances/Variation-Orders ledger totals in the `financial`
 * section are likewise the real sums for this stage, not placeholders.
 */
export const REAL_STAGE_NAME = 'تحضيرات';

/**
 * Small inline SVG placeholders standing in for real jobsite photos in the
 * demo — no binary assets to ship, and the label makes it obvious in the
 * preview that these are illustrative, not real attachments.
 */
function placeholderPhoto(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320">
    <rect width="480" height="320" fill="${bg}" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * A fully-populated, illustrative snapshot used only by the demo page — never
 * fetched from a real project. Exercises every section, including the
 * "unavailable vs. zero" and missing-data-transparency conventions the real
 * mapper follows, so the demo is representative of actual output.
 */
export function buildDemoSnapshot(): ProjectReportSnapshot {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 4, 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 15);

  const contractorRows = [
    {
      name: 'Al-Basha’ir Contracting Co.',
      classification: 'Main Contractor',
      contractorType: 'General Contractor',
      stageName: 'Foundation & Substructure',
      contractValue: 62000,
      startDate: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 5),
      endDate: new Date(startDate.getFullYear(), startDate.getMonth() + 3, 20),
      totalPaid: 48500,
      remainingBalance: 13500,
      duties: [
        { dutyType: 'Excavation', responsibility: 'Contractor', unit: 'm³', quantity: 640, price: 8.5, subTotal: 5440 },
        { dutyType: 'Formwork & Concrete', responsibility: 'Contractor', unit: 'm³', quantity: 210, price: 145, subTotal: 30450 },
      ],
      payments: [
        { date: new Date(startDate.getFullYear(), startDate.getMonth() + 1, 20), amount: 20000, method: null, reference: 'RCP-1042' },
        { date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, 18), amount: 28500, method: null, reference: 'RCP-1077' },
      ],
    },
    {
      name: 'Al-Noor Electromechanical',
      classification: 'Subcontractor',
      contractorType: 'MEP',
      stageName: 'Superstructure — Ground Floor',
      contractValue: 24500,
      startDate: new Date(startDate.getFullYear(), startDate.getMonth() + 2, 1),
      endDate: null,
      totalPaid: 9000,
      remainingBalance: 15500,
      duties: [{ dutyType: 'Electrical Rough-in', responsibility: 'Contractor', unit: 'point', quantity: 145, price: 22, subTotal: 3190 }],
      payments: [{ date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, 15), amount: 9000, method: null, reference: 'RCP-1088' }],
    },
    // Real ProjectMainContractors rows for project stage #48 (شركة محمد ثلجي وشركاؤه × 2, جهاد الشويكي × 1).
    {
      name: 'شركة محمد ثلجي وشركاؤه',
      classification: null,
      contractorType: 'مقاول عظم',
      stageName: REAL_STAGE_NAME,
      contractValue: 8000,
      startDate: new Date(2026, 4, 4),
      endDate: new Date(2026, 4, 9),
      totalPaid: 8500,
      remainingBalance: computeRemainingBalance(8000, 8500),
      duties: [],
      payments: [
        { date: new Date(2026, 4, 9), amount: 8000, method: null, reference: '541' },
        { date: new Date(2026, 6, 7), amount: 500, method: null, reference: '898HJU' },
      ],
    },
    {
      name: 'جهاد الشويكي.',
      classification: null,
      contractorType: 'مقاول كهرباء',
      stageName: REAL_STAGE_NAME,
      contractValue: 3,
      startDate: new Date(2026, 5, 24),
      endDate: new Date(2026, 5, 23),
      totalPaid: 0,
      remainingBalance: computeRemainingBalance(3, 0),
      duties: [{ dutyType: null, responsibility: null, unit: null, quantity: 795, price: 461, subTotal: 366495 }],
      payments: [],
    },
    {
      name: 'شركة محمد ثلجي وشركاؤه',
      classification: null,
      contractorType: 'مقاول عظم',
      stageName: REAL_STAGE_NAME,
      contractValue: 7878,
      startDate: new Date(2026, 6, 8),
      endDate: new Date(2026, 6, 21),
      totalPaid: 0,
      remainingBalance: computeRemainingBalance(7878, 0),
      duties: [],
      payments: [],
    },
  ];

  const boqRows = [
    {
      material: 'Reinforcement Steel', unit: 'ton', expectedQuantity: 24, actualQuantity: 22.4,
      expectedPrice: 720, actualPrice: 735, subTotal: 16464, supplierName: 'Jordan Steel Trading',
      constructorName: 'Al-Basha’ir Contracting Co.', stageName: 'Foundation & Substructure',
    },
    {
      material: 'Block Work — 20cm', unit: 'm²', expectedQuantity: 480, actualQuantity: 260,
      expectedPrice: 9.5, actualPrice: 9.5, subTotal: 2470, supplierName: null,
      constructorName: 'Al-Basha’ir Contracting Co.', stageName: 'Superstructure — Ground Floor',
    },
    // Real ProjectBOQs rows for project stage #48 (materialId 1/92/93, constructorId 10).
    {
      material: 'باطون تجهيزات غرف العمال والمستودعات', unit: 'm³', expectedQuantity: null, actualQuantity: 3,
      expectedPrice: 45, actualPrice: 46, subTotal: 138, supplierName: null,
      constructorName: 'شركة محمد ثلجي وشركاؤه', stageName: REAL_STAGE_NAME,
    },
    {
      material: 'بناء طوب غرف العمال والحارس والمستودع', unit: 'piece', expectedQuantity: null, actualQuantity: 3000,
      expectedPrice: 0, actualPrice: 0.26, subTotal: 780, supplierName: null,
      constructorName: 'شركة محمد ثلجي وشركاؤه', stageName: REAL_STAGE_NAME,
    },
    {
      material: 'توريد وتجهيزات الموقع بالكرفان وطابعة خاصة وتمديداته الكهروميكانيكية بقيمة 1600 دينار', unit: 'piece', expectedQuantity: null, actualQuantity: 1,
      expectedPrice: 0, actualPrice: 0, subTotal: 0, supplierName: null,
      constructorName: 'شركة محمد ثلجي وشركاؤه', stageName: REAL_STAGE_NAME,
    },
    // Real ProjectBOQs rows for project stage #48 (materialId 1, constructorId 2).
    {
      material: 'Concrete', unit: 'm²', expectedQuantity: null, actualQuantity: 2,
      expectedPrice: 45, actualPrice: 2, subTotal: 4, supplierName: null,
      constructorName: 'Darwish Company', stageName: REAL_STAGE_NAME,
    },
    {
      material: 'Concrete', unit: 'm²', expectedQuantity: null, actualQuantity: 3,
      expectedPrice: 45, actualPrice: 3, subTotal: 9, supplierName: null,
      constructorName: 'Darwish Company', stageName: REAL_STAGE_NAME,
    },
    {
      material: 'Concrete', unit: 'm³', expectedQuantity: null, actualQuantity: 22,
      expectedPrice: 45, actualPrice: 4, subTotal: 88, supplierName: null,
      constructorName: 'Darwish Company', stageName: REAL_STAGE_NAME,
    },
  ];

  const poRows = [
    { poNumber: 'PO-2026-031', supplierName: 'Al-Ameed Ready-Mix', description: 'Ground-floor slab pour', unit: 'm³', price: 62, subTotal: 6820, statusLabel: 'Approved', stageName: 'Superstructure — Ground Floor' },
    { poNumber: 'PO-2026-034', supplierName: 'Jordan Steel Trading', description: 'First-floor reinforcement batch', unit: 'ton', price: 735, subTotal: 8820, statusLabel: 'Pending', stageName: 'Superstructure — First Floor' },
  ];

  return {
    meta: {
      generatedAt: today,
      generatedByName: 'Demo User',
      failedSections: [],
      warnings: [],
    },
    cover: {
      projectName: 'Sunrise Villas — Building B',
      projectNumber: 'PRJ-2026-014',
      clientName: 'Nadia Al-Khatib',
      location: 'Marj Al-Hamam, Amman, Jordan',
      reportingPeriodLabel: '',
      asOfDate: today,
    },
    executiveSummary: {
      statusLabel: 'In Progress',
      progressPercent: 62.5,
      startDate,
      endDate,
      daysElapsed: 122,
      daysRemaining: 96,
      budget: 185000,
      contractValue: 172500,
      actualExpenditure: 96430,
      committedAmount: 138900,
      milestonesTotal: 7,
      milestonesCompleted: null,
      risks: [
        'Steel delivery for the first-floor slab is running two weeks behind the supplier’s original commitment.',
        'Per-milestone execution status is not currently exposed by the system; only milestone names and order are shown.',
      ],
    },
    // Real Agreement wizard data for this project (agreement #4) — agreementDto/clientDto/landInformationDto
    // (step 1), agreementPaymentDto + services (step 2, lookups joined), and mileStonesDto (step 3), sourced
    // verbatim from live backend responses.
    agreement: {
      agreementDate: new Date(2026, 4, 4),
      businessSector: 'سكني',
      description: 'فيلا سكنية 3 طوابق وررف وأعمال لاندسكيب وتشطيبات داخلية',
      drillingQuantity: 1000,
      client: {
        contactPerson: 'محمد العساف',
        contactPersonPhone: '503183815',
        representerName: 'محمد العساف',
        representerPhone: '503183815',
      },
      land: {
        plotNumber: 2553,
        directorate: 'شمال عمان',
        village: 'الجبيهة',
        basinName: 'ابو العوف',
        basinNumber: 1,
        floorNumber: 4,
      },
      contract: {
        contractTypeLabel: 'Management',
        contractModelLabel: 'Cost Plus',
        monthlyFees: 0,
        percentageFees: 8.9,
      },
      services: ['Excavation', 'Construction', 'Engineering Consultation', 'Project Management', 'Quality Assurance', 'Finishing'],
    },
    scope: {
      // Real ProjectAreaUnits rows for agreement #4 (annexId 4/6/7/11, unitId 1 — m²).
      areas: [
        { annexName: 'Basement 1', amount: 350, unitName: 'm²' },
        { annexName: 'G.F (Ground Floor)', amount: 350, unitName: 'm²' },
        { annexName: 'First Floor', amount: 350, unitName: 'm²' },
        { annexName: 'Roof Floor', amount: 200, unitName: 'm²' },
      ],
      // Real MileStonesDto rows for agreement #4, in backend `order`.
      milestones: [
        { order: 1, name: REAL_STAGE_NAME, description: 'تحضيرات', statusLabel: null, stageLinked: true },
        { order: 2, name: 'الحفر', description: 'بداية المشروع ', statusLabel: null, stageLinked: false },
        { order: 3, name: 'القواعد', description: 'قواعد المشروع الرئيسية', statusLabel: null, stageLinked: false },
        { order: 4, name: 'التعالي', description: 'تعالي, TB, أسوار', statusLabel: null, stageLinked: false },
        { order: 5, name: 'جدران تسوية وأعمدة وجدران واسوار وأعمال خارجية', description: 'جدران', statusLabel: null, stageLinked: false },
        { order: 6, name: 'عقدة التسوية', description: 'milestone رئيسي', statusLabel: null, stageLinked: false },
        { order: 7, name: 'جدران واعمدة وحجر الأرضي', description: 'مرحلة 2', statusLabel: null, stageLinked: false },
        { order: 8, name: 'عقدة الأرضي', description: 'مرحلة 2', statusLabel: null, stageLinked: false },
        { order: 9, name: 'جدران وأعمدة وحجر الطابق الأول', description: 'مرحلة 3', statusLabel: null, stageLinked: false },
        { order: 10, name: 'عقدة الطابق الأول', description: 'مرحلة 3', statusLabel: null, stageLinked: false },
        { order: 11, name: 'جدران وأعمدة وبناء حجر طابق الرووف', description: 'مرحلة 4', statusLabel: null, stageLinked: false },
        { order: 12, name: 'عقدة الرووف', description: 'مرحلة 4', statusLabel: null, stageLinked: false },
        { order: 13, name: 'أعمال التصاوين', description: 'مرحلة 5', statusLabel: null, stageLinked: false },
        { order: 14, name: 'تفنيش الأعمال الخارجية', description: 'مرحلة 6', statusLabel: null, stageLinked: false },
      ],
    },
    financial: {
      authorized: true,
      currencyLabel: 'JOD',
      contractValue: 172500,
      budget: 185000,
      boqTotal: sumBy(boqRows, (r) => r.subTotal),
      contractorCommitments: sumBy(contractorRows, (r) => r.contractValue),
      contractorPaid: sumBy(contractorRows, (r) => r.totalPaid),
      contractorRemaining: sumBy(contractorRows, (r) => r.remainingBalance),
      purchaseOrdersTotal: sumBy(poRows, (r) => r.subTotal),
      // Real Expenses total for project stage #48 (sum of 10 expense records' totalAmount).
      expensesTotal: 30335.14,
      // Real Advances summary (project-wide, not stage-scoped — the backend does not tie advances to a stage).
      advancesTotal: 56577,
      advancesRemaining: 56283.8,
      ownerPaymentsTotal: 110000,
      // Real ProjectVOs total for project stage #48 (one VO, status "approved").
      variationOrdersApprovedTotal: 102732,
      variationOrdersPendingTotal: 0,
      variationOrdersRejectedTotal: 0,
      paymentClaimAuthorized: true,
      paymentClaimEstimateTotal: 86114,
      notes: [
        'Each figure above is an independent ledger and is not summed into the others — treat them as distinct totals, not a single running balance.',
      ],
    },
    schedule: {
      plannedStart: startDate,
      plannedEnd: endDate,
      asOfDate: today,
      daysElapsed: 122,
      daysRemaining: 96,
      taskCounts: { todo: 9, inProgress: 6, review: 2, completed: 18 },
      stages: [
        { name: 'Site Preparation & Survey', typeLabel: 'Preparing' },
        { name: 'Foundation & Substructure', typeLabel: 'Milestone' },
        { name: 'Superstructure — Ground Floor', typeLabel: 'Milestone' },
        { name: 'Superstructure — First Floor', typeLabel: 'Milestone' },
        { name: REAL_STAGE_NAME, typeLabel: 'Milestone' },
      ],
      inProgressWork: ['Ground-floor block work', 'Electrical rough-in — ground floor'],
      upcomingWork: ['First-floor column reinforcement', 'First-floor slab formwork'],
    },
    siteActivities: {
      tasks: [
        { title: 'Pour ground-floor slab', statusLabel: 'Completed', typeLabel: 'Concrete Work', responsibility: 'Contractor', startDate: new Date(startDate.getFullYear(), startDate.getMonth() + 2, 3), endDate: new Date(startDate.getFullYear(), startDate.getMonth() + 2, 5), subtaskCount: 3 },
        { title: 'Ground-floor block work', statusLabel: 'In Progress', typeLabel: 'Masonry', responsibility: 'Contractor', startDate: new Date(startDate.getFullYear(), startDate.getMonth() + 3, 1), endDate: null, subtaskCount: 2 },
        { title: 'Electrical rough-in — ground floor', statusLabel: 'In Progress', typeLabel: 'MEP', responsibility: 'Supplier', startDate: new Date(startDate.getFullYear(), startDate.getMonth() + 3, 5), endDate: null, subtaskCount: 1 },
        { title: 'First-floor column reinforcement', statusLabel: 'To Do', typeLabel: 'Structural', responsibility: 'Contractor', startDate: null, endDate: null, subtaskCount: 0 },
      ],
      surveyingVisits: [
        { date: new Date(startDate.getFullYear(), startDate.getMonth(), 12), surveyor: 'Eng. Rami Salameh', purpose: 'Boundary and setting-out verification', subTotal: 120 },
        { date: new Date(startDate.getFullYear(), startDate.getMonth() + 2, 2), surveyor: 'Eng. Rami Salameh', purpose: 'Foundation level check', subTotal: 120 },
        // Real ProjectSurveyingVisits rows for project stage #48.
        { date: new Date(2026, 5, 8), surveyor: 'ibrahim', purpose: 'test', subTotal: 880 },
        { date: new Date(2026, 5, 30), surveyor: 'werwe', purpose: 'wrwewr', subTotal: 132 },
      ],
    },
    documents: {
      photos: [
        { fileName: 'foundation-progress.jpg', dataUrl: placeholderPhoto('Foundation', '#1d4ed8'), relatedTo: 'Foundation & Substructure' },
        { fileName: 'site-survey.jpg', dataUrl: placeholderPhoto('Site Survey', '#0f766e'), relatedTo: 'Site Preparation & Survey' },
        { fileName: 'block-work.jpg', dataUrl: placeholderPhoto('Block Work', '#b45309'), relatedTo: 'Superstructure — Ground Floor' },
      ],
      photosOmittedCount: 0,
    },
    signatures: {
      preparedByLabel: 'Prepared By',
      reviewedByLabel: 'Reviewed By',
      approvedByLabel: 'Approved By',
    },
  };
}

/** A copy of the demo snapshot with financial-permission redaction applied — shows the "restricted" rendering. */
export function buildDemoSnapshotRestricted(): ProjectReportSnapshot {
  const snapshot = buildDemoSnapshot();
  return {
    ...snapshot,
    executiveSummary: { ...snapshot.executiveSummary, contractValue: null, actualExpenditure: null, committedAmount: null },
    financial: {
      ...snapshot.financial,
      authorized: false,
      contractValue: null,
      boqTotal: 0,
      contractorCommitments: 0,
      contractorPaid: 0,
      contractorRemaining: 0,
      purchaseOrdersTotal: 0,
      expensesTotal: 0,
      advancesTotal: 0,
      advancesRemaining: 0,
      ownerPaymentsTotal: 0,
      variationOrdersApprovedTotal: 0,
      variationOrdersPendingTotal: 0,
      variationOrdersRejectedTotal: 0,
      paymentClaimAuthorized: false,
      paymentClaimEstimateTotal: null,
      notes: [],
    },
  };
}

/** A copy of the demo snapshot simulating a partial API failure (agreement fetch failed). */
export function buildDemoSnapshotPartialFailure(): ProjectReportSnapshot {
  const snapshot = buildDemoSnapshot();
  return {
    ...snapshot,
    meta: { ...snapshot.meta, failedSections: ['Agreement', 'AgreementAttachments'] },
    agreement: {
      agreementDate: null,
      businessSector: null,
      description: null,
      drillingQuantity: null,
      client: { contactPerson: null, contactPersonPhone: null, representerName: null, representerPhone: null },
      land: { plotNumber: null, directorate: null, village: null, basinName: null, basinNumber: null, floorNumber: null },
      contract: { contractTypeLabel: null, contractModelLabel: null, monthlyFees: null, percentageFees: null },
      services: [],
    },
    scope: { areas: [], milestones: [] },
    executiveSummary: {
      ...snapshot.executiveSummary,
      risks: [
        ...snapshot.executiveSummary.risks,
        'Agreement data could not be loaded for this report.',
        'AgreementAttachments data could not be loaded for this report.',
      ],
    },
  };
}
