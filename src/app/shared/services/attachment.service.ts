import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AttachmentClient,
  AttachmentType,
  GetAttachmentMetaData,
  UploadAttachmentCommand,
  BooleanResponse,
  GetAttachmentMetaDataListResponse,
  GetAttachmentMetaDataResponse,
  API_BASE_URL
} from '../../../nswag/api-client';
import { Inject, Optional } from '@angular/core';

/**
 * Enum mapping for AttachmentType with human-readable names
 * AttachmentType enum values:
 * - Agreement = 1
 * - Project = 2
 * - Milestone = 3
 * - Task = 4
 * - ProjectPO = 5
 * - SurveyingVisit = 6
 */
export const AttachmentTypeMap = {
  Agreement: AttachmentType._1,
  Project: AttachmentType._2,
  Milestone: AttachmentType._3,
  Task: AttachmentType._4,
  ProjectPO: AttachmentType._5,
  SurveyingVisit: AttachmentType._6
} as const;

export interface AttachmentUploadParams {
  attachmentType: AttachmentType;
  relationshipId: number;
  file: File;
  fileName?: string;
}

export interface AttachmentMetaData {
  id: number;
  fileName: string;
  filePath: string;
  relationshipId: number;
  contentType?: string;
  size?: number;
  uploadDate?: Date;
  uploadedBy?: string;
  fileType?: 'PDF' | 'Excel' | 'Image' | 'Word' | 'Other';
}

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  private attachmentClient = inject(AttachmentClient);
  private http = inject(HttpClient);
  private baseUrl: string;

  constructor(@Optional() @Inject(API_BASE_URL) baseUrl?: string) {
    this.baseUrl = baseUrl ?? '';
  }

  /**
   * Upload an attachment with base64 data
   * This is a global method that can be used across all modules
   * @param params - Upload parameters including type, relationshipId, and file
   */
  uploadAttachment(params: AttachmentUploadParams): Observable<BooleanResponse> {
    return new Observable(observer => {
      this.convertFileToBase64(params.file).then(base64Data => {
        const command = new UploadAttachmentCommand();
        command.attachmentType = params.attachmentType;
        command.relationshipId = params.relationshipId;
        command.fileName = params.fileName || params.file.name;
        command.filePath = ''; // Server will handle path
        command.base64Data = base64Data;
        command.contentType = params.file.type || this.getMimeType(params.file.name);

        this.attachmentClient.createOrUpdate(command).subscribe({
          next: (response) => {
            observer.next(response);
            observer.complete();
          },
          error: (error) => observer.error(error)
        });
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Get attachments by relationship ID and type
   * @param relationshipId - The ID of the related entity (project, task, etc.)
   * @param attachmentType - The type of attachment
   */
  getAttachments(relationshipId: number, attachmentType: AttachmentType): Observable<AttachmentMetaData[]> {
    return this.attachmentClient.getAttachmentsByAgreementId(relationshipId, attachmentType).pipe(
      map(response => {
        if (response.succeeded && response.data) {
          return response.data.map(att => this.mapToAttachmentMetaData(att));
        }
        return [];
      })
    );
  }

  /**
   * Get a single attachment by ID
   * @param id - Attachment ID
   */
  getAttachmentById(id: number): Observable<GetAttachmentMetaDataResponse> {
    return this.attachmentClient.getAttachmentById(id);
  }

  /**
   * Delete an attachment
   * @param id - Attachment ID to delete
   */
  deleteAttachment(id: number): Observable<BooleanResponse> {
    return this.attachmentClient.deleteAttachment(id);
  }

  /**
   * Fetch an attachment as a blob URL for in-browser preview.
   * Caller is responsible for calling URL.revokeObjectURL() when done.
   */
  getAttachmentBlobUrl(id: number): Observable<{ url: string; mimeType: string }> {
    const url = `${this.baseUrl}/api/Attachment/${id}/download`;
    return this.http.get(url, { responseType: 'blob', observe: 'response' }).pipe(
      map(response => {
        const blob = response.body!;
        const mimeType = blob.type || 'application/octet-stream';
        return { url: URL.createObjectURL(blob), mimeType };
      })
    );
  }

  /**
   * Download an attachment — fetches the binary blob and triggers a browser download.
   * @param id - Attachment ID
   * @param fileName - Optional filename hint (falls back to id)
   */
  downloadAttachment(id: number, fileName?: string): Observable<void> {
    const url = `${this.baseUrl}/api/Attachment/${id}/download`;
    return new Observable(observer => {
      this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
        next: (response) => {
          const blob = response.body!;
          // Derive filename from Content-Disposition header, fallback to provided name or id
          let name = fileName;
          if (!name) {
            const disposition = response.headers.get('content-disposition') ?? '';
            const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'"\n;]+)\1/);
            name = match ? match[2].trim() : `attachment-${id}`;
          }
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
          observer.next();
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Convert a File to base64 string
   */
  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:mime;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Map API response to our AttachmentMetaData interface
   */
  private mapToAttachmentMetaData(att: GetAttachmentMetaData): AttachmentMetaData {
    const displayName = att.originalName || att.fileName || '';
    return {
      id: att.id || 0,
      fileName: displayName,
      filePath: att.filePath || '',
      relationshipId: att.relationshipId || 0,
      fileType: this.determineFileType(displayName)
    };
  }

  /**
   * Determine the file type category based on extension
   */
  determineFileType(fileName: string): 'PDF' | 'Excel' | 'Image' | 'Word' | 'Other' {
    const extension = this.getFileExtension(fileName).toLowerCase();
    
    if (extension === 'pdf') return 'PDF';
    if (['xls', 'xlsx', 'csv'].includes(extension)) return 'Excel';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) return 'Image';
    if (['doc', 'docx'].includes(extension)) return 'Word';
    return 'Other';
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop() || '';
  }

  /**
   * Get MIME type from filename
   */
  getMimeType(fileName: string): string {
    const extension = this.getFileExtension(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'txt': 'text/plain',
      'csv': 'text/csv'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}
