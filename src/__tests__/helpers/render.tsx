/**
 * Custom Render Helper
 * Provides a custom render function with all necessary providers for testing
 */

import React, { type ReactElement, type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Import factories
import {
  createMockUser,
  createMockSession,
  type MockUser,
  type MockSession,
} from '../factories';

// ============================================================================
// Types
// ============================================================================

export interface AuthContextValue {
  session: MockSession | null;
  user: MockSession['user'] | null;
  userProfile: MockUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Authentication options
  user?: MockUser | null;
  session?: MockSession | null;
  isAuthenticated?: boolean;

  // Router options
  route?: string;
  routes?: string[];
  memoryRouter?: boolean;

  // Query client options
  queryClient?: QueryClient;

  // Additional wrapper options
  wrapperProps?: Record<string, unknown>;
}

// ============================================================================
// Mock Auth Context
// ============================================================================

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function MockAuthProvider({
  children,
  user = null,
  session = null,
  loading = false,
}: {
  children: ReactNode;
  user?: MockUser | null;
  session?: MockSession | null;
  loading?: boolean;
}) {
  const signIn = vi.fn().mockResolvedValue(undefined);
  const signOut = vi.fn().mockResolvedValue(undefined);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    userProfile: user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMockAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useMockAuth must be used within a MockAuthProvider');
  }
  return context;
}

// ============================================================================
// Query Client Factory
// ============================================================================

/**
 * Create a new QueryClient configured for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries for faster test feedback
        retry: false,
        // Disable refetching on window focus
        refetchOnWindowFocus: false,
        // Keep cache time reasonable for tests
        gcTime: 1000 * 60 * 5, // 5 minutes
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    // Silence console errors during tests
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });
}

// ============================================================================
// All Providers Wrapper
// ============================================================================

interface AllProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
  user: MockUser | null;
  session: MockSession | null;
  authLoading: boolean;
  route: string;
  memoryRouter: boolean;
  routes: string[];
}

function AllProviders({
  children,
  queryClient,
  user,
  session,
  authLoading,
  route,
  memoryRouter,
  routes,
}: AllProvidersProps) {
  const RouterWrapper = memoryRouter ? MemoryRouter : BrowserRouter;
  const routerProps = memoryRouter
    ? { initialEntries: routes.length > 0 ? routes : [route], initialIndex: routes.indexOf(route) >= 0 ? routes.indexOf(route) : 0 }
    : {};

  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider user={user} session={session} loading={authLoading}>
        <RouterWrapper {...routerProps}>
          {children}
        </RouterWrapper>
      </MockAuthProvider>
    </QueryClientProvider>
  );
}

// ============================================================================
// Custom Render Function
// ============================================================================

/**
 * Custom render function that wraps components with all necessary providers
 *
 * @example
 * // Render with default options (unauthenticated)
 * const { getByText } = customRender(<MyComponent />);
 *
 * @example
 * // Render with authenticated user
 * const user = createMockUser({ role: 'admin' });
 * const session = createMockSession();
 * const { getByText } = customRender(<MyComponent />, {
 *   user,
 *   session,
 *   isAuthenticated: true,
 * });
 *
 * @example
 * // Render with specific route
 * const { getByText } = customRender(<MyComponent />, {
 *   route: '/projects/123',
 *   memoryRouter: true,
 * });
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const {
    user = null,
    session = null,
    isAuthenticated = false,
    route = '/',
    routes = [],
    memoryRouter = false,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  // If isAuthenticated is true but no user/session provided, create defaults
  const finalUser = isAuthenticated && !user ? createMockUser() : user;
  const finalSession = isAuthenticated && !session ? createMockSession() : session;

  // Set window location for non-memory router
  if (!memoryRouter && route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AllProviders
        queryClient={queryClient}
        user={finalUser}
        session={finalSession}
        authLoading={false}
        route={route}
        memoryRouter={memoryRouter}
        routes={routes}
      >
        {children}
      </AllProviders>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    queryClient,
  };
}

/**
 * Render with authenticated user
 */
export function renderAuthenticated(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'isAuthenticated'> = {}
): RenderResult & { queryClient: QueryClient; user: MockUser; session: MockSession } {
  const user = options.user ?? createMockUser();
  const session = options.session ?? createMockSession();

  const result = customRender(ui, {
    ...options,
    user,
    session,
    isAuthenticated: true,
  });

  return {
    ...result,
    user,
    session,
  };
}

/**
 * Render with specific user role
 */
export function renderWithRole(
  ui: ReactElement,
  role: 'admin' | 'superintendent' | 'project_manager' | 'foreman' | 'viewer',
  options: Omit<CustomRenderOptions, 'user' | 'isAuthenticated'> = {}
): RenderResult & { queryClient: QueryClient; user: MockUser } {
  const user = createMockUser({ role });
  const session = createMockSession();

  const result = customRender(ui, {
    ...options,
    user,
    session,
    isAuthenticated: true,
  });

  return {
    ...result,
    user,
  };
}

/**
 * Render with loading state
 */
export function renderLoading(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MockAuthProvider loading={true}>
          <BrowserRouter>{children}</BrowserRouter>
        </MockAuthProvider>
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...options });

  return {
    ...result,
    queryClient,
  };
}

/**
 * Render for unit testing without providers (bare component)
 */
export function renderBare(
  ui: ReactElement,
  options: RenderOptions = {}
): RenderResult {
  return render(ui, options);
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export everything from @testing-library/react for convenience
export * from '@testing-library/react';

// Re-export userEvent
export { default as userEvent } from '@testing-library/user-event';

// Export the default render as a named export too
export { customRender as render };
