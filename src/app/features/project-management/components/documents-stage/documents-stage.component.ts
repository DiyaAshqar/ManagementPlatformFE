import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';

interface Document {
  name: string;
  size: string;
  category: string;
  type?: string;
  uploadedBy?: string;
  uploadedDate?: Date;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  category: string;
  uploadProgress: number;
  file?: File;
}

interface Category {
  label: string;
  value: string;
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
    DialogModule,
    DropdownModule,
    ProgressBarModule,
    TooltipModule
  ],
  templateUrl: './documents-stage.component.html',
  styleUrls: ['./documents-stage.component.scss']
})
export class DocumentsStageComponent implements OnInit {
  @Input() projectId!: string;
  
  documents = signal<Document[]>([]);
  selectedFiles = signal<UploadedFile[]>([]);
  showUploadDialog = false;
  selectedCategory = 'general';

  categories: Category[] = [
    { label: 'General', value: 'general' },
    { label: 'Blueprints', value: 'blueprints' },
    { label: 'Permits', value: 'permits' },
    { label: 'Contracts', value: 'contracts' },
    { label: 'Photos', value: 'photos' },
    { label: 'Reports', value: 'reports' }
  ];

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    // TODO: Load documents from service
    // Mock data for now
    this.documents.set([]);
  }

  openUploadDialog(): void {
    this.showUploadDialog = true;
    this.selectedFiles.set([]);
    this.selectedCategory = 'general';
  }

  closeUploadDialog(): void {
    this.showUploadDialog = false;
    this.selectedFiles.set([]);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  private addFiles(files: File[]): void {
    const newFiles: UploadedFile[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      category: this.selectedCategory,
      uploadProgress: 0,
      file: file
    }));

    const currentFiles = this.selectedFiles();
    this.selectedFiles.set([...currentFiles, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((newFile, index) => {
      const fileIndex = currentFiles.length + index;
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        const files = this.selectedFiles();
        files[fileIndex] = { ...files[fileIndex], uploadProgress: Math.min(progress, 100) };
        this.selectedFiles.set([...files]);
        if (progress >= 100) clearInterval(interval);
      }, 200);
    });
  }

  removeFile(index: number): void {
    const files = this.selectedFiles();
    this.selectedFiles.set(files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  uploadFiles(): void {
    const files = this.selectedFiles();
    console.log('Uploading files for project:', this.projectId, files);
    // TODO: Implement actual file upload logic
    
    // Add uploaded files to documents list
    const newDocuments: Document[] = files.map(f => ({
      name: f.name,
      size: this.formatFileSize(f.size),
      category: f.category,
      type: f.type
    }));
    
    this.documents.set([...this.documents(), ...newDocuments]);
    this.closeUploadDialog();
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
