// File: /src/lib/auth/biometric.ts
// Web Authentication API (WebAuthn) integration for biometric authentication

import { supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

/**
 * WebAuthn credential types
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
 * Biometric authentication settings
 */
export interface BiometricSettings {
  enabled: boolean
  reauthInterval: ReauthInterval
  credentials: BiometricCredential[]
}

/**
 * Re-authentication interval options
 */
export type ReauthInterval = '15min' | '1hour' | '4hours' | 'never'

export const REAUTH_INTERVALS: Record<ReauthInterval, { label: string; ms: number }> = {
  '15min': { label: '15 minutes', ms: 15 * 60 * 1000 },
  '1hour': { label: '1 hour', ms: 60 * 60 * 1000 },
  '4hours': { label: '4 hours', ms: 4 * 60 * 60 * 1000 },
  'never': { label: 'Never (session only)', ms: Infinity }
}

/**
 * Registration result from WebAuthn
 */
interface _RegistrationResult {
  credentialId: string
  publicKey: string
  transports: AuthenticatorTransport[]
}

/**
 * Authentication result from WebAuthn
 */
interface AuthenticationResult {
  credentialId: string
  authenticatorData: ArrayBuffer
  clientDataJSON: ArrayBuffer
  signature: ArrayBuffer
  userHandle: ArrayBuffer | null
}

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}

/**
 * Check if platform authenticator (biometric) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch (error) {
    logger.error('Error checking platform authenticator availability:', error)
    return false
  }
}

/**
 * Check if conditional mediation (autofill) is available
 */
export async function isConditionalMediationAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false
  }

  try {
    // @ts-expect-error - PublicKeyCredential.isConditionalMediationAvailable is a newer WebAuthn API not yet in TypeScript's lib.dom.d.ts
    if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      // @ts-expect-error - PublicKeyCredential.isConditionalMediationAvailable is a newer WebAuthn API not yet in TypeScript's lib.dom.d.ts
      return await PublicKeyCredential.isConditionalMediationAvailable()
    }
    return false
  } catch {
    return false
  }
}

/**
 * Get browser and device information for credential naming
 */
export function getDeviceInfo(): string {
  const userAgent = navigator.userAgent
  let deviceName = 'Unknown Device'

  // Detect browser (order matters - Edge/Chrome include other browser strings)
  if (userAgent.includes('Edg')) {
    // Modern Edge uses 'Edg/' (not 'Edge/')
    deviceName = 'Edge'
  } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    deviceName = 'Chrome'
  } else if (userAgent.includes('Firefox')) {
    deviceName = 'Firefox'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    deviceName = 'Safari'
  }

  // Detect platform (order matters - iOS includes 'Mac' in user agent)
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    deviceName += ' on iOS'
  } else if (userAgent.includes('Android')) {
    deviceName += ' on Android'
  } else if (userAgent.includes('Windows')) {
    deviceName += ' on Windows'
  } else if (userAgent.includes('Mac')) {
    deviceName += ' on Mac'
  } else if (userAgent.includes('Linux')) {
    deviceName += ' on Linux'
  }

  return deviceName
}

/**
 * Generate a random challenge for WebAuthn
 */
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)
  return challenge
}

/**
 * Convert ArrayBuffer to Base64 URL-safe string
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Convert Base64 URL-safe string to ArrayBuffer
 */
export function base64UrlToArrayBuffer(base64Url: string): ArrayBuffer {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * Register a new biometric credential
 */
export async function registerBiometricCredential(
  userId: string,
  userEmail: string,
  deviceName?: string
): Promise<BiometricCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  const isAvailable = await isPlatformAuthenticatorAvailable()
  if (!isAvailable) {
    throw new Error('Platform authenticator (biometric) is not available on this device')
  }

  // Generate challenge
  const challenge = generateChallenge()
  const challengeBase64 = arrayBufferToBase64Url(challenge.buffer)

  // Store challenge in session for verification
  sessionStorage.setItem('webauthn_challenge', challengeBase64)

  // Get existing credential IDs to exclude
  const existingCredentials = await getUserBiometricCredentials(userId)
  const excludeCredentials: PublicKeyCredentialDescriptor[] = existingCredentials.map(cred => ({
    type: 'public-key',
    id: base64UrlToArrayBuffer(cred.credentialId),
    transports: cred.transports as AuthenticatorTransport[]
  }))

  // WebAuthn credential creation options
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: 'JobSight Construction Management',
      id: window.location.hostname
    },
    user: {
      id: stringToUint8Array(userId),
      name: userEmail,
      displayName: userEmail.split('@')[0]
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256 (ECDSA with SHA-256)
      { alg: -257, type: 'public-key' }  // RS256 (RSASSA-PKCS1-v1_5 with SHA-256)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
      requireResidentKey: false
    },
    timeout: 60000, // 60 seconds
    attestation: 'none',
    excludeCredentials
  }

  try {
    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential

    if (!credential) {
      throw new Error('Failed to create credential')
    }

    const response = credential.response as AuthenticatorAttestationResponse

    // Extract credential data
    const credentialId = arrayBufferToBase64Url(credential.rawId)
    const publicKey = arrayBufferToBase64Url(response.getPublicKey()!)
    const transports = response.getTransports ? response.getTransports() : []
    const finalDeviceName = deviceName || getDeviceInfo()

    // Save credential to database
    const savedCredential = await saveBiometricCredential(userId, {
      credentialId,
      publicKey,
      deviceName: finalDeviceName,
      transports: transports as AuthenticatorTransport[]
    })

    logger.info('Biometric credential registered successfully', { userId, credentialId })

    return savedCredential
  } catch (error: unknown) {
    const err = error as Error
    logger.error('Error registering biometric credential:', error)

    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or not allowed')
    } else if (err.name === 'InvalidStateError') {
      throw new Error('This authenticator is already registered')
    } else if (err.name === 'NotSupportedError') {
      throw new Error('Biometric authentication is not supported on this device')
    }

    throw new Error(`Failed to register biometric credential: ${err.message}`)
  } finally {
    sessionStorage.removeItem('webauthn_challenge')
  }
}

/**
 * Authenticate using biometric credential
 */
export async function authenticateWithBiometric(userId?: string): Promise<AuthenticationResult> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser')
  }

  // Generate challenge
  const challenge = generateChallenge()
  const challengeBase64 = arrayBufferToBase64Url(challenge.buffer)

  // Store challenge for verification
  sessionStorage.setItem('webauthn_challenge', challengeBase64)

  // Get allowed credentials if userId is provided
  let allowCredentials: PublicKeyCredentialDescriptor[] = []
  if (userId) {
    const credentials = await getUserBiometricCredentials(userId)
    allowCredentials = credentials.map(cred => ({
      type: 'public-key',
      id: base64UrlToArrayBuffer(cred.credentialId),
      transports: cred.transports as AuthenticatorTransport[]
    }))

    if (allowCredentials.length === 0) {
      throw new Error('No biometric credentials registered for this user')
    }
  }

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge,
    timeout: 60000,
    rpId: window.location.hostname,
    userVerification: 'required',
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    }) as PublicKeyCredential

    if (!assertion) {
      throw new Error('Authentication failed')
    }

    const response = assertion.response as AuthenticatorAssertionResponse

    // Update last used timestamp
    const credentialId = arrayBufferToBase64Url(assertion.rawId)
    await updateCredentialLastUsed(credentialId)

    return {
      credentialId,
      authenticatorData: response.authenticatorData,
      clientDataJSON: response.clientDataJSON,
      signature: response.signature,
      userHandle: response.userHandle
    }
  } catch (error: unknown) {
    const err = error as Error
    logger.error('Error during biometric authentication:', error)

    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric authentication was cancelled or not allowed')
    }

    throw new Error(`Biometric authentication failed: ${err.message}`)
  } finally {
    sessionStorage.removeItem('webauthn_challenge')
  }
}

/**
 * Verify biometric authentication with backend
 */
