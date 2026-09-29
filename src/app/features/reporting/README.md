# Reporting Module

A generic, configuration-driven reporting feature for the Management Platform. Build a full report — toolbar, filters, summaries, sortable/paginated/groupable table, and PDF/Excel/CSV/Print export — by declaring a single `ReportConfig` object. No bespoke report page required.

> **Zero new dependencies.** Exports are implemented natively (a self‑contained OOXML `.xlsx` writer, an injection‑safe CSV writer, and a browser‑print PDF pipeline). Nothing new was added to `package.json`.

---

## 1. Overview

```
reporting/
├── components/      report-viewer (public), toolbar, filter-panel, table,
│                    summary, column-selector, export-dialog, empty-state
├── models/          strongly-typed config/column/filter/summary/export/data-source
├── services/        formatting, persistence, csv/excel/pdf/print export, orchestrator
├── utilities/       value/path, calculation, filter, file-name, csv, zip, xlsx, print-html
├── demo/            invoice demo data, config factory, playground page
├── index.ts         public barrel
└── README.md
```

The single public component is **`<app-report-viewer>`**. Everything else is composed by it.

## 2. Installation requirements

Already satisfied by this workspace — Angular 19 (standalone + signals), PrimeNG 19, `@ngx-translate`, `date-fns`. **No additional packages are required.**

## 3. Basic usage

```ts
import { ReportViewerComponent, defineReport, ReportConfig } from '@app/features/reporting';
import { InvoiceRow } from './models';

@Component({
  standalone: true,
  imports: [ReportViewerComponent],
  template: `<app-report-viewer [config]="config" [data]="rows()"></app-report-viewer>`,
})
export class InvoicesReportPage {
  readonly rows = signal<InvoiceRow[]>([]);
  readonly config: ReportConfig = defineReport<InvoiceRow>({
    id: 'invoices',
    title: 'Invoices',
    columns: [
      { key: 'invoiceNumber', header: 'Invoice #', sortable: true, searchable: true },
      { key: 'customer.name', header: 'Customer', sortable: true },
      { key: 'total', header: 'Total', type: 'currency', currencyCode: 'JOD', summary: 'sum' },
      { key: 'createdAt', header: 'Created', type: 'dateTime' },
    ],
    summaries: [{ key: 'total', label: 'Total', field: 'total', calculation: 'sum', type: 'currency' }],
    export: { excel: true, csv: true, pdf: true, print: true, fileName: 'invoices' },
  });
}
```

> **`defineReport<T>()`** lets you author a report against a concrete row type `T` (full type‑safety in every callback) while returning the erased `ReportConfig` the non‑generic viewer binds to. This keeps the reusable component free of generic‑component friction without any `any`.

## 4. Client-side usage

Default mode (`dataMode: 'client'`). Pass the full dataset via `[data]`; the viewer filters, searches, sorts, paginates, groups and aggregates locally.

```html
<app-report-viewer [config]="config" [data]="allRows()" [loading]="loading()"></app-report-viewer>
```

## 5. Server-side usage

Set `dataMode: 'server'`. The viewer emits a `ReportQuery` on every filter/search/sort/page/group change; you load the matching page and feed it back.

```html
<app-report-viewer
  [config]="config"
  [data]="pageRows()"
  [loading]="loading()"
  [totalRecordsInput]="totalCount()"
  [serverSummaries]="summaries()"
  (filtersChanged)="load($event)">
</app-report-viewer>
```

```ts
load(query: ReportQuery) {
  this.loading.set(true);
  this.api.getInvoices(query).subscribe(res => {
    this.pageRows.set(res.items);
    this.totalCount.set(res.totalCount);
    this.summaries.set(res.summaries ?? {});   // full-filtered totals from the backend
    this.loading.set(false);
  });
}
```

`ReportQuery` = `{ page, pageSize, search?, filters?, sort?, groups?, visibleColumns? }`.
`ReportResult<T>` = `{ items, totalCount, page, pageSize, summaries? }`.

You may also implement a `ReportDataSource<T>` (`load()` + optional `exportAll()`) for a cleaner separation.

