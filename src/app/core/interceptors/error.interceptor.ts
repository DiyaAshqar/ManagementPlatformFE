import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthService } from '../auth/services/auth.service';

export const ErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const messageService = inject(MessageService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      handleError(error, req, router, messageService, authService);
      return throwError(() => error);
    })
  );
};

function handleError(
  error: HttpErrorResponse,
  req: any,
  router: Router,
  messageService: MessageService,
  authService: AuthService
): void {
  let errorMessage = 'An error occurred';

  if (error.error instanceof ErrorEvent) {
    // Client-side error
    errorMessage = `Error: ${error.error.message}`;
  } else {
    // Server-side error
    switch (error.status) {
      case 400:
        errorMessage = error.error?.message || 'Bad Request';
        break;
      case 401:
        errorMessage = 'Unauthorized. Please login again.';
        authService.logout();
        break;
      case 403:
        errorMessage = 'Access Forbidden';
        break;
      case 404:
        errorMessage = 'Resource Not Found';
        break;
      case 500:
        errorMessage = 'Internal Server Error';
        break;
      default:
        errorMessage = error.error?.message || `Error Code: ${error.status}`;
    }
  }

  // Show error toast (skip if explicitly requested)
  if (!req.headers.has('X-Skip-Error-Toast')) {
    messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000
    });
  }
}
