export const environment = {
  production: false,
  apiUrl: 'http://62.84.178.178:8102/api',
  nSwagUrl: 'http://62.84.178.178:8102',
  appName: 'Construction',
  version: '1.0.0-dev',
  enableLogging: true,
  debugMode: true,
  auth: {
    // Toggle the in-memory mock auth backend. Set to `false` once the backend
    // ships its auth endpoints and the generated AuthClient is wired in.
    useMock: true,
    tokenStorageKey: 'auth_token',
    refreshTokenStorageKey: 'refresh_token',
    userStorageKey: 'current_user',
    tokenExpirationWarningMinutes: 5
  },
  advances: {
    // The AdvancesController/AdvanceClient backend is written but not deployed
    // yet. Keep `true` until `npm run generate-api` produces an AdvanceClient
    // and AdvanceApiService's `// REAL API` blocks are wired in.
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
    enablePush: false,
    enableAnalytics: false,
    enableBeta: true
  }
};
