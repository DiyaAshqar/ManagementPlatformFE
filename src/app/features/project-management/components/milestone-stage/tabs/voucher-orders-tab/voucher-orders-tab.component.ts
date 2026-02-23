import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-voucher-orders-tab',
  standalone: true,
  imports: [],
  template: `
    <div class="tab-placeholder">
      <i class="pi pi-receipt"></i>
      <p>Voucher Orders – coming soon</p>
    </div>
  `,
  styles: [`
    .tab-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: var(--text-color-secondary);
      gap: 0.75rem;

      i { font-size: 2.5rem; opacity: 0.35; }
      p { font-size: 0.95rem; margin: 0; opacity: 0.65; }
    }
  `]
})
export class VoucherOrdersTabComponent {
  @Input() projectStageId: number = 0;
}
