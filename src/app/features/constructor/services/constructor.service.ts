import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConstructorClient,
  CreateConstructorCommand,
  GetConstructorDtoListPagedResponseResponse,
  GetConstructorDtoResponse,
  BooleanResponse
} from '../../../../nswag/api-client';

@Injectable({
  providedIn: 'root'
})
export class ConstructorService {

  constructor(private constructorClient: ConstructorClient) { }

  // Get all constructors with pagination and filters
  getAllConstructors(
    pageNumber?: number,
    pageSize?: number,
    search?: string
  ): Observable<GetConstructorDtoListPagedResponseResponse> {
    return this.constructorClient.getAll(
      pageNumber,
      pageSize,
      search
    );
  }

  // Get constructor by ID
  getConstructorById(id: number): Observable<GetConstructorDtoResponse> {
    return this.constructorClient.getById(id);
  }

  // Create or update constructor
  createOrUpdateConstructor(command: CreateConstructorCommand): Observable<BooleanResponse> {
    return this.constructorClient.createOrUpdate(command);
  }

  // Delete constructor
  deleteConstructor(id: number): Observable<BooleanResponse> {
    return this.constructorClient.delete(id);
  }
}
