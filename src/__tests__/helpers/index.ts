/**
 * Test Helpers
 * Central export for all test helper utilities
 */

// Render helpers
export {
  customRender,
  customRender as render,
  renderAuthenticated,
  renderWithRole,
  renderLoading,
  renderBare,
  createTestQueryClient,
  MockAuthProvider,
  useMockAuth,
  type AuthContextValue,
  type CustomRenderOptions,
  // Re-exports from @testing-library/react
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
  fireEvent,
  cleanup,
  act,
  userEvent,
} from './render';

// API mock helpers
export {
  // Response helpers
  successResponse,
  arrayResponse,
  paginatedResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,

  // Handler factories
  createSupabaseHandler,
  createQueryHandler,
  createResourceHandler,

  // Common handlers
  createUserHandlers,
  createProjectHandlers,
  createDailyReportHandlers,
  createDocumentHandlers,
  createDocuSignHandlers,

  // Server management
  createMockServer,
  addHandlers,
  resetHandlers,
  overrideHandler,

  // Test utilities
  createTrackedHandler,
  createFailAfterHandler,
  createDelayedHandler,
  createFlakyHandler,

  // Pre-configured handler sets
  createDefaultHandlers,
  createErrorHandlers,
  createOfflineHandlers,

  type HttpMethod,
  type MockApiResponse,
  type HandlerOptions,
  type PaginatedResponse,
} from './api-mocks';

// Auth helpers
export {
  // Mock context factories
  createUnauthenticatedContext,
  createAuthenticatedContext,
  createLoadingContext,
  createContextWithRole,

  // Mock Supabase auth
  createMockSupabaseAuth,
  createMockSupabaseAuthUnauthenticated,

  // Login helpers
  mockSuccessfulLogin,
  mockFailedLogin,
  mockLoginWithRole,
  mockSessionExpired,
  mockTokenRefresh,

  // Permission helpers
  isAdmin,
  canManageProjects,
  canEditDailyReports,
  canViewFinancials,
  canApproveDocuments,

  // Test utilities
  createTestCredentials,
  createInvalidCredentials,
  waitForAuthState,
  createUseAuthMock,
  setupAuthMock,

  // Role-based testing
  roleScenarios,
  testForAllRoles,
  testForRolesWithPermission,

  type MockAuthContext,
  type MockSupabaseAuth,
  type LoginCredentials,
} from './auth-helpers';
