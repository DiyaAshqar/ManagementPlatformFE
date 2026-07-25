import { Injectable } from '@angular/core';

/**
 * Triggers browser downloads for generated report files. Isolated so the
 * export services stay free of DOM plumbing and remain easy to unit test.
 */
@Injectable({ providedIn: 'root' })
export class ReportFileService {
  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      // Give the browser a tick to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  downloadText(text: string, fileName: string, mime = 'text/plain;charset=utf-8'): void {
    this.downloadBlob(new Blob([text], { type: mime }), fileName);
  }
}
