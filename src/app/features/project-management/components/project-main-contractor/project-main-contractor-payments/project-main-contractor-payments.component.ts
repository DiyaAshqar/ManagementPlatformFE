import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnChanges, OnInit, SimpleChanges, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

import { DialogModule } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';
import {
  AttachmentType,
  CreateProjectMainContractorPaymentCommand,
  GetProjectMainContractorPaymentDto,
  IGetProjectMainContractorDto,
  LookupClient,
  LookupType,
  ProjectMainContractorPaymentClient
} from '../../../../../../nswag/api-client';
import { getLookupData } from '../../../../../shared/utils/lookup.util';
import { DocumentsTableComponent } from '../../../../../shared/components/documents-table/documents-table.component';
import { NumberInputComponent } from '../../../../../shared/components/number-input/number-input.component';
import { AppNumberPipe } from '../../../../../shared/pipes/app-number.pipe';

@Component({
  selector: 'app-project-main-contractor-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CalendarModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TooltipModule,
    TagModule,
    DialogModule,
    TextareaModule,
    DocumentsTableComponent,
    NumberInputComponent,
    AppNumberPipe
  ],
  providers: [ProjectMainContractorPaymentClient, LookupClient],
  templateUrl: './project-main-contractor-payments.component.html',
  styleUrl: './project-main-contractor-payments.component.scss'
})
export class ProjectMainContractorPaymentsComponent implements OnInit, OnChanges {
  @Input() contractor!: IGetProjectMainContractorDto;
  @Input() contractorName: string = '';

  @ViewChild('dt') dt!: Table;

  private paymentClient = inject(ProjectMainContractorPaymentClient);
  private lookupClient = inject(LookupClient);
  private confirmationService = inject(ConfirmationService);
  private translate = inject(TranslateService);

  rows: GetProjectMainContractorPaymentDto[] = [];
  clonedRows: { [key: number]: GetProjectMainContractorPaymentDto } = {};
  isLoading = signal(false);

  paymentMethodOptions: { label: string; value: number }[] = [];
  paymentMethodMap: Record<number, string> = {};

  readonly paymentAttachmentType = AttachmentType.ProjectMainContractorPayment;
  selectedPaymentForAttachments: GetProjectMainContractorPaymentDto | null = null;

  private tempIdSeq = -1;

  get totalPaid(): number {
    return this.rows.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
  }

  get remainingBalance(): number {
    return (this.contractor?.amount ?? 0) - this.totalPaid;
  }

  ngOnInit(): void {
    this.loadLookups();
    if (this.contractor?.id) {
      this.loadPayments();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contractor'] && !changes['contractor'].isFirstChange() && this.contractor?.id) {
      this.loadPayments();
    }
  }

  loadLookups(): void {
    this.lookupClient.getAllLookups([LookupType.PaymentMethod]).subscribe({
      next: (res) => {
        const methods = getLookupData(res.data as any, LookupType.PaymentMethod);
        if (methods) {
          this.paymentMethodOptions = (methods as { id: number; name: string }[])
            .map(m => ({ label: m.name, value: m.id }));
          this.paymentMethodMap = Object.fromEntries(this.paymentMethodOptions.map(o => [o.value, o.label]));
        }
      }
    });
  }

  loadPayments(): void {
    this.isLoading.set(true);
    this.paymentClient.getByContractorId(this.contractor.id, 1, 100, undefined).subscribe({
      next: (res) => {
        this.rows = (res.succeeded && res.data?.data) ? res.data.data : [];
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  getMethodLabel(method: number | undefined): string {
    if (method == null) return '—';
    return this.paymentMethodMap[method] ?? '—';
  }

  getMethodSeverity(method: number | undefined): 'success' | 'info' | 'warn' | 'secondary' {
    if (method == null) return 'secondary';
    const palette: ('success' | 'info' | 'warn')[] = ['success', 'info', 'warn'];
    const idx = this.paymentMethodOptions.findIndex(o => o.value === method);
    return idx >= 0 ? palette[idx % palette.length] : 'secondary';
  }

  addNewRow(): void {
    const newRow = new GetProjectMainContractorPaymentDto({
      id: this.tempIdSeq--,
      projectMainContractorId: this.contractor.id,
      paymentDate: new Date()
    });
    this.rows = [newRow, ...this.rows];
    setTimeout(() => this.dt?.initRowEdit(newRow));
  }

  onRowEditInit(item: GetProjectMainContractorPaymentDto): void {
    if (item.id && item.id > 0) {
      this.clonedRows[item.id] = new GetProjectMainContractorPaymentDto(item);
    }
  }

  onRowEditSave(item: GetProjectMainContractorPaymentDto): void {
    const isNew = (item.id ?? 0) <= 0;
    const command = new CreateProjectMainContractorPaymentCommand({
      id: isNew ? undefined : item.id,
      projectMainContractorId: this.contractor.id!,
      paymentDate: item.paymentDate,
      paidAmount: item.paidAmount,
      paymentMethod: item.paymentMethod,
      receiptNo: item.receiptNo || undefined,
      chequeNo: item.chequeNo || undefined,
      transferReferenceNumber: item.transferReferenceNumber || undefined,
      notes: item.notes || undefined
    });

    this.paymentClient.createOrUpdate(command).subscribe({
      next: (res) => {
        if (res.succeeded) {
          if (item.id) delete this.clonedRows[item.id];
          this.loadPayments();
        }
      },
      error: () => {
      }
    });
  }

  onRowEditCancel(item: GetProjectMainContractorPaymentDto, rowIndex: number): void {
    const isNew = (item.id ?? 0) <= 0;
    if (isNew) {
      this.rows = this.rows.filter((_, i) => i !== rowIndex);
    } else if (item.id && this.clonedRows[item.id]) {
      Object.assign(item, this.clonedRows[item.id]);
      delete this.clonedRows[item.id];
    }
  }

  confirmDelete(item: GetProjectMainContractorPaymentDto): void {
    this.confirmationService.confirm({
      message: this.translate.instant('projectTabs.contractorPayment.confirmDelete.message'),
      header: this.translate.instant('projectTabs.contractorPayment.confirmDelete.header'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.paymentClient.delete(item.id!).subscribe({
          next: (res) => {
            if (res.succeeded) {
              this.loadPayments();
            }
          },
          error: () => {
          }
        });
      }
    });
  }

  openAttachments(item: GetProjectMainContractorPaymentDto): void {
    this.selectedPaymentForAttachments = item;
  }

  closeAttachmentsDialog(): void {
    this.selectedPaymentForAttachments = null;
  }
}
