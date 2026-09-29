import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, Confirmation } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    TranslateModule
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  private confirmationService = inject(ConfirmationService);

  onAccept(confirmation: Confirmation) {
    if (confirmation.accept) {
      confirmation.accept();
    }
    this.confirmationService.close();
  }

  onReject(confirmation: Confirmation) {
    if (confirmation.reject) {
      confirmation.reject();
    }
    this.confirmationService.close();
  }
}
