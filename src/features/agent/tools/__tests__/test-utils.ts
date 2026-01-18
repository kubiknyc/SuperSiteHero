/**
 * Agent Tool Test Utilities
 *
 * Shared mocking utilities for testing agent tools.
 * Provides reusable mocks for Supabase, AI services, and tool context.
 */

import { vi } from 'vitest';
import type { ToolContext } from '../../types/tools';

// ============================================================================
// Mock Factory Functions
// ============================================================================

/**
 * Creates a mock AI service with common methods
 */
export function createMockAiService() {
  return {
    extractJSON: vi.fn(),
    generateText: vi.fn(),
    complete: vi.fn(),
  };
}

/**
 * Creates a mock logger with all standard methods
 */
export function createMockLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Creates a chainable mock Supabase query builder
 * Supports from, select, eq, single, insert, update, delete, order, limit, etc.
 */
export function createMockSupabaseQuery<T = any>(returnValue: { data: T | null; error: any; count?: number }) {
  const query: any = {
    _returnValue: returnValue,
    from: vi.fn(function (this: any) {
      return this;
    }),
    select: vi.fn(function (this: any) {
      return this;
    }),
    insert: vi.fn(function (this: any) {
      // Return this for chaining (.select().single()), not Promise directly
      return this;
    }),
    update: vi.fn(function (this: any) {
      return this;
    }),
    delete: vi.fn(function (this: any) {
      return this;
    }),
    upsert: vi.fn(function (this: any) {
      // Return this for chaining (.select().single()), not Promise directly
      return this;
    }),
    eq: vi.fn(function (this: any) {
      // Make thenable for awaiting, but also return this for chaining
      const result = Promise.resolve(this._returnValue);
      Object.assign(result, this);
      return result;
    }),
    neq: vi.fn(function (this: any) {
      return this;
    }),
    gt: vi.fn(function (this: any) {
      return this;
    }),
    gte: vi.fn(function (this: any) {
      return this;
    }),
    lt: vi.fn(function (this: any) {
      return this;
    }),
    lte: vi.fn(function (this: any) {
      return this;
    }),
    like: vi.fn(function (this: any) {
      return this;
    }),
    ilike: vi.fn(function (this: any) {
      return this;
    }),
    is: vi.fn(function (this: any) {
      return this;
    }),
    not: vi.fn(function (this: any) {
      return this;
    }),
    in: vi.fn(function (this: any) {
      return this;
    }),
    contains: vi.fn(function (this: any) {
      return this;
    }),
    containedBy: vi.fn(function (this: any) {
      return this;
    }),
    range: vi.fn(function (this: any) {
      return this;
    }),
    order: vi.fn(function (this: any) {
      return this;
    }),
    limit: vi.fn(function (this: any) {
      return this;
    }),
    single: vi.fn(function (this: any) {
      return Promise.resolve(this._returnValue);
    }),
    maybeSingle: vi.fn(function (this: any) {
      return Promise.resolve(this._returnValue);
    }),
    then: function (this: any, resolve: (value: any) => void) {
      return Promise.resolve(this._returnValue).then(resolve);
    },
  };

  return query;
}

/**
 * Creates a mock Supabase client with query sequencing support
 */
export function createMockSupabaseClient() {
  let querySequence: ReturnType<typeof createMockSupabaseQuery>[] = [];
  let currentQueryIndex = 0;

  const client = {
    from: vi.fn(() => {
      if (currentQueryIndex < querySequence.length) {
        return querySequence[currentQueryIndex++];
      }
      return createMockSupabaseQuery({ data: null, error: null });
    }),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  };

  return {
    client,
    /**
     * Setup a sequence of queries that will be returned in order
     */
    setupQueries: (queries: Array<{ data: any; error?: any; count?: number }>) => {
      querySequence = queries.map((q) => createMockSupabaseQuery(q));
      currentQueryIndex = 0;
    },
    /**
     * Reset the query sequence
     */
    resetQueries: () => {
      querySequence = [];
      currentQueryIndex = 0;
    },
    /**
     * Get the current query sequence for assertions
     */
    getQuerySequence: () => querySequence,
  };
}

