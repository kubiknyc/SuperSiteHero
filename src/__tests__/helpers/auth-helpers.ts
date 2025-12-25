/**
 * Auth Helpers
 * Utilities for testing authentication flows and user contexts
 */

import { vi, type Mock } from 'vitest';
import {
  createMockUser,
  createMockSession,
  createMockAuthUser,
  createMockUserWithAuth,
  type MockUser,
  type MockSession,
  type MockAuthUser,
  type UserRole,
} from '../factories';

// ============================================================================
// Types
// ============================================================================

export interface MockAuthContext {
  session: MockSession | null;
  user: MockAuthUser | null;
  userProfile: MockUser | null;
  loading: boolean;
  signIn: Mock<(email: string, password: string) => Promise<void>>;
  signOut: Mock<() => Promise<void>>;
}

export interface MockSupabaseAuth {
  getSession: Mock<() => Promise<{ data: { session: MockSession | null } }>>;
  getUser: Mock<() => Promise<{ data: { user: MockAuthUser | null } }>>;
  signInWithPassword: Mock<(credentials: { email: string; password: string }) => Promise<{ data: { session: MockSession; user: MockAuthUser }; error: null } | { data: null; error: Error }>>;
  signOut: Mock<() => Promise<{ error: null }>>;
  onAuthStateChange: Mock<(callback: (event: string, session: MockSession | null) => void) => { data: { subscription: { unsubscribe: () => void } } }>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ============================================================================
// Mock Context Factories
// ============================================================================

/**
 * Create a mock auth context for unauthenticated state
 */
export function createUnauthenticatedContext(): MockAuthContext {
  return {
    session: null,
    user: null,
    userProfile: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock auth context for authenticated state
 */
export function createAuthenticatedContext(userOptions?: Parameters<typeof createMockUser>[0]): MockAuthContext {
  const { authUser, profile, session } = createMockUserWithAuth(userOptions);

  return {
    session,
    user: authUser,
    userProfile: profile,
    loading: false,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock auth context for loading state
 */
export function createLoadingContext(): MockAuthContext {
  return {
    session: null,
    user: null,
    userProfile: null,
    loading: true,
    signIn: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a mock auth context for a specific role
 */
export function createContextWithRole(role: UserRole): MockAuthContext {
  return createAuthenticatedContext({ role });
}

// ============================================================================
// Mock Supabase Auth
// ============================================================================

/**
 * Create a mock Supabase auth object for authenticated state
 */
export function createMockSupabaseAuth(user?: MockUser): MockSupabaseAuth {
  const { authUser, session } = user
    ? { authUser: createMockAuthUser({ id: user.id, email: user.email }), session: createMockSession({ user: createMockAuthUser({ id: user.id, email: user.email }) }) }
    : createMockUserWithAuth();

  return {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: authUser } }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { session, user: authUser },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      // Immediately call with current session
      setTimeout(() => callback('SIGNED_IN', session), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
}

/**
 * Create a mock Supabase auth object for unauthenticated state
 */
export function createMockSupabaseAuthUnauthenticated(): MockSupabaseAuth {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Invalid login credentials'),
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
  };
}

// ============================================================================
// Login Helpers
// ============================================================================

/**
 * Simulate a successful login
 */
export function mockSuccessfulLogin(
  mockAuth: MockSupabaseAuth,
  credentials?: LoginCredentials
): { user: MockUser; session: MockSession } {
  const { authUser, profile, session } = createMockUserWithAuth(
    credentials ? { email: credentials.email } : undefined
  );

  mockAuth.signInWithPassword.mockResolvedValueOnce({
    data: { session, user: authUser },
    error: null,
  });

  mockAuth.getSession.mockResolvedValueOnce({ data: { session } });
  mockAuth.getUser.mockResolvedValueOnce({ data: { user: authUser } });

  return { user: profile, session };
}

/**
 * Simulate a failed login
 */
export function mockFailedLogin(
  mockAuth: MockSupabaseAuth,
  errorMessage: string = 'Invalid login credentials'
): void {
  mockAuth.signInWithPassword.mockResolvedValueOnce({
    data: null,
    error: new Error(errorMessage),
  });
}

/**
 * Simulate a login with specific user role
 */
export function mockLoginWithRole(
  mockAuth: MockSupabaseAuth,
  role: UserRole
): { user: MockUser; session: MockSession } {
  const { authUser, profile, session } = createMockUserWithAuth({ role });

  mockAuth.signInWithPassword.mockResolvedValueOnce({
    data: { session, user: authUser },
    error: null,
  });

  mockAuth.getSession.mockResolvedValueOnce({ data: { session } });
  mockAuth.getUser.mockResolvedValueOnce({ data: { user: authUser } });

  return { user: profile, session };
}

/**
 * Simulate session expiry
 */
export function mockSessionExpired(mockAuth: MockSupabaseAuth): void {
  mockAuth.getSession.mockResolvedValueOnce({ data: { session: null } });
  mockAuth.getUser.mockResolvedValueOnce({ data: { user: null } });
}

/**
 * Simulate token refresh
 */
export function mockTokenRefresh(
  mockAuth: MockSupabaseAuth,
  user?: MockUser
): MockSession {
  const { authUser, session } = user
    ? { authUser: createMockAuthUser({ id: user.id, email: user.email }), session: createMockSession({ user: createMockAuthUser({ id: user.id, email: user.email }) }) }
    : createMockUserWithAuth();

  mockAuth.getSession.mockResolvedValueOnce({ data: { session } });
  mockAuth.getUser.mockResolvedValueOnce({ data: { user: authUser } });

  return session;
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user has admin role
 */
export function isAdmin(user: MockUser): boolean {
  return user.role === 'admin';
}

/**
 * Check if user can manage projects
 */
export function canManageProjects(user: MockUser): boolean {
  return ['admin', 'superintendent', 'project_manager'].includes(user.role);
}

/**
 * Check if user can edit daily reports
 */
export function canEditDailyReports(user: MockUser): boolean {
  return ['admin', 'superintendent', 'project_manager', 'foreman'].includes(user.role);
}

/**
 * Check if user can view financial data
 */
export function canViewFinancials(user: MockUser): boolean {
  return ['admin', 'project_manager'].includes(user.role);
}

/**
 * Check if user can approve documents
 */
export function canApproveDocuments(user: MockUser): boolean {
  return ['admin', 'superintendent', 'project_manager'].includes(user.role);
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create test credentials
 */
export function createTestCredentials(): LoginCredentials {
  return {
    email: 'test@example.com',
    password: 'password123',
  };
}

/**
 * Create invalid credentials for testing
 */
export function createInvalidCredentials(): LoginCredentials {
  return {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  };
}

/**
 * Wait for auth state to settle
 */
export async function waitForAuthState(timeoutMs: number = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

/**
 * Create a mock for useAuth hook
 */
export function createUseAuthMock(
  options: {
    isAuthenticated?: boolean;
    user?: MockUser;
    loading?: boolean;
  } = {}
): MockAuthContext {
  const { isAuthenticated = false, user, loading = false } = options;

  if (isAuthenticated) {
    const context = createAuthenticatedContext(user ? { id: user.id, email: user.email, role: user.role } : undefined);
    if (user) {
      context.userProfile = user;
    }
    context.loading = loading;
    return context;
  }

  const context = createUnauthenticatedContext();
  context.loading = loading;
  return context;
}

/**
 * Setup vi.mock for useAuth hook
 */
export function setupAuthMock(context: MockAuthContext): void {
  vi.mock('@/lib/auth/AuthContext', () => ({
    useAuth: () => context,
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  }));
}

// ============================================================================
// Role-based Test Scenarios
// ============================================================================

/**
 * Test scenarios for different user roles
 */
export const roleScenarios = {
  admin: () => createContextWithRole('admin'),
  superintendent: () => createContextWithRole('superintendent'),
  projectManager: () => createContextWithRole('project_manager'),
  foreman: () => createContextWithRole('foreman'),
  viewer: () => createContextWithRole('viewer'),
} as const;

/**
 * Run a test for all roles
 */
export async function testForAllRoles(
  testFn: (role: UserRole, context: MockAuthContext) => Promise<void> | void
): Promise<void> {
  const roles: UserRole[] = ['admin', 'superintendent', 'project_manager', 'foreman', 'viewer'];

  for (const role of roles) {
    const context = createContextWithRole(role);
    await testFn(role, context);
  }
}

/**
 * Run a test for roles with specific permission
 */
export async function testForRolesWithPermission(
  permissionCheck: (user: MockUser) => boolean,
  testFn: (role: UserRole, context: MockAuthContext, hasPermission: boolean) => Promise<void> | void
): Promise<void> {
  const roles: UserRole[] = ['admin', 'superintendent', 'project_manager', 'foreman', 'viewer'];

  for (const role of roles) {
    const context = createContextWithRole(role);
    const hasPermission = permissionCheck(context.userProfile!);
    await testFn(role, context, hasPermission);
  }
}
