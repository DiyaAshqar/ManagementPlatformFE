import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AttachmentType } from '../../../../../nswag/api-client';
import { AttachmentTypeMap } from '../../../../shared/services/attachment.service';
import { DocumentsTableComponent } from '../../../../shared/components/documents-table/documents-table.component';

@Component({
  selector: 'app-documents-stage',
  standalone: true,
  imports: [CardModule, DocumentsTableComponent],
  templateUrl: './documents-stage.component.html',
  styleUrls: ['./documents-stage.component.scss'],
})
export class DocumentsStageComponent {
  @Input() projectId!: string;

  readonly attachmentType: AttachmentType = AttachmentTypeMap.Project;

  get relationshipId(): number {
    return Number(this.projectId);
  }
}
