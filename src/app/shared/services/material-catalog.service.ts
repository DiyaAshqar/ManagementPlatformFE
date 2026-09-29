import { Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, map, of, shareReplay, tap } from 'rxjs';

import {
  GetMaterialDto,
  GetMaterialDtoListPagedResponseResponse,
  MaterialClient,
} from '../../../nswag/api-client';

@Injectable({ providedIn: 'root' })
export class MaterialCatalogService {
  private readonly materialCache = signal<ReadonlyMap<number, GetMaterialDto>>(new Map());
  private readonly pendingById = new Map<number, Observable<GetMaterialDto | undefined>>();
  private readonly pendingPages = new Map<string, Observable<GetMaterialDtoListPagedResponseResponse>>();

  constructor(private materialClient: MaterialClient) {}

  getPage(
    pageNumber: number,
    pageSize: number,
    filter?: string
  ): Observable<GetMaterialDtoListPagedResponseResponse> {
    const requestKey = `${filter ?? ''}\u0000${pageNumber}\u0000${pageSize}`;
    const pending = this.pendingPages.get(requestKey);
    if (pending) {
      return pending;
    }

    const request = this.materialClient.getAll(pageNumber, pageSize, filter, undefined).pipe(
      tap((response) => this.remember(response.data?.data ?? [])),
      finalize(() => this.pendingPages.delete(requestKey)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.pendingPages.set(requestKey, request);
    return request;
  }

  getById(id: number): Observable<GetMaterialDto | undefined> {
    const cached = this.getCached(id);
    if (cached) {
      return of(cached);
    }

    const pending = this.pendingById.get(id);
    if (pending) {
      return pending;
    }

    const request = this.materialClient.getById(id).pipe(
      map((response) => response.succeeded ? response.data : undefined),
      tap((material) => this.remember(material ? [material] : [])),
      catchError((error) => {
        console.error(`Error loading material ${id}:`, error);
        return of(undefined);
      }),
      finalize(() => this.pendingById.delete(id)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.pendingById.set(id, request);
    return request;
  }

  ensureByIds(ids: Array<number | null | undefined>): Observable<GetMaterialDto[]> {
    const uniqueIds = [...new Set(ids.filter((id): id is number => id != null && id > 0))];
    if (uniqueIds.length === 0) {
      return of([]);
    }

    return forkJoin(uniqueIds.map((id) => this.getById(id))).pipe(
      map((materials) => materials.filter((material): material is GetMaterialDto => !!material))
    );
  }

  getCached(id: number | null | undefined): GetMaterialDto | undefined {
    return id == null ? undefined : this.materialCache().get(id);
  }

  getName(id: number | null | undefined, fallback = 'Unknown'): string {
    return this.getCached(id)?.name?.trim() || fallback;
  }

  private remember(materials: GetMaterialDto[]): void {
    const validMaterials = materials.filter((material) => material.id != null);
    if (validMaterials.length === 0) {
      return;
    }

    this.materialCache.update((current) => {
      const next = new Map(current);
      for (const material of validMaterials) {
        next.set(material.id!, material);
      }
      return next;
    });
  }
}
