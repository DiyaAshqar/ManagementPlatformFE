import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  ProjectBOQClient,
  CreateProjectBOQCommand,
  GetProjectBOQDtoListPagedResponseResponse,
  GetProjectBOQDtoResponse,
  BooleanResponse
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class BoqApiService {

  constructor(private boqClient: ProjectBOQClient) {}

  /**
   * Create or update a BOQ item (POST /api/ProjectBOQ)
   * Used for both create (id = 0 / undefined) and update (id = existing id)
   */
  createOrUpdate(command: CreateProjectBOQCommand): Observable<BooleanResponse> {
    return this.boqClient.createOrUpdate(command);
  }

  /**
   * Delete a BOQ item (DELETE /api/ProjectBOQ?Id=&ProjectStageId=)
   */
  delete(id: number, projectStageId: number): Observable<BooleanResponse> {
    return this.boqClient.delete(id, projectStageId);
  }

  /**
   * Get a BOQ item by id (GET /api/ProjectBOQ/{id})
   */
  getById(id: number): Observable<GetProjectBOQDtoResponse> {
    return this.boqClient.getById(id);
  }

  /**
   * Get all BOQ items by stage id (GET /api/ProjectBOQ/by-stage)
   */
  getByStageId(
    stageId: number,
    pageNumber: number = 1,
    pageSize: number = 100
  ): Observable<GetProjectBOQDtoListPagedResponseResponse> {
    return this.boqClient.getByStageId(stageId, pageNumber, pageSize, undefined);
  }
}