// ============================================================================
// Tool Context Factory
// ============================================================================

export interface MockContextOptions {
  companyId?: string;
  sessionId?: string;
  messageId?: string;
  userId?: string;
  projectId?: string;
}

/**
 * Creates a mock tool context
 */
export function createMockToolContext(options: MockContextOptions = {}): ToolContext {
  return {
    companyId: options.companyId || 'company-test-123',
    sessionId: options.sessionId || 'session-test-456',
    messageId: options.messageId || 'message-test-789',
    userId: options.userId || 'user-test-abc',
    ...(options.projectId && { projectId: options.projectId }),
  };
}

// ============================================================================
// AI Response Factories
// ============================================================================

export interface MockAiResponseOptions {
  data?: any;
  tokens?: {
    total?: number;
    prompt?: number;
    completion?: number;
  };
}

/**
 * Creates a mock AI extractJSON response
 */
export function createMockAiResponse(options: MockAiResponseOptions = {}) {
  return {
    data: options.data || {},
    tokens: {
      total: options.tokens?.total ?? 300,
      prompt: options.tokens?.prompt ?? 200,
      completion: options.tokens?.completion ?? 100,
    },
  };
}

/**
 * Creates a mock AI error
 */
export function createMockAiError(message: string = 'AI service error') {
  return new Error(message);
}

// ============================================================================
// Common Test Data Factories
// ============================================================================

/**
 * Creates a mock project
 */
export function createMockProject(overrides: Partial<any> = {}) {
  return {
    id: 'project-123',
    name: 'Test Project',
    project_number: 'TP-001',
    status: 'active',
    company_id: 'company-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock user
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'superintendent',
    company_id: 'company-123',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Tool Result Helpers
// ============================================================================

/**
 * Creates a successful tool result
 */
export function createSuccessResult<T>(data: T, metadata?: Record<string, any>) {
  return {
    success: true,
    data,
    metadata: {
      executionTimeMs: 100,
      ...metadata,
    },
  };
}

/**
 * Creates a failed tool result
 */
export function createErrorResult(error: string, errorCode: string, metadata?: Record<string, any>) {
  return {
    success: false,
    error,
    errorCode,
    metadata: {
      executionTimeMs: 50,
      ...metadata,
    },
  };
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Asserts that a tool result is successful
 */
export function expectSuccess(result: any) {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.error).toBeUndefined();
}

/**
 * Asserts that a tool result is an error
 */
export function expectError(result: any, errorCode?: string) {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  if (errorCode) {
    expect(result.errorCode).toBe(errorCode);
  }
}

// ============================================================================
// Module Mock Setup Helpers
// ============================================================================

/**
 * Common module mocks for agent tools
 * Use with vi.mock() at the top of your test file
 *
 * Example usage:
 * ```typescript
 * const { mockSupabase, mockAiService, mockLogger } = setupAgentToolMocks();
 *
 * vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase.client }));
 * vi.mock('@/lib/api/services/ai-provider', () => ({ aiService: mockAiService }));
 * vi.mock('@/lib/utils/logger', () => ({ logger: mockLogger }));
 * ```
 */
export function setupAgentToolMocks() {
  const mockSupabase = createMockSupabaseClient();
  const mockAiService = createMockAiService();
  const mockLogger = createMockLogger();

  return {
    mockSupabase,
    mockAiService,
    mockLogger,
    /**
     * Clear all mocks between tests
     */
    clearMocks: () => {
      vi.clearAllMocks();
      mockSupabase.resetQueries();
    },
  };
}

// ============================================================================
// Date/Time Helpers
// ============================================================================

/**
 * Creates a date string in ISO format
 */
export function createISODate(daysFromNow: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

/**
 * Creates a date string in YYYY-MM-DD format
 */
export function createDateString(daysFromNow: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}
