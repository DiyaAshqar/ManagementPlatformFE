import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { AttachmentType, FullAgreementDtoResponse, LookupType, ProjectReportDto, ReportClient } from '../../../../../../nswag/api-client';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { Permissions } from '../../../../../core/auth/models/auth.models';
import { AttachmentMetaData, AttachmentService } from '../../../../../shared/services/attachment.service';
import { AgreementWizardService } from '../../../../agreement-wizard/services/agreement-wizard.service';
import { ProjectApiService } from '../../../services/project-api.service';
import { ProjectReportLanguage, ProjectReportSnapshot } from '../models/project-report.model';
import { isImageFileName } from '../utilities/project-report-calculations.util';
import {
  buildProjectReportSnapshot,
  LookupDictionary,
  RawAgreementBundle,
  ReportPermissionFlags,
} from '../utilities/project-report-mapper.util';

export interface LoadProjectReportOptions {
  asOfDate: Date;
  language: ProjectReportLanguage;
  translate: (key: string, params?: Record<string, unknown>) => string;
}

const AGREEMENT_LOOKUPS: LookupType[] = [
  LookupType.Material,
  LookupType.Unit,
  LookupType.Constructor,
  LookupType.Supplier,
  LookupType.Annex,
  LookupType.Country,
  LookupType.City,
  LookupType.AgreementType,
  LookupType.ContractType,
  LookupType.ContractModel,
  LookupType.Service,
];

const MAX_PHOTOS_TO_EMBED = 24;

/** Any one of these grants "financial" visibility for the report — shared with the config dialog's UI gating. */
export const REPORT_FINANCIAL_VIEW_PERMISSIONS: string[] = [
  Permissions.BOQ.View,
  Permissions.OwnerPayments.View,
  Permissions.Advances.View,
  Permissions.PettyCash.View,
  Permissions.MilestoneTabs.ProjectMainContractor,
  Permissions.MilestoneTabs.PurchaseOrders,
  Permissions.MilestoneTabs.VoucherOrders,
  Permissions.MilestoneTabs.SurveyingVisits,
];

/** Any one of these grants document/photo visibility for the report — shared with the config dialog's UI gating. */
export const REPORT_DOCUMENTS_VIEW_PERMISSIONS: string[] = [Permissions.Documents.View, Permissions.ProjectTabs.Documents];

/**
 * Aggregates a `ProjectReportSnapshot` from the real backend: the project
 * record, the bundled `ReportClient.getProjectReport` stage/financial/task
 * data, the linked agreement's wizard-step payloads, lookups, and document
 * attachments. Partial failures degrade gracefully — every branch is
 * individually guarded so one broken endpoint doesn't blank the whole report;
 * failures are recorded and surfaced via `snapshot.meta.failedSections`
 * rather than silently producing an incomplete-but-confident report.
 */
