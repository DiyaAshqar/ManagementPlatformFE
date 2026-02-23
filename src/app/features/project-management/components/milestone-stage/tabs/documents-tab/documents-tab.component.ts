import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-milestone-documents-tab',
  standalone: true,
  imports: [],
  template: `
    <div class="tab-placeholder">
      <i class="pi pi-folder"></i>
      <p>Documents – coming soon</p>
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
export class MilestoneDocumentsTabComponent {
  @Input() projectStageId: number = 0;
}
