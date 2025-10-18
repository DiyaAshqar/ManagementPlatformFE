import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiRequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
  skipLoading?: boolean;
  skipErrorToast?: boolean;
  skipSuccessToast?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * GET request
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const headers = this.buildHeaders(options);
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, {
      headers,
      params: options?.params
    });
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data: any, options?: ApiRequestOptions): Observable<T> {
    const headers = this.buildHeaders(options);
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers,
      params: options?.params
    });
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: any, options?: ApiRequestOptions): Observable<T> {
    const headers = this.buildHeaders(options);
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers,
      params: options?.params
    });
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data: any, options?: ApiRequestOptions): Observable<T> {
    const headers = this.buildHeaders(options);
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, data, {
      headers,
      params: options?.params
    });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const headers = this.buildHeaders(options);
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, {
      headers,
      params: options?.params
    });
  }

  /**
   * Build headers with custom options
   */
  private buildHeaders(options?: ApiRequestOptions): HttpHeaders {
    let headers = options?.headers instanceof HttpHeaders 
      ? options.headers 
      : new HttpHeaders(options?.headers || {});

    if (options?.skipLoading) {
      headers = headers.set('X-Skip-Loading', 'true');
    }

    if (options?.skipErrorToast) {
      headers = headers.set('X-Skip-Error-Toast', 'true');
    }

    if (options?.skipSuccessToast) {
      headers = headers.set('X-Skip-Success-Toast', 'true');
    }

    return headers;
  }
}
