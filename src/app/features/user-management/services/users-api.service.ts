import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssignRoleCommand,
  BooleanResponse,
  RemoveRoleCommand,
  UserDtoListResponse,
  UserDtoResponse,
  UsersClient,
} from '../../../../nswag/api-client';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  constructor(private readonly usersClient: UsersClient) {}

  getAllUsers(): Observable<UserDtoListResponse> {
    return this.usersClient.getAllUsers();
  }

  getUserById(id: number): Observable<UserDtoResponse> {
    return this.usersClient.getUserById(id);
  }

  assignRole(userId: number, roleId: number): Observable<BooleanResponse> {
    return this.usersClient.assignRole(new AssignRoleCommand({ userId, roleId }));
  }

  removeRole(userId: number, roleId: number): Observable<BooleanResponse> {
    return this.usersClient.removeRole(new RemoveRoleCommand({ userId, roleId }));
  }

  activateUser(id: number): Observable<BooleanResponse> {
    return this.usersClient.activateUser(id);
  }

  deactivateUser(id: number): Observable<BooleanResponse> {
    return this.usersClient.deactivateUser(id);
  }

  softDeleteUser(id: number): Observable<BooleanResponse> {
    return this.usersClient.softDeleteUser(id);
  }
}
