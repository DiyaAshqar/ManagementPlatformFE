/**
 * Demo-only invoice dataset. This is illustrative sample data for the reporting
 * demo page — it is not wired to any backend and lives entirely in the browser.
 */

export type CustomerType = 'Individual' | 'Company';
export type InvoiceCurrency = 'JOD' | 'USD' | 'EUR';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer';
export type InvoiceStatus =
  | 'Draft'
  | 'Pending'
  | 'Paid'
  | 'Partially Paid'
  | 'Overdue'
  | 'Cancelled';

export interface InvoiceReportRow {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerType: CustomerType;
  branchName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  currency: InvoiceCurrency;
  paymentMethod: PaymentMethod;
  status: InvoiceStatus;
  createdBy: string;
  notes?: string;
}

const CUSTOMERS: { name: string; type: CustomerType }[] = [
  { name: 'Al-Rashid Trading Co.', type: 'Company' },
  { name: 'Petra Construction Ltd.', type: 'Company' },
  { name: 'Omar Haddad', type: 'Individual' },
  { name: 'Layla Nasser', type: 'Individual' },
  { name: 'Jordan Steel Works', type: 'Company' },
  { name: 'Amman Interiors', type: 'Company' },
  { name: 'Khaled Mansour', type: 'Individual' },
  { name: 'Zaha Design House', type: 'Company' },
  { name: 'Sami Qasem', type: 'Individual' },
  { name: 'Blue Nile Contracting', type: 'Company' },
];

const BRANCHES = ['Amman', 'Irbid', 'Zarqa', 'Aqaba'];
const CREATED_BY = ['Omar Altamimi', 'Sara Yousef', 'Hind Ali', 'Faris Odeh'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Card', 'Bank Transfer'];
const CURRENCIES: InvoiceCurrency[] = ['JOD', 'JOD', 'JOD', 'USD', 'EUR'];
const STATUSES: InvoiceStatus[] = [
  'Draft',
  'Pending',
  'Paid',
  'Paid',
  'Partially Paid',
  'Overdue',
  'Cancelled',
];

/** Deterministic pseudo-random generator so the demo data is stable. */
function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Generate a deterministic set of demo invoices (default 60 rows). */
export function generateInvoices(count = 60): InvoiceReportRow[] {
  const random = seededRandom(20260724);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
  const today = new Date('2026-07-24T00:00:00');
  const rows: InvoiceReportRow[] = [];

  for (let i = 0; i < count; i++) {
    const customer = pick(CUSTOMERS);
    const status = pick(STATUSES);
    const currency = pick(CURRENCIES);

    const daysAgo = Math.floor(random() * 240);
    const invoiceDate = new Date(today);
    invoiceDate.setDate(invoiceDate.getDate() - daysAgo);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const subtotal = round2(500 + random() * 19500);
    const discount = round2(subtotal * random() * 0.1);
    const tax = round2((subtotal - discount) * 0.16);
    const total = round2(subtotal - discount + tax);

    let paidAmount = 0;
    switch (status) {
      case 'Paid':
        paidAmount = total;
        break;
      case 'Partially Paid':
        paidAmount = round2(total * (0.3 + random() * 0.4));
        break;
      case 'Overdue':
        paidAmount = round2(total * random() * 0.25);
        break;
      default:
        paidAmount = 0;
    }
    const remainingAmount = round2(total - paidAmount);

    const year = invoiceDate.getFullYear();
    rows.push({
      id: i + 1,
      invoiceNumber: `INV-${year}-${String(1000 + i).padStart(4, '0')}`,
      customerName: customer.name,
      customerType: customer.type,
      branchName: pick(BRANCHES),
      invoiceDate: invoiceDate.toISOString(),
      dueDate: dueDate.toISOString(),
      subtotal,
      discount,
      tax,
      total,
      paidAmount,
      remainingAmount,
      currency,
      paymentMethod: pick(PAYMENT_METHODS),
      status,
      createdBy: pick(CREATED_BY),
      notes: random() > 0.7 ? 'Priority client — follow up on payment.' : undefined,
    });
  }

  return rows;
}

/** The default demo dataset. */
export const DEMO_INVOICES: InvoiceReportRow[] = generateInvoices(60);
