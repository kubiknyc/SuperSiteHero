/**
 * k6 Load Test - Project CRUD Operations
 *
 * Tests project creation, reading, updating, and deletion under load
 *
 * Run:
 *   k6 run tests/load/scenarios/projects.js
 *   k6 run --env SCENARIO=stress tests/load/scenarios/projects.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { config, stages, getAuthHeaders, generateTestData, randomSleep } from '../k6-config.js';

// Custom metrics
const projectCreateDuration = new Trend('project_create_duration');
const projectReadDuration = new Trend('project_read_duration');
const projectUpdateDuration = new Trend('project_update_duration');
const projectDeleteDuration = new Trend('project_delete_duration');
const projectOperationSuccess = new Rate('project_operation_success');
const projectCreateErrors = new Counter('project_create_errors');

// Test configuration
const scenario = __ENV.SCENARIO || 'load';
export const options = {
  stages: stages[scenario],
  thresholds: {
    ...config.thresholds,
    'project_create_duration': ['p(95)<2000', 'p(99)<3000'],
    'project_read_duration': ['p(95)<500', 'p(99)<1000'],
    'project_update_duration': ['p(95)<1500', 'p(99)<2500'],
    'project_delete_duration': ['p(95)<1000', 'p(99)<2000'],
    'project_operation_success': ['rate>0.95'],
    'http_req_duration{operation:create}': ['p(95)<2000'],
    'http_req_duration{operation:read}': ['p(95)<500'],
    'http_req_duration{operation:update}': ['p(95)<1500'],
    'http_req_duration{operation:delete}': ['p(95)<1000'],
  },
};

/**
 * Setup - authenticate once per VU
 */
