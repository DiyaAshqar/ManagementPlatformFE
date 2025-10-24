import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Client } from '../../../nswag/api-client';

/**
 * Example service demonstrating how to use the generated API client
 * This is a wrapper service that provides a cleaner interface to your components
 */
@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private apiClient = inject(Client);

  /**
   * Example method - replace with actual API methods from your generated client
   * Check the api-client.ts file to see all available methods
   */
  
  // Example: Get data
  // getData(): Observable<YourDataType[]> {
  //   return this.apiClient.yourGetMethod();
  // }

  // Example: Post data
  // createItem(data: YourDataType): Observable<YourDataType> {
  //   return this.apiClient.yourPostMethod(data);
  // }

  // Example: Update data
  // updateItem(id: number, data: YourDataType): Observable<void> {
  //   return this.apiClient.yourPutMethod(id, data);
  // }

  // Example: Delete data
  // deleteItem(id: number): Observable<void> {
  //   return this.apiClient.yourDeleteMethod(id);
  // }
}
