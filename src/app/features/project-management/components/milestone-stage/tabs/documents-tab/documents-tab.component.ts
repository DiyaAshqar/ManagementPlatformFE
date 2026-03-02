import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

// Services and Types
import { AttachmentService, AttachmentMetaData, AttachmentTypeMap } from '../../../../../../shared/services/attachment.service';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  file: File;
}

@Component({
  selector: 'app-milestone-documents-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TooltipModule
  ],
  providers: [ConfirmationService],
  templateUrl: './documents-tab.component.html',
  styleUrls: ['./documents-tab.component.scss']
})
export class MilestoneDocumentsTabComponent implements OnInit, OnDestroy {
  @Input() projectStageId: number = 0;

  // Injected services
  private attachmentService = inject(AttachmentService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // Signals for state management
  documents = signal<AttachmentMetaData[]>([]);
  selectedFiles = signal<UploadedFile[]>([]);
  isLoading = signal(false);
  isUploading = signal(false);

  // Dialog states
  showUploadDialog = false;
  isDragging = false;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDocuments(): void {
    if (!this.projectStageId) return;

    this.isLoading.set(true);
    this.attachmentService
      .getAttachments(this.projectStageId, AttachmentTypeMap.Milestone)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => this.documents.set(data),
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load documents',
            life: 5000
          });
        }
      });
  }

  openUploadDialog(): void {
    this.showUploadDialog = true;
    this.selectedFiles.set([]);
  }

  closeUploadDialog(): void {
    this.showUploadDialog = false;
    this.selectedFiles.set([]);
    this.isDragging = false;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  private addFiles(files: File[]): void {
    const newFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      file
    }));
    this.selectedFiles.set([...this.selectedFiles(), ...newFiles]);
  }

  removeFile(index: number): void {
    this.selectedFiles.set(this.selectedFiles().filter((_, i) => i !== index));
  }

  uploadFiles(): void {
    const files = this.selectedFiles();
    if (!files.length) return;

    this.isUploading.set(true);

    const uploads = files.map(f =>
      this.attachmentService.uploadAttachment({
        attachmentType: AttachmentTypeMap.Milestone,
        relationshipId: this.projectStageId,
        file: f.file,
        fileName: f.name
      })
    );

    forkJoin(uploads)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isUploading.set(false))
      )
      .subscribe({
        next: (results) => {
          const ok = results.filter(r => r.succeeded).length;
          const fail = results.length - ok;
          if (ok > 0) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${ok} document(s) uploaded successfully`,
              life: 3000
            });
          }
          if (fail > 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: `${fail} document(s) failed to upload`,
              life: 5000
            });
          }
          this.closeUploadDialog();
          this.loadDocuments();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload documents',
            life: 5000
          });
        }
      });
  }

  downloadDocument(doc: AttachmentMetaData): void {
    this.attachmentService
      .downloadAttachment(doc.id, doc.fileName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Document downloaded',
            life: 3000
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to download document',
            life: 5000
          });
        }
      });
  }

  confirmDelete(doc: AttachmentMetaData): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${doc.fileName}"?`,
      header: 'Delete Document',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteDocument(doc)
    });
  }

  private deleteDocument(doc: AttachmentMetaData): void {
    this.isLoading.set(true);
    this.attachmentService
      .deleteAttachment(doc.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Document deleted successfully',
              life: 3000
            });
            this.loadDocuments();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Failed to delete document',
              life: 5000
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete document',
            life: 5000
          });
        }
      });
  }

  getFileIcon(fileType: string | undefined): string {
    switch (fileType) {
      case 'PDF':   return 'pi pi-file-pdf';
      case 'Excel': return 'pi pi-file-excel';
      case 'Word':  return 'pi pi-file-word';
      case 'Image': return 'pi pi-image';
      default:      return 'pi pi-file';
    }
  }

  getFileType(fileName: string): 'PDF' | 'Excel' | 'Image' | 'Word' | 'Other' {
    return this.attachmentService.determineFileType(fileName);
  }

  getTypeSeverity(fileType: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (fileType) {
      case 'PDF':   return 'danger';
      case 'Excel': return 'success';
      case 'Image': return 'info';
      case 'Word':  return 'info';
      default:      return 'secondary';
    }
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  getDocumentCountByType(type: string): number {
    return this.documents().filter(d => d.fileType === type).length;
  }
}
