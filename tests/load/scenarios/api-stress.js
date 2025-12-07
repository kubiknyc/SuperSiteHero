/**
 * k6 Load Test - API Stress Test
 *
 * Comprehensive stress test of all major API endpoints
 *
 * Run:
 *   k6 run tests/load/scenarios/api-stress.js
 *   k6 run --env SCENARIO=spike tests/load/scenarios/api-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { config, stages, getAuthHeaders, generateTestData, randomSleep } from '../k6-config.js';

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const apiErrorRate = new Rate('api_error_rate');
const apiSuccessRate = new Rate('api_success_rate');
const endpointErrors = new Counter('endpoint_errors');
const slowRequests = new Counter('slow_requests');

// Endpoint-specific metrics
const projectsApiTime = new Trend('projects_api_time');
const dailyReportsApiTime = new Trend('daily_reports_api_time');
const rfisApiTime = new Trend('rfis_api_time');
const tasksApiTime = new Trend('tasks_api_time');
const documentsApiTime = new Trend('documents_api_time');

// Test configuration
const scenario = __ENV.SCENARIO || 'stress';
export const options = {
  stages: stages[scenario],
  thresholds: {
    ...config.thresholds,
    'api_response_time': ['p(95)<2000', 'p(99)<5000'],
    'api_error_rate': ['rate<0.05'], // Allow 5% error rate under stress
    'api_success_rate': ['rate>0.95'],
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
};

/**
 * Setup - authenticate
 */
export function setup() {
  console.log(`Starting API stress test (${scenario} scenario)...`);

  const loginPayload = JSON.stringify({
    email: config.testUsers.superintendent.email,
    password: config.testUsers.superintendent.password,
  });

  const loginResponse = http.post(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    loginPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseAnonKey,
      },
    }
  );

  if (loginResponse.status !== 200) {
    console.error(`Setup failed: Unable to authenticate`);
    return null;
  }

  const loginData = JSON.parse(loginResponse.body);

  return {
    accessToken: loginData.access_token,
    userId: loginData.user.id,
    timestamp: Date.now(),
    endpoints: [
      'projects',
      'daily_reports',
      'rfis',
      'tasks',
      'documents',
      'change_orders',
      'submittals',
      'punch_items',
    ],
  };
}

/**
 * Test endpoint helper
 */
