import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ProjectClient,
  CreateProjectCommand,
  GetProjectDtoListPagedResponseResponse,
  GetProjectDtoResponse,
  Int32Response,
  AssignProjectUsersCommand,
  UnassignProjectUsersCommand,
  ProjectUserDtoListResponse
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

  // Project users (GET/POST/DELETE /api/Project/{projectId}/users)
  getProjectUsers(projectId: number): Observable<ProjectUserDtoListResponse> {
    return this.projectClient.getProjectUsers(projectId);
  }

  assignProjectUsers(projectId: number, userIds: number[]): Observable<ProjectUserDtoListResponse> {
    return this.projectClient.assignProjectUsers(
      projectId,
      new AssignProjectUsersCommand({ projectId, userIds, replaceExisting: false })
    );
  }

  unassignProjectUsers(projectId: number, userIds: number[]): Observable<ProjectUserDtoListResponse> {
    return this.projectClient.unassignProjectUsers(projectId, new UnassignProjectUsersCommand({ projectId, userIds }));
  }
}
