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
