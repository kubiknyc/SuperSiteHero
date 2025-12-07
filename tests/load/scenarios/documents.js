/**
 * k6 Load Test - Document Upload/Download Operations
 *
 * Tests document upload, download, and listing under load
 *
 * Run:
 *   k6 run tests/load/scenarios/documents.js
 *   k6 run --env SCENARIO=stress tests/load/scenarios/documents.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import encoding from 'k6/encoding';
import { config, stages, getAuthHeaders, generateTestData, randomSleep } from '../k6-config.js';

// Custom metrics
const documentUploadDuration = new Trend('document_upload_duration');
const documentDownloadDuration = new Trend('document_download_duration');
const documentListDuration = new Trend('document_list_duration');
const documentOperationSuccess = new Rate('document_operation_success');
const uploadErrors = new Counter('upload_errors');
const downloadErrors = new Counter('download_errors');

// Test configuration
const scenario = __ENV.SCENARIO || 'load';
export const options = {
  stages: stages[scenario],
  thresholds: {
    ...config.thresholds,
    'document_upload_duration': ['p(95)<5000', 'p(99)<10000'], // Upload can be slower
    'document_download_duration': ['p(95)<2000', 'p(99)<4000'],
    'document_list_duration': ['p(95)<1000', 'p(99)<2000'],
    'document_operation_success': ['rate>0.90'], // Allow 10% failure for uploads
    'http_req_duration{operation:upload}': ['p(95)<5000'],
    'http_req_duration{operation:download}': ['p(95)<2000'],
  },
};

/**
 * Setup - authenticate and create test project
 */
export function setup() {
  console.log(`Starting document operations load test (${scenario} scenario)...`);

  // Authenticate
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
  const authHeaders = getAuthHeaders(loginData.access_token);

  // Create a test project for document uploads
  const projectPayload = JSON.stringify({
    name: 'Load Test Project for Documents',
    description: 'Project for document load testing',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
  });

  const projectResponse = http.post(
    `${config.supabaseUrl}/rest/v1/projects`,
    projectPayload,
    {
      headers: {
        ...authHeaders,
        'Prefer': 'return=representation',
      },
    }
  );

  let projectId = null;
  if (projectResponse.status === 201) {
    try {
      const projectData = JSON.parse(projectResponse.body);
      projectId = projectData[0].id;
    } catch (e) {
      console.error(`Failed to parse project response: ${e}`);
    }
  }

  return {
    accessToken: loginData.access_token,
    userId: loginData.user.id,
    projectId: projectId,
    timestamp: Date.now(),
  };
}

/**
 * Generate mock file data
 */