export async function verifyBiometricAuthentication(
  credentialId: string,
  authenticatorData: ArrayBuffer,
  clientDataJSON: ArrayBuffer,
  signature: ArrayBuffer
): Promise<{ token: string; userId: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  const response = await fetch(`${supabaseUrl}/functions/v1/verify-biometric-auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentialId,
      authenticatorData: arrayBufferToBase64Url(authenticatorData),
      clientDataJSON: arrayBufferToBase64Url(clientDataJSON),
      signature: arrayBufferToBase64Url(signature),
      challenge: sessionStorage.getItem('webauthn_challenge')
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Verification failed')
  }

  const result = await response.json()
  return {
    token: result.token,
    userId: result.userId
  }
}

/**
 * Save biometric credential to database
 */
async function saveBiometricCredential(
  userId: string,
  data: {
    credentialId: string
    publicKey: string
    deviceName: string
    transports: AuthenticatorTransport[]
  }
): Promise<BiometricCredential> {
  const { data: credential, error } = await supabaseUntyped
    .from('biometric_credentials')
    .insert({
      user_id: userId,
      credential_id: data.credentialId,
      public_key: data.publicKey,
      device_name: data.deviceName,
      transports: data.transports,
      created_at: new Date().toISOString(),
      last_used: null
    })
    .select()
    .single()

  if (error) {
    logger.error('Error saving biometric credential:', error)
    throw new Error('Failed to save biometric credential')
  }

  return {
    id: credential.id,
    credentialId: credential.credential_id,
    publicKey: credential.public_key,
    deviceName: credential.device_name,
    createdAt: credential.created_at,
    lastUsed: credential.last_used,
    transports: credential.transports
  }
}

/**
 * Get user's biometric credentials
 */
export async function getUserBiometricCredentials(userId: string): Promise<BiometricCredential[]> {
  const { data, error } = await supabaseUntyped
    .from('biometric_credentials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching biometric credentials:', error)
    return []
  }

  return (data || []).map((cred: Record<string, unknown>) => ({
    id: cred.id as string,
    credentialId: cred.credential_id as string,
    publicKey: cred.public_key as string,
    deviceName: cred.device_name as string,
    createdAt: cred.created_at as string,
    lastUsed: cred.last_used as string | null,
    transports: cred.transports as AuthenticatorTransport[]
  }))
}

/**
 * Delete a biometric credential
 */
export async function deleteBiometricCredential(credentialId: string): Promise<boolean> {
  const { error } = await supabaseUntyped
    .from('biometric_credentials')
    .delete()
    .eq('id', credentialId)

  if (error) {
    logger.error('Error deleting biometric credential:', error)
    return false
  }

  logger.info('Biometric credential deleted', { credentialId })
  return true
}

/**
 * Update credential last used timestamp
 */
async function updateCredentialLastUsed(credentialId: string): Promise<void> {
  const { error } = await supabaseUntyped
    .from('biometric_credentials')
    .update({ last_used: new Date().toISOString() })
    .eq('credential_id', credentialId)

  if (error) {
    logger.warn('Error updating credential last used:', error)
  }
}

/**
 * Get user's biometric settings
 */
export async function getBiometricSettings(userId: string): Promise<BiometricSettings> {
  // Get settings from user preferences
  const { data: prefs, error: prefsError } = await supabaseUntyped
    .from('user_preferences')
    .select('biometric_enabled, biometric_reauth_interval')
    .eq('user_id', userId)
    .maybeSingle()

  // Get credentials
  const credentials = await getUserBiometricCredentials(userId)

  if (prefsError) {
    logger.warn('Error fetching biometric settings:', prefsError)
  }

  return {
    enabled: prefs?.biometric_enabled ?? false,
    reauthInterval: (prefs?.biometric_reauth_interval as ReauthInterval) ?? '1hour',
    credentials
  }
}

/**
 * Update biometric settings
 */
export async function updateBiometricSettings(
  userId: string,
  settings: { enabled?: boolean; reauthInterval?: ReauthInterval }
): Promise<void> {
  const updateData: Record<string, unknown> = {}

  if (settings.enabled !== undefined) {
    updateData.biometric_enabled = settings.enabled
  }
  if (settings.reauthInterval !== undefined) {
    updateData.biometric_reauth_interval = settings.reauthInterval
  }

  const { error } = await supabaseUntyped
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...updateData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    logger.error('Error updating biometric settings:', error)
    throw new Error('Failed to update biometric settings')
  }
}

/**
 * Check if re-authentication is needed based on last auth time
 */
export function isReauthenticationNeeded(lastAuthTime: Date, interval: ReauthInterval): boolean {
  if (interval === 'never') {
    return false
  }

  const now = new Date()
  const timeSinceAuth = now.getTime() - lastAuthTime.getTime()
  const intervalMs = REAUTH_INTERVALS[interval].ms

  return timeSinceAuth >= intervalMs
}

/**
 * Store last biometric auth time in session storage
 */
export function setLastBiometricAuthTime(): void {
  sessionStorage.setItem('last_biometric_auth', new Date().toISOString())
}

/**
 * Get last biometric auth time from session storage
 */
export function getLastBiometricAuthTime(): Date | null {
  const stored = sessionStorage.getItem('last_biometric_auth')
  return stored ? new Date(stored) : null
}

/**
 * Clear biometric auth session
 */
export function clearBiometricAuthSession(): void {
  sessionStorage.removeItem('last_biometric_auth')
  sessionStorage.removeItem('webauthn_challenge')
}

/**
 * Find user by credential ID (for passwordless login)
 */
export async function findUserByCredentialId(credentialId: string): Promise<string | null> {
  const { data, error } = await supabaseUntyped
    .from('biometric_credentials')
    .select('user_id')
    .eq('credential_id', credentialId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.user_id
}
