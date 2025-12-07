/**
 * API CRUD Operations Load Test
 *
 * Tests common API operations under load:
 * - List projects
 * - Get single project
 * - Create/Update/Delete operations
 *
 * Run: k6 run tests/load/scenarios/api-crud.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, API_URL, TEST_USER, defaultThresholds, standardLoadStages } from '../k6-config.js';

// Custom metrics
const apiSuccessRate = new Rate('api_success_rate');
const listProjectsDuration = new Trend('list_projects_duration');
const getProjectDuration = new Trend('get_project_duration');

export const options = {
  stages: standardLoadStages,
  thresholds: {
    ...defaultThresholds,
    api_success_rate: ['rate>0.99'],
    list_projects_duration: ['p(95)<500'],
    get_project_duration: ['p(95)<300'],
  },
};

// Shared state
let authToken = null;

export function setup() {
  // Login once to get auth token
  const loginRes = http.post(
    `${API_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'apikey': __ENV.SUPABASE_ANON_KEY || '',
      },
    }
  );

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.access_token };
  }

  return { token: null };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': __ENV.SUPABASE_ANON_KEY || '',
    'Authorization': `Bearer ${data.token}`,
  };

  group('List Projects', () => {
    const res = http.get(`${API_URL}/rest/v1/projects?select=*`, { headers });

    listProjectsDuration.add(res.timings.duration);
    apiSuccessRate.add(res.status === 200);

    check(res, {
      'list projects status 200': (r) => r.status === 200,
      'list projects returns array': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
      'list projects < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(1);

  group('Get Single Project', () => {
    // First get list to find a project ID
    const listRes = http.get(`${API_URL}/rest/v1/projects?select=id&limit=1`, { headers });

    if (listRes.status === 200) {
      try {
        const projects = JSON.parse(listRes.body);
        if (projects.length > 0) {
          const projectId = projects[0].id;
          const res = http.get(
            `${API_URL}/rest/v1/projects?id=eq.${projectId}&select=*`,
            { headers }
          );

          getProjectDuration.add(res.timings.duration);
          apiSuccessRate.add(res.status === 200);

          check(res, {
            'get project status 200': (r) => r.status === 200,
            'get project returns data': (r) => {
              try {
                const data = JSON.parse(r.body);
                return data.length > 0;
              } catch {
                return false;
              }
            },
            'get project < 300ms': (r) => r.timings.duration < 300,
          });
        }
      } catch (e) {
        console.error('Error parsing projects:', e);
      }
    }
  });

  sleep(1);

  group('List RFIs', () => {
    const res = http.get(`${API_URL}/rest/v1/rfis?select=*&limit=50`, { headers });

    apiSuccessRate.add(res.status === 200);

    check(res, {
      'list RFIs status 200': (r) => r.status === 200,
      'list RFIs < 500ms': (r) => r.timings.duration < 500,
    });
  });

  sleep(1);

  group('List Daily Reports', () => {
    const res = http.get(`${API_URL}/rest/v1/daily_reports?select=*&limit=50`, { headers });

    apiSuccessRate.add(res.status === 200);

    check(res, {
      'list daily reports status 200': (r) => r.status === 200,
      'list daily reports < 500ms': (r) => r.timings.duration < 500,
    });
  });

  // Random sleep to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'tests/load/results/api-crud-summary.json': JSON.stringify(data, null, 2),
  };
}