export function setup() {
  console.log(`Starting project CRUD load test (${scenario} scenario)...`);

  // Authenticate to get access token
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
    console.error(`Setup failed: Unable to authenticate. Status: ${loginResponse.status}`);
    return null;
  }

  const loginData = JSON.parse(loginResponse.body);

  return {
    accessToken: loginData.access_token,
    userId: loginData.user.id,
    timestamp: Date.now(),
  };
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
  const testData = generateTestData();
  let projectId;

  group('Project CRUD Operations', () => {
    // Test 1: Create Project
    group('Create Project', () => {
      const createStart = Date.now();

      const projectPayload = JSON.stringify({
        name: testData.projectName,
        description: `Load test project created at ${new Date().toISOString()}`,
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        location: '123 Test Street, Test City',
        budget: 1000000,
      });

      const createResponse = http.post(
        `${config.supabaseUrl}/rest/v1/projects`,
        projectPayload,
        {
          headers: {
            ...authHeaders,
            'Prefer': 'return=representation',
          },
          tags: { operation: 'create' },
        }
      );

      const createDuration = Date.now() - createStart;
      projectCreateDuration.add(createDuration);

      const createSuccess = check(createResponse, {
        'create status is 201': (r) => r.status === 201,
        'create returns project data': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body) && body.length > 0 && body[0].id !== undefined;
          } catch {
            return false;
          }
        },
        'create duration under 2s': () => createDuration < 2000,
      });

      projectOperationSuccess.add(createSuccess);

      if (createSuccess) {
        try {
          const responseData = JSON.parse(createResponse.body);
          projectId = responseData[0].id;
        } catch (e) {
          console.error(`Failed to parse create response: ${e}`);
          projectCreateErrors.add(1);
          return;
        }
      } else {
        console.error(`Create failed: ${createResponse.status} - ${createResponse.body}`);
        projectCreateErrors.add(1);
        return;
      }
    });

    sleep(randomSleep(0.5, 1));

    // Test 2: Read Project List
    group('Read Project List', () => {
      const readStart = Date.now();

      const readResponse = http.get(
        `${config.supabaseUrl}/rest/v1/projects?select=*&order=created_at.desc&limit=20`,
        {
          headers: authHeaders,
          tags: { operation: 'read' },
        }
      );

      const readDuration = Date.now() - readStart;
      projectReadDuration.add(readDuration);

      const readSuccess = check(readResponse, {
        'read list status is 200': (r) => r.status === 200,
        'read list returns array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body);
          } catch {
            return false;
          }
        },
        'read duration under 500ms': () => readDuration < 500,
      });

      projectOperationSuccess.add(readSuccess);
    });

    sleep(randomSleep(0.5, 1));

    // Test 3: Read Single Project
    if (projectId) {
      group('Read Single Project', () => {
        const readSingleStart = Date.now();

        const readSingleResponse = http.get(
          `${config.supabaseUrl}/rest/v1/projects?id=eq.${projectId}&select=*`,
          {
            headers: authHeaders,
            tags: { operation: 'read' },
          }
        );

        const readSingleDuration = Date.now() - readSingleStart;
        projectReadDuration.add(readSingleDuration);

        const readSingleSuccess = check(readSingleResponse, {
          'read single status is 200': (r) => r.status === 200,
          'read single returns project': (r) => {
            try {
              const body = JSON.parse(r.body);
              return Array.isArray(body) && body.length === 1;
            } catch {
              return false;
            }
          },
        });

        projectOperationSuccess.add(readSingleSuccess);
      });

      sleep(randomSleep(1, 2));

      // Test 4: Update Project
      group('Update Project', () => {
        const updateStart = Date.now();

        const updatePayload = JSON.stringify({
          description: `Updated at ${new Date().toISOString()}`,
          budget: 1500000,
        });

        const updateResponse = http.patch(
          `${config.supabaseUrl}/rest/v1/projects?id=eq.${projectId}`,
          updatePayload,
          {
            headers: {
              ...authHeaders,
              'Prefer': 'return=representation',
            },
            tags: { operation: 'update' },
          }
        );

        const updateDuration = Date.now() - updateStart;
        projectUpdateDuration.add(updateDuration);

        const updateSuccess = check(updateResponse, {
          'update status is 200': (r) => r.status === 200,
          'update returns updated data': (r) => {
            try {
              const body = JSON.parse(r.body);
              return Array.isArray(body) && body.length > 0;
            } catch {
              return false;
            }
          },
          'update duration under 1.5s': () => updateDuration < 1500,
        });

        projectOperationSuccess.add(updateSuccess);
      });

      sleep(randomSleep(1, 2));

      // Test 5: Delete Project
      group('Delete Project', () => {
        const deleteStart = Date.now();

        const deleteResponse = http.del(
          `${config.supabaseUrl}/rest/v1/projects?id=eq.${projectId}`,
          null,
          {
            headers: authHeaders,
            tags: { operation: 'delete' },
          }
        );

        const deleteDuration = Date.now() - deleteStart;
        projectDeleteDuration.add(deleteDuration);

        const deleteSuccess = check(deleteResponse, {
          'delete status is 204': (r) => r.status === 204,
          'delete duration under 1s': () => deleteDuration < 1000,
        });

        projectOperationSuccess.add(deleteSuccess);
      });
    }
  });

  // Think time between iterations
  sleep(randomSleep(3, 7));
}

/**
 * Teardown
 */
export function teardown(data) {
  console.log('Project CRUD load test completed');
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
    'tests/load/results/projects-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { indent = '' } = options;
  let summary = '\n';

  summary += `${indent}Project CRUD Load Test Summary\n`;
  summary += `${indent}================================\n\n`;

  const operations = ['create', 'read', 'update', 'delete'];
  operations.forEach(op => {
    const metricName = `project_${op}_duration`;
    if (data.metrics[metricName]) {
      summary += `${indent}${op.charAt(0).toUpperCase() + op.slice(1)} Performance:\n`;
      summary += `${indent}  - Avg: ${data.metrics[metricName].values.avg.toFixed(2)}ms\n`;
      summary += `${indent}  - P95: ${data.metrics[metricName].values['p(95)'].toFixed(2)}ms\n`;
      summary += `${indent}  - P99: ${data.metrics[metricName].values['p(99)'].toFixed(2)}ms\n\n`;
    }
  });

  if (data.metrics.project_operation_success) {
    summary += `${indent}Overall Success Rate: ${(data.metrics.project_operation_success.values.rate * 100).toFixed(2)}%\n\n`;
  }

  return summary;
}
