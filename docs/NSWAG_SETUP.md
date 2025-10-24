# NSwag Configuration Guide

## Overview
NSwag is configured to automatically generate TypeScript API clients from your Swagger/OpenAPI specification.

## Configuration

### API Endpoint
- **Swagger URL**: `http://62.84.178.178:93/swagger/v1/swagger.json`
- **Base API URL**: `http://62.84.178.178:93`

### Generated Files
The API client is generated at: `src/nswag/api-client.ts`

## Usage

### 1. Generate API Client
Run the following command to generate/update the TypeScript API client:

```bash
npm run generate-api
```

or

```bash
npm run nswag
```

This command reads the `nswag.json` configuration file and generates the TypeScript client from the Swagger specification.

### 2. Using Generated Clients in Your Components

The generated clients are Angular services that use `HttpClient` under the hood. Here's how to use them:

```typescript
import { Component, inject } from '@angular/core';
import { YourClient } from '../../nswag/api-client';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent {
  private apiClient = inject(YourClient);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiClient.getData().subscribe({
      next: (data) => {
        console.log('Data received:', data);
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });
  }
}
```

### 3. Configuration Details

The NSwag configuration (`nswag.json`) includes:

- **Template**: Angular
- **RxJS Version**: 7.0
- **HTTP Client**: HttpClient
- **TypeScript Version**: 5.0
- **Client Class Generation**: Enabled
- **DTO Type Generation**: Enabled
- **Exception Wrapping**: Enabled

### 4. Environment Configuration

The API base URL is configured in the environment files:

- **Development**: `src/environments/environment.development.ts`
- **Production**: `src/environments/environment.production.ts`
- **Default**: `src/environments/environment.ts`

All are currently set to: `http://62.84.178.178:93`

### 5. Automatic Base URL Injection

The `API_BASE_URL` token is provided in `app.config.ts` and automatically injected into all generated API clients. This ensures your clients use the correct base URL based on the environment.

## When to Regenerate

Regenerate the API client whenever:
- The backend API changes (new endpoints, modified models, etc.)
- Swagger specification is updated
- You need to sync with the latest API contract

## Troubleshooting

### Connection Issues
If the generation fails due to connection issues:
1. Verify the Swagger URL is accessible: `http://62.84.178.178:93/swagger/v1/swagger.json`
2. Check your network connection
3. Ensure the API server is running

### CORS Issues
If you encounter CORS errors when calling the API from your Angular app:
1. The backend needs to enable CORS for your Angular app origin
2. Add appropriate CORS headers on the server side

### Type Errors
If you get TypeScript errors after generation:
1. Check that all dependencies are installed (`npm install`)
2. Verify TypeScript version compatibility
3. Review the generated `api-client.ts` file for any issues

## Advanced Configuration

To modify the generation settings, edit `nswag.json`. Key settings include:

- `className`: Pattern for generated client class names
- `template`: Angular, Fetch, Axios, etc.
- `operationGenerationMode`: How operations are organized into classes
- `generateClientInterfaces`: Whether to generate interfaces for clients
- `output`: Where the generated file is saved

## Best Practices

1. **Version Control**: Commit the generated `api-client.ts` file to version control
2. **Regular Updates**: Regenerate when the API changes
3. **Error Handling**: Use the generated `ApiException` class for proper error handling
4. **Type Safety**: Leverage the generated TypeScript types for compile-time safety
5. **Testing**: Mock the generated clients in unit tests

## Additional Resources

- [NSwag Documentation](https://github.com/RicoSuter/NSwag)
- [NSwag Studio](https://github.com/RicoSuter/NSwag/wiki/NSwagStudio) - GUI tool for configuration