## 6. Column configuration

Every `ReportColumn` supports: `type` (`text｜number｜currency｜percentage｜date｜dateTime｜boolean｜status｜custom`), nested `key` paths (`customer.name`), custom `value`/`formatter`, `headerKey`/`emptyText`, width/min/max, `alignment`, `sticky`, and capability flags (`sortable｜filterable｜searchable｜resizable｜reorderable｜exportable｜printable｜mandatory｜visible`), footer `summary` aggregation, conditional `cellClass`/`cellStyle`, and a `templateName` for custom cell templates. `status` columns take a `statusMap` (value → label/severity/icon).

## 7. Filter configuration

Filters (`ReportFilterConfig`) support types `text｜number｜numberRange｜date｜dateRange｜select｜multiSelect｜boolean｜status｜autocomplete｜custom`, static `options` or async `optionsLoader`, `defaultValue`, `required`, `visibleWhen`, `dependsOn`, `advanced` (collapsible), `debounceMs`, a value `transform` (applied before the query is emitted) and a client‑side `matcher`. Filters are applied **only on Apply** — never per keystroke.

## 8. Summary configuration

Summaries (`ReportSummaryConfig`) support `count｜sum｜avg｜min｜max｜custom`, a formatting `type`, and `display` targets (`cards｜footer｜below｜export`). In **server mode** summary values come from `ReportResult.summaries` (full filtered dataset), not the current page. Financial figures use a safe‑decimal strategy (Kahan summation + string‑exponent rounding) — see `utilities/report-calculation.utils.ts`.

## 9. Export configuration

```ts
export: {
  excel: true, csv: true, pdf: true, print: true,
  fileName: 'invoices',            // or a (context) => string
  orientation: 'landscape',
  company: { name: 'Acme', logoDataUrl: 'data:image/png;base64,...' },
  watermark: 'CONFIDENTIAL', footerText: '...', signature: true,
  includeFilters: true, includeSummaries: true, includeCompanyHeader: true, includeGeneratedDate: true,
}
```

The export dialog lets the user pick **format, scope (current page / all filtered / selected), columns, file name, orientation** and the include‑toggles. Heavy export code is `import()`‑ed lazily and code‑split out of the eager bundle.

- **Excel** — genuine typed cells (numbers/currency/percentage/dates/booleans), number formats, frozen + styled header, auto column widths, safe sheet/file names. Formula‑injection is neutralised for untrusted text.
- **CSV** — UTF‑8 BOM (correct Arabic in Excel), configurable delimiter, RFC‑4180 escaping, OWASP CSV‑injection protection.
- **PDF / Print** — see §17.

## 10. Permission configuration

Gate actions with static flags or a resolver callback:

```ts
permissions: { exportPdf: false, viewFinancials: false }   // static
```
```html
<app-report-viewer [config]="config" [permissionResolver]="canReport"></app-report-viewer>
```
```ts
canReport = (action) => this.auth.hasPermission(reportPermissionFor(action));
```

Actions: `view｜exportPdf｜exportExcel｜exportCsv｜print｜viewFinancials`. Summaries/columns marked `financial: true` are hidden unless `viewFinancials` is granted.

> **Security:** UI gating is not data security. The backend **must** enforce the same permissions and must never return unauthorized fields. All exported values are sanitized; report data is never injected as raw HTML.

## 11. Localization

Every user‑facing string is a translate key resolved via `@ngx-translate`; the module ships `reporting.*` keys in `en.json` and `ar.json`. Numbers/currency/dates use `Intl` with the active app locale (override via `config.locale`). Provide `headerKey`/`labelKey` on columns/filters/summaries; never hardcode English inside a report.

## 12. RTL support

The viewer honours the app's `LanguageService` direction. Alignments use logical `start`/`end`, and the PDF/print document is emitted with `dir="rtl"` when Arabic is active.

## 13. User preference persistence

```ts
persistence: {
  enabled: true, storage: 'localStorage', key: 'invoice-report', userId: currentUserId,
  includeColumns: true, includeSorting: true, includePageSize: true, includeFilters: true, includeGrouping: true,
}
```

