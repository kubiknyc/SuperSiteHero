// File: /src/__tests__/lib/auth/session-manager.test.ts
// Tests for session manager

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatTimeRemaining,
  sessionNeedsRefresh,
} from '@/lib/auth/session-manager'

describe('Session Manager Utilities', () => {
  describe('formatTimeRemaining', () => {
    it('should format hours and minutes correctly', () => {
      expect(formatTimeRemaining(3600000 + 1800000)).toBe('1h 30m') // 1h 30m
    })

    it('should format minutes and seconds correctly', () => {
      expect(formatTimeRemaining(125000)).toBe('2m 5s') // 2m 5s
    })

    it('should format seconds only correctly', () => {
      expect(formatTimeRemaining(45000)).toBe('45s')
    })

    it('should return Expired for zero or negative', () => {
      expect(formatTimeRemaining(0)).toBe('Expired')
      expect(formatTimeRemaining(-1000)).toBe('Expired')
    })
  })

  describe('sessionNeedsRefresh', () => {
    it('should return false for null session', () => {
      expect(sessionNeedsRefresh(null)).toBe(false)
    })

    it('should return false for session without expires_at', () => {
      const session = { user: { id: '123' } } as any
      expect(sessionNeedsRefresh(session)).toBe(false)
    })

    it('should return true when session is expiring soon', () => {
      const now = Date.now()
      const session = {
        expires_at: Math.floor((now + 2 * 60 * 1000) / 1000), // 2 minutes from now
      } as any
      expect(sessionNeedsRefresh(session)).toBe(true)
    })

    it('should return false when session has plenty of time', () => {
      const now = Date.now()
      const session = {
        expires_at: Math.floor((now + 60 * 60 * 1000) / 1000), // 1 hour from now
      } as any
      expect(sessionNeedsRefresh(session)).toBe(false)
    })
  })
})

describe('Session Security', () => {
  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint on same device', async () => {
      const { generateFingerprint } = await import('@/lib/auth/session-security')

      const fp1 = generateFingerprint()
      const fp2 = generateFingerprint()

      expect(fp1.hash).toBe(fp2.hash)
      expect(fp1.userAgent).toBe(fp2.userAgent)
      expect(fp1.platform).toBe(fp2.platform)
    })

    it('should include required properties', async () => {
      const { generateFingerprint } = await import('@/lib/auth/session-security')

      const fp = generateFingerprint()

      expect(fp).toHaveProperty('userAgent')
      expect(fp).toHaveProperty('screenResolution')
      expect(fp).toHaveProperty('timezoneOffset')
      expect(fp).toHaveProperty('languages')
      expect(fp).toHaveProperty('platform')
      expect(fp).toHaveProperty('hash')
    })
  })

  describe('compareFingerprints', () => {
    it('should return 1.0 similarity for identical fingerprints', async () => {
      const { generateFingerprint, compareFingerprints } = await import(
        '@/lib/auth/session-security'
      )

      const fp = generateFingerprint()
      const result = compareFingerprints(fp, fp)

      expect(result.similarity).toBe(1)
      expect(result.differences).toHaveLength(0)
    })

    it('should detect differences in fingerprints', async () => {
      const { generateFingerprint, compareFingerprints } = await import(
        '@/lib/auth/session-security'
      )

      const fp1 = generateFingerprint()
      const fp2 = { ...fp1, userAgent: 'different-agent' }

      const result = compareFingerprints(fp1, fp2)

      expect(result.similarity).toBeLessThan(1)
      expect(result.differences).toContain('userAgent')
    })
  })

  describe('checkSessionSecurity', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    afterEach(() => {
      localStorage.clear()
    })

    it('should pass with no stored fingerprint', async () => {
      const { checkSessionSecurity } = await import('@/lib/auth/session-security')

      const result = checkSessionSecurity()

      expect(result.passed).toBe(true)
      expect(result.riskLevel).toBe('none')
    })

    it('should pass when fingerprint matches', async () => {
      const {
        generateFingerprint,
        storeSessionFingerprint,
        storeSessionMetadata,
        checkSessionSecurity,
      } = await import('@/lib/auth/session-security')

      const fp = generateFingerprint()
      storeSessionFingerprint(fp)
      storeSessionMetadata({
        initialFingerprint: fp.hash,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        mismatchCount: 0,
      })

      const result = checkSessionSecurity()

      expect(result.passed).toBe(true)
      expect(result.riskLevel).toBe('none')
    })
  })
})
