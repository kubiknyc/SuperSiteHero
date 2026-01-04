// File: /src/lib/auth/index.ts
// Auth module exports

// Main auth context and hook
export { AuthProvider, useAuth } from './AuthContext'

// MFA utilities
export {
  checkMFAStatus,
  enrollMFA,
  verifyMFACode,
  verifyMFAEnrollment,
  unenrollMFA,
  getMFAChallenge,
  isRoleMFARequired,
  getUserMFAPreferences,
  updateUserMFAPreferences,
  type MFAFactor,
  type MFAEnrollmentData,
} from './mfa'

// MFA middleware
export {
  checkMFARequirement,
  isPathMFAProtected,
  calculateMFAGracePeriod,
  enforceMFAForRoute,
} from './mfaMiddleware'

// Biometric authentication
export {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isConditionalMediationAvailable,
  registerBiometricCredential,
  authenticateWithBiometric,
  verifyBiometricAuthentication,
  getUserBiometricCredentials,
  deleteBiometricCredential,
  getBiometricSettings,
  updateBiometricSettings,
  type BiometricCredential,
  type BiometricSettings,
} from './biometric'

// Enhanced auth context with MFA
export {
  AuthProviderWithMFA,
  useAuthWithMFA,
} from './AuthContextWithMFA'

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
