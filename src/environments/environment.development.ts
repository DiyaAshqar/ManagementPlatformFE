export const environment = {
  production: false,
  apiUrl: 'http://62.84.178.178:93/api',
  nSwagUrl: 'http://62.84.178.178:93',
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
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  cache: {
    defaultTtl: 300000,
    maxSize: 100
  },
  features: {
    enablePush: false,
    enableAnalytics: false,
    enableBeta: true
  }
};
