# NSwag Quick Start

## ✅ What's Configured

NSwag has been successfully configured for your Angular project to generate TypeScript API clients from your Swagger API.

### Configuration Files Created:
- `src/nswag/nswag.json` - NSwag configuration file
- `NSWAG_SETUP.md` - Detailed documentation
- `src/nswag/api-client.ts` - Generated API client (1597 lines)
- `src/app/shared/services/api-client.service.ts` - Example wrapper service
- `src/app/shared/components/api-example/api-example.component.ts` - Usage example

### Configuration Updated:
- `package.json` - Added npm scripts
- `app.config.ts` - Added API_BASE_URL provider
- Environment files - Updated with correct API URL

## 🚀 How to Use

### 1. Regenerate API Client (When API Changes)
```bash
npm run generate-api
```

### 2. Use in Your Components
```typescript
import { Component, inject } from '@angular/core';
import { Client } from './nswag/api-client';

export class YourComponent {
  private apiClient = inject(Client);

  loadData() {
    // Check api-client.ts for available methods
    this.apiClient.agreementPOST(data).subscribe({
      next: (result) => console.log(result),
      error: (error) => console.error(error)
    });
  }
}
```

## 📋 Available Commands

- `npm run generate-api` - Generate/update API client from Swagger
- `npm run nswag` - Same as generate-api
- `npm start` - Run development server

## 🌐 API Configuration

- **Swagger URL**: http://62.84.178.178:93/swagger/v1/swagger.json
- **Base URL**: http://62.84.178.178:93
- **Generated Client**: src/nswag/api-client.ts

## 📖 Next Steps

1. Open `src/nswag/api-client.ts` to see all available API methods
2. Use the `Client` service in your components
3. Regenerate the client whenever your backend API changes
4. Check `NSWAG_SETUP.md` for detailed documentation

## ⚠️ Important Notes

- The generated file is 1597 lines - it includes all your API endpoints
- The Client service is already provided in app.config.ts
- API base URL is automatically injected from environment files
- All methods return RxJS Observables

## 🔍 View Generated Methods

Check these files to see what's available:
```
src/nswag/api-client.ts - All generated API methods
src/app/shared/components/api-example/ - Usage examples
```
