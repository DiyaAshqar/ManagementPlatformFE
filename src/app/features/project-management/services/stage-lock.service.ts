import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { BooleanResponse, CloseProjectStageDtoResponse, ProjectStageClient } from '../../../../nswag/api-client';

/** Close & Lock / Unlock of a milestone stage (used by the Payment Claim tab). */
@Injectable({ providedIn: 'root' })
export class StageLockService {
  private readonly stageClient = inject(ProjectStageClient);
  private readonly lockedIds = signal<ReadonlySet<number>>(new Set());

  isLocked(stageId: number | null | undefined): boolean {
    return stageId != null && this.lockedIds().has(stageId);
  }

  /** POST /api/project-stages/{id}/close — locks the stage and migrates open advances / remaining contracts. */
  close(stageId: number): Observable<CloseProjectStageDtoResponse> {
    return this.stageClient.close(stageId).pipe(tap((res) => res.succeeded && this.set(stageId, true)));
  }

  /** POST /api/project-stages/{id}/unlock */
  unlock(stageId: number): Observable<BooleanResponse> {
    return this.stageClient.unlock(stageId).pipe(tap((res) => res.succeeded && this.set(stageId, false)));
  }

  /** Seeds the lock state from the backend `ProjectStageDto.close` flag. */
  sync(stageId: number, closed: boolean | undefined): void {
    if (this.isLocked(stageId) !== !!closed) this.set(stageId, !!closed);
  }

  private set(stageId: number, locked: boolean): void {
    this.lockedIds.update((current) => {
      const next = new Set(current);
      locked ? next.add(stageId) : next.delete(stageId);
      return next;
    });
  }
}
