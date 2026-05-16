import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { Project } from '../../models';
import {
  CreatePaymentFlowCommand,
  CurrencyClient,
  CurrencyDto,
  GetPaymentFlowDto,
  LookupClient,
  PaymentFlowClient
} from '../../../../../nswag/api-client';
import { PrintService } from '../../../../shared';

interface SelectOption<T = number> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-owner-payment-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, PaymentFlowClient, LookupClient, CurrencyClient],
  templateUrl: './owner-payment-tab.component.html',
  styleUrls: ['./owner-payment-tab.component.scss'],
})
export class OwnerPaymentTabComponent implements OnInit, OnChanges {
  @Input() project: Project | null = null;

  createdAt = signal<Date>(new Date());
  amount = signal<number | null>(null);
  currencyId = signal<number | null>(null);
  paymentMethodId = signal<number | null>(null);
  referenceNumber = signal<string>('');
  notes = signal<string>('');
  submitted = signal<boolean>(false);
  isLoadingRecords = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  deletingPaymentId = signal<number | null>(null);
  records = signal<GetPaymentFlowDto[]>([]);

  currencies: SelectOption[] = [];
  private currencyMap: Record<number, string> = {};

  paymentTypes: SelectOption[] = [];
  private paymentMethodMap: Record<number, string> = {};

