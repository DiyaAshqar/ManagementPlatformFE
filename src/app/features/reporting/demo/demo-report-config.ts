import { ReportConfig, defineReport } from '../models/report-config.model';
import { InvoiceReportRow } from './demo-report-data';

/** Options driven by the demo control panel to rebuild the report config. */
export interface DemoReportOptions {
  dataMode: 'client' | 'server';
  currencyCode: string;
  pageSize: number;
  search: boolean;
  filters: boolean;
  pagination: boolean;
  grouping: boolean;
  summaries: boolean;
  rowSelection: boolean;
  columnSelection: boolean;
  exportPdf: boolean;
  exportExcel: boolean;
  exportCsv: boolean;
  print: boolean;
  orientation: 'portrait' | 'landscape';
  persistPreferences: boolean;
}

export const DEFAULT_DEMO_OPTIONS: DemoReportOptions = {
  dataMode: 'client',
  currencyCode: 'JOD',
  pageSize: 10,
  search: true,
  filters: true,
  pagination: true,
  grouping: true,
  summaries: true,
  rowSelection: true,
  columnSelection: true,
  exportPdf: true,
  exportExcel: true,
  exportCsv: true,
  print: true,
  orientation: 'landscape',
  persistPreferences: true,
};

const CUSTOMER_NAMES = [
  'Al-Rashid Trading Co.',
  'Petra Construction Ltd.',
  'Omar Haddad',
  'Layla Nasser',
  'Jordan Steel Works',
  'Amman Interiors',
  'Khaled Mansour',
  'Zaha Design House',
  'Sami Qasem',
  'Blue Nile Contracting',
];
const BRANCHES = ['Amman', 'Irbid', 'Zarqa', 'Aqaba'];