Corrupted or outdated blobs are ignored safely (versioned). The toolbar's **Reset report settings** clears them.

## 14. Large dataset recommendations

Use `dataMode: 'server'` — never stream every row into the browser. Keep `pageSize` modest, rely on backend `summaries`, and prefer backend export for "all filtered" (§15). Grouping and client aggregation are intended for already‑filtered / bounded sets.

## 15. Backend export recommendations

For very large "all filtered" exports, implement `ReportDataSource.exportAll(query, format)` on the server and stream a `Blob`, or handle `(exportRequested)` in the parent and call your export endpoint. The viewer never fetches an unbounded row count into the browser.

## 16. Examples: invoices / transactions / audit logs

The same API covers any domain — only the config changes:

- **Invoices** — see `demo/demo-report-config.ts` (currency columns, status tags, grouping by customer/status/month).
- **Transactions** — columns `date｜account｜type｜amount(currency)｜balance(currency)`, filters `dateRange｜type(multiSelect)｜amount(numberRange)`, summary `sum(amount)`.
- **Audit logs** — columns `timestamp(dateTime)｜user｜action(status)｜entity｜ip`, filters `dateRange｜action(multiSelect)｜user(autocomplete)`, `dataMode: 'server'`, no financial summaries.

## 17. Known PDF/Arabic font requirements

PDF export uses the **browser print pipeline** (a styled, paginated HTML document → *Save as PDF*). This renders **Arabic/RTL through the browser's own fonts**, so **no font file needs to be committed** and there is no embedding step. It supports orientation, repeated headers, page‑break avoidance, watermark, footer and signature.

If you need a fully programmatic PDF (headless generation, exact byte output), swap `ReportPdfExportService` for a `jsPDF` + `jspdf-autotable` implementation. In that case Arabic requires an **embedded Arabic‑capable font** (e.g. Amiri/Noto Naskh) registered as a VFS font with `jsPDF`, plus a shaping step — provide that font asset yourself; it is intentionally not bundled here.

## 18. How to add a custom cell template

```html
<app-report-viewer [config]="config" [cellTemplates]="{ badge: badgeTpl }"></app-report-viewer>
<ng-template #badgeTpl let-value let-row="row">
  <span class="badge">{{ value }} — {{ row.extra }}</span>
</ng-template>
```
```ts
{ key: 'status', header: 'Status', templateName: 'badge' }
```

## 19. How to add a custom filter component

Give the filter `type: 'custom'` + a `templateName`, pass `[filterTemplates]="{ myFilter: tpl }"`, and provide a `matcher` for client‑side filtering. The template context exposes `$implicit` (current value), `filter`, and a `setValue(key, value)` callback.

## 20. Create a new report in a few minutes

1. Define your row interface.
2. `const config = defineReport<Row>({ id, title, columns, filters?, summaries?, groups?, export? })`.
3. Drop `<app-report-viewer [config]="config" [data]="rows()">` on a page.
4. For large data set `dataMode: 'server'` and wire `(filtersChanged)`.

---

### Minimal example

```ts
readonly config = defineReport<Row>({
  id: 'mini', title: 'Mini',
  columns: [{ key: 'name', header: 'Name', sortable: true }, { key: 'amount', header: 'Amount', type: 'currency' }],
});
```

### Advanced example

See [`demo/demo-report-config.ts`](./demo/demo-report-config.ts) and the interactive playground at **`/reporting-demo`** — every feature (filters, grouping, summaries, selection, exports, RTL, client/server modes, simulated loading/empty/error, persistence) is toggleable.

---

## Validation

```bash
npm run build                                   # prod build (type-checks all templates)
npx ng test --watch=false --browsers=ChromeHeadless   # unit tests
```

The reporting unit suite (calculation, filtering, sorting, pagination, value resolution, CSV escaping/injection, file‑name/sheet sanitization, XLSX/ZIP writers, persistence) passes; see `**/*.spec.ts` in this folder.
