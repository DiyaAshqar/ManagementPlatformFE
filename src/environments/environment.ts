export const environment = {
  production: false,
  apiUrl: 'https://api.dev.iconic.neurocodejo.com/api',
  nSwagUrl: 'https://api.dev.iconic.neurocodejo.com',
  appName: 'Construction',
  version: '1.0.0-dev',
  enableLogging: true,
  debugMode: true,
  auth: {
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
    tokenExpirationWarningMinutes: 5
  },
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },
  cache: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 100
  },
  features: {
    enablePush: false,
    enableAnalytics: false,
    enableBeta: true
  }
};