const monthBucket = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/** Build the invoice demo report configuration from the current demo options. */
export function buildInvoiceReportConfig(options: DemoReportOptions): ReportConfig {
  const currency = options.currencyCode;

  return defineReport<InvoiceReportRow>({
    id: 'invoice-report-demo',
    title: 'Invoice Report',
    titleKey: 'reporting.demo.title',
    descriptionKey: 'reporting.demo.description',
    dataMode: options.dataMode,
    locale: undefined,
    currencyCode: currency,
    rowId: (row) => row.id,
    defaultSort: [{ field: 'invoiceDate', direction: 'desc' }],
    searchDebounceMs: 300,

    columns: [
      { key: 'invoiceNumber', headerKey: 'reporting.demo.columns.invoiceNumber', header: 'Invoice #', sortable: true, searchable: true, mandatory: true, width: '10rem', sticky: true },
      { key: 'customerName', headerKey: 'reporting.demo.columns.customer', header: 'Customer', sortable: true, searchable: true, width: '14rem' },
      { key: 'customerType', headerKey: 'reporting.demo.columns.customerType', header: 'Type', sortable: true, width: '8rem' },
      { key: 'branchName', headerKey: 'reporting.demo.columns.branch', header: 'Branch', sortable: true, width: '8rem' },
      { key: 'invoiceDate', headerKey: 'reporting.demo.columns.invoiceDate', header: 'Invoice Date', type: 'date', sortable: true, width: '9rem' },
      { key: 'dueDate', headerKey: 'reporting.demo.columns.dueDate', header: 'Due Date', type: 'date', sortable: true, width: '9rem' },
      { key: 'subtotal', headerKey: 'reporting.demo.columns.subtotal', header: 'Subtotal', type: 'currency', currencyCode: currency, sortable: true, width: '9rem' },
      { key: 'discount', headerKey: 'reporting.demo.columns.discount', header: 'Discount', type: 'currency', currencyCode: currency, sortable: true, width: '9rem', summary: 'sum' },
      { key: 'tax', headerKey: 'reporting.demo.columns.tax', header: 'Tax', type: 'currency', currencyCode: currency, sortable: true, width: '8rem', summary: 'sum' },
      { key: 'total', headerKey: 'reporting.demo.columns.total', header: 'Total', type: 'currency', currencyCode: currency, sortable: true, width: '9rem', summary: 'sum' },
      { key: 'paidAmount', headerKey: 'reporting.demo.columns.paid', header: 'Paid', type: 'currency', currencyCode: currency, sortable: true, width: '9rem', summary: 'sum' },
      { key: 'remainingAmount', headerKey: 'reporting.demo.columns.remaining', header: 'Remaining', type: 'currency', currencyCode: currency, sortable: true, width: '9rem', summary: 'sum' },
      { key: 'currency', headerKey: 'reporting.demo.columns.currency', header: 'Currency', sortable: true, width: '7rem', alignment: 'center' },
      { key: 'paymentMethod', headerKey: 'reporting.demo.columns.paymentMethod', header: 'Payment', sortable: true, width: '10rem' },
      {
        key: 'status',
        headerKey: 'reporting.demo.columns.status',
        header: 'Status',
        type: 'status',
        sortable: true,
        width: '10rem',
        statusMap: [
          { value: 'Draft', labelKey: 'reporting.demo.status.draft', severity: 'secondary', icon: 'pi pi-pencil' },
          { value: 'Pending', labelKey: 'reporting.demo.status.pending', severity: 'warn', icon: 'pi pi-clock' },
          { value: 'Paid', labelKey: 'reporting.demo.status.paid', severity: 'success', icon: 'pi pi-check-circle' },
          { value: 'Partially Paid', labelKey: 'reporting.demo.status.partiallyPaid', severity: 'info', icon: 'pi pi-percentage' },
          { value: 'Overdue', labelKey: 'reporting.demo.status.overdue', severity: 'danger', icon: 'pi pi-exclamation-triangle' },
          { value: 'Cancelled', labelKey: 'reporting.demo.status.cancelled', severity: 'contrast', icon: 'pi pi-times-circle' },
        ],
      },
      { key: 'createdBy', headerKey: 'reporting.demo.columns.createdBy', header: 'Created By', sortable: true, width: '11rem', visible: false },
      { key: 'notes', headerKey: 'reporting.demo.columns.notes', header: 'Notes', searchable: true, exportable: true, printable: true, width: '16rem', visible: false, emptyText: '—' },
    ],

    filters: [
      { key: 'invoiceNumber', type: 'text', label: 'Invoice #', labelKey: 'reporting.demo.filters.invoiceNumber', fieldKey: 'invoiceNumber' },
      {
        key: 'customerName',
        type: 'multiSelect',
        label: 'Customer',
        labelKey: 'reporting.demo.filters.customer',
        options: CUSTOMER_NAMES.map((name) => ({ label: name, value: name })),
      },
      {
        key: 'customerType',
        type: 'select',
        label: 'Customer Type',
        labelKey: 'reporting.demo.filters.customerType',
        options: [
          { label: 'Individual', labelKey: 'reporting.demo.customerType.individual', value: 'Individual' },
          { label: 'Company', labelKey: 'reporting.demo.customerType.company', value: 'Company' },
        ],
      },
      {
        key: 'branchName',
        type: 'multiSelect',
        label: 'Branch',
        labelKey: 'reporting.demo.filters.branch',
        options: BRANCHES.map((branch) => ({ label: branch, value: branch })),
      },
      { key: 'invoiceDate', type: 'dateRange', label: 'Invoice Date', labelKey: 'reporting.demo.filters.invoiceDate', fieldKey: 'invoiceDate' },
      { key: 'dueDate', type: 'dateRange', label: 'Due Date', labelKey: 'reporting.demo.filters.dueDate', fieldKey: 'dueDate', advanced: true },
      { key: 'amount', type: 'numberRange', label: 'Amount', labelKey: 'reporting.demo.filters.amount', fieldKey: 'total' },
      {
        key: 'paymentMethod',
        type: 'multiSelect',
        label: 'Payment Method',
        labelKey: 'reporting.demo.filters.paymentMethod',
        advanced: true,
        options: [
          { label: 'Cash', labelKey: 'reporting.demo.paymentMethod.cash', value: 'Cash' },
          { label: 'Card', labelKey: 'reporting.demo.paymentMethod.card', value: 'Card' },
          { label: 'Bank Transfer', labelKey: 'reporting.demo.paymentMethod.bankTransfer', value: 'Bank Transfer' },
        ],
      },
      {
        key: 'status',
        type: 'multiSelect',
        label: 'Status',
        labelKey: 'reporting.demo.filters.status',
        options: [
          { label: 'Draft', labelKey: 'reporting.demo.status.draft', value: 'Draft' },
          { label: 'Pending', labelKey: 'reporting.demo.status.pending', value: 'Pending' },
          { label: 'Paid', labelKey: 'reporting.demo.status.paid', value: 'Paid' },
          { label: 'Partially Paid', labelKey: 'reporting.demo.status.partiallyPaid', value: 'Partially Paid' },
          { label: 'Overdue', labelKey: 'reporting.demo.status.overdue', value: 'Overdue' },
          { label: 'Cancelled', labelKey: 'reporting.demo.status.cancelled', value: 'Cancelled' },
        ],
      },
      {
        key: 'fullyPaid',
        type: 'boolean',
        label: 'Fully Paid',
        labelKey: 'reporting.demo.filters.fullyPaid',
        advanced: true,
        matcher: (row, value) => (value ? row.remainingAmount === 0 : row.remainingAmount > 0),
      },
    ],

    summaries: [
      { key: 'invoiceCount', label: 'Total Invoices', labelKey: 'reporting.demo.summary.count', calculation: 'count', icon: 'pi pi-file' },
      { key: 'totalAmount', label: 'Total Amount', labelKey: 'reporting.demo.summary.total', field: 'total', calculation: 'sum', type: 'currency', currencyCode: currency, icon: 'pi pi-dollar' },
      { key: 'paidAmount', label: 'Paid', labelKey: 'reporting.demo.summary.paid', field: 'paidAmount', calculation: 'sum', type: 'currency', currencyCode: currency, icon: 'pi pi-check' },
      { key: 'remainingAmount', label: 'Remaining', labelKey: 'reporting.demo.summary.remaining', field: 'remainingAmount', calculation: 'sum', type: 'currency', currencyCode: currency, icon: 'pi pi-wallet' },
      { key: 'avgInvoice', label: 'Average Invoice', labelKey: 'reporting.demo.summary.average', field: 'total', calculation: 'avg', type: 'currency', currencyCode: currency, icon: 'pi pi-chart-line' },
    ],

    groups: [
      { key: 'byCustomer', field: 'customerName', labelKey: 'reporting.demo.groups.customer' },
      { key: 'byStatus', field: 'status', labelKey: 'reporting.demo.groups.status' },
      { key: 'byMonth', field: 'invoiceDate', labelKey: 'reporting.demo.groups.month', valueFormatter: monthBucket },
    ],

    features: {
      search: options.search,
      filters: options.filters,
      pagination: options.pagination,
      sorting: true,
      multiSort: true,
      columnSelection: options.columnSelection,
      columnReordering: true,
      columnResizing: true,
      rowSelection: options.rowSelection,
      rowNumbers: true,
      grouping: options.grouping,
      summaries: options.summaries,
      print: options.print,
      refresh: true,
      fullscreen: true,
      stickyHeader: true,
    },

    export: {
      pdf: options.exportPdf,
      excel: options.exportExcel,
      csv: options.exportCsv,
      print: options.print,
      fileName: 'invoice-report',
      orientation: options.orientation,
      company: { name: 'NeuroCode Construction' },
      includeFilters: true,
      includeSummaries: true,
      includeCompanyHeader: true,
      includeGeneratedDate: true,
      footerText: 'Confidential — generated by the Management Platform reporting module.',
      signature: true,
    },

    pagination: {
      pageSize: options.pageSize,
      pageSizeOptions: [5, 10, 25, 50],
    },

    persistence: {
      enabled: options.persistPreferences,
      storage: 'localStorage',
      key: 'invoice-report-demo',
      includeColumns: true,
      includeSorting: true,
      includePageSize: true,
      includeFilters: true,
      includeGrouping: true,
    },

    emptyStateMessageKey: 'reporting.demo.empty',
  });
}
