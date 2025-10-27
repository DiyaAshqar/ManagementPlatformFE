import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

// Services
import { AgreementWizardService } from '../../services/agreement-wizard.service';
import { GetAllAgreementDto } from '../../../../../nswag/api-client';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
    selector: 'app-agreement-list',
    standalone: true,
    imports: [
        CommonModule,
        TranslateModule,
        TableModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        TooltipModule,
        ConfirmDialogModule,
        ToastModule
    ],
    providers: [ConfirmationService, MessageService],
    templateUrl: './agreement-list.component.html',
    styleUrls: ['./agreement-list.component.scss']
})
export class AgreementListComponent {
    agreements = signal<GetAllAgreementDto[]>([]);
    loading = signal<boolean>(false);
    totalRecords = signal<number>(0);

    // Pagination
    first = 0;
    rows = 10;

    constructor(
        private agreementService: AgreementWizardService,
        private router: Router,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) { }


    loadAgreements(page: number = 1): void {
        this.loading.set(true);

        this.agreementService.getAllAgreements(page, this.rows).subscribe({
            next: (response) => {
                if (response.succeeded && response.data?.data) {
                    this.agreements.set(response.data.data);
                    this.totalRecords.set(response.data.totalRecords || 0);
                } else {
                    this.agreements.set([]);
                    this.totalRecords.set(0);
                }
                this.loading.set(false);
            },
            error: (error) => {
                console.error('Error loading agreements:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load agreements'
                });
                this.loading.set(false);
            }
        });
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        const page = Math.floor(event.first / event.rows) + 1;
        this.loadAgreements(page);
    }

    addNewAgreement(): void {
        this.router.navigate(['/agreement-wizard/create']);
    }

    editAgreement(agreement: GetAllAgreementDto): void {
        if (agreement.id) {
            this.router.navigate(['/agreement-wizard/edit', agreement.id]);
        }
    }

    deleteAgreement(agreement: GetAllAgreementDto): void {
        this.confirmationService.confirm({
            message: `Are you sure you want to delete agreement "${agreement.projectName}"?`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                // TODO: Implement delete API call when available
                console.log('Delete agreement:', agreement.id);
                this.messageService.add({
                    severity: 'info',
                    summary: 'Info',
                    detail: 'Delete functionality to be implemented'
                });

                // After successful deletion, reload the list
                // this.loadAgreements();
            }
        });
    }

    viewAgreement(agreement: GetAllAgreementDto): void {
        if (agreement.id) {
            this.router.navigate(['/agreement-wizard/view', agreement.id]);
        }
    }

    formatDate(date: Date | undefined): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
    }
}
