import { CommonModule } from '@angular/common';
import { Component, ElementRef, input, OnDestroy, OnInit, output, signal, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { finalize, Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { AgreementClient, AttachmentClient, AttachmentDto, SeventhStepDto, FullAgreementDto } from '../../../../../../nswag/api-client';

interface Attachment {
  id?: number;
  name: string;
  type: string;
  file?: File;
  fileName?: string;
  filePath?: string;
  contentType?: string;
  isFromServer?: boolean;
}

@Component({
  selector: 'app-step7',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    ProgressSpinnerModule,
    InputTextModule,
    ProgressBarModule,
    TooltipModule,
    FileUploadModule
  ],
  templateUrl: './step7.component.html',
  styleUrls: ['./step7.component.scss']
})
export class Step7Component implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Angular 19 signals for inputs/outputs
  currentStep = input.required<number>();
  agreementId = input.required<number>();
  stepData = output<any>();

  private router = inject(Router);

  attachmentForm!: FormGroup;
  selectedFile = signal<File | null>(null);
  attachments = signal<Attachment[]>([]);
  isLoading = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  uploadSuccess = signal(false);

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private agreementClient: AgreementClient,
    private attachmentClient: AttachmentClient
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadExistingAttachments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.attachmentForm = this.fb.group({
      attachmentName: ['', [Validators.required, Validators.maxLength(200)]],
      file: [null, [Validators.required]]
    });
  }

  onFileInputClick(): void {
    this.fileInput?.nativeElement?.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);
      this.attachmentForm.patchValue({ file });
      this.attachmentForm.get('file')?.markAsTouched();
      
      // Simulate upload progress
      this.simulateFileUpload();
    }
  }

  private simulateFileUpload(): void {
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.uploadSuccess.set(false);

    const interval = setInterval(() => {
      const increment = Math.floor(Math.random() * 11) + 5;
      const newProgress = Math.min(this.uploadProgress() + increment, 100);
      this.uploadProgress.set(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.isUploading.set(false);
          this.uploadSuccess.set(true);
          this.uploadProgress.set(0);
          
          setTimeout(() => {
            this.uploadSuccess.set(false);
          }, 3000);
        }, 500);
      }
    }, 200);
  }

  addAttachment(): void {
    if (this.attachmentForm.invalid || !this.selectedFile()) {
      this.attachmentForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a file and enter an attachment name',
        life: 5000
      });
      return;
    }

    const file = this.selectedFile()!;
    const newAttachment: Attachment = {
      name: this.attachmentForm.value.attachmentName,
      type: this.getFileExtension(file.name),
      file: file,
      fileName: file.name,
      contentType: file.type || this.toMimeType(file.name),
      isFromServer: false
    };

    this.attachments.set([...this.attachments(), newAttachment]);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Attachment added successfully',
      life: 3000
    });

    this.clearForm();
  }

  clearForm(): void {
    this.attachmentForm.reset();
    this.selectedFile.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  viewAttachment(attachment: Attachment): void {
    const isPdf = this.isPdfFile(attachment);
    
    if (!isPdf) {
      this.messageService.add({
        severity: 'error',
        summary: 'Preview Not Available',
        detail: 'Only PDF files can be previewed',
        life: 5000
      });
      return;
    }

    if (attachment.file) {
      // Local file
      const url = URL.createObjectURL(attachment.file);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } else if (attachment.isFromServer && attachment.id) {
      // Server file - download and open in new tab
      this.downloadAttachment(attachment, true);
    }
  }

  downloadAttachment(attachment: Attachment, openInNewTab: boolean = false): void {
    if (attachment.file) {
      // Local file
      const url = URL.createObjectURL(attachment.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName || attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (attachment.isFromServer && attachment.id) {
      // Server file
      this.isLoading.set(true);
      this.attachmentClient
        .downloadAttachment(attachment.id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading.set(false))
        )
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'File downloaded successfully',
              life: 3000
            });
          },
          error: (error) => {
            console.error('Error downloading attachment:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to download attachment',
              life: 5000
            });
          }
        });
    }
  }

  validateStep(): void {
    if (this.attachments().length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please add at least one attachment',
        life: 5000
      });
      return;
    }

    this.submitStep();
  }

  private async submitStep(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const attachmentDto = await Promise.all(
        this.attachments()
          .filter(att => !att.isFromServer)
          .map(async att => {
            const dto = new AttachmentDto();
            dto.id = 0;
            dto.fileName = att.name || att.file?.name || '';
            dto.filePath = '';
            dto.base64Data = att.file ? await this.convertFileToBase64(att.file) : '';
            dto.contentType = this.toMimeType(att.type || att.file?.type || att.file?.name || '');
            return dto;
          })
      );

      // Create SeventhStepDto
      const stepDataValue = new SeventhStepDto();
      stepDataValue.agreementId = this.agreementId();
      stepDataValue.attachmentDto = attachmentDto;

      // Create FullAgreementDto with step 7 data
      const fullAgreementDto = new FullAgreementDto();
      fullAgreementDto.step = 7;
      fullAgreementDto.agreementId = this.agreementId();
      fullAgreementDto.seventhStepDto = stepDataValue;

      // Log the payload for debugging
      console.log('Step 7 Payload:', JSON.stringify({
        step: fullAgreementDto.step,
        agreementId: fullAgreementDto.agreementId,
        seventhStepDto: {
          agreementId: stepDataValue.agreementId,
          attachmentDto: stepDataValue.attachmentDto?.map(att => ({
            id: att.id,
            fileName: att.fileName,
            filePath: att.filePath,
            base64Data: att.base64Data?.substring(0, 50) + '...', // Truncate for readability
            contentType: att.contentType
          }))
        }
      }, null, 2));

      // Call the API
      this.agreementClient
        .createAgreement(fullAgreementDto)
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
                detail: response.message || 'Agreement completed successfully',
                life: 3000
              });

              // Emit data to parent component for state management
              this.stepData.emit(stepDataValue);

              this.router.navigate(['/agreement-wizard/success']);
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: response.message || 'Failed to submit step 7',
                life: 5000
              });
            }
          },
          error: (error) => {
            console.error('Error submitting step 7:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to submit step 7. Please try again.',
              life: 5000
            });
          }
        });
    } catch (error) {
      console.error('Error processing attachments:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to process attachments',
        life: 5000
      });
      this.isLoading.set(false);
    }
  }

  private loadExistingAttachments(): void {
    const agreementId = this.agreementId();
    // Only load attachments in edit mode (when agreementId > 0)
    if (!agreementId || agreementId <= 0) {
      return;
    }

    this.isLoading.set(true);
    this.attachmentClient
      .getAttachmentsByAgreementId(agreementId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response.succeeded && response.data) {
            const loadedAttachments: Attachment[] = response.data.map(att => ({
              id: att.id,
              name: att.fileName || '',
              type: this.getFileExtension(att.fileName || ''),
              fileName: att.fileName,
              filePath: att.filePath,
              contentType: this.toMimeType(att.fileName || ''),
              isFromServer: true
            }));
            
            this.attachments.set(loadedAttachments);
            
            if (loadedAttachments.length > 0) {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: `Loaded ${loadedAttachments.length} existing attachment(s)`,
                life: 3000
              });
            }
          }
        },
        error: (error) => {
          console.error('Error loading attachments:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load existing attachments',
            life: 5000
          });
        }
      });
  }

  deleteAttachment(index: number): void {
    const attachmentsList = [...this.attachments()];
    const attachment = attachmentsList[index];

    // If it's a server attachment, call the delete API
    if (attachment.isFromServer && attachment.id) {
      this.isLoading.set(true);
      this.attachmentClient
        .deleteAttachment(attachment.id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading.set(false))
        )
        .subscribe({
          next: (response) => {
            if (response.succeeded) {
              attachmentsList.splice(index, 1);
              this.attachments.set(attachmentsList);
              
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Attachment deleted successfully',
                life: 3000
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: response.message || 'Failed to delete attachment',
                life: 5000
              });
            }
          },
          error: (error) => {
            console.error('Error deleting attachment:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete attachment',
              life: 5000
            });
          }
        });
    } else {
      // Local attachment, just remove from array
      attachmentsList.splice(index, 1);
      this.attachments.set(attachmentsList);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Attachment removed successfully',
        life: 3000
      });
    }
  }

  // Helper methods
  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  getFileSize(file: File | null): string {
    if (!file) return '';
    
    const bytes = file.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    
    return `${size} ${sizes[i]}`;
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  }

  private toMimeType(filenameOrType: string): string {
    if (!filenameOrType) return 'application/octet-stream';
    const lower = filenameOrType.toLowerCase();
    
    if (lower.includes('/')) return lower;
    if (lower.endsWith('.pdf') || lower === 'pdf') return 'application/pdf';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower === 'jpg' || lower === 'jpeg') return 'image/jpeg';
    if (lower.endsWith('.png') || lower === 'png') return 'image/png';
    if (lower.endsWith('.doc') || lower === 'doc') return 'application/msword';
    if (lower.endsWith('.docx') || lower === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    return 'application/octet-stream';
  }

  isPdfFile(attachment: Attachment): boolean {
    const isPdfByMime = (attachment.type || attachment.contentType || '').toLowerCase() === 'application/pdf';
    const isPdfByName = (attachment.file?.name || attachment.fileName || '').toLowerCase().endsWith('.pdf');
    return isPdfByMime || isPdfByName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.attachmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.attachmentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['maxLength']) return 'Value is too long';
    }
    return '';
  }
}
