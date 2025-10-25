import { CommonModule } from '@angular/common';
import { Component, ElementRef, input, OnDestroy, OnInit, output, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';

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
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
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

  deleteAttachment(index: number): void {
    const attachmentsList = [...this.attachments()];
    attachmentsList.splice(index, 1);
    this.attachments.set(attachmentsList);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Attachment removed successfully',
      life: 3000
    });
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
      const url = URL.createObjectURL(attachment.file);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  }

  downloadAttachment(attachment: Attachment): void {
    if (attachment.file) {
      const url = URL.createObjectURL(attachment.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName || attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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

    this.emitStepData();
  }

  private async emitStepData(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      const attachmentDto = await Promise.all(
        this.attachments()
          .filter(att => !att.isFromServer)
          .map(async att => ({
            id: 0,
            fileName: att.name || att.file?.name || '',
            filePath: '',
            base64Data: att.file ? await this.convertFileToBase64(att.file) : '',
            contentType: this.toMimeType(att.type || att.file?.type || att.file?.name || '')
          }))
      );

      const stepDataValue = {
        agreementId: this.agreementId(),
        attachmentDto
      };

      this.stepData.emit(stepDataValue);
    } catch (error) {
      console.error('Error processing attachments:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to process attachments',
        life: 5000
      });
    } finally {
      this.isLoading.set(false);
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
