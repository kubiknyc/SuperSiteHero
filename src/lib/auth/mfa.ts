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
 * Codes are stored securely (hashed with salt) in the database
 * @returns Array of 10 backup codes in format XXXX-XXXX-XX
 */
export async function generateBackupCodes(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user')
    }

    // Generate 10 backup codes using crypto.getRandomValues
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      const array = new Uint8Array(5)
      crypto.getRandomValues(array)
      const code = Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
      // Format as XXXX-XXXX-XX for readability
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 10)}`)
    }

    // Store hashed codes in database using secure function
    const { data, error } = await supabase.rpc('store_backup_codes', {
      p_user_id: user.id,
      p_codes: codes.map(c => c.replace(/-/g, '')) // Remove dashes for storage
    })

    if (error) {
      logger.error('Failed to store backup codes:', error)
      throw new Error('Failed to store backup codes securely')
    }

    logger.log('Backup codes generated and stored', { batchId: data })

    // Return plaintext codes to user (they should save these)
    // These are NEVER stored in plaintext - only shown once
    return codes
  } catch (error) {
    logger.error('Error generating backup codes:', error)
    throw error
  }
}

/**
 * Verify a backup code during MFA recovery
 * @param code The backup code to verify (with or without dashes)
 * @returns true if code is valid and was marked as used
 */
export async function verifyBackupCode(code: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('No authenticated user')
    }

    // Remove any formatting (dashes, spaces)
    const cleanCode = code.replace(/[-\s]/g, '').toUpperCase()

    // Verify using secure database function
    const { data, error } = await supabase.rpc('verify_mfa_backup_code', {
      p_user_id: user.id,
      p_code: cleanCode
    })

    if (error) {
      logger.error('Error verifying backup code:', error)
      return false
    }

    return data === true
  } catch (error) {
    logger.error('Error verifying backup code:', error)
    return false
  }
}

/**
 * Get status of user's backup codes (remaining count, etc.)
 */
export async function getBackupCodeStatus(): Promise<{
  totalCodes: number
  usedCodes: number
  remainingCodes: number
  lastUsedAt: string | null
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase.rpc('get_backup_code_status', {
      p_user_id: user.id
    })

    if (error || !data || data.length === 0) {
      return null
    }

    const status = data[0]
    return {
      totalCodes: status.total_codes || 0,
      usedCodes: status.used_codes || 0,
      remainingCodes: status.remaining_codes || 0,
      lastUsedAt: status.last_used_at || null
    }
  } catch (error) {
    logger.error('Error getting backup code status:', error)
    return null
  }
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
 * Uses the user_preferences table created in migration 148
 */
export async function getUserMFAPreferences(userId: string): Promise<{
  mfaEnabled: boolean
  mfaEnforcedAt?: string
  backupCodesGenerated?: boolean
  backupCodesGeneratedAt?: string
}> {
  try {
    // Use untyped client since this table may not be in generated types yet
    const { data, error } = await supabase
      .from('user_preferences')
      .select('mfa_enabled, mfa_enforced_at, backup_codes_generated, backup_codes_generated_at')
      .eq('user_id', userId)
      .single()

    if (error) {
      // PGRST116 = no rows found, which is expected for new users
      if (error.code === 'PGRST116') {
        return { mfaEnabled: false }
      }
      logger.error('Error getting MFA preferences:', error)
      return { mfaEnabled: false }
    }

    if (!data) {
      return { mfaEnabled: false }
    }

    return {
      mfaEnabled: data.mfa_enabled || false,
      mfaEnforcedAt: data.mfa_enforced_at || undefined,
      backupCodesGenerated: data.backup_codes_generated || false,
      backupCodesGeneratedAt: data.backup_codes_generated_at || undefined
    }
  } catch (error) {
    logger.error('Error getting MFA preferences:', error)
    return { mfaEnabled: false }
  }
}

/**
 * Update user's MFA preferences in database
 * Uses the user_preferences table created in migration 148
 */
export async function updateUserMFAPreferences(
  userId: string,
  preferences: {
    mfaEnabled?: boolean
    mfaEnforcedAt?: string
    backupCodesGenerated?: boolean
  }
): Promise<boolean> {
  try {
    const updateData: Record<string, unknown> = {
      user_id: userId,
    }

    if (preferences.mfaEnabled !== undefined) {
      updateData.mfa_enabled = preferences.mfaEnabled
    }
    if (preferences.mfaEnforcedAt !== undefined) {
      updateData.mfa_enforced_at = preferences.mfaEnforcedAt
    }
    if (preferences.backupCodesGenerated !== undefined) {
      updateData.backup_codes_generated = preferences.backupCodesGenerated
      if (preferences.backupCodesGenerated) {
        updateData.backup_codes_generated_at = new Date().toISOString()
      }
    }

    // Use untyped client since this table may not be in generated types yet
    const { error } = await supabase
      .from('user_preferences')
      .upsert(updateData, {
        onConflict: 'user_id'
      })

    if (error) {
      logger.error('Error updating MFA preferences:', error)
      return false
    }

    return true
  } catch (error) {
    logger.error('Error updating MFA preferences:', error)
    return false
  }
}

/**
 * Format TOTP secret for manual entry (groups of 4 characters)
 */
export function formatTOTPSecret(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') || secret
}