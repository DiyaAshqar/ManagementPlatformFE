import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';

import { OfficeService } from '../../services/office.service';
import { todayIso } from '../../services/office-calc';
import { JodPipe, fileNames } from '../../shared/office-ui';
import { AdminExpense, AdminExpenseCategory, PaymentMethod } from '../../models/office.models';

/** Screen 07 — general office expenses (not tied to any project stage). */
@Component({
  selector: 'app-office-admin-expenses',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule, ButtonModule, TableModule, SelectModule, InputTextModule, InputNumberModule,
    IconFieldModule, InputIconModule, CheckboxModule, TagModule, JodPipe,
  ],
  templateUrl: './admin-expenses.component.html',
})
export class OfficeAdminExpensesComponent {
  private readonly office = inject(OfficeService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly categories: AdminExpenseCategory[] = ['salaries', 'rent', 'utilities', 'internet', 'stationery', 'software', 'transport', 'other'];
  readonly methods: PaymentMethod[] = ['cash', 'cheque', 'transfer', 'card'];
  readonly search = signal('');
  readonly category = signal<AdminExpenseCategory | null>(null);
  readonly from = signal('');
  readonly to = signal('');

  form: Omit<AdminExpense, 'id'> = this.blank();

  readonly rows = computed(() => [...this.office.db().adminExpenses].sort((a, b) => b.date.localeCompare(a.date)));
  readonly filtered = computed(() => {
    const s = this.search().trim().toLowerCase();
    return this.rows().filter((e) =>
      (!this.category() || e.category === this.category()) &&
      (!this.from() || e.date >= this.from()) &&
      (!this.to() || e.date <= this.to()) &&
      (!s || e.description.toLowerCase().includes(s) || (e.supplier ?? '').toLowerCase().includes(s)),
    );
  });
  readonly filteredTotal = computed(() => this.filtered().reduce((s, e) => s + e.amount, 0));

  readonly stats = computed(() => {
    const month = todayIso().slice(0, 7);
    const m = this.rows().filter((e) => e.date.startsWith(month));
    const sum = (f: (e: AdminExpense) => boolean) => m.filter(f).reduce((s, e) => s + e.amount, 0);
    return {
      total: sum(() => true),
      salaries: sum((e) => e.category === 'salaries'),
      rent: sum((e) => e.category === 'rent' || e.category === 'utilities' || e.category === 'internet'),
      other: sum((e) => !['salaries', 'rent', 'utilities', 'internet'].includes(e.category)),
    };
  });

  pickFile(event: Event): void {
    this.form.attachment = fileNames(event)[0];
  }

  save(): void {
    this.office.addAdminExpense(this.form).subscribe((res) => {
      if (res.succeeded) this.form = this.blank();
    });
  }

  remove(e: AdminExpense): void {
    this.confirm.confirm({
      header: this.translate.instant('office.common.deleteTitle'),
      message: this.translate.instant('office.common.deleteMsg', { name: e.description }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.office.deleteAdminExpense(e.id).subscribe(),
    });
  }

  private blank(): Omit<AdminExpense, 'id'> {
    return { category: 'rent', description: '', amount: 0, date: todayIso(), method: 'cash', supplier: '', recurring: false };
  }
}
