import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AgreementDetailsDtoResponse, GetProjectStagesDetailsQuery, ReportClient } from '../../../../../nswag/api-client';

/** Wrapper around `Report/project-stages-details` for the project Timeframe tab. */
@Injectable({ providedIn: 'root' })
export class TimeframeApiService {
  private readonly reportClient = inject(ReportClient);

  getProjectStagesDetails(projectId: number, projectStageIds?: number[]): Observable<AgreementDetailsDtoResponse> {
    return this.reportClient.getProjectStagesDetails(new GetProjectStagesDetailsQuery({ projectId, projectStageIds }));
  }
}
