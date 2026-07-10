import { Component, Input, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AttachmentType } from '../../../../nswag/api-client';
import { AttachmentMetaData, AttachmentService } from '../../services/attachment.service';
import { Permissions } from '../../../core/auth/models/auth.models';
import { AuthService } from '../../../core/auth/services/auth.service';
import { HasPermissionDirective } from '../../../core/auth/directives/has-permission.directive';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

@Component({
  selector: 'app-documents-table',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    TableModule,
    TagModule,
    TooltipModule,
    HasPermissionDirective,
  ],
  providers: [ConfirmationService],
  templateUrl: './documents-table.component.html',
  styleUrls: ['./documents-table.component.scss'],
})
export class DocumentsTableComponent implements OnInit, OnDestroy {
  readonly permissions = Permissions;
  /** The entity type (Project=2, Milestone=3, Task=4 …) */
  @Input({ required: true }) attachmentType!: AttachmentType;
  /** The ID of the owning entity */
  @Input({ required: true }) relationshipId!: number;
  /** Shown inside the upload dialog description */
  @Input() contextLabel = 'this item';

  private attachmentService = inject(AttachmentService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);

  documents = signal<AttachmentMetaData[]>([]);
  selectedFiles = signal<UploadedFile[]>([]);
  isLoading = signal(false);
  isUploading = signal(false);
  isPreviewing = signal(false);
  showUploadDialog = false;
  showPreviewDialog = false;
  previewUrl: string | null = null;
  previewSafeUrl: SafeResourceUrl | null = null;
  previewFileName = '';
  previewType: 'image' | 'pdf' | 'unsupported' = 'unsupported';
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
    if (!this.relationshipId) return;
    this.isLoading.set(true);
    this.attachmentService
      .getAttachments(this.relationshipId, this.attachmentType)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.documents.set(data),
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load documents',
            life: 5000,
          }),
      });
  }

  openUploadDialog(): void {
    if (!this.canManage()) return;
    this.showUploadDialog = true;
    this.selectedFiles.set([]);
  }

  closeUploadDialog(): void {
    this.showUploadDialog = false;
    this.selectedFiles.set([]);
    this.isDragging = false;
  }

  onFileSelect(event: Event): void {
    if (!this.canManage()) return;
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
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
    if (!this.canManage()) return;
    if (event.dataTransfer?.files) this.addFiles(Array.from(event.dataTransfer.files));
  }

  private addFiles(files: File[]): void {
    const newFiles: UploadedFile[] = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    this.selectedFiles.set([...this.selectedFiles(), ...newFiles]);
  }

  removeFile(index: number): void {
    if (!this.canManage()) return;
    this.selectedFiles.set(this.selectedFiles().filter((_, i) => i !== index));
  }

  uploadFiles(): void {
    if (!this.canManage()) return;
    const files = this.selectedFiles();
    if (!files.length) return;
    this.isUploading.set(true);

    forkJoin(
      files.map((f) =>
        this.attachmentService.uploadAttachment({
          attachmentType: this.attachmentType,
          relationshipId: this.relationshipId,
          file: f.file,
          fileName: f.name,
        })
      )
    )
      .pipe(takeUntil(this.destroy$), finalize(() => this.isUploading.set(false)))
      .subscribe({
        next: (results) => {
          const ok = results.filter((r) => r.succeeded).length;
          const fail = results.length - ok;
          if (ok > 0)
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `${ok} document(s) uploaded successfully`,
              life: 3000,
            });
          if (fail > 0)
            this.messageService.add({
              severity: 'warn',
              summary: 'Warning',
              detail: `${fail} document(s) failed to upload`,
              life: 5000,
            });
          this.closeUploadDialog();
          this.loadDocuments();
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload documents',
            life: 5000,
          }),
      });
  }

  previewDocument(doc: AttachmentMetaData): void {
    this.previewFileName = doc.fileName;
    this.previewType = doc.fileType === 'Image' ? 'image' : doc.fileType === 'PDF' ? 'pdf' : 'unsupported';
    if (this.previewType === 'unsupported') {
      this.showPreviewDialog = true;
      return;
    }
    this.isPreviewing.set(true);
    this.attachmentService
      .getAttachmentBlobUrl(doc.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isPreviewing.set(false)))
      .subscribe({
        next: ({ url }) => {
          this.previewUrl = url;
          this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.showPreviewDialog = true;
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load preview',
            life: 5000,
          }),
      });
  }

  closePreviewDialog(): void {
    this.showPreviewDialog = false;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
      this.previewSafeUrl = null;
    }
  }

  downloadDocument(doc: AttachmentMetaData): void {
    this.attachmentService
      .downloadAttachment(doc.id, doc.fileName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () =>
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Document downloaded',
            life: 3000,
          }),
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to download document',
            life: 5000,
          }),
      });
  }

  confirmDelete(doc: AttachmentMetaData): void {
    if (!this.canManage()) return;
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${doc.fileName}"?`,
      header: 'Delete Document',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteDocument(doc),
    });
  }

  private deleteDocument(doc: AttachmentMetaData): void {
    this.isLoading.set(true);
    this.attachmentService
      .deleteAttachment(doc.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Document deleted successfully',
              life: 3000,
            });
            this.loadDocuments();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Failed to delete document',
              life: 5000,
            });
          }
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete document',
            life: 5000,
          }),
      });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

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

  getTypeSeverity(
    fileType: string | undefined
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
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
      day: '2-digit',
    });
  }

  formatFileSize(bytes: number): string {
    return this.attachmentService.formatFileSize(bytes);
  }

  getDocumentCountByType(type: string): number {
    return this.documents().filter((d) => d.fileType === type).length;
  }

  canManage(): boolean {
    return this.authService.hasPermission(Permissions.Documents.Manage);
  }
}
