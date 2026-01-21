// File: /src/lib/auth/index.ts
// Simplified auth module exports

// Main auth context and hook
export { AuthProvider, useAuth } from './AuthContext'

// Authorization utilities
export {
  // Types
  type UserRole,
  type Permission,
  type AuthContext,
  type AuthorizationGuard,
  type ServiceAuthConfig,
  // Constants
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  // Functions
  hasPermission,
  getRolePermissions,
  hasEqualOrHigherAccess,
  getRoleLevel,
  isAdminRole,
  isManagementRole,
  createAuthContext,
  createAuthGuard,
  createServiceAuthHooks,
} from './authorization'

// Rate limiting
export { useRateLimit } from './rate-limiter'

// Auth retry utilities
export {
  withAuthRetry,
  isTransientError,
  isPermanentError,
  isOnline,
  waitForOnline,
} from './auth-retry'

// Session management
export { sessionManager } from './session-manager'
