import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssignRolePermissionsCommand,
  BooleanResponse,
  RolePermissionsDtoResponse,
  RolesClient,
} from '../../../../nswag/api-client';

@Injectable({ providedIn: 'root' })
export class RolePermissionsApiService {
  constructor(private readonly rolesClient: RolesClient) {}

  getRolePermissions(roleId: number): Observable<RolePermissionsDtoResponse> {
    return this.rolesClient.getRolePermissions(roleId);
  }

  assignRolePermissions(
    roleId: number,
    body: AssignRolePermissionsCommand
  ): Observable<BooleanResponse> {
    return this.rolesClient.assignRolePermissions(roleId, body);
  }
}
