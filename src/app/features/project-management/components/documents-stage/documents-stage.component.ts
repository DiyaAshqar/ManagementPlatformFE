import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DataViewModule } from 'primeng/dataview';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

interface Document {
  name: string;
  type: string;
  size: string;
  uploadedBy?: string;
  uploadedDate?: Date;
}

@Component({
  selector: 'app-documents-stage',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    DataViewModule,
    DialogModule,
    FileUploadModule,
    TooltipModule,
    SkeletonModule
  ],
  templateUrl: './documents-stage.component.html',
  styleUrls: ['./documents-stage.component.scss']
})
export class DocumentsStageComponent implements OnInit {
  @Input() projectId!: string;
  
  documents = signal<Document[]>([]);
  isLoading = signal<boolean>(false);
  showUploadDialog = false;

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    // TODO: Load documents from service
    // Mock data for now
    setTimeout(() => {
      this.documents.set([]);
      this.isLoading.set(false);
    }, 500);
  }

  openUploadDialog(): void {
    this.showUploadDialog = true;
  }

  closeUploadDialog(): void {
    this.showUploadDialog = false;
  }

  uploadFiles(): void {
    // Implement file upload logic
    console.log('Uploading files for project:', this.projectId);
    this.closeUploadDialog();
  }

  onUploadComplete(event: any): void {
    console.log('Upload complete:', event);
    this.loadDocuments();
  }

  viewDocument(document: Document): void {
    console.log('Viewing document:', document);
    // Implement view document logic
  }

  downloadDocument(document: Document): void {
    console.log('Downloading document:', document);
    // Implement download document logic
  }

  deleteDocument(document: Document): void {
    console.log('Deleting document:', document);
    // Implement delete document logic
  }
}
