import { Component, Input } from '@angular/core';
import { AttachmentType } from '../../../../../../../nswag/api-client';
import { AttachmentTypeMap } from '../../../../../../shared/services/attachment.service';
import { DocumentsTableComponent } from '../../../../../../shared/components/documents-table/documents-table.component';

@Component({
  selector: 'app-milestone-documents-tab',
  standalone: true,
  imports: [DocumentsTableComponent],
  template: `
    <app-documents-table
      [attachmentType]="attachmentType"
      [relationshipId]="projectStageId"
      contextLabel="this milestone">
    </app-documents-table>
  `,
  styles: [':host { display: block; padding-top: 1rem; }'],
})
export class MilestoneDocumentsTabComponent {
  @Input() projectStageId: number = 0;
  readonly attachmentType: AttachmentType = AttachmentTypeMap.Milestone;
}
