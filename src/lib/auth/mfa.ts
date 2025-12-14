// File: /src/lib/auth/mfa.ts
// Multi-Factor Authentication utility functions

import { supabase } from '@/lib/supabase'
import type { AuthMFAEnrollResponse, AuthMFAUnenrollResponse, AuthMFAVerifyResponse } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

/**
 * MFA Factor type
 */
export interface MFAFactor {
  id: string
  type: 'totp'
  status: 'verified' | 'unverified'
  created_at: string
  updated_at: string
  friendly_name?: string
}

/**
 * MFA Enrollment response
 */
export interface MFAEnrollmentData {
  qr: string // SVG QR code
  secret: string // TOTP secret for manual entry
  uri: string // otpauth:// URI
  factorId: string
}

/**
 * Check if user has MFA enabled
 */
export async function checkMFAStatus(): Promise<{
  enrolled: boolean
  factors: MFAFactor[]
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {throw new Error('No authenticated user')}

    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {throw error}

    const verifiedFactors = data?.totp?.filter(f => f.status === 'verified') || []

    const factors: MFAFactor[] = (data?.totp || []).map(factor => ({
      id: factor.id,
      type: 'totp' as const,
      status: factor.status,
      created_at: factor.created_at,
      updated_at: factor.updated_at,
      friendly_name: factor.friendly_name
    }))

    return {
      enrolled: verifiedFactors.length > 0,
      factors
    }
  } catch (error) {
    logger.error('Error checking MFA status:', error)
    return { enrolled: false, factors: [] }
  }
}

/**
 * Enroll user in TOTP MFA
 */
export async function enrollMFA(factorFriendlyName?: string): Promise<MFAEnrollmentData> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: factorFriendlyName || 'JobSight App'
    })

    if (error) {throw error}
    if (!data) {throw new Error('No enrollment data received')}

    return {
      qr: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
      factorId: data.id
    }
  } catch (error) {
    logger.error('Error enrolling MFA:', error)
    throw new Error('Failed to enroll in MFA')
  }
}

/**
 * Verify MFA enrollment with TOTP code
 */
export async function verifyMFAEnrollment(
  factorId: string,
  code: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code
    })

    if (error) {throw error}
    return !!data
  } catch (error) {
    logger.error('Error verifying MFA enrollment:', error)
    return false
  }
}

/**
 * Verify MFA code during login
 */
export async function verifyMFACode(
  factorId: string,
  code: string
): Promise<AuthMFAVerifyResponse> {
  try {
    const response = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code
    })

    if (response.error) {throw response.error}
    return response
  } catch (error) {
    logger.error('Error verifying MFA code:', error)
    throw new Error('Invalid MFA code')
  }
}

/**
 * Unenroll from MFA
 */
export async function unenrollMFA(factorId: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({
      factorId
    })

    if (error) {throw error}
    return true
  } catch (error) {
    logger.error('Error unenrolling from MFA:', error)
    return false
  }
}

/**
 * Get MFA challenge for login
 */
export async function getMFAChallenge(): Promise<{
  factorId: string
  challengeId?: string
} | null> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (error) {throw error}
    if (!data) {return null}

    // Check if MFA is required
    if (data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const verifiedFactor = factors?.totp?.find(f => f.status === 'verified')

      if (verifiedFactor) {
        // Create challenge
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id
        })

        if (challengeError) {throw challengeError}

        return {
          factorId: verifiedFactor.id,
          challengeId: challenge?.id
        }
      }
    }

    return null
  } catch (error) {
    logger.error('Error getting MFA challenge:', error)
    return null
  }
}

/**
 * Generate backup codes using cryptographically secure random values
 */
export async function generateBackupCodes(): Promise<string[]> {
  // Note: Supabase doesn't have built-in backup codes yet
  // This is a placeholder for future implementation
  // Using crypto.getRandomValues for secure random generation
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const array = new Uint8Array(5)
    crypto.getRandomValues(array)
    const code = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    codes.push(code)
  }

  // TODO: Store these codes securely (hashed) in the database
  // This would require a custom table for backup codes

  return codes
}

/**
 * Check if user role requires MFA
 */
export async function isRoleMFARequired(role: string): Promise<boolean> {
  const mfaRequiredRoles = ['superintendent', 'project_manager', 'owner', 'admin', 'office_admin']
  return mfaRequiredRoles.includes(role.toLowerCase())
}

/**
 * Get user's MFA preferences from database
 */
export async function getUserMFAPreferences(userId: string): Promise<{
  mfaEnabled: boolean
  mfaEnforcedAt?: string
  backupCodesGenerated?: boolean
}> {
  // TODO: Implement when user_preferences table is created in database
  // Currently returning defaults as the table doesn't exist in the schema

  // try {
  //   const { data, error } = await supabase
  //     .from('user_preferences')
  //     .select('mfa_enabled, mfa_enforced_at, backup_codes_generated')
  //     .eq('user_id', userId)
  //     .single()

  //   if (error || !data) {
  //     return { mfaEnabled: false }
  //   }

  //   return {
  //     mfaEnabled: data.mfa_enabled || false,
  //     mfaEnforcedAt: data.mfa_enforced_at,
  //     backupCodesGenerated: data.backup_codes_generated || false
  //   }
  // } catch (error) {
  //   console.error('Error getting MFA preferences:', error)
  //   return { mfaEnabled: false }
  // }

  return { mfaEnabled: false }
}

/**
 * Update user's MFA preferences
 */
export async function updateUserMFAPreferences(
  userId: string,
  preferences: {
    mfaEnabled?: boolean
    mfaEnforcedAt?: string
    backupCodesGenerated?: boolean
  }
): Promise<boolean> {
  // TODO: Implement when user_preferences table is created in database
  // Currently no-op as the table doesn't exist in the schema

  // try {
  //   const { error } = await supabase
  //     .from('user_preferences')
  //     .upsert({
  //       user_id: userId,
  //       ...preferences,
  //       updated_at: new Date().toISOString()
  //     })

  //   if (error) throw error
  //   return true
  // } catch (error) {
  //   console.error('Error updating MFA preferences:', error)
  //   return false
  // }

  logger.log('MFA preferences update skipped - user_preferences table not implemented', { userId, preferences })
  return true
}

/**
 * Format TOTP secret for manual entry (groups of 4 characters)
 */
export function formatTOTPSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret
}