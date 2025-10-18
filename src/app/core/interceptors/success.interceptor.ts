import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

export const SuccessInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  // Only show success messages for POST, PUT, PATCH, DELETE
  const showSuccessFor = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const shouldShowSuccess = showSuccessFor.includes(req.method);

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && shouldShowSuccess) {
        // Skip if explicitly requested
        if (req.headers.has('X-Skip-Success-Toast')) {
          return;
        }

        const successMessage = (event.body as any)?.message || 'Operation completed successfully';

        messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: successMessage,
          life: 3000
        });
      }
    })
  );
};
