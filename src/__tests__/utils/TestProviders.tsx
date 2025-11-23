import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Test wrapper that provides all necessary context providers
 * for testing React components that use React Query, routing, etc.
 */

interface TestProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function TestProviders({ children, queryClient: customQueryClient }: TestProvidersProps) {
  // Create a new QueryClient for each test to ensure isolation
  const queryClient = customQueryClient ?? new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Keep data in cache indefinitely during tests
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Helper to create a custom wrapper for renderHook
 *
 * Usage:
 * ```ts
 * const { result } = renderHook(() => useMyHook(), {
 *   wrapper: createWrapper(),
 * });
 * ```
 */
export function createWrapper(queryClient?: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders queryClient={queryClient}>
        {children}
      </TestProviders>
    );
  };
}
