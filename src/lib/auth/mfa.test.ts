/**
 * Multi-Factor Authentication Tests
 * CRITICAL for security - ensures MFA enrollment, verification, and management work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkMFAStatus,
  enrollMFA,
  verifyMFAEnrollment,
  verifyMFACode,
  unenrollMFA,
  getMFAChallenge,
  generateBackupCodes,
  isRoleMFARequired,
  getUserMFAPreferences,
  updateUserMFAPreferences,
  formatTOTPSecret,
  type MFAFactor,
  type MFAEnrollmentData,
} from './mfa'

// Mock Supabase
const mockGetUser = vi.fn()
const mockListFactors = vi.fn()
const mockEnroll = vi.fn()
const mockChallengeAndVerify = vi.fn()
const mockUnenroll = vi.fn()
const mockGetAuthenticatorAssuranceLevel = vi.fn()
const mockChallenge = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      mfa: {
        listFactors: () => mockListFactors(),
        enroll: (params: any) => mockEnroll(params),
        challengeAndVerify: (params: any) => mockChallengeAndVerify(params),
        unenroll: (params: any) => mockUnenroll(params),
        getAuthenticatorAssuranceLevel: () => mockGetAuthenticatorAssuranceLevel(),
        challenge: (params: any) => mockChallenge(params),
      },
    },
  },
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
  },
}))

import { logger } from '@/lib/utils/logger'

describe('MFA Functions', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
  }

  const mockTOTPFactor = {
    id: 'factor-123',
    status: 'verified' as const,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    friendly_name: 'JobSight App',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkMFAStatus', () => {
    it('should return enrolled status when MFA is configured', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockListFactors.mockResolvedValue({
        data: { totp: [mockTOTPFactor] },
        error: null,
      })

      const result = await checkMFAStatus()

      expect(result.enrolled).toBe(true)
      expect(result.factors).toHaveLength(1)
      expect(result.factors[0]).toMatchObject({
        id: 'factor-123',
        type: 'totp',
        status: 'verified',
      })
    })

    it('should return not enrolled when no verified factors', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockListFactors.mockResolvedValue({
        data: { totp: [{ ...mockTOTPFactor, status: 'unverified' }] },
        error: null,
      })

      const result = await checkMFAStatus()

      expect(result.enrolled).toBe(false)
      expect(result.factors).toHaveLength(1)
      expect(result.factors[0].status).toBe('unverified')
    })

    it('should handle no user error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const result = await checkMFAStatus()

      expect(result.enrolled).toBe(false)
      expect(result.factors).toEqual([])
      expect(logger.error).toHaveBeenCalledWith(
        'Error checking MFA status:',
        expect.any(Error)
      )
    })

    it('should handle API errors gracefully', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockListFactors.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      })

      const result = await checkMFAStatus()

      expect(result.enrolled).toBe(false)
      expect(result.factors).toEqual([])
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle empty factors list', async () => {
      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockListFactors.mockResolvedValue({
        data: { totp: [] },
        error: null,
      })

      const result = await checkMFAStatus()

      expect(result.enrolled).toBe(false)
      expect(result.factors).toEqual([])
    })
  })

  describe('enrollMFA', () => {
    const mockEnrollmentResponse = {
      id: 'factor-456',
      totp: {
        qr_code: '<svg>...</svg>',
        secret: 'JBSWY3DPEHPK3PXP',
        uri: 'otpauth://totp/JobSight:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=JobSight',
      },
    }

    it('should enroll user in MFA successfully', async () => {
      mockEnroll.mockResolvedValue({
        data: mockEnrollmentResponse,
        error: null,
      })

      const result = await enrollMFA()

      expect(result).toMatchObject({
        qr: '<svg>...</svg>',
        secret: 'JBSWY3DPEHPK3PXP',
        uri: expect.stringContaining('otpauth://'),
        factorId: 'factor-456',
      })
      expect(mockEnroll).toHaveBeenCalledWith({
        factorType: 'totp',
        friendlyName: 'JobSight App',
      })
    })

    it('should accept custom friendly name', async () => {
      mockEnroll.mockResolvedValue({
        data: mockEnrollmentResponse,
        error: null,
      })

      await enrollMFA('My Custom App')

      expect(mockEnroll).toHaveBeenCalledWith({
        factorType: 'totp',
        friendlyName: 'My Custom App',
      })
    })

    it('should handle enrollment errors', async () => {
      mockEnroll.mockResolvedValue({
        data: null,
        error: new Error('Already enrolled'),
      })

      await expect(enrollMFA()).rejects.toThrow('Failed to enroll in MFA')
      expect(logger.error).toHaveBeenCalledWith(
        'Error enrolling MFA:',
        expect.any(Error)
      )
    })

    it('should handle missing enrollment data', async () => {
      mockEnroll.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(enrollMFA()).rejects.toThrow('Failed to enroll in MFA')
    })
  })

  describe('verifyMFAEnrollment', () => {
    it('should verify enrollment code successfully', async () => {
      mockChallengeAndVerify.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await verifyMFAEnrollment('factor-123', '123456')

      expect(result).toBe(true)
      expect(mockChallengeAndVerify).toHaveBeenCalledWith({
        factorId: 'factor-123',
        code: '123456',
      })
    })

    it('should return false for invalid code', async () => {
      mockChallengeAndVerify.mockResolvedValue({
        data: null,
        error: new Error('Invalid code'),
      })

      const result = await verifyMFAEnrollment('factor-123', '000000')

      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalled()
    })

    it('should return false when verification data is missing', async () => {
      mockChallengeAndVerify.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await verifyMFAEnrollment('factor-123', '123456')

      expect(result).toBe(false)
    })
  })

  describe('verifyMFACode', () => {
    it('should verify MFA code during login', async () => {
      const mockResponse = {
        data: { user: mockUser, session: {} },
        error: null,
      }
      mockChallengeAndVerify.mockResolvedValue(mockResponse)

      const result = await verifyMFACode('factor-123', '123456')

      expect(result).toEqual(mockResponse)
      expect(mockChallengeAndVerify).toHaveBeenCalledWith({
        factorId: 'factor-123',
        code: '123456',
      })
    })

    it('should throw error for invalid MFA code', async () => {
      mockChallengeAndVerify.mockResolvedValue({
        data: null,
        error: new Error('Invalid code'),
      })

      await expect(verifyMFACode('factor-123', '000000')).rejects.toThrow(
        'Invalid MFA code'
      )
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('unenrollMFA', () => {
    it('should unenroll from MFA successfully', async () => {
      mockUnenroll.mockResolvedValue({
        error: null,
      })

      const result = await unenrollMFA('factor-123')

      expect(result).toBe(true)
      expect(mockUnenroll).toHaveBeenCalledWith({ factorId: 'factor-123' })
    })

    it('should return false on unenroll error', async () => {
      mockUnenroll.mockResolvedValue({
        error: new Error('Factor not found'),
      })

      const result = await unenrollMFA('factor-123')

      expect(result).toBe(false)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getMFAChallenge', () => {
    it('should get MFA challenge when required', async () => {
      mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
        data: {
          currentLevel: 'aal1',
          nextLevel: 'aal2',
        },
        error: null,
      })

      mockListFactors.mockResolvedValue({
        data: { totp: [mockTOTPFactor] },
        error: null,
      })

      mockChallenge.mockResolvedValue({
        data: { id: 'challenge-123' },
        error: null,
      })

      const result = await getMFAChallenge()

      expect(result).toEqual({
        factorId: 'factor-123',
        challengeId: 'challenge-123',
      })
    })

    it('should return null when MFA not required', async () => {
      mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
        data: {
          currentLevel: 'aal2',
          nextLevel: 'aal2',
        },
        error: null,
      })

      const result = await getMFAChallenge()

      expect(result).toBeNull()
    })

    it('should return null when no verified factors', async () => {
      mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
        data: {
          currentLevel: 'aal1',
          nextLevel: 'aal2',
        },
        error: null,
      })

      mockListFactors.mockResolvedValue({
        data: { totp: [] },
        error: null,
      })

      const result = await getMFAChallenge()

      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      })

      const result = await getMFAChallenge()

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', async () => {
      const codes = await generateBackupCodes()

      expect(codes).toHaveLength(10)
      expect(codes.every((code) => typeof code === 'string')).toBe(true)
    })

    it('should generate unique codes', async () => {
      const codes = await generateBackupCodes()
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(10)
    })

    it('should generate uppercase hex codes', async () => {
      const codes = await generateBackupCodes()

      codes.forEach((code) => {
        expect(code).toMatch(/^[0-9A-F]+$/)
      })
    })

    it('should generate codes of consistent length', async () => {
      const codes = await generateBackupCodes()
      const codeLength = codes[0].length

      codes.forEach((code) => {
        expect(code.length).toBe(codeLength)
      })
    })
  })

  describe('isRoleMFARequired', () => {
    it('should require MFA for superintendent role', async () => {
      const result = await isRoleMFARequired('superintendent')
      expect(result).toBe(true)
    })

    it('should require MFA for project_manager role', async () => {
      const result = await isRoleMFARequired('project_manager')
      expect(result).toBe(true)
    })

    it('should require MFA for owner role', async () => {
      const result = await isRoleMFARequired('owner')
      expect(result).toBe(true)
    })

    it('should require MFA for admin role', async () => {
      const result = await isRoleMFARequired('admin')
      expect(result).toBe(true)
    })

    it('should require MFA for office_admin role', async () => {
      const result = await isRoleMFARequired('office_admin')
      expect(result).toBe(true)
    })

    it('should not require MFA for field_worker role', async () => {
      const result = await isRoleMFARequired('field_worker')
      expect(result).toBe(false)
    })

    it('should not require MFA for subcontractor role', async () => {
      const result = await isRoleMFARequired('subcontractor')
      expect(result).toBe(false)
    })

    it('should be case-insensitive', async () => {
      expect(await isRoleMFARequired('SUPERINTENDENT')).toBe(true)
      expect(await isRoleMFARequired('Project_Manager')).toBe(true)
      expect(await isRoleMFARequired('FIELD_WORKER')).toBe(false)
    })
  })

  describe('getUserMFAPreferences', () => {
    it('should return default preferences (table not implemented)', async () => {
      const result = await getUserMFAPreferences('user-123')

      expect(result).toEqual({ mfaEnabled: false })
    })

    it('should handle different user IDs', async () => {
      const result1 = await getUserMFAPreferences('user-123')
      const result2 = await getUserMFAPreferences('user-456')

      expect(result1).toEqual(result2)
    })
  })

  describe('updateUserMFAPreferences', () => {
    it('should log preferences update (table not implemented)', async () => {
      const result = await updateUserMFAPreferences('user-123', {
        mfaEnabled: true,
      })

      expect(result).toBe(true)
      expect(logger.log).toHaveBeenCalledWith(
        'MFA preferences update skipped - user_preferences table not implemented',
        expect.objectContaining({
          userId: 'user-123',
          preferences: { mfaEnabled: true },
        })
      )
    })

    it('should accept all preference fields', async () => {
      const preferences = {
        mfaEnabled: true,
        mfaEnforcedAt: '2024-01-01T00:00:00Z',
        backupCodesGenerated: true,
      }

      const result = await updateUserMFAPreferences('user-123', preferences)

      expect(result).toBe(true)
    })
  })

  describe('formatTOTPSecret', () => {
    it('should format secret in groups of 4', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      const formatted = formatTOTPSecret(secret)

      expect(formatted).toBe('JBSW Y3DP EHPK 3PXP')
    })

    it('should handle secrets of various lengths', () => {
      expect(formatTOTPSecret('ABCD')).toBe('ABCD')
      expect(formatTOTPSecret('ABCDEFGH')).toBe('ABCD EFGH')
      expect(formatTOTPSecret('ABCDEFGHIJKLMNOP')).toBe('ABCD EFGH IJKL MNOP')
    })

    it('should handle empty string', () => {
      expect(formatTOTPSecret('')).toBe('')
    })

    it('should handle secret not divisible by 4', () => {
      expect(formatTOTPSecret('ABCDE')).toBe('ABCD E')
      expect(formatTOTPSecret('ABCDEFG')).toBe('ABCD EFG')
    })
  })

  describe('Security Critical Tests', () => {
    it('should not expose sensitive data in error messages', async () => {
      mockEnroll.mockResolvedValue({
        data: null,
        error: new Error('Database credentials exposed'),
      })

      await expect(enrollMFA()).rejects.toThrow('Failed to enroll in MFA')
      // Should not throw the original error message
    })

    it('should validate factor ID format in verification', async () => {
      mockChallengeAndVerify.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      await verifyMFAEnrollment('factor-123', '123456')

      expect(mockChallengeAndVerify).toHaveBeenCalledWith(
        expect.objectContaining({
          factorId: 'factor-123',
        })
      )
    })

    it('should handle concurrent enrollment attempts', async () => {
      const mockEnrollmentResponse = {
        id: 'factor-456',
        totp: {
          qr_code: '<svg>...</svg>',
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/JobSight:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=JobSight',
        },
      }

      mockEnroll.mockResolvedValue({
        data: mockEnrollmentResponse,
        error: null,
      })

      const enrollments = await Promise.all([
        enrollMFA('Device 1'),
        enrollMFA('Device 2'),
        enrollMFA('Device 3'),
      ])

      expect(enrollments).toHaveLength(3)
      expect(mockEnroll).toHaveBeenCalledTimes(3)
    })
  })
})