function generateMockFile(filename, sizeKB = 100) {
  // Generate random binary data
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let data = '';
  const length = sizeKB * 1024;

  for (let i = 0; i < length; i++) {
    data += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return {
    filename: filename,
    data: data,
    contentType: 'application/pdf',
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
  let documentPath;

  group('Document Operations', () => {
    // Test 1: Upload Document
    group('Upload Document', () => {
      if (!data.projectId) {
        console.error('No project ID available, skipping upload');
        uploadErrors.add(1);
        return;
      }

      const uploadStart = Date.now();

      // Generate mock file (100KB PDF)
      const mockFile = generateMockFile(testData.documentName, 100);
      const fileData = encoding.b64encode(mockFile.data);

      // Upload to Supabase Storage
      const storagePath = `${data.projectId}/documents/${mockFile.filename}`;

      const uploadResponse = http.post(
        `${config.supabaseUrl}/storage/v1/object/documents/${storagePath}`,
        mockFile.data,
        {
          headers: {
            ...authHeaders,
            'Content-Type': mockFile.contentType,
            'Cache-Control': '3600',
          },
          tags: { operation: 'upload' },
        }
      );

      const uploadDuration = Date.now() - uploadStart;
      documentUploadDuration.add(uploadDuration);

      const uploadSuccess = check(uploadResponse, {
        'upload status is 200': (r) => r.status === 200,
        'upload returns path': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.Key !== undefined || body.path !== undefined;
          } catch {
            return false;
          }
        },
        'upload duration under 5s': () => uploadDuration < 5000,
      });

      documentOperationSuccess.add(uploadSuccess);

      if (uploadSuccess) {
        documentPath = storagePath;

        // Create document record in database
        const docPayload = JSON.stringify({
          project_id: data.projectId,
          name: mockFile.filename,
          file_type: 'pdf',
          storage_path: storagePath,
          file_size: mockFile.data.length,
        });

        const docResponse = http.post(
          `${config.supabaseUrl}/rest/v1/documents`,
          docPayload,
          {
            headers: {
              ...authHeaders,
              'Prefer': 'return=representation',
            },
          }
        );

        check(docResponse, {
          'document record created': (r) => r.status === 201,
        });
      } else {
        console.error(`Upload failed: ${uploadResponse.status} - ${uploadResponse.body}`);
        uploadErrors.add(1);
      }
    });

    sleep(randomSleep(1, 2));

    // Test 2: List Documents
    group('List Documents', () => {
      if (!data.projectId) {
        console.error('No project ID available, skipping list');
        return;
      }

      const listStart = Date.now();

      const listResponse = http.get(
        `${config.supabaseUrl}/rest/v1/documents?project_id=eq.${data.projectId}&select=*&order=created_at.desc&limit=20`,
        {
          headers: authHeaders,
          tags: { operation: 'list' },
        }
      );

      const listDuration = Date.now() - listStart;
      documentListDuration.add(listDuration);

      const listSuccess = check(listResponse, {
        'list status is 200': (r) => r.status === 200,
        'list returns array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body);
          } catch {
            return false;
          }
        },
        'list duration under 1s': () => listDuration < 1000,
      });

      documentOperationSuccess.add(listSuccess);
    });

    sleep(randomSleep(1, 2));

    // Test 3: Download Document
    if (documentPath) {
      group('Download Document', () => {
        const downloadStart = Date.now();

        const downloadResponse = http.get(
          `${config.supabaseUrl}/storage/v1/object/documents/${documentPath}`,
          {
            headers: authHeaders,
            tags: { operation: 'download' },
          }
        );

        const downloadDuration = Date.now() - downloadStart;
        documentDownloadDuration.add(downloadDuration);

        const downloadSuccess = check(downloadResponse, {
          'download status is 200': (r) => r.status === 200,
          'download returns data': (r) => r.body.length > 0,
          'download duration under 2s': () => downloadDuration < 2000,
        });

        documentOperationSuccess.add(downloadSuccess);

        if (!downloadSuccess) {
          downloadErrors.add(1);
        }
      });

      sleep(randomSleep(1, 2));

      // Test 4: Get Document Metadata
      group('Get Document Metadata', () => {
        const metadataResponse = http.get(
          `${config.supabaseUrl}/storage/v1/object/info/documents/${documentPath}`,
          {
            headers: authHeaders,
            tags: { operation: 'metadata' },
          }
        );

        check(metadataResponse, {
          'metadata status is 200': (r) => r.status === 200,
          'metadata returns info': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.size !== undefined;
            } catch {
              return false;
            }
          },
        });
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
  console.log('Document operations load test completed');
  if (data && data.timestamp) {
    console.log(`Test duration: ${((Date.now() - data.timestamp) / 1000).toFixed(2)}s`);
  }

  // Note: Cleanup of test documents could be done here
}

/**
 * Handle summary
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/documents-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const { indent = '' } = options;
  let summary = '\n';

  summary += `${indent}Document Operations Load Test Summary\n`;
  summary += `${indent}======================================\n\n`;

  if (data.metrics.document_upload_duration) {
    summary += `${indent}Upload Performance:\n`;
    summary += `${indent}  - Avg: ${data.metrics.document_upload_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${data.metrics.document_upload_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  - P99: ${data.metrics.document_upload_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.document_download_duration) {
    summary += `${indent}Download Performance:\n`;
    summary += `${indent}  - Avg: ${data.metrics.document_download_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${data.metrics.document_download_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.document_list_duration) {
    summary += `${indent}List Performance:\n`;
    summary += `${indent}  - Avg: ${data.metrics.document_list_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  - P95: ${data.metrics.document_list_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.document_operation_success) {
    summary += `${indent}Overall Success Rate: ${(data.metrics.document_operation_success.values.rate * 100).toFixed(2)}%\n\n`;
  }

  return summary;
}