  isReferenceDisabled = computed(() => this.isCashPayment(this.paymentMethodId()));
  totalPaid = computed(() => this.records().reduce((sum, record) => sum + (record.cash ?? 0), 0));

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService,
    private paymentFlowClient: PaymentFlowClient,
    private lookupClient: LookupClient,
    private currencyClient: CurrencyClient,
    private printService: PrintService
  ) {}

  ngOnInit(): void {
    this.loadLookups();
    this.loadCurrencies();
    this.loadPayments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].isFirstChange()) {
      this.loadPayments();
    }
  }

  onPaymentTypeChange(value: number): void {
    this.paymentMethodId.set(value);
    if (this.isCashPayment(value)) {
      this.referenceNumber.set('');
    }
  }

  loadPayments(): void {
    const projectId = this.projectId;
    if (!projectId) {
      this.records.set([]);
      return;
    }

    this.isLoadingRecords.set(true);
    this.paymentFlowClient.getByProjectId(projectId, 1, 100, undefined).subscribe({
      next: (response) => {
        const rows = response.succeeded && response.data?.data ? response.data.data : [];
        this.records.set(rows.sort((a, b) => this.dateTime(b.createdAt) - this.dateTime(a.createdAt)));
        this.isLoadingRecords.set(false);
      },
      error: () => {
        this.records.set([]);
        this.isLoadingRecords.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: 'Failed to load owner payments.',
        });
      },
    });
  }

  savePayment(): void {
    this.submitted.set(true);

    const projectId = this.projectId;
    if (!projectId || !this.createdAt() || !this.amount() || this.amount()! <= 0 || !this.currencyId() || !this.paymentMethodId()) {
      return;
    }

    const command = new CreatePaymentFlowCommand({
      cash: this.amount()!,
      projectId,
      paymentMethodId: this.paymentMethodId()!,
      currencyId: this.currencyId()!,
      notes: this.buildNotes(),
      createdAt: this.createdAt(),
    });

    this.isSaving.set(true);
    this.paymentFlowClient.createOrUpdate(command).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        if (response.succeeded) {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('ownerPaymentEntry.messages.saved'),
          });
          this.resetForm();
          this.loadPayments();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error') || 'Error',
            detail: response.message || 'Failed to save owner payment.',
          });
        }
      },
      error: () => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: 'Failed to save owner payment.',
        });
      },
    });
  }

  deletePayment(record: GetPaymentFlowDto): void {
    if (!record.id) {
      return;
    }

    this.confirmationService.confirm({
      message: this.t('ownerPaymentEntry.messages.confirmDelete', 'Are you sure you want to delete this owner payment?'),
      header: this.t('ownerPaymentEntry.messages.confirmDeleteHeader', 'Delete Owner Payment'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: this.translate.instant('common.delete') },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: this.translate.instant('common.cancel') },
      accept: () => {
        this.deletingPaymentId.set(record.id!);
        this.paymentFlowClient.delete(record.id).subscribe({
          next: (response) => {
            this.deletingPaymentId.set(null);
            if (response.succeeded) {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('common.success'),
                detail: this.t('ownerPaymentEntry.messages.deleted', 'Owner payment deleted successfully.'),
              });
              this.loadPayments();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error') || 'Error',
                detail: response.message || 'Failed to delete owner payment.',
              });
            }
          },
          error: () => {
            this.deletingPaymentId.set(null);
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('common.error') || 'Error',
              detail: 'Failed to delete owner payment.',
            });
          },
        });
      },
      reject: () => {
        if (this.deletingPaymentId() === record.id) {
          this.deletingPaymentId.set(null);
        }
      },
    });
  }

  resetForm(): void {
    this.submitted.set(false);
    this.createdAt.set(new Date());
    this.amount.set(null);
    this.currencyId.set(null);
    this.paymentMethodId.set(null);
    this.setDefaultCurrency();
    this.setDefaultPaymentMethod();
    this.referenceNumber.set('');
    this.notes.set('');
  }

  getPaymentTypeLabel(value?: number): string {
    if (value == null) return '-';
    return this.paymentMethodMap[value] ?? '-';
  }

  getCurrencyLabel(value?: number): string {
    if (value == null) return this.selectedCurrencyLabel;
    return this.currencyMap[value] ?? 'JOD';
  }

  getReferenceNumber(record: GetPaymentFlowDto): string {
    const referenceMatch = record.notes?.match(/(?:^|\n)Reference Number:\s*(.+)(?:\n|$)/i);
    return referenceMatch?.[1]?.trim() || '-';
  }

  formatAmount(value: number | undefined, currency: string = this.selectedCurrencyLabel): string {
    return `${(value ?? 0).toFixed(2)} ${currency}`;
  }

  isDeleting(record: GetPaymentFlowDto): boolean {
    return record.id != null && this.deletingPaymentId() === record.id;
  }

  printReceipt(record: GetPaymentFlowDto): void {
    const referenceNumber = this.getReferenceNumber(record);
    const notes = record.notes?.replace(/(?:^|\n)Reference Number:\s*.+(?:\n|$)/gi, '').trim() || '';
    const currency = record.currencyAbb || record.currencyName || this.getCurrencyLabel(record.currencyId);
    const paymentMethod = record.paymentMethodName || this.getPaymentTypeLabel(record.paymentMethodId);
    const clientName = this.project?.clientName || this.project?.name || '';
    const projectName = record.projectName || this.project?.name || '';
    const date = record.createdAt
      ? new Date(record.createdAt).toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const dateEn = record.createdAt
      ? new Date(record.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const amount = (record.cash ?? 0).toFixed(2);

    this.printService.openAndPrint(this.buildReceiptHtml({
      receiptNo: record.id ?? 0,
      clientName,
      amount,
      currency,
      date,
      dateEn,
      paymentMethod,
      referenceNumber: referenceNumber !== '-' ? referenceNumber : '',
      projectName,
      notes,
    }));
  }

  private buildReceiptHtml(opts: {
    receiptNo: number;
    clientName: string;
    amount: string;
    currency: string;
    date: string;
    dateEn: string;
    paymentMethod: string;
    referenceNumber: string;
    projectName: string;
    notes: string;
  }): string {
    const { receiptNo, clientName, amount, currency, date, dateEn, paymentMethod, referenceNumber, projectName, notes } = opts;

    const refRow = referenceNumber ? `
        <tr>
          <td class="label">رقم المرجع</td>
          <td class="label-en">Reference No.</td>
          <td class="value">${referenceNumber}</td>
        </tr>` : '';

    const notesRow = notes ? `
        <tr>
          <td class="label">ملاحظات</td>
          <td class="label-en">Notes</td>
          <td class="value notes-value">${notes}</td>
        </tr>` : '';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سند قبض #${receiptNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tajawal', 'Inter', sans-serif;
      background: #f0f4f8;
      display: flex;
      justify-content: center;
      padding: 2rem;
      min-height: 100vh;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    @page { margin: 1cm; }
    @media print { body { background: white; padding: 0; } }
    .receipt {
      background: white;
      width: 680px;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .receipt-header {
      background: linear-gradient(135deg, #1a56db 0%, #1e40af 100%);
      color: white;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title h1 { font-size: 1.7rem; font-weight: 800; }
    .header-title h2 {
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      font-weight: 400;
      opacity: 0.8;
      margin-top: 3px;
    }
    .receipt-no {
      text-align: left;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 0.6rem 1rem;
    }
    .receipt-no .no-label { font-size: 0.7rem; opacity: 0.8; display: block; }
    .receipt-no strong { font-size: 1.25rem; font-family: 'Inter', sans-serif; }
    .receipt-body { padding: 2rem; }
    .received-from {
      background: #f8faff;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .received-from .from-label { font-size: 0.8rem; color: #64748b; margin-bottom: 0.3rem; }
    .received-from .from-name { font-size: 1.2rem; font-weight: 700; color: #1e293b; }
    .amount-banner {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1px solid #6ee7b7;
      border-radius: 8px;
      padding: 1.1rem 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .amount-banner .amount-label { font-size: 0.85rem; color: #059669; }
    .amount-banner .amount-value {
      font-size: 1.7rem;
      font-weight: 800;
      color: #065f46;
      font-family: 'Inter', sans-serif;
      direction: ltr;
    }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table tr { border-bottom: 1px solid #f1f5f9; }
    .details-table tr:last-child { border-bottom: none; }
    .details-table td { padding: 0.65rem 0.25rem; vertical-align: middle; }
    .details-table .label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #334155;
      width: 120px;
      white-space: nowrap;
    }
    .details-table .label-en {
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: 'Inter', sans-serif;
      width: 110px;
      white-space: nowrap;
    }
    .details-table .value { font-size: 0.95rem; color: #0f172a; font-weight: 500; }
    .details-table .notes-value { font-size: 0.9rem; color: #475569; white-space: pre-wrap; }
    .receipt-footer {
      border-top: 2px dashed #e2e8f0;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
    }
    .signature { flex: 1; text-align: center; }
    .signature .sig-ar { font-size: 0.9rem; font-weight: 600; color: #475569; }
    .signature .sig-en {
      font-size: 0.75rem;
      color: #94a3b8;
      font-family: 'Inter', sans-serif;
      margin-bottom: 2.5rem;
    }
    .signature .sig-line { border-bottom: 1.5px solid #94a3b8; }
    .stamp-area { text-align: center; color: #cbd5e1; padding-bottom: 0.5rem; }
    .stamp-circle {
      width: 80px;
      height: 80px;
      border: 2px dashed #cbd5e1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.4rem;
      font-size: 0.65rem;
      color: #94a3b8;
      text-align: center;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="header-title">
        <h1>سند قبض</h1>
        <h2>Payment Receipt</h2>
      </div>
      <div class="receipt-no">
        <span class="no-label">رقم السند | Receipt No.</span>
        <strong>#${receiptNo}</strong>
      </div>
    </div>

    <div class="receipt-body">
      <div class="received-from">
        <div class="from-label">وصلني من السيد / السيدة &nbsp;|&nbsp; Received from</div>
        <div class="from-name">${clientName || '—'}</div>
      </div>

      <div class="amount-banner">
        <span class="amount-label">مبلغ وقدره &nbsp;|&nbsp; Amount</span>
        <span class="amount-value">${amount} ${currency}</span>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">بتاريخ</td>
          <td class="label-en">Date</td>
          <td class="value">${date} &nbsp;|&nbsp; <span style="font-family:'Inter',sans-serif">${dateEn}</span></td>
        </tr>
        <tr>
          <td class="label">طريقة الدفع</td>
          <td class="label-en">Payment Method</td>
          <td class="value">${paymentMethod}</td>
        </tr>
        <tr>
          <td class="label">المشروع</td>
          <td class="label-en">Project</td>
          <td class="value">${projectName || '—'}</td>
        </tr>${refRow}${notesRow}
      </table>
    </div>

    <div class="receipt-footer">
      <div class="signature">
        <div class="sig-ar">توقيع المستلم</div>
        <div class="sig-en">Receiver's Signature</div>
        <div class="sig-line"></div>
      </div>
      <div class="stamp-area">
        <div class="stamp-circle">ختم<br/>المنشأة<br/>Stamp</div>
      </div>
      <div class="signature">
        <div class="sig-ar">توقيع المُسدِّد</div>
        <div class="sig-en">Payer's Signature</div>
        <div class="sig-line"></div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private loadLookups(): void {
    this.lookupClient.getAllLookups(['paymentMethod']).subscribe({
      next: (response) => {
        const data = response.data as Record<string, { id: number; name: string }[]> | undefined;
        const paymentMethods = data?.['paymentMethod'] ?? data?.['paymentmethod'] ?? [];
        this.paymentTypes = paymentMethods.map((method) => ({ label: method.name, value: method.id }));
        this.paymentMethodMap = Object.fromEntries(this.paymentTypes.map((option) => [option.value, option.label]));
        this.setDefaultPaymentMethod();
      },
      error: () => {
        this.paymentTypes = [];
        this.paymentMethodMap = {};
      },
    });
  }

  private loadCurrencies(): void {
    this.currencyClient.getAll(1, 100, undefined).subscribe({
      next: (response) => {
        const currencies = response.succeeded && response.data?.data ? response.data.data : [];
        this.currencies = currencies
          .filter((currency): currency is CurrencyDto & { id: number } => currency.id != null)
          .map((currency) => ({
            label: currency.abb || currency.name || `${currency.id}`,
            value: currency.id,
          }));
        this.currencyMap = Object.fromEntries(this.currencies.map((option) => [option.value, option.label]));
        this.setDefaultCurrency();
      },
      error: () => {
        this.currencies = [];
        this.currencyMap = {};
      },
    });
  }

  private buildNotes(): string | undefined {
    const reference = this.referenceNumber().trim();
    const noteText = this.notes().trim();
    const noteParts = [
      reference ? `Reference Number: ${reference}` : '',
      noteText,
    ].filter(Boolean);

    return noteParts.length ? noteParts.join('\n') : undefined;
  }

  private setDefaultPaymentMethod(): void {
    if (this.paymentMethodId() || !this.paymentTypes.length) {
      return;
    }

    const cashOption = this.paymentTypes.find((option) => option.label.toLowerCase().includes('cash'));
    this.paymentMethodId.set(cashOption?.value ?? this.paymentTypes[0].value);
  }

  private setDefaultCurrency(): void {
    if (this.currencyId() || !this.currencies.length) {
      return;
    }

    const jodOption = this.currencies.find((option) => option.label.toLowerCase() === 'jod');
    this.currencyId.set(jodOption?.value ?? this.currencies[0].value);
  }

  private isCashPayment(value?: number | null): boolean {
    if (value == null) {
      return false;
    }

    return (this.paymentMethodMap[value] ?? '').toLowerCase().includes('cash');
  }

  private dateTime(date?: Date): number {
    return date ? new Date(date).getTime() : 0;
  }

  private get selectedCurrencyLabel(): string {
    const selectedCurrencyId = this.currencyId();
    return selectedCurrencyId ? this.currencyMap[selectedCurrencyId] ?? 'JOD' : 'JOD';
  }

  private get projectId(): number | null {
    const id = Number(this.project?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private t(key: string, fallback: string): string {
    const value = this.translate.instant(key);
    return value && value !== key ? value : fallback;
  }
}
