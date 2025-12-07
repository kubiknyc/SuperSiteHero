/**
 * k6 Load Test - Authentication Scenarios
 *
 * Tests authentication endpoints under load
 *
 * Run:
 *   k6 run tests/load/scenarios/auth.js
 *   k6 run --stage 2m:10,5m:10,2m:0 tests/load/scenarios/auth.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { config, stages, getAuthHeaders, randomSleep } from '../k6-config.js';

// Custom metrics
const loginDuration = new Trend('login_duration');
const loginSuccessRate = new Rate('login_success_rate');
const loginFailures = new Counter('login_failures');
const sessionValidationDuration = new Trend('session_validation_duration');

// Test configuration
export const options = {
  stages: stages.load,
  thresholds: {
    ...config.thresholds,
    'login_duration': ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    'login_success_rate': ['rate>0.99'], // 99% success rate
    'session_validation_duration': ['p(95)<500'], // Session validation under 500ms
    'http_req_duration{scenario:login}': ['p(95)<1500'],
    'http_req_duration{scenario:signup}': ['p(95)<2000'],
  },
};

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting authentication load test...');
  console.log(`Target URL: ${config.supabaseUrl}`);
  return {
    timestamp: Date.now(),
  };
}

/**
 * Main test function - runs for each virtual user
 */
export default function(data) {
  const testUser = config.testUsers.superintendent;

  group('Authentication Flow', () => {
    // Test 1: User Login
    group('Login', () => {
      const loginStart = Date.now();
      const loginPayload = JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      });

      const loginResponse = http.post(
        `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
        loginPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.supabaseAnonKey,
          },
          tags: { scenario: 'login' },
        }
      );

      const loginEnd = Date.now();
      const duration = loginEnd - loginStart;
      loginDuration.add(duration);

      const loginSuccess = check(loginResponse, {
        'login status is 200': (r) => r.status === 200,
        'login returns access token': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.access_token !== undefined;
          } catch {
            return false;
          }
        },
        'login returns user data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.user !== undefined;
          } catch {
            return false;
          }
        },
        'login duration under 2s': () => duration < 2000,
      });

      loginSuccessRate.add(loginSuccess);

      if (!loginSuccess) {
        loginFailures.add(1);
        console.error(`Login failed: ${loginResponse.status} - ${loginResponse.body}`);
        return; // Skip rest of test if login fails
      }

      // Extract access token for subsequent requests
      let accessToken;
      try {
        const loginData = JSON.parse(loginResponse.body);
        accessToken = loginData.access_token;
      } catch (e) {
        console.error(`Failed to parse login response: ${e}`);
        return;
      }

      sleep(randomSleep(1, 2));

      // Test 2: Session Validation
      group('Session Validation', () => {
        const sessionStart = Date.now();

        const sessionResponse = http.get(
          `${config.supabaseUrl}/auth/v1/user`,
          {
            headers: getAuthHeaders(accessToken),
            tags: { scenario: 'session_validation' },
          }
        );

        const sessionDuration = Date.now() - sessionStart;
        sessionValidationDuration.add(sessionDuration);

        check(sessionResponse, {
          'session validation status is 200': (r) => r.status === 200,
          'session returns user data': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.email === testUser.email;
            } catch {
              return false;
            }
          },
          'session validation under 500ms': () => sessionDuration < 500,
        });
      });

      sleep(randomSleep(1, 2));

      // Test 3: Fetch User Profile
      group('User Profile', () => {
        const profileResponse = http.get(
          `${config.supabaseUrl}/rest/v1/users?select=*`,
          {
            headers: getAuthHeaders(accessToken),
            tags: { scenario: 'profile_fetch' },
          }
        );

        check(profileResponse, {
          'profile fetch status is 200': (r) => r.status === 200,
          'profile returns data': (r) => {
            try {
              const body = JSON.parse(r.body);
              return Array.isArray(body);
            } catch {
              return false;
            }
          },
        });
      });

      sleep(randomSleep(2, 4));

      // Test 4: Logout (optional - token expiration)
      group('Logout', () => {
        const logoutResponse = http.post(
          `${config.supabaseUrl}/auth/v1/logout`,
          null,
          {
            headers: getAuthHeaders(accessToken),
            tags: { scenario: 'logout' },
          }
        );

        check(logoutResponse, {
          'logout status is 204': (r) => r.status === 204,
        });
      });
    });
  });

  // Think time between iterations
  sleep(randomSleep(3, 7));
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  console.log('Authentication load test completed');
  console.log(`Test duration: ${Date.now() - data.timestamp}ms`);
}

/**
 * Handle test summary
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/auth-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;
  let summary = '\n';

  summary += `${indent}Authentication Load Test Summary\n`;
  summary += `${indent}================================\n\n`;

  if (data.metrics.login_duration) {
    summary += `${indent}Login Performance:\n`;
    summary += `${indent}  - Avg: ${data.metrics.login_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${data.metrics.login_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  - P99: ${data.metrics.login_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.login_success_rate) {
    summary += `${indent}Login Success Rate: ${(data.metrics.login_success_rate.values.rate * 100).toFixed(2)}%\n\n`;
  }

  if (data.metrics.http_req_duration) {
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  - Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  return summary;
}
