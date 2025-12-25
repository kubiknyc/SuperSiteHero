/**
 * Helpers Tests
 * Verify that all test helper utilities work correctly
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import helpers
import {
  // Render helpers
  customRender,
  renderAuthenticated,
  renderWithRole,
  renderLoading,
  createTestQueryClient,

  // API mock helpers
  successResponse,
  arrayResponse,
  paginatedResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,

  // Auth helpers
  createUnauthenticatedContext,
  createAuthenticatedContext,
  createLoadingContext,
  createContextWithRole,
  createMockSupabaseAuth,
  createMockSupabaseAuthUnauthenticated,
  mockSuccessfulLogin,
  mockFailedLogin,
  mockLoginWithRole,
  isAdmin,
  canManageProjects,
  canEditDailyReports,
  canViewFinancials,
  canApproveDocuments,
  createTestCredentials,
  testForAllRoles,
  testForRolesWithPermission,
} from './index';

// Import factories for testing
import { createMockUser, TEST_USERS } from '../factories';

// Simple test component
function TestComponent({ message = 'Hello Test' }: { message?: string }) {
  return <div data-testid="test-component">{message}</div>;
}

describe('Render Helpers', () => {
  describe('customRender', () => {
    it('should render a component with default providers', () => {
      const { getByTestId } = customRender(<TestComponent />);
      expect(getByTestId('test-component')).toHaveTextContent('Hello Test');
    });

    it('should render with custom props', () => {
      const { getByTestId } = customRender(<TestComponent message="Custom Message" />);
      expect(getByTestId('test-component')).toHaveTextContent('Custom Message');
    });

    it('should provide query client', () => {
      const { queryClient } = customRender(<TestComponent />);
      expect(queryClient).toBeDefined();
      expect(queryClient.getDefaultOptions).toBeDefined();
    });
  });

  describe('renderAuthenticated', () => {
    it('should render with authenticated user', () => {
      const { user, session, getByTestId } = renderAuthenticated(<TestComponent />);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(session).toBeDefined();
      expect(session.access_token).toBeDefined();
      expect(getByTestId('test-component')).toBeInTheDocument();
    });

    it('should accept custom user', () => {
      const customUser = createMockUser({ role: 'admin' });
      const { user } = renderAuthenticated(<TestComponent />, { user: customUser });

      expect(user.role).toBe('admin');
    });
  });

  describe('renderWithRole', () => {
    it('should render with specific role', () => {
      const { user } = renderWithRole(<TestComponent />, 'superintendent');
      expect(user.role).toBe('superintendent');
    });

    it('should work with all roles', () => {
      const roles = ['admin', 'superintendent', 'project_manager', 'foreman', 'viewer'] as const;

      roles.forEach((role) => {
        const { user } = renderWithRole(<TestComponent />, role);
        expect(user.role).toBe(role);
      });
    });
  });

  describe('renderLoading', () => {
    it('should render in loading state', () => {
      const { getByTestId } = renderLoading(<TestComponent />);
      expect(getByTestId('test-component')).toBeInTheDocument();
    });
  });

  describe('createTestQueryClient', () => {
    it('should create a query client with test configuration', () => {
      const queryClient = createTestQueryClient();

      expect(queryClient).toBeDefined();

      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.retry).toBe(false);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });
  });
});

describe('API Mock Helpers', () => {
  describe('Response helpers', () => {
    it('should create success response', async () => {
      const response = successResponse({ id: 1, name: 'Test' });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ id: 1, name: 'Test' });
    });

    it('should create array response', async () => {
      const response = arrayResponse([{ id: 1 }, { id: 2 }]);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });

    it('should create paginated response', async () => {
      const response = paginatedResponse([{ id: 1 }, { id: 2 }], 1, 10, 100);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      // Content-Range shows the range based on page size (0-9 for page 1, size 10)
      expect(response.headers.get('Content-Range')).toBe('0-9/100');
      expect(response.headers.get('X-Total-Count')).toBe('100');
    });

    it('should create error responses', async () => {
      const generic = errorResponse('Generic error', 400);
      const unauthorized = unauthorizedResponse();
      const forbidden = forbiddenResponse();
      const notFound = notFoundResponse();
      const serverError = serverErrorResponse();

      expect(generic.status).toBe(400);
      expect(unauthorized.status).toBe(401);
      expect(forbidden.status).toBe(403);
      expect(notFound.status).toBe(404);
      expect(serverError.status).toBe(500);

      const errorData = await generic.json();
      expect(errorData.message).toBe('Generic error');
    });
  });
});

describe('Auth Helpers', () => {
  describe('Context factories', () => {
    it('should create unauthenticated context', () => {
      const context = createUnauthenticatedContext();

      expect(context.session).toBeNull();
      expect(context.user).toBeNull();
      expect(context.userProfile).toBeNull();
      expect(context.loading).toBe(false);
      expect(context.signIn).toBeDefined();
      expect(context.signOut).toBeDefined();
    });

    it('should create authenticated context', () => {
      const context = createAuthenticatedContext();

      expect(context.session).toBeDefined();
      expect(context.user).toBeDefined();
      expect(context.userProfile).toBeDefined();
      expect(context.loading).toBe(false);
    });

    it('should create authenticated context with custom user', () => {
      const context = createAuthenticatedContext({ role: 'admin' });

      expect(context.userProfile?.role).toBe('admin');
    });

    it('should create loading context', () => {
      const context = createLoadingContext();

      expect(context.loading).toBe(true);
      expect(context.session).toBeNull();
    });

    it('should create context with specific role', () => {
      const context = createContextWithRole('superintendent');

      expect(context.userProfile?.role).toBe('superintendent');
    });
  });

  describe('Mock Supabase Auth', () => {
    it('should create mock auth for authenticated state', async () => {
      const mockAuth = createMockSupabaseAuth();

      const { data: { session } } = await mockAuth.getSession();
      const { data: { user } } = await mockAuth.getUser();

      expect(session).toBeDefined();
      expect(user).toBeDefined();
    });

    it('should create mock auth for unauthenticated state', async () => {
      const mockAuth = createMockSupabaseAuthUnauthenticated();

      const { data: { session } } = await mockAuth.getSession();
      const { data: { user } } = await mockAuth.getUser();

      expect(session).toBeNull();
      expect(user).toBeNull();
    });
  });

  describe('Login helpers', () => {
    it('should mock successful login', async () => {
      const mockAuth = createMockSupabaseAuthUnauthenticated();
      const { user, session } = mockSuccessfulLogin(mockAuth);

      expect(user).toBeDefined();
      expect(session).toBeDefined();

      // Verify the mock was updated
      const result = await mockAuth.signInWithPassword({ email: 'test@test.com', password: 'password' });
      expect(result.error).toBeNull();
      expect(result.data?.session).toBeDefined();
    });

    it('should mock failed login', async () => {
      const mockAuth = createMockSupabaseAuth();
      mockFailedLogin(mockAuth, 'Invalid credentials');

      const result = await mockAuth.signInWithPassword({ email: 'test@test.com', password: 'wrong' });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Invalid credentials');
    });

    it('should mock login with specific role', async () => {
      const mockAuth = createMockSupabaseAuthUnauthenticated();
      const { user } = mockLoginWithRole(mockAuth, 'admin');

      expect(user.role).toBe('admin');
    });
  });

  describe('Permission helpers', () => {
    it('should correctly identify admin', () => {
      expect(isAdmin(TEST_USERS.admin)).toBe(true);
      expect(isAdmin(TEST_USERS.superintendent)).toBe(false);
      expect(isAdmin(TEST_USERS.viewer)).toBe(false);
    });

    it('should correctly identify project management permission', () => {
      expect(canManageProjects(TEST_USERS.admin)).toBe(true);
      expect(canManageProjects(TEST_USERS.superintendent)).toBe(true);
      expect(canManageProjects(TEST_USERS.projectManager)).toBe(true);
      expect(canManageProjects(TEST_USERS.foreman)).toBe(false);
      expect(canManageProjects(TEST_USERS.viewer)).toBe(false);
    });

    it('should correctly identify daily report edit permission', () => {
      expect(canEditDailyReports(TEST_USERS.admin)).toBe(true);
      expect(canEditDailyReports(TEST_USERS.superintendent)).toBe(true);
      expect(canEditDailyReports(TEST_USERS.projectManager)).toBe(true);
      expect(canEditDailyReports(TEST_USERS.foreman)).toBe(true);
      expect(canEditDailyReports(TEST_USERS.viewer)).toBe(false);
    });

    it('should correctly identify financial view permission', () => {
      expect(canViewFinancials(TEST_USERS.admin)).toBe(true);
      expect(canViewFinancials(TEST_USERS.projectManager)).toBe(true);
      expect(canViewFinancials(TEST_USERS.superintendent)).toBe(false);
      expect(canViewFinancials(TEST_USERS.foreman)).toBe(false);
      expect(canViewFinancials(TEST_USERS.viewer)).toBe(false);
    });

    it('should correctly identify document approval permission', () => {
      expect(canApproveDocuments(TEST_USERS.admin)).toBe(true);
      expect(canApproveDocuments(TEST_USERS.superintendent)).toBe(true);
      expect(canApproveDocuments(TEST_USERS.projectManager)).toBe(true);
      expect(canApproveDocuments(TEST_USERS.foreman)).toBe(false);
      expect(canApproveDocuments(TEST_USERS.viewer)).toBe(false);
    });
  });

  describe('Test utilities', () => {
    it('should create test credentials', () => {
      const credentials = createTestCredentials();

      expect(credentials.email).toBeDefined();
      expect(credentials.password).toBeDefined();
    });

    it('should test for all roles', async () => {
      const testedRoles: string[] = [];

      await testForAllRoles((role, context) => {
        testedRoles.push(role);
        expect(context.userProfile?.role).toBe(role);
      });

      expect(testedRoles).toContain('admin');
      expect(testedRoles).toContain('superintendent');
      expect(testedRoles).toContain('project_manager');
      expect(testedRoles).toContain('foreman');
      expect(testedRoles).toContain('viewer');
      expect(testedRoles).toHaveLength(5);
    });

    it('should test for roles with permission', async () => {
      const results: { role: string; hasPermission: boolean }[] = [];

      await testForRolesWithPermission(isAdmin, (role, context, hasPermission) => {
        results.push({ role, hasPermission });
      });

      expect(results.find((r) => r.role === 'admin')?.hasPermission).toBe(true);
      expect(results.find((r) => r.role === 'viewer')?.hasPermission).toBe(false);
    });
  });
});
