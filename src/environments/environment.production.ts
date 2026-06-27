export const environment = {
  production: true,
  apiUrl: 'http://62.84.178.178:8103/api',
  nSwagUrl: 'http://62.84.178.178:8103',
  appName: 'Construction',
  version: '1.0.0',
  enableLogging: false,
  debugMode: false,
  auth: {
    // Mock auth is enabled until the backend exposes real auth endpoints.
    // Flip to `false` (and wire the generated AuthClient) when they are ready.
    useMock: true,
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
    tokenExpirationWarningMinutes: 5
  },
  advances: {
    // Mock advances are enabled until AdvancesController is deployed and
    // `npm run generate-api` produces an AdvanceClient. Flip to `false` (and
    // wire the generated client) when ready.
    useMock: true
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
