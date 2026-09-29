import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrintService {
  openAndPrint(html: string): void {
    const win = window.open('', '_blank', 'width=1024,height=800');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => setTimeout(() => win.print(), 400));
  }
}
