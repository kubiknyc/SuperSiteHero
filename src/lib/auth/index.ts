// File: /src/lib/auth/index.ts
// Auth module exports

// Main auth context and hook
export { AuthProvider, useAuth } from './AuthContext'

// MFA utilities
export {
  checkMFAStatus,
  enrollMFA,
  verifyMFA,
  unenrollMFA,
  getMFAChallenge,
  isRoleMFARequired,
  getUserMFAPreferences,
  updateUserMFAPreferences,
  type MFAFactor,
  type MFAEnrollmentData,
  type MFAPreferences,
} from './mfa'

// MFA middleware
export {
  checkMFARequirement,
  createMFASession,
  getMFASession,
  clearMFASession,
  isMFASessionValid,
  type MFASession,
} from './mfaMiddleware'

// Biometric authentication
export {
  isBiometricSupported,
  registerBiometricCredential,
  authenticateWithBiometric,
  getBiometricCredentials,
  removeBiometricCredential,
  updateBiometricSettings,
  type BiometricCredential,
  type BiometricSettings,
} from './biometric'

// Enhanced auth context with MFA
export {
  AuthProviderWithMFA,
  useAuthWithMFA,
} from './AuthContextWithMFA'
