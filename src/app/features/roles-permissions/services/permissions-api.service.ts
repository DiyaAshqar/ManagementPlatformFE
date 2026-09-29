import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BooleanResponse,
  CreatePermissionCommand,
  PermissionDtoListResponse,
  PermissionDtoResponse,
  PermissionsClient,
  UpdatePermissionCommand,
} from '../../../../nswag/api-client';

@Injectable({ providedIn: 'root' })
export class PermissionsApiService {
  constructor(private readonly permissionsClient: PermissionsClient) {}

  getAll(): Observable<PermissionDtoListResponse> {
    return this.permissionsClient.getAll();
  }

  getById(id: number): Observable<PermissionDtoResponse> {
    return this.permissionsClient.getById(id);
  }

  create(body: CreatePermissionCommand): Observable<BooleanResponse> {
    return this.permissionsClient.create(body);
  }

  update(id: number, body: UpdatePermissionCommand): Observable<BooleanResponse> {
    return this.permissionsClient.update(id, body);
  }

  delete(id: number): Observable<BooleanResponse> {
    return this.permissionsClient.delete(id);
  }
}
