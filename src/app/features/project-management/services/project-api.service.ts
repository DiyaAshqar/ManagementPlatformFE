import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ProjectClient,
  CreateProjectCommand,
  GetProjectDtoListPagedResponseResponse,
  GetProjectDtoResponse,
  Int32Response
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class ProjectApiService {

  constructor(private projectClient: ProjectClient) { }

  // Project methods
  createProject(command: CreateProjectCommand): Observable<Int32Response> {
    return this.projectClient.createProject(command);
  }

  getAllProjects(pageNumber?: number, pageSize?: number, filterByTitle?: string): Observable<GetProjectDtoListPagedResponseResponse> {
    return this.projectClient.getAllProjects(pageNumber, pageSize, filterByTitle);
  }

  getProjectById(id: number): Observable<GetProjectDtoResponse> {
    return this.projectClient.getProjectById(id);
  }
}
