import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BooleanResponse,
  CreateFeatureCommand,
  FeatureDtoListResponse,
  FeatureDtoResponse,
  FeaturesClient,
  UpdateFeatureCommand,
} from '../../../../nswag/api-client';

@Injectable({ providedIn: 'root' })
export class FeaturesApiService {
  constructor(private readonly featuresClient: FeaturesClient) {}

  getAll(): Observable<FeatureDtoListResponse> {
    return this.featuresClient.getAll();
  }

  getById(id: number): Observable<FeatureDtoResponse> {
    return this.featuresClient.getById(id);
  }

  create(body: CreateFeatureCommand): Observable<BooleanResponse> {
    return this.featuresClient.create(body);
  }

  update(id: number, body: UpdateFeatureCommand): Observable<BooleanResponse> {
    return this.featuresClient.update(id, body);
  }

  delete(id: number): Observable<BooleanResponse> {
    return this.featuresClient.delete(id);
  }
}
