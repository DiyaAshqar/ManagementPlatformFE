import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConstructorClient,
  CreateConstructorCommand,
  GetConstructorDtoListPagedResponseResponse,
  GetConstructorDtoResponse,
  BooleanResponse,
  LookupClient,
  LookupDto,
  LookupType
} from '../../../../nswag/api-client';
import { getLookupData } from '../../../shared/utils/lookup.util';

@Injectable({
  providedIn: 'root'
})
export class ConstructorService {

  constructor(
    private constructorClient: ConstructorClient,
    private lookupClient: LookupClient
  ) { }

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

  // Lookup methods
  getMainContractorTypes(): Observable<LookupDto[]> {
    return this.lookupClient.getAllLookups([LookupType.MainContractType]).pipe(
      map(response => {
        if (response.succeeded) {
          return getLookupData(response.data, LookupType.MainContractType) ?? [];
        }
        return [];
      })
    );
  }
}
