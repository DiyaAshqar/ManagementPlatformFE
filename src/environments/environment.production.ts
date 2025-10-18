export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
  nSwagUrl: 'https://your-production-api.com',
  appName: 'Construction',
  version: '1.0.0',
  enableLogging: false,
  debugMode: false,
  auth: {
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
    tokenExpirationWarningMinutes: 5
  },
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  cache: {
    defaultTtl: 300000,
    maxSize: 100
  },
  features: {
    enablePush: true,
    enableAnalytics: true,
    enableBeta: false
  }
};
