import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  IGetProjectMainContractorDto,
  ProjectMainContractorPaymentClient
} from '../../../../nswag/api-client';

/**
 * Fills `totalPayments` on main contractors from their actual payment records
 * (sum of `paidAmount`), so it always matches the contractor payments dialog.
 *
 * Not provided in root — the generated clients are component-scoped, so add both
 * this service and `ProjectMainContractorPaymentClient` to the component providers.
 */
@Injectable()
export class MainContractorPaidTotalsService {
  constructor(private paymentClient: ProjectMainContractorPaymentClient) {}

  withPaidTotals<T extends IGetProjectMainContractorDto>(contractors: T[]): Observable<T[]> {
    if (!contractors.length) return of(contractors);

    return forkJoin(
      contractors.map((contractor) =>
        contractor.id
          ? this.paymentClient.getByContractorId(contractor.id, 1, 500, undefined).pipe(
              map((res) => {
                const payments = res.succeeded ? res.data?.data ?? [] : null;
                if (!payments) return contractor;
                contractor.totalPayments = payments.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0);
                return contractor;
              }),
              // Keep the backend value if the payments request fails.
              catchError(() => of(contractor))
            )
          : of(contractor)
      )
    );
  }
}