@Injectable({ providedIn: 'root' })
export class ProjectReportDataService {
  private readonly projectApi = inject(ProjectApiService);
  private readonly reportClient = inject(ReportClient);
  private readonly agreementWizard = inject(AgreementWizardService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly authService = inject(AuthService);

  loadSnapshot(projectId: number, options: LoadProjectReportOptions): Observable<ProjectReportSnapshot> {
    const permissions = this.resolvePermissions();

    return this.projectApi.getProjectById(projectId).pipe(
      map((response) => {
        if (!response.succeeded || !response.data) {
          throw new Error(response.message || 'Failed to load the project.');
        }
        return response.data;
      }),
      switchMap((project) => {
        const failedDomains: string[] = [];

        const report$ = this.reportClient.getProjectReport(projectId, undefined).pipe(
          map((r) => (r.succeeded ? r.data ?? null : null)),
          catchError(() => {
            failedDomains.push('ProjectReport');
            return of(null as ProjectReportDto | null);
          })
        );

        const lookups$ = this.agreementWizard.getAllLookups(AGREEMENT_LOOKUPS).pipe(
          map((r) => (r.succeeded ? r.data : undefined)),
          catchError(() => {
            failedDomains.push('Lookups');
            return of(undefined as LookupDictionary);
          })
        );

        const agreementId = project.agreementId;
        const agreement$: Observable<RawAgreementBundle | null> = agreementId
          ? this.fetchAgreementBundle(agreementId, permissions.canViewAgreementPayments, failedDomains)
          : of(null);

        const agreementAttachments$: Observable<AttachmentMetaData[]> = agreementId
          ? this.attachmentService.getAttachments(agreementId, AttachmentType.Agreement).pipe(
              catchError(() => {
                failedDomains.push('AgreementAttachments');
                return of([] as AttachmentMetaData[]);
              })
            )
          : of([]);

        return forkJoin({ report: report$, lookups: lookups$, agreement: agreement$, agreementAttachments: agreementAttachments$ }).pipe(
          switchMap(({ report, lookups, agreement, agreementAttachments }) =>
            this.fetchPhotoDataUrls(report, agreementAttachments, permissions.canViewDocuments).pipe(
              map((photoDataUrls) => {
                const snapshot = buildProjectReportSnapshot({
                  project,
                  report,
                  agreement,
                  agreementAttachments,
                  lookups,
                  permissions,
                  generatedByName: this.authService.currentUser()?.fullName || this.authService.currentUser()?.userName || '',
                  asOfDate: options.asOfDate,
                  language: options.language,
                  failedDomains,
                  photoDataUrls,
                  translate: options.translate,
                });
                return snapshot;
              })
            )
          )
        );
      })
    );
  }

  private resolvePermissions(): ReportPermissionFlags {
    return {
      canViewFinancial: this.authService.hasAnyPermission(REPORT_FINANCIAL_VIEW_PERMISSIONS),
      canViewAgreementPayments: this.authService.hasPermission(Permissions.Agreements.ViewPaymentDetails),
      canViewPaymentClaims: this.authService.hasPermission(Permissions.PaymentClaims.Print),
      canViewContractors: this.authService.hasPermission(Permissions.MilestoneTabs.ProjectMainContractor),
      canViewDocuments: this.authService.hasAnyPermission(REPORT_DOCUMENTS_VIEW_PERMISSIONS),
    };
  }

  /** Fetches the agreement's wizard-step payloads independently, degrading step-by-step rather than all-or-nothing. */
  private fetchAgreementBundle(
    agreementId: number,
    canViewPayments: boolean,
    failedDomains: string[]
  ): Observable<RawAgreementBundle | null> {
    const step = (n: number) =>
      this.agreementWizard.getAgreementById(agreementId, n).pipe(
        map((r: FullAgreementDtoResponse) => (r.succeeded ? r.data ?? null : null)),
        catchError(() => of(null))
      );

    return forkJoin({
      first: step(1),
      milestones: step(3),
      areas: step(4),
      supplierServices: step(6),
      quantityBill: step(7),
      payment: canViewPayments ? step(2) : of(null),
    }).pipe(
      map(({ first, milestones, areas, supplierServices, quantityBill, payment }) => {
        if (!first?.firstStepDto) {
          failedDomains.push('Agreement');
          return null;
        }
        const bundle: RawAgreementBundle = {
          agreementId,
          agreementDto: first.firstStepDto.agreementDto ?? null,
          clientDto: first.firstStepDto.clientDto ?? null,
          landInformationDto: first.firstStepDto.landInformationDto ?? null,
          milestones: milestones?.mileStonesStepDto?.mileStonesDto?.filter((m) => !m.isDeleted) ?? null,
          areas: areas?.thirdStepDto?.projectAreaUnitDto?.filter((a) => !a.isDeleted) ?? null,
          supplierServices: supplierServices?.fifthStepDto?.supplierServiceDto?.filter((s) => !s.isDeleted) ?? null,
          quantityBill: quantityBill?.sixthStepDto?.quantityBillDto?.filter((q) => !q.isDeleted) ?? null,
          payment: canViewPayments ? payment?.secondStepDto?.agreementPaymentDto ?? null : null,
          selectedServiceIds: canViewPayments
            ? payment?.secondStepDto?.agreementServiceDto?.map((s) => s.serviceId).filter((id): id is number => id !== undefined) ?? null
            : null,
        };
        return bundle;
      })
    );
  }

  /**
   * Best-effort, capped fetch of image attachments as base64 data URLs so the
   * print window (opened via `document.write`, no access to the app's auth
   * headers) can render photos without a live authenticated request. Never
   * blocks the report on a single broken image.
   */
  private fetchPhotoDataUrls(
    report: ProjectReportDto | null,
    agreementAttachments: AttachmentMetaData[],
    canViewDocuments: boolean
  ): Observable<Record<number, string>> {
    if (!canViewDocuments) {
      return of({});
    }

    const candidateIds: number[] = [];
    for (const doc of report?.documents ?? []) {
      if (doc.id !== undefined && isImageFileName(doc.originalName || doc.fileName || '')) {
        candidateIds.push(doc.id);
      }
    }
    for (const att of agreementAttachments) {
      if (att.fileType === 'Image') {
        candidateIds.push(att.id);
      }
    }

    const capped = candidateIds.slice(0, MAX_PHOTOS_TO_EMBED);
    if (capped.length === 0) {
      return of({});
    }

    const fetches = capped.map((id) =>
      this.attachmentService.getAttachmentDataUrl(id).pipe(
        map((dataUrl) => ({ id, dataUrl })),
        catchError(() => of({ id, dataUrl: null as string | null }))
      )
    );

    return forkJoin(fetches).pipe(
      map((results) => {
        const dict: Record<number, string> = {};
        for (const r of results) {
          if (r.dataUrl) {
            dict[r.id] = r.dataUrl;
          }
        }
        return dict;
      })
    );
  }
}
