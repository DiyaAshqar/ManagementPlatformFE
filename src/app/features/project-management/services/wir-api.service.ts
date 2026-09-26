import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BooleanResponse,
  CloneProjectWirCommand,
  CreateProjectWirCommand,
  CreateWirChecklistItemCommand,
  GetProjectWirDtoListPagedResponseResponse,
  GetProjectWirDtoResponse,
  GetWirChecklistItemDtoListPagedResponseResponse,
  Int32Response,
  ProjectWirClient,
  WirChecklistItemClient,
} from '../../../../nswag/api-client';

/** Wrapper around the generated ProjectWir / WirChecklistItem clients (Work Inspection Requests). */
@Injectable({ providedIn: 'root' })
export class WirApiService {
  private readonly wirClient = inject(ProjectWirClient);
  private readonly checklistClient = inject(WirChecklistItemClient);

  getByStageId(stageId: number, pageNumber = 1, pageSize = 100): Observable<GetProjectWirDtoListPagedResponseResponse> {
    return this.wirClient.getByStageId(stageId, pageNumber, pageSize, undefined);
  }

  getById(id: number): Observable<GetProjectWirDtoResponse> {
    return this.wirClient.getById(id);
  }

  /** Creates when `id` is 0/undefined, updates otherwise. Returns the WIR id. */
  createOrUpdate(command: CreateProjectWirCommand): Observable<Int32Response> {
    return this.wirClient.createOrUpdate(command);
  }

  delete(id: number): Observable<BooleanResponse> {
    return this.wirClient.delete(id);
  }

  /** Creates a new revision (RevNo + 1) of an existing WIR. */
  createRevision(projectWirId: number): Observable<GetProjectWirDtoResponse> {
    return this.wirClient.clone(new CloneProjectWirCommand({ projectWirId }));
  }

  /** Master checklist catalog used by the details dropdown. */
  getChecklistItems(pageSize = 500): Observable<GetWirChecklistItemDtoListPagedResponseResponse> {
    return this.checklistClient.getAll(1, pageSize, undefined);
  }

  /** Creates when `id` is 0/undefined, updates otherwise. */
  saveChecklistItem(command: CreateWirChecklistItemCommand): Observable<BooleanResponse> {
    return this.checklistClient.createOrUpdate(command);
  }

  deleteChecklistItem(id: number): Observable<BooleanResponse> {
    return this.checklistClient.delete(id);
  }
}