function testEndpoint(endpoint, authHeaders, tags = {}) {
  const start = Date.now();

  const response = http.get(
    `${config.supabaseUrl}/rest/v1/${endpoint}?select=*&order=created_at.desc&limit=20`,
    {
      headers: authHeaders,
      tags: { endpoint, ...tags },
    }
  );

  const duration = Date.now() - start;
  apiResponseTime.add(duration);

  // Track endpoint-specific metrics
  switch(endpoint) {
    case 'projects':
      projectsApiTime.add(duration);
      break;
    case 'daily_reports':
      dailyReportsApiTime.add(duration);
      break;
    case 'rfis':
      rfisApiTime.add(duration);
      break;
    case 'tasks':
      tasksApiTime.add(duration);
      break;
    case 'documents':
      documentsApiTime.add(duration);
      break;
  }

  const success = check(response, {
    [`${endpoint} status is 200`]: (r) => r.status === 200,
    [`${endpoint} returns data`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
    [`${endpoint} response under 2s`]: () => duration < 2000,
  });

  if (success) {
    apiSuccessRate.add(true);
  } else {
    apiSuccessRate.add(false);
    apiErrorRate.add(true);
    endpointErrors.add(1);
    console.error(`${endpoint} failed: ${response.status} - ${response.body.substring(0, 200)}`);
  }

  if (duration > 2000) {
    slowRequests.add(1);
  }

  return { response, duration, success };
}

/**
 * Main test function
 */
export default function(data) {
  if (!data || !data.accessToken) {
    console.error('No access token available, skipping test');
    return;
  }

  const authHeaders = getAuthHeaders(data.accessToken);

  group('API Stress Test - All Endpoints', () => {
    // Test 1: Projects endpoint
    group('Projects API', () => {
      testEndpoint('projects', authHeaders, { category: 'core' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 2: Daily Reports endpoint
    group('Daily Reports API', () => {
      testEndpoint('daily_reports', authHeaders, { category: 'core' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 3: RFIs endpoint
    group('RFIs API', () => {
      testEndpoint('rfis', authHeaders, { category: 'workflow' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 4: Tasks endpoint
    group('Tasks API', () => {
      testEndpoint('tasks', authHeaders, { category: 'core' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 5: Documents endpoint
    group('Documents API', () => {
      testEndpoint('documents', authHeaders, { category: 'storage' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 6: Change Orders endpoint
    group('Change Orders API', () => {
      testEndpoint('change_orders', authHeaders, { category: 'workflow' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 7: Submittals endpoint
    group('Submittals API', () => {
      testEndpoint('submittals', authHeaders, { category: 'workflow' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 8: Punch Items endpoint
    group('Punch Items API', () => {
      testEndpoint('punch_items', authHeaders, { category: 'quality' });
    });

    sleep(randomSleep(0.5, 1));

    // Test 9: Complex query with joins
    group('Complex Query with Joins', () => {
      const complexStart = Date.now();

      const complexResponse = http.get(
        `${config.supabaseUrl}/rest/v1/daily_reports?select=*,project:projects(name),author:users(name)&order=created_at.desc&limit=10`,
        {
          headers: authHeaders,
          tags: { endpoint: 'complex_query', category: 'performance' },
        }
      );

      const complexDuration = Date.now() - complexStart;
      apiResponseTime.add(complexDuration);

      const complexSuccess = check(complexResponse, {
        'complex query status is 200': (r) => r.status === 200,
        'complex query returns data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body);
          } catch {
            return false;
          }
        },
        'complex query under 3s': () => complexDuration < 3000,
      });

      apiSuccessRate.add(complexSuccess);

      if (!complexSuccess) {
        apiErrorRate.add(true);
        endpointErrors.add(1);
      }
    });

    sleep(randomSleep(0.5, 1));

    // Test 10: Aggregation query
    group('Aggregation Query', () => {
      const aggStart = Date.now();

      const aggResponse = http.get(
        `${config.supabaseUrl}/rest/v1/projects?select=status&limit=100`,
        {
          headers: authHeaders,
          tags: { endpoint: 'aggregation', category: 'analytics' },
        }
      );

      const aggDuration = Date.now() - aggStart;
      apiResponseTime.add(aggDuration);

      const aggSuccess = check(aggResponse, {
        'aggregation status is 200': (r) => r.status === 200,
        'aggregation under 2s': () => aggDuration < 2000,
      });

      apiSuccessRate.add(aggSuccess);
    });
  });

  // Minimal think time during stress test
  sleep(randomSleep(1, 2));
}

/**
 * Teardown
 */
export function teardown(data) {
  console.log('API stress test completed');
  if (data && data.timestamp) {
    console.log(`Test duration: ${((Date.now() - data.timestamp) / 1000).toFixed(2)}s`);
  }
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/api-stress-summary.json': JSON.stringify(data, null, 2),
    'tests/load/results/api-stress-summary.html': htmlSummary(data),
  };
}

function textSummary(data, options) {
  const { indent = '' } = options;
  let summary = '\n';

  summary += `${indent}API Stress Test Summary\n`;
  summary += `${indent}========================\n\n`;

  if (data.metrics.api_response_time) {
    summary += `${indent}Overall API Performance:\n`;
    summary += `${indent}  - Avg: ${data.metrics.api_response_time.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - Min: ${data.metrics.api_response_time.values.min.toFixed(2)}ms\n`;
    summary += `${indent}  - Med: ${data.metrics.api_response_time.values.med.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${data.metrics.api_response_time.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  - P99: ${data.metrics.api_response_time.values['p(99)'].toFixed(2)}ms\n`;
    summary += `${indent}  - Max: ${data.metrics.api_response_time.values.max.toFixed(2)}ms\n\n`;
  }

  // Endpoint-specific performance
  const endpoints = [
    { name: 'Projects', metric: 'projects_api_time' },
    { name: 'Daily Reports', metric: 'daily_reports_api_time' },
    { name: 'RFIs', metric: 'rfis_api_time' },
    { name: 'Tasks', metric: 'tasks_api_time' },
    { name: 'Documents', metric: 'documents_api_time' },
  ];

  summary += `${indent}Endpoint Performance:\n`;
  endpoints.forEach(({ name, metric }) => {
    if (data.metrics[metric]) {
      summary += `${indent}  ${name}:\n`;
      summary += `${indent}    - Avg: ${data.metrics[metric].values.avg.toFixed(2)}ms\n`;
      summary += `${indent}    - P95: ${data.metrics[metric].values['p(95)'].toFixed(2)}ms\n`;
    }
  });
  summary += '\n';

  if (data.metrics.api_success_rate) {
    summary += `${indent}Success Rate: ${(data.metrics.api_success_rate.values.rate * 100).toFixed(2)}%\n`;
  }

  if (data.metrics.api_error_rate) {
    summary += `${indent}Error Rate: ${(data.metrics.api_error_rate.values.rate * 100).toFixed(2)}%\n`;
  }

  if (data.metrics.slow_requests) {
    summary += `${indent}Slow Requests (>2s): ${data.metrics.slow_requests.values.count}\n`;
  }

  if (data.metrics.endpoint_errors) {
    summary += `${indent}Total Errors: ${data.metrics.endpoint_errors.values.count}\n`;
  }

  summary += '\n';

  return summary;
}

function htmlSummary(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>API Stress Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .success { color: green; }
    .warning { color: orange; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>API Stress Test Results</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Summary</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 'N/A'}</td>
      <td class="success">OK</td>
    </tr>
    <tr>
      <td>Success Rate</td>
      <td>${data.metrics.api_success_rate ? (data.metrics.api_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%</td>
      <td class="${data.metrics.api_success_rate && data.metrics.api_success_rate.values.rate > 0.95 ? 'success' : 'warning'}">
        ${data.metrics.api_success_rate && data.metrics.api_success_rate.values.rate > 0.95 ? 'PASS' : 'WARN'}
      </td>
    </tr>
    <tr>
      <td>P95 Response Time</td>
      <td>${data.metrics.api_response_time ? data.metrics.api_response_time.values['p(95)'].toFixed(2) : 'N/A'}ms</td>
      <td class="${data.metrics.api_response_time && data.metrics.api_response_time.values['p(95)'] < 2000 ? 'success' : 'warning'}">
        ${data.metrics.api_response_time && data.metrics.api_response_time.values['p(95)'] < 2000 ? 'PASS' : 'WARN'}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
