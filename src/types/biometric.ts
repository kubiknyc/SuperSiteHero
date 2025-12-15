// File: /src/types/biometric.ts
// Type definitions for biometric authentication

/**
 * Biometric credential stored in database
 */
export interface BiometricCredential {
  id: string
  credentialId: string
  publicKey: string
  deviceName: string
  createdAt: string
  lastUsed: string | null
  transports?: AuthenticatorTransport[]
}

/**
 * Re-authentication interval options
 */
export type ReauthInterval = '15min' | '1hour' | '4hours' | 'never'

/**
 * Biometric authentication settings
 */
export interface BiometricSettings {
  enabled: boolean
  reauthInterval: ReauthInterval
  credentials: BiometricCredential[]
}

/**
 * Biometric device compatibility info
 */
export interface BiometricCompatibility {
  isWebAuthnSupported: boolean
  isPlatformAuthenticatorAvailable: boolean
  isConditionalMediationAvailable: boolean
}

/**
 * Biometric registration state
 */
export interface BiometricRegistrationState {
  isRegistering: boolean
  error: string | null
  success: boolean
}

/**
 * Biometric authentication state
 */
export interface BiometricAuthState {
  isAuthenticating: boolean
  isAvailable: boolean
  hasCredentials: boolean
  error: string | null
}

/**
 * Database row type for biometric_credentials table
 */
export interface BiometricCredentialRow {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  device_name: string
  transports: string[] | null
  created_at: string
  last_used: string | null
}

/**
 * Database row type for user biometric preferences
 */
export interface BiometricPreferencesRow {
  user_id: string
  biometric_enabled: boolean
  biometric_reauth_interval: string
  updated_at: string
}
