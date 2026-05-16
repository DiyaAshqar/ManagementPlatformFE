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
    private currencyClient: CurrencyClient
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
