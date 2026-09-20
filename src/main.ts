import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

declare global {
  interface Window {
    __env?: { API_URL?: string };
  }
}

const runtimeApiUrl = window.__env?.API_URL?.replace(/\/$/, '');
if (runtimeApiUrl) {
  environment.apiUrl = `${runtimeApiUrl}/api`;
  environment.nSwagUrl = runtimeApiUrl;
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
