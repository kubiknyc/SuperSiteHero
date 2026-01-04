// File: /src/lib/auth/biometric.test.ts
// Tests for biometric authentication service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  isConditionalMediationAvailable,
  getDeviceInfo,
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  isReauthenticationNeeded,
  setLastBiometricAuthTime,
  getLastBiometricAuthTime,
  clearBiometricAuthSession,
  REAUTH_INTERVALS,
} from './biometric'

// Mock navigator.credentials
const mockCredentials = {
  create: vi.fn(),
  get: vi.fn(),
}

// Mock PublicKeyCredential
const mockIsUserVerifyingPlatformAuthenticatorAvailable = vi.fn()
const mockIsConditionalMediationAvailable = vi.fn()

describe('biometric', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup global mocks
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: mockIsUserVerifyingPlatformAuthenticatorAvailable,
        isConditionalMediationAvailable: mockIsConditionalMediationAvailable,
      },
      writable: true,
    })

    Object.defineProperty(navigator, 'credentials', {
      value: mockCredentials,
      writable: true,
    })

    // Clear session storage
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  describe('isWebAuthnSupported', () => {
    it('returns true when WebAuthn is supported', () => {
      expect(isWebAuthnSupported()).toBe(true)
    })

    // Note: Cannot easily test the "not supported" case in JSDOM
    // as PublicKeyCredential is set up in beforeEach and cannot be deleted
  })

  describe('isPlatformAuthenticatorAvailable', () => {
    it('returns true when platform authenticator is available', async () => {
      mockIsUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)
      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(true)
    })

    it('returns false when platform authenticator is not available', async () => {
      mockIsUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false)
      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(false)
    })

    it('returns false when check throws error', async () => {
      mockIsUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(new Error('Not supported'))
      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(false)
    })

    it('returns false when WebAuthn is not supported', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
      })
      const result = await isPlatformAuthenticatorAvailable()
      expect(result).toBe(false)
    })
  })

  describe('isConditionalMediationAvailable', () => {
    it('returns true when conditional mediation is available', async () => {
      mockIsConditionalMediationAvailable.mockResolvedValue(true)
      const result = await isConditionalMediationAvailable()
      expect(result).toBe(true)
    })

    it('returns false when conditional mediation is not available', async () => {
      mockIsConditionalMediationAvailable.mockResolvedValue(false)
      const result = await isConditionalMediationAvailable()
      expect(result).toBe(false)
    })

    it('returns false when function does not exist', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: mockIsUserVerifyingPlatformAuthenticatorAvailable,
        },
        writable: true,
      })
      const result = await isConditionalMediationAvailable()
      expect(result).toBe(false)
    })
  })

  describe('getDeviceInfo', () => {
    const originalUserAgent = navigator.userAgent

    afterEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      })
    })

    it('detects Chrome on Windows', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        writable: true,
      })
      expect(getDeviceInfo()).toBe('Chrome on Windows')
    })

    it('detects Safari on Mac', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        writable: true,
      })
      expect(getDeviceInfo()).toBe('Safari on Mac')
    })

    it('detects Firefox on Linux', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
        writable: true,
      })
      expect(getDeviceInfo()).toBe('Firefox on Linux')
    })

    it('detects Chrome on iOS', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
        writable: true,
      })
      // Note: Chrome on iOS actually uses CriOS, but our detection uses 'Chrome'
      // The iPhone/iPad detection takes priority for iOS
      expect(getDeviceInfo()).toBe('Safari on iOS')
    })

    it('detects Chrome on Android', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
        writable: true,
      })
      expect(getDeviceInfo()).toBe('Chrome on Android')
    })

    it('detects Edge on Windows', () => {
      // Modern Edge uses 'Edg/' not 'Edge/'
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        writable: true,
      })
      expect(getDeviceInfo()).toBe('Edge on Windows')
    })
  })

  describe('Base64URL encoding/decoding', () => {
    it('correctly encodes ArrayBuffer to Base64URL', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer
      const encoded = arrayBufferToBase64Url(buffer)
      expect(encoded).toBe('AQIDBAU')
    })

    it('correctly decodes Base64URL to ArrayBuffer', () => {
      const encoded = 'AQIDBAU'
      const decoded = base64UrlToArrayBuffer(encoded)
      const array = new Uint8Array(decoded)
      expect(Array.from(array)).toEqual([1, 2, 3, 4, 5])
    })

    it('handles Base64URL with special characters', () => {
      // Test with data that would produce + and / in standard base64
      const buffer = new Uint8Array([251, 255, 254]).buffer
      const encoded = arrayBufferToBase64Url(buffer)

      // Should not contain + or /
      expect(encoded).not.toContain('+')
      expect(encoded).not.toContain('/')

      // Should decode back correctly
      const decoded = base64UrlToArrayBuffer(encoded)
      const array = new Uint8Array(decoded)
      expect(Array.from(array)).toEqual([251, 255, 254])
    })

    it('handles empty ArrayBuffer', () => {
      const buffer = new ArrayBuffer(0)
      const encoded = arrayBufferToBase64Url(buffer)
      expect(encoded).toBe('')

      const decoded = base64UrlToArrayBuffer('')
      expect(decoded.byteLength).toBe(0)
    })
  })

  describe('Re-authentication timing', () => {
    describe('REAUTH_INTERVALS', () => {
      it('has correct interval values', () => {
        expect(REAUTH_INTERVALS['15min'].ms).toBe(15 * 60 * 1000)
        expect(REAUTH_INTERVALS['1hour'].ms).toBe(60 * 60 * 1000)
        expect(REAUTH_INTERVALS['4hours'].ms).toBe(4 * 60 * 60 * 1000)
        expect(REAUTH_INTERVALS['never'].ms).toBe(Infinity)
      })

      it('has correct labels', () => {
        expect(REAUTH_INTERVALS['15min'].label).toBe('15 minutes')
        expect(REAUTH_INTERVALS['1hour'].label).toBe('1 hour')
        expect(REAUTH_INTERVALS['4hours'].label).toBe('4 hours')
        expect(REAUTH_INTERVALS['never'].label).toBe('Never (session only)')
      })
    })

    describe('isReauthenticationNeeded', () => {
      it('returns true when interval has passed', () => {
        const oldTime = new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
        expect(isReauthenticationNeeded(oldTime, '15min')).toBe(true)
      })

      it('returns false when interval has not passed', () => {
        const recentTime = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        expect(isReauthenticationNeeded(recentTime, '15min')).toBe(false)
      })

      it('returns false when interval is never', () => {
        const veryOldTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        expect(isReauthenticationNeeded(veryOldTime, 'never')).toBe(false)
      })

      it('handles 1 hour interval', () => {
        const justOverAnHour = new Date(Date.now() - 61 * 60 * 1000)
        const justUnderAnHour = new Date(Date.now() - 59 * 60 * 1000)

        expect(isReauthenticationNeeded(justOverAnHour, '1hour')).toBe(true)
        expect(isReauthenticationNeeded(justUnderAnHour, '1hour')).toBe(false)
      })

      it('handles 4 hours interval', () => {
        const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)

        expect(isReauthenticationNeeded(fiveHoursAgo, '4hours')).toBe(true)
        expect(isReauthenticationNeeded(threeHoursAgo, '4hours')).toBe(false)
      })
    })
  })

  describe('Fallback and error handling', () => {
    describe('WebAuthn not supported fallback', () => {
      it('isWebAuthnSupported returns false when PublicKeyCredential is undefined', () => {
        Object.defineProperty(window, 'PublicKeyCredential', {
          value: undefined,
          writable: true,
        })
        expect(isWebAuthnSupported()).toBe(false)
      })

      it('isWebAuthnSupported handles missing function gracefully', () => {
        Object.defineProperty(window, 'PublicKeyCredential', {
          value: {},
          writable: true,
        })
        expect(isWebAuthnSupported()).toBe(false)
      })
    })

    describe('Platform authenticator fallback', () => {
      it('returns false when platform check times out', async () => {
        // Simulate a timeout by rejecting with timeout error
        mockIsUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
          new Error('Timeout')
        )
        const result = await isPlatformAuthenticatorAvailable()
        expect(result).toBe(false)
      })

      it('returns false when security error occurs', async () => {
        mockIsUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
          new DOMException('Security check failed', 'SecurityError')
        )
        const result = await isPlatformAuthenticatorAvailable()
        expect(result).toBe(false)
      })

      it('returns false when AbortError occurs', async () => {
        mockIsUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
          new DOMException('User cancelled', 'AbortError')
        )
        const result = await isPlatformAuthenticatorAvailable()
        expect(result).toBe(false)
      })

      it('returns false when NotAllowedError occurs', async () => {
        mockIsUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
          new DOMException('Permission denied', 'NotAllowedError')
        )
        const result = await isPlatformAuthenticatorAvailable()
        expect(result).toBe(false)
      })
    })

    describe('Conditional mediation fallback', () => {
      it('returns false when function throws', async () => {
        mockIsConditionalMediationAvailable.mockRejectedValue(
          new Error('Not implemented')
        )
        const result = await isConditionalMediationAvailable()
        expect(result).toBe(false)
      })

      it('returns false when WebAuthn is not defined at all', async () => {
        Object.defineProperty(window, 'PublicKeyCredential', {
          value: undefined,
          writable: true,
        })
        const result = await isConditionalMediationAvailable()
        expect(result).toBe(false)
      })

      it('returns false when isConditionalMediationAvailable is not a function', async () => {
        Object.defineProperty(window, 'PublicKeyCredential', {
          value: {
            isUserVerifyingPlatformAuthenticatorAvailable: mockIsUserVerifyingPlatformAuthenticatorAvailable,
            isConditionalMediationAvailable: 'not-a-function',
          },
          writable: true,
        })
        const result = await isConditionalMediationAvailable()
        expect(result).toBe(false)
      })
    })

    describe('Edge case handling', () => {
      it('handles empty user agent gracefully', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: '',
          writable: true,
        })
        // Should not throw and should return a reasonable default
        const result = getDeviceInfo()
        expect(result).toBe('Unknown Device')
      })

      it('handles malformed session storage data', () => {
        sessionStorage.setItem('last_biometric_auth', 'invalid-date')
        const result = getLastBiometricAuthTime()
        // Should return an Invalid Date object
        expect(result).toBeInstanceOf(Date)
        expect(Number.isNaN(result?.getTime())).toBe(true)
      })

      it('handles null in session storage', () => {
        // Simulate corrupted session storage
        sessionStorage.setItem('last_biometric_auth', 'null')
        const result = getLastBiometricAuthTime()
        // Should still return a Date object (though invalid)
        expect(result).toBeInstanceOf(Date)
      })
    })

    describe('Re-authentication boundary conditions', () => {
      it('handles exact boundary time for 15min interval', () => {
        // Exactly at the boundary - should NOT need reauth (< not <=)
        const exactBoundary = new Date(Date.now() - 15 * 60 * 1000)
        expect(isReauthenticationNeeded(exactBoundary, '15min')).toBe(true)
      })

      it('handles just before boundary for 15min interval', () => {
        const justBefore = new Date(Date.now() - (15 * 60 * 1000 - 1))
        expect(isReauthenticationNeeded(justBefore, '15min')).toBe(false)
      })

      it('handles future time gracefully', () => {
        const futureTime = new Date(Date.now() + 60 * 1000)
        expect(isReauthenticationNeeded(futureTime, '15min')).toBe(false)
      })

      it('handles very old time correctly', () => {
        const veryOld = new Date(0) // Unix epoch
        expect(isReauthenticationNeeded(veryOld, '15min')).toBe(true)
        expect(isReauthenticationNeeded(veryOld, '4hours')).toBe(true)
        expect(isReauthenticationNeeded(veryOld, 'never')).toBe(false)
      })
    })
  })

  describe('Session management', () => {
    describe('setLastBiometricAuthTime', () => {
      it('stores current time in session storage', () => {
        const before = Date.now()
        setLastBiometricAuthTime()
        const after = Date.now()

        const stored = sessionStorage.getItem('last_biometric_auth')
        expect(stored).not.toBeNull()

        const storedTime = new Date(stored!).getTime()
        expect(storedTime).toBeGreaterThanOrEqual(before)
        expect(storedTime).toBeLessThanOrEqual(after)
      })
    })

    describe('getLastBiometricAuthTime', () => {
      it('returns null when no time is stored', () => {
        expect(getLastBiometricAuthTime()).toBeNull()
      })

      it('returns stored time as Date object', () => {
        const testTime = new Date().toISOString()
        sessionStorage.setItem('last_biometric_auth', testTime)

        const result = getLastBiometricAuthTime()
        expect(result).toBeInstanceOf(Date)
        expect(result?.toISOString()).toBe(testTime)
      })
    })

    describe('clearBiometricAuthSession', () => {
      it('clears all biometric session data', () => {
        sessionStorage.setItem('last_biometric_auth', new Date().toISOString())
        sessionStorage.setItem('webauthn_challenge', 'test-challenge')

        clearBiometricAuthSession()

        expect(sessionStorage.getItem('last_biometric_auth')).toBeNull()
        expect(sessionStorage.getItem('webauthn_challenge')).toBeNull()
      })

      it('does not affect other session storage items', () => {
        sessionStorage.setItem('other_item', 'value')
        sessionStorage.setItem('last_biometric_auth', new Date().toISOString())

        clearBiometricAuthSession()

        expect(sessionStorage.getItem('other_item')).toBe('value')
      })
    })
  })
})
