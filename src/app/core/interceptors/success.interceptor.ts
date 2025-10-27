import { HttpInterceptorFn, HttpResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, switchMap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { MessageService } from 'primeng/api';

export const SuccessInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    switchMap(event => {
      if (event instanceof HttpResponse) {
        // If body is a Blob, parse it first
        if (event.body instanceof Blob) {
          return from(parseBlobToJson(event.body)).pipe(
            tap(parsedBody => {
              const responseWithParsedBody = event.clone({ body: parsedBody });
              handleResponse(responseWithParsedBody, req, messageService);
            }),
            switchMap(() => of(event))
          );
        }
        
        handleResponse(event, req, messageService);
      }
      return of(event);
    })
  );
};

async function parseBlobToJson(blob: Blob): Promise<any> {
  try {
    const text = await blob.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse blob:', error);
    return null;
  }
}

function handleResponse(
  response: HttpResponse<any>,
  request: HttpRequest<any>,
  messageService: MessageService
): void {
  // Check if response has succeeded: false - treat as error
  if (response.body && 'succeeded' in response.body && response.body.succeeded === false) {
    handleFailedResponse(response, request, messageService);
    return;
  }

  // Otherwise handle as success
  if (shouldSkipSuccessToast(request, response)) {
    return;
  }

  if (shouldShowSuccessToast(request, response)) {
    showSuccessToast(request, response, messageService);
  }
}

function handleFailedResponse(
  response: HttpResponse<any>,
  request: HttpRequest<any>,
  messageService: MessageService
): void {
  // Skip if explicitly requested
  if (request.headers.has('X-Skip-Error-Toast')) {
    return;
  }

  const errorMessage = response.body?.message || 'Operation failed';
  
  messageService.add({
    severity: 'error',
    summary: 'Error',
    detail: errorMessage,
    life: 5000
  });
}



function shouldSkipSuccessToast(
  request: HttpRequest<any>,
  response: HttpResponse<any>
): boolean {
  if (hasSkipSuccessHeader(request)) {
    return true;
  }

  if (isGetRequest(request)) {
    return true;
  }

  return isSkippedUrl(request);
}

function hasSkipSuccessHeader(request: HttpRequest<any>): boolean {
  return request.headers.has('X-Skip-Success-Toast');
}

function isGetRequest(request: HttpRequest<any>): boolean {
  return request.method === 'GET';
}

function isSkippedUrl(request: HttpRequest<any>): boolean {
  const skipUrls = [
    '/api/Lookup',
  ];

  return skipUrls.some(url => request.url.includes(url));
}

function shouldShowSuccessToast(
  request: HttpRequest<any>,
  response: HttpResponse<any>
): boolean {
  const isSuccessMethod = isModificationMethod(request);
  const isSuccessStatus = isSuccessfulStatus(response);
  
  // If response body has a 'succeeded' property, only show success if it's true
  if (response.body && 'succeeded' in response.body) {
    return isSuccessMethod && isSuccessStatus && response.body.succeeded === true;
  }
  
  // For responses without 'succeeded' property, rely on HTTP status
  return isSuccessMethod && isSuccessStatus && isCreatedOrOkStatus(response);
}

function isModificationMethod(request: HttpRequest<any>): boolean {
  const successMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  return successMethods.includes(request.method);
}

function isSuccessfulStatus(response: HttpResponse<any>): boolean {
  return response.status >= 200 && response.status < 300;
}

function isCreatedOrOkStatus(response: HttpResponse<any>): boolean {
  return response.status === 200 || response.status === 201;
}

function showSuccessToast(
  request: HttpRequest<any>,
  response: HttpResponse<any>,
  messageService: MessageService
): void {
  const message = extractSuccessMessage(response.body, request.method);
  const title = 'Success';

  messageService.add({
    severity: 'success',
    summary: title,
    detail: message,
    life: 4000
  });
}

function extractSuccessMessage(responseBody: any, method: string): string {
  if (responseBody?.message) {
    return responseBody.message;
  }

  if (responseBody?.title) {
    return responseBody.title;
  }

  return getDefaultSuccessMessage(method);
}

function getDefaultSuccessMessage(method: string): string {
  const messages: Record<string, string> = {
    'POST': 'Item has been created successfully.',
    'PUT': 'Item has been updated successfully.',
    'PATCH': 'Item has been updated successfully.',
    'DELETE': 'Item has been deleted successfully.'
  };

  return messages[method] || 'Operation completed successfully.';
}


