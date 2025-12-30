/**
 * API Mocks Helper
 * Utilities for creating and managing MSW handlers in tests
 */

import { http, HttpResponse, type DefaultBodyType, type HttpHandler, type StrictRequest, type JsonBodyType } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';

// Import factories
import {
  createMockUser,
  createMockProject,
  createMockDailyReport,
  createMockDocument,
  createMockDSEnvelope,
  createMockDSConnection,
  type MockUser,
  type MockProject,
  type MockDailyReport,
  type MockDocument,
} from '../factories';

import type { DSEnvelope, DSConnection } from '@/types/docusign';

// ============================================================================
// Types
// ============================================================================

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface MockApiResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface HandlerOptions {
  delay?: number;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Get Supabase URL from env or use test default
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://test.supabase.co';
const API_URL = `${SUPABASE_URL}/rest/v1`;
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a successful API response
 */
export function successResponse(data: JsonBodyType, options: HandlerOptions = {}) {
  const { status = 200 } = options;
  return HttpResponse.json(data, { status });
}

/**
 * Create a successful array response (Supabase format)
 */
export function arrayResponse<T>(data: T[], options: HandlerOptions = {}) {
  const { status = 200 } = options;
  return HttpResponse.json(data, {
    status,
    headers: {
      'Content-Range': `0-${data.length - 1}/${data.length}`,
    },
  });
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number = 1,
  pageSize: number = 10,
  total?: number
) {
  const totalCount = total ?? data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, totalCount);

  // Unused but kept for potential future use
  void totalPages;

  return HttpResponse.json(data, {
    status: 200,
    headers: {
      'Content-Range': `${start}-${end - 1}/${totalCount}`,
      'X-Total-Count': totalCount.toString(),
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code?: string
) {
  return HttpResponse.json(
    {
      error: message,
      message,
      code: code ?? 'API_ERROR',
    },
    { status }
  );
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized') {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden') {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(message: string = 'Not found') {
  return errorResponse(message, 404, 'NOT_FOUND');
}

/**
 * Create a 500 Server Error response
 */
export function serverErrorResponse(message: string = 'Internal server error') {
  return errorResponse(message, 500, 'INTERNAL_SERVER_ERROR');
}

// ============================================================================
// Handler Factories
// ============================================================================

/**
 * Create a handler for a Supabase REST endpoint
 */
export function createSupabaseHandler(
  method: HttpMethod,
  table: string,
  response: JsonBodyType | (() => JsonBodyType),
  options: HandlerOptions = {}
): HttpHandler {
  const { delay = 0, status = 200 } = options;
  const url = `${API_URL}/${table}`;

  const httpMethod = http[method];

  return httpMethod(url, async () => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const data = typeof response === 'function' ? response() : response;
    return HttpResponse.json(Array.isArray(data) ? data : [data], { status });
  });
}

/**
 * Create a GET handler that returns data matching query params
 */
export function createQueryHandler<T extends Record<string, unknown>>(
  table: string,
  dataFactory: (params: URLSearchParams) => T[],
  options: HandlerOptions = {}
): HttpHandler {
  const { delay = 0 } = options;

  return http.get(`${API_URL}/${table}`, async ({ request }) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const url = new URL(request.url);
    const data = dataFactory(url.searchParams);
    return arrayResponse(data);
  });
}

/**
 * Create a handler that returns different data based on ID
 */
export function createResourceHandler<T extends { id: string }>(
  table: string,
  resources: T[],
  options: HandlerOptions = {}
): HttpHandler[] {
  const { delay = 0 } = options;

  return [
    // Get all
    http.get(`${API_URL}/${table}`, async ({ request }) => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const url = new URL(request.url);
      const idFilter = url.searchParams.get('id');

      if (idFilter) {
        // Extract ID from eq.{id} format
        const id = idFilter.replace('eq.', '');
        const resource = resources.find((r) => r.id === id);
        return resource ? arrayResponse([resource]) : arrayResponse([]);
      }

      return arrayResponse(resources);
    }),

    // Get by ID pattern
    http.get(`${API_URL}/${table}/*`, async ({ params }) => {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const id = params['0'] as string;
      const resource = resources.find((r) => r.id === id);
      return resource ? successResponse(resource) : notFoundResponse();
    }),
  ];
}

// ============================================================================
// Common API Handlers
// ============================================================================

/**
 * Create handlers for user endpoints
 */
export function createUserHandlers(users: MockUser[] = [createMockUser()]): HttpHandler[] {
  return [
    ...createResourceHandler('users', users),

    // Auth endpoints
    http.get(`${AUTH_URL}/user`, () => {
      if (users.length > 0) {
        return successResponse({
          id: users[0].id,
          email: users[0].email,
          role: 'authenticated',
        });
      }
      return unauthorizedResponse();
    }),
  ];
}

/**
 * Create handlers for project endpoints
 */
export function createProjectHandlers(projects: MockProject[] = [createMockProject()]): HttpHandler[] {
  return createResourceHandler('projects', projects);
}

/**
 * Create handlers for daily report endpoints
 */
export function createDailyReportHandlers(reports: MockDailyReport[] = [createMockDailyReport()]): HttpHandler[] {
  return createResourceHandler('daily_reports', reports);
}

/**
 * Create handlers for document endpoints
 */
export function createDocumentHandlers(documents: MockDocument[] = [createMockDocument()]): HttpHandler[] {
  return createResourceHandler('documents', documents);
}

/**
 * Create handlers for DocuSign endpoints
 */
export function createDocuSignHandlers(
  connection: DSConnection = createMockDSConnection() as unknown as DSConnection,
  envelopes: DSEnvelope[] = [createMockDSEnvelope() as unknown as DSEnvelope]
): HttpHandler[] {
  return [
    ...createResourceHandler('docusign_connections', [connection] as unknown as { id: string }[]),
    ...createResourceHandler('docusign_envelopes', envelopes as unknown as { id: string }[]),
  ];
}

// ============================================================================
// Server Management
// ============================================================================

/**
 * Create and configure MSW server for tests
 */
export function createMockServer(handlers: HttpHandler[] = []): SetupServerApi {
  return setupServer(...handlers);
}

/**
 * Add handlers to an existing server
 */
export function addHandlers(server: SetupServerApi, handlers: HttpHandler[]): void {
  server.use(...handlers);
}

/**
 * Reset server handlers to initial state
 */
export function resetHandlers(server: SetupServerApi): void {
  server.resetHandlers();
}

/**
 * Override specific handler temporarily
 */
export function overrideHandler(server: SetupServerApi, handler: HttpHandler): void {
  server.use(handler);
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a handler that tracks requests
 */
export function createTrackedHandler(
  method: HttpMethod,
  path: string,
  responseData: JsonBodyType
): {
  handler: HttpHandler;
  requests: Request[];
  getLastRequest: () => Request | undefined;
  clearRequests: () => void;
} {
  const requests: Request[] = [];

  const handler = http[method](path, async ({ request }) => {
    requests.push(request);
    return HttpResponse.json(responseData);
  });

  return {
    handler,
    requests,
    getLastRequest: () => requests[requests.length - 1],
    clearRequests: () => {
      requests.length = 0;
    },
  };
}

/**
 * Create a handler that fails after N requests
 */
export function createFailAfterHandler(
  method: HttpMethod,
  path: string,
  successData: JsonBodyType,
  failData: JsonBodyType,
  failAfter: number,
  failStatus: number = 500
): HttpHandler {
  let requestCount = 0;

  return http[method](path, async () => {
    requestCount++;
    if (requestCount > failAfter) {
      return HttpResponse.json(failData, { status: failStatus });
    }
    return HttpResponse.json(successData);
  });
}

/**
 * Create a handler that simulates network delay
 */
export function createDelayedHandler(
  method: HttpMethod,
  path: string,
  responseData: JsonBodyType,
  delayMs: number
): HttpHandler {
  return http[method](path, async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return HttpResponse.json(responseData);
  });
}

/**
 * Create a handler that fails randomly
 */
export function createFlakyHandler(
  method: HttpMethod,
  path: string,
  successData: JsonBodyType,
  failData: JsonBodyType,
  failureProbability: number = 0.5,
  failStatus: number = 500
): HttpHandler {
  return http[method](path, async () => {
    if (Math.random() < failureProbability) {
      return HttpResponse.json(failData, { status: failStatus });
    }
    return HttpResponse.json(successData);
  });
}

// ============================================================================
// Pre-configured Handler Sets
// ============================================================================

/**
 * Create a complete set of handlers for a typical test scenario
 */
export function createDefaultHandlers(): HttpHandler[] {
  const user = createMockUser();
  const project = createMockProject({ company_id: user.company_id });
  const report = createMockDailyReport({ project_id: project.id, company_id: user.company_id });
  const document = createMockDocument({ project_id: project.id, company_id: user.company_id });

  return [
    ...createUserHandlers([user]),
    ...createProjectHandlers([project]),
    ...createDailyReportHandlers([report]),
    ...createDocumentHandlers([document]),
  ];
}

/**
 * Create handlers that always return errors
 */
export function createErrorHandlers(): HttpHandler[] {
  return [
    http.get(`${API_URL}/*`, () => serverErrorResponse()),
    http.post(`${API_URL}/*`, () => serverErrorResponse()),
    http.patch(`${API_URL}/*`, () => serverErrorResponse()),
    http.delete(`${API_URL}/*`, () => serverErrorResponse()),
  ];
}

/**
 * Create handlers that simulate offline state
 */
export function createOfflineHandlers(): HttpHandler[] {
  return [
    http.get(`${API_URL}/*`, () => {
      return HttpResponse.error();
    }),
    http.post(`${API_URL}/*`, () => {
      return HttpResponse.error();
    }),
    http.patch(`${API_URL}/*`, () => {
      return HttpResponse.error();
    }),
    http.delete(`${API_URL}/*`, () => {
      return HttpResponse.error();
    }),
  ];
}
