import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Project } from '../../models';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

interface OwnerPaymentRecord {
  id: number;
  createdAt: Date;
  amount: number;
  currency: string;
  paymentType: string;
  referenceNumber?: string;
  notes?: string;
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
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './owner-payment-tab.component.html',
  styleUrls: ['./owner-payment-tab.component.scss'],
})
export class OwnerPaymentTabComponent {
  @Input() project: Project | null = null;

  createdAt = signal<Date>(new Date());
  amount = signal<number | null>(null);
  currency = signal<string>('JOD');
  paymentType = signal<string>('cash');
  referenceNumber = signal<string>('');
  notes = signal<string>('');
  submitted = signal<boolean>(false);
  records = signal<OwnerPaymentRecord[]>([]);

  currencies: SelectOption[] = [
    { label: 'JOD', value: 'JOD' },
    { label: 'USD', value: 'USD' },
    { label: 'EUR', value: 'EUR' },
  ];

  paymentTypes: SelectOption[] = [];

  isReferenceDisabled = computed(() => this.paymentType() === 'cash');
  totalPaid = computed(() => this.records().reduce((sum, record) => sum + record.amount, 0));

  constructor(
    private messageService: MessageService,
    private translate: TranslateService
  ) {
    this.paymentTypes = [
      { label: this.translate.instant('ownerPaymentEntry.paymentTypes.cash'), value: 'cash' },
      { label: this.translate.instant('ownerPaymentEntry.paymentTypes.cheque'), value: 'cheque' },
      { label: this.translate.instant('ownerPaymentEntry.paymentTypes.transfer'), value: 'transfer' },
    ];
  }

  onPaymentTypeChange(value: string): void {
    this.paymentType.set(value);
    if (value === 'cash') {
      this.referenceNumber.set('');
    }
  }

  savePayment(): void {
    this.submitted.set(true);

    if (!this.createdAt() || !this.amount() || this.amount()! <= 0 || !this.currency() || !this.paymentType()) {
      return;
    }

    const nextRecord: OwnerPaymentRecord = {
      id: Date.now(),
      createdAt: this.createdAt(),
      amount: this.amount()!,
      currency: this.currency(),
      paymentType: this.paymentType(),
      referenceNumber: this.referenceNumber().trim() || undefined,
      notes: this.notes().trim() || undefined,
    };

    this.records.update((current) => [nextRecord, ...current]);
    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('common.success'),
      detail: this.translate.instant('ownerPaymentEntry.messages.saved'),
    });
    this.resetForm();
  }

  resetForm(): void {
    this.submitted.set(false);
    this.createdAt.set(new Date());
    this.amount.set(null);
    this.currency.set('JOD');
    this.paymentType.set('cash');
    this.referenceNumber.set('');
    this.notes.set('');
  }

  getPaymentTypeLabel(value: string): string {
    return this.paymentTypes.find((option) => option.value === value)?.label ?? value;
  }

  formatAmount(value: number, currency: string = this.currency()): string {
    return `${value.toFixed(2)} ${currency}`;
  }
}
