import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
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
import { AttachmentService, AttachmentMetaData, AttachmentTypeMap } from '../../../../shared/services/attachment.service';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  file: File;
}

@Component({
  selector: 'app-documents-stage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
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
  templateUrl: './documents-stage.component.html',
  styleUrls: ['./documents-stage.component.scss']
})
export class DocumentsStageComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  
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

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load documents from API
   */
  loadDocuments(): void {
    if (!this.projectId) return;

    this.isLoading.set(true);
    this.attachmentService
      .getAttachments(Number(this.projectId), AttachmentTypeMap.Project)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.documents.set(data);
        },
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

  /**
   * Open upload dialog
   */
  openUploadDialog(): void {
    this.showUploadDialog = true;
    this.selectedFiles.set([]);
  }

  /**
   * Close upload dialog
   */
  closeUploadDialog(): void {
    this.showUploadDialog = false;
    this.selectedFiles.set([]);
    this.isDragging = false;
  }

  /**
   * Handle file input change
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    // Reset input so same file can be selected again
    input.value = '';
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Add files to the selection list
   */
  private addFiles(files: File[]): void {
    const newFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      file: file
    }));

    const currentFiles = this.selectedFiles();
    this.selectedFiles.set([...currentFiles, ...newFiles]);
  }

  /**
   * Remove file from selection
   */
  removeFile(index: number): void {
    const files = this.selectedFiles();
    this.selectedFiles.set(files.filter((_, i) => i !== index));
  }

  /**
   * Upload all selected files
   */
  uploadFiles(): void {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    this.isUploading.set(true);

    // Create upload observables for all files
    const uploadObservables = files.map(file => 
      this.attachmentService.uploadAttachment({
        attachmentType: AttachmentTypeMap.Project,
        relationshipId: Number(this.projectId),
        file: file.file,
        fileName: file.name
      })
    );

    // Upload all files
    forkJoin(uploadObservables)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isUploading.set(false))
      )
      .subscribe({
        next: (results) => {
          const successCount = results.filter(r => r.succeeded).length;
          const failCount = results.length - successCount;

          if (successCount > 0) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${successCount} document(s) uploaded successfully`,
              life: 3000
            });
          }

          if (failCount > 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: `${failCount} document(s) failed to upload`,
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

  /**
   * Download a document
   */
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

  /**
   * Confirm before deleting a document
   */
  confirmDelete(doc: AttachmentMetaData): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${doc.fileName}"?`,
      header: 'Delete Document',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteDocument(doc);
      }
    });
  }

  /**
   * Delete a document
   */
  private deleteDocument(doc: AttachmentMetaData): void {
    this.isLoading.set(true);
    this.attachmentService
      .deleteAttachment(doc.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response.succeeded) {
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
              detail: response.message || 'Failed to delete document',
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

  /**
   * Get icon class for file type
   */
  getFileIcon(fileType: string | undefined): string {
    switch (fileType) {
      case 'PDF':
        return 'pi pi-file-pdf';
      case 'Excel':
        return 'pi pi-file-excel';
      case 'Word':
        return 'pi pi-file-word';
      case 'Image':
        return 'pi pi-image';
      default:
        return 'pi pi-file';
    }
  }

  /**
   * Get file type from filename
   */
  getFileType(fileName: string): 'PDF' | 'Excel' | 'Image' | 'Word' | 'Other' {
    return this.attachmentService.determineFileType(fileName);
  }

  /**
   * Get tag severity for file type
   */
  getTypeSeverity(fileType: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (fileType) {
      case 'PDF':
        return 'danger';
      case 'Excel':
        return 'success';
      case 'Image':
        return 'info';
      case 'Word':
        return 'info';
      default:
        return 'secondary';
    }
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  /**
   * Get document count by type
   */
  getDocumentCountByType(type: string): number {
    return this.documents().filter(doc => doc.fileType === type).length;
  }
}
