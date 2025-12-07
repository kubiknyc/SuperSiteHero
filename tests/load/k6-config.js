/**
 * k6 Load Testing Configuration
 *
 * Base configuration for k6 load tests
 * Install k6: https://k6.io/docs/getting-started/installation/
 *
 * Run tests:
 *   k6 run tests/load/scenarios/auth.js
 *   k6 run tests/load/scenarios/projects.js
 *
 * Run with cloud reporting (requires k6 cloud account):
 *   k6 cloud tests/load/scenarios/auth.js
 */

export const config = {
  // Base URL - override with environment variable
  baseUrl: __ENV.BASE_URL || 'http://localhost:5173',
  apiUrl: __ENV.API_URL || 'https://your-project.supabase.co',

  // Supabase credentials - DO NOT commit real values
  supabaseUrl: __ENV.SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseAnonKey: __ENV.SUPABASE_ANON_KEY || 'your-anon-key',

  // Test users
  testUsers: {
    admin: {
      email: __ENV.TEST_ADMIN_EMAIL || 'admin@test.com',
      password: __ENV.TEST_ADMIN_PASSWORD || 'Test1234!',
    },
    superintendent: {
      email: __ENV.TEST_SUPER_EMAIL || 'super@test.com',
      password: __ENV.TEST_SUPER_PASSWORD || 'Test1234!',
    },
    foreman: {
      email: __ENV.TEST_FOREMAN_EMAIL || 'foreman@test.com',
      password: __ENV.TEST_FOREMAN_PASSWORD || 'Test1234!',
    },
  },

  // Performance thresholds
  thresholds: {
    // 95% of requests should complete within 2s
    http_req_duration: ['p(95)<2000'],
    // 99% of requests should complete within 5s
    'http_req_duration{type:api}': ['p(99)<5000'],
    // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'],
    // 95% of checks should pass
    checks: ['rate>0.95'],
  },

  // Common headers
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Load Test Stages
 *
 * Ramp-up, plateau, ramp-down pattern for realistic load simulation
 */
export const stages = {
  // Smoke test - single user
  smoke: [
    { duration: '30s', target: 1 },
  ],

  // Load test - moderate load
  load: [
    { duration: '2m', target: 10 },  // Ramp-up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '2m', target: 0 },   // Ramp-down
  ],

  // Stress test - high load
  stress: [
    { duration: '2m', target: 20 },  // Ramp-up to 20 users
    { duration: '5m', target: 20 },  // Stay at 20 users
    { duration: '2m', target: 50 },  // Spike to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 0 },   // Ramp-down
  ],

  // Spike test - sudden load increase
  spike: [
    { duration: '1m', target: 10 },   // Ramp-up to 10 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 10 },   // Drop back
    { duration: '1m', target: 0 },    // Ramp-down
  ],

  // Soak test - sustained load
  soak: [
    { duration: '5m', target: 20 },   // Ramp-up
    { duration: '60m', target: 20 },  // Sustained load for 1 hour
    { duration: '5m', target: 0 },    // Ramp-down
  ],
};

/**
 * Helper function to create authenticated headers
 */
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'apikey': config.supabaseAnonKey,
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Helper function to check response
 */
export function checkResponse(response, expectedStatus = 200) {
  return response.status === expectedStatus;
}

/**
 * Sleep helper with random jitter
 */
export function randomSleep(min = 1, max = 3) {
  const sleepTime = Math.random() * (max - min) + min;
  return sleepTime;
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    projectName: `Load Test Project ${timestamp}-${random}`,
    reportTitle: `Load Test Report ${timestamp}-${random}`,
    documentName: `document-${timestamp}-${random}.pdf`,
    rfiSubject: `Load Test RFI ${timestamp}-${random}`,
    taskTitle: `Load Test Task ${timestamp}-${random}`,
  };
}

/**
 * Custom metrics
 */
export const customMetrics = {
  // Time to First Byte
  ttfb: {
    type: 'trend',
    name: 'time_to_first_byte',
  },
  // Database query duration
  dbQueryDuration: {
    type: 'trend',
    name: 'db_query_duration',
  },
  // Authentication duration
  authDuration: {
    type: 'trend',
    name: 'auth_duration',
  },
  // File upload duration
  uploadDuration: {
    type: 'trend',
    name: 'upload_duration',
  },
};

export default config;
