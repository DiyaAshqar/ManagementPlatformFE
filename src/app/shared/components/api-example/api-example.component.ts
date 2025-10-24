import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../../nswag/api-client';
import { MessageService } from 'primeng/api';

/**
 * Example component demonstrating how to use the NSwag-generated API client
 * 
 * To use this in your actual components:
 * 1. Inject the Client service (or your wrapper service)
 * 2. Call the generated methods
 * 3. Handle responses with RxJS operators
 */
@Component({
  selector: 'app-api-example',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="api-example-container">
      <h2>API Client Usage Example</h2>
      
      <div class="example-section">
        <h3>How to use the generated API client:</h3>
        <ol>
          <li>Inject the Client service in your component</li>
          <li>Call the API methods (they return Observables)</li>
          <li>Subscribe to handle the response</li>
        </ol>
      </div>

      <div class="code-example">
        <h4>Example Code:</h4>
        <pre><code>
// In your component
private apiClient = inject(Client);

ngOnInit() &#123;
  this.loadData();
&#125;

loadData() &#123;
  this.apiClient.yourMethodName().subscribe(&#123;
    next: (data) => &#123;
      console.log('Success:', data);
      this.data = data;
    &#125;,
    error: (error) => &#123;
      console.error('Error:', error);
      this.messageService.add(&#123;
        severity: 'error',
        summary: 'Error',
        detail: error.message
      &#125;);
    &#125;
  &#125;);
&#125;
        </code></pre>
      </div>

      <div class="info-section">
        <p><strong>Note:</strong> Check the <code>api-client.ts</code> file to see all available API methods generated from your Swagger specification.</p>
        <p><strong>API Base URL:</strong> {{ apiBaseUrl }}</p>
      </div>
    </div>
  `,
  styles: [`
    .api-example-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .example-section,
    .code-example,
    .info-section {
      margin: 2rem 0;
      padding: 1.5rem;
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      background: var(--surface-card);
    }

    h2 {
      color: var(--primary-color);
      margin-bottom: 1rem;
    }

    h3, h4 {
      color: var(--text-color);
      margin-bottom: 1rem;
    }

    pre {
      background: var(--surface-ground);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }

    code {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .info-section p {
      margin: 0.5rem 0;
    }

    .info-section strong {
      color: var(--primary-color);
    }
  `]
})
export class ApiExampleComponent implements OnInit {
  private apiClient = inject(Client);
  private messageService = inject(MessageService);

  apiBaseUrl = '';

  ngOnInit() {
    // Get the base URL from the client (for display purposes)
    this.apiBaseUrl = 'http://62.84.178.178:93';
    
    // Example of how to use the API client
    // Uncomment and modify based on your actual API endpoints
    // this.loadExampleData();
  }

  /**
   * Example method showing how to call an API endpoint
   */
  // loadExampleData() {
  //   this.apiClient.yourGetMethod().subscribe({
  //     next: (data) => {
  //       console.log('Data loaded successfully:', data);
  //       // Process your data here
  //     },
  //     error: (error) => {
  //       console.error('Error loading data:', error);
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to load data'
  //       });
  //     }
  //   });
  // }

  /**
   * Example method showing how to post data
   */
  // createExample(data: any) {
  //   this.apiClient.yourPostMethod(data).subscribe({
  //     next: (response) => {
  //       console.log('Created successfully:', response);
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Success',
  //         detail: 'Data created successfully'
  //       });
  //     },
  //     error: (error) => {
  //       console.error('Error creating data:', error);
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Error',
  //         detail: 'Failed to create data'
  //       });
  //     }
  //   });
  // }
}
