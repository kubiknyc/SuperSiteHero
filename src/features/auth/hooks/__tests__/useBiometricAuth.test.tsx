/**
 * useBiometricAuth Hook Tests
 *
 * Tests biometric authentication hook functionality:
 * - WebAuthn support detection
 * - Device registration and management
 * - Authentication flow
 * - Re-authentication timing
 * - Settings management
 * - Error handling
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBiometricAuth } from '../useBiometricAuth'
import * as biometricLib from '@/lib/auth/biometric'
import { createMockUser, createMockSession } from '@/__tests__/factories'
import type { BiometricSettings, BiometricCredential } from '@/lib/auth/biometric'

// Hoist mock functions so they can be used in vi.mock
const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

// Mock the auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: mockUseAuth,
}))

// Mock the biometric library
vi.mock('@/lib/auth/biometric')

const mockUser = createMockUser({ role: 'project_manager' })

const mockSettings: BiometricSettings = {
  enabled: true,
  reauth_interval: 'one_hour',
  credentials_count: 2,
  last_auth_at: new Date().toISOString(),
}

const mockCredentials: BiometricCredential[] = [
  {
    id: 'cred-1',
    credential_id: 'abc123',
    credential_public_key: 'pubkey1',
    user_id: mockUser.id,
    device_name: 'iPhone 14 Pro',
    created_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  },
  {
    id: 'cred-2',
    credential_id: 'def456',
    credential_public_key: 'pubkey2',
    user_id: mockUser.id,
    device_name: 'MacBook Pro',
    created_at: new Date().toISOString(),
    last_used_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
]

// Create a wrapper with auth context and query client
function createWrapper(user: ReturnType<typeof createMockUser> | null = mockUser) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useBiometricAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useAuth to return the mock user
    mockUseAuth.mockReturnValue({
      user: mockUser,
      userProfile: mockUser,
      session: createMockSession(),
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    // Default mock implementations
    vi.mocked(biometricLib.isWebAuthnSupported).mockReturnValue(true)
    vi.mocked(biometricLib.isPlatformAuthenticatorAvailable).mockResolvedValue(true)
    vi.mocked(biometricLib.getBiometricSettings).mockResolvedValue(mockSettings)
    vi.mocked(biometricLib.getUserBiometricCredentials).mockResolvedValue(mockCredentials)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Browser Support Detection', () => {
    it('should detect WebAuthn support', async () => {
      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
      })

      expect(biometricLib.isWebAuthnSupported).toHaveBeenCalled()
    })

    it('should detect platform authenticator availability', async () => {
      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isAvailable).toBe(true)
      })

      expect(biometricLib.isPlatformAuthenticatorAvailable).toHaveBeenCalled()
    })

    it('should handle unsupported browsers', async () => {
      vi.mocked(biometricLib.isWebAuthnSupported).mockReturnValue(false)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false)
        expect(result.current.isAvailable).toBe(false)
      })
    })

    it('should handle unavailable platform authenticator', async () => {
      vi.mocked(biometricLib.isPlatformAuthenticatorAvailable).mockResolvedValue(false)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true)
        expect(result.current.isAvailable).toBe(false)
      })
    })
  })

  describe('Settings Loading', () => {
    it('should load biometric settings on mount', async () => {
      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.settings).toEqual(mockSettings)
        expect(result.current.isLoading).toBe(false)
      })

      expect(biometricLib.getBiometricSettings).toHaveBeenCalledWith(mockUser.id)
    })

    it('should show enabled state from settings', async () => {
      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true)
      })
    })

    it('should handle loading errors', async () => {
      vi.mocked(biometricLib.getBiometricSettings).mockRejectedValue(
        new Error('Failed to load')
      )

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load biometric settings')
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should not load settings when user is not authenticated', async () => {
      // Override mock to return null user
      mockUseAuth.mockReturnValue({
        user: null,
        userProfile: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      })

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(null),
      })

      await waitFor(() => {
        expect(result.current.settings).toBeNull()
        expect(result.current.isLoading).toBe(false)
      })

      expect(biometricLib.getBiometricSettings).not.toHaveBeenCalled()
    })
  })

  describe('Device Registration', () => {
    it('should register new device successfully', async () => {
      const newCredential: BiometricCredential = {
        ...mockCredentials[0],
        id: 'cred-3',
        device_name: 'New Device',
      }

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      let registeredCredential: BiometricCredential | undefined

      await act(async () => {
        registeredCredential = await result.current.registerDevice('New Device')
      })

      expect(registeredCredential).toEqual(newCredential)
      expect(biometricLib.registerBiometricCredential).toHaveBeenCalledWith(
        mockUser.id,
        'New Device'
      )
    })

    it('should register device with auto-generated name', async () => {
      const newCredential: BiometricCredential = {
        ...mockCredentials[0],
        id: 'cred-4',
        device_name: 'Chrome on Windows',
      }

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.registerDevice()
      })

      expect(biometricLib.registerBiometricCredential).toHaveBeenCalledWith(
        mockUser.id,
        undefined
      )
    })

    it('should handle registration errors', async () => {
      vi.mocked(biometricLib.registerBiometricCredential).mockRejectedValue(
        new Error('Registration failed')
      )

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await expect(async () => {
        await act(async () => {
          await result.current.registerDevice('Test Device')
        })
      }).rejects.toThrow('Registration failed')
    })

    it('should refresh settings after successful registration', async () => {
      const newCredential: BiometricCredential = {
        ...mockCredentials[0],
        id: 'cred-5',
      }

      vi.mocked(biometricLib.registerBiometricCredential).mockResolvedValue(newCredential)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.registerDevice('Test')
      })

      // Settings should be refreshed (called twice: once on mount, once after registration)
      await waitFor(() => {
        expect(biometricLib.getBiometricSettings).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Device Removal', () => {
    it('should remove device successfully', async () => {
      vi.mocked(biometricLib.deleteBiometricCredential).mockResolvedValue(true)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      let success = false

      await act(async () => {
        success = await result.current.removeDevice('cred-1')
      })

      expect(success).toBe(true)
      expect(biometricLib.deleteBiometricCredential).toHaveBeenCalledWith('cred-1')
    })

    it('should refresh settings after device removal', async () => {
      vi.mocked(biometricLib.deleteBiometricCredential).mockResolvedValue(true)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.removeDevice('cred-1')
      })

      // Settings should be refreshed
      await waitFor(() => {
        expect(biometricLib.getBiometricSettings).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle removal errors', async () => {
      vi.mocked(biometricLib.deleteBiometricCredential).mockRejectedValue(
        new Error('Deletion failed')
      )

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await expect(async () => {
        await act(async () => {
          await result.current.removeDevice('cred-1')
        })
      }).rejects.toThrow('Deletion failed')
    })
  })

  describe('Authentication', () => {
    it('should authenticate successfully', async () => {
      vi.mocked(biometricLib.authenticateWithBiometric).mockResolvedValue(true)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      let success = false

      await act(async () => {
        success = await result.current.authenticate()
      })

      expect(success).toBe(true)
      expect(biometricLib.authenticateWithBiometric).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle authentication failure', async () => {
      vi.mocked(biometricLib.authenticateWithBiometric).mockResolvedValue(false)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      let success = true

      await act(async () => {
        success = await result.current.authenticate()
      })

      expect(success).toBe(false)
    })

    it('should handle authentication errors', async () => {
      vi.mocked(biometricLib.authenticateWithBiometric).mockRejectedValue(
        new Error('Auth failed')
      )

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await expect(async () => {
        await act(async () => {
          await result.current.authenticate()
        })
      }).rejects.toThrow('Auth failed')
    })
  })

  describe('Settings Management', () => {
    it('should toggle enabled state', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue(undefined)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.toggleEnabled(false)
      })

      expect(biometricLib.updateBiometricSettings).toHaveBeenCalledWith(mockUser.id, {
        enabled: false,
      })
    })

    it('should update reauth interval', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue(undefined)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.setReauthInterval('four_hours')
      })

      expect(biometricLib.updateBiometricSettings).toHaveBeenCalledWith(mockUser.id, {
        reauth_interval: 'four_hours',
      })
    })

    it('should refresh settings after toggle', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue(undefined)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.toggleEnabled(true)
      })

      // Should refresh settings
      await waitFor(() => {
        expect(biometricLib.getBiometricSettings).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Re-authentication Checking', () => {
    it('should check if re-authentication is needed', async () => {
      vi.mocked(biometricLib.isReauthenticationNeeded).mockReturnValue(true)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        const needsReauth = result.current.needsReauth()
        expect(needsReauth).toBe(true)
      })

      expect(biometricLib.isReauthenticationNeeded).toHaveBeenCalledWith('one_hour')
    })

    it('should not need reauth when recently authenticated', async () => {
      vi.mocked(biometricLib.isReauthenticationNeeded).mockReturnValue(false)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        const needsReauth = result.current.needsReauth()
        expect(needsReauth).toBe(false)
      })
    })
  })

  describe('Session Management', () => {
    it('should clear biometric auth session', async () => {
      vi.mocked(biometricLib.clearBiometricAuthSession).mockReturnValue(undefined)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await act(() => {
        result.current.clearSession()
      })

      expect(biometricLib.clearBiometricAuthSession).toHaveBeenCalled()
    })
  })

  describe('Manual Settings Refresh', () => {
    it('should allow manual settings refresh', async () => {
      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      // Clear the initial load call
      vi.clearAllMocks()

      await act(async () => {
        await result.current.refreshSettings()
      })

      expect(biometricLib.getBiometricSettings).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid successive operations', async () => {
      vi.mocked(biometricLib.updateBiometricSettings).mockResolvedValue(undefined)

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      // Fire multiple operations rapidly
      await act(async () => {
        await Promise.all([
          result.current.toggleEnabled(false),
          result.current.setReauthInterval('never'),
          result.current.refreshSettings(),
        ])
      })

      // All operations should complete
      expect(biometricLib.updateBiometricSettings).toHaveBeenCalledTimes(2)
    })

    it('should handle user changing during hook lifetime', async () => {
      const newUser = createMockUser({ id: 'user-2', role: 'admin' })

      const { result, rerender } = renderHook(
        () => useBiometricAuth(),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => {
        expect(result.current.settings).toEqual(mockSettings)
      })

      // Change user by updating the mock
      mockUseAuth.mockReturnValue({
        user: newUser,
        userProfile: newUser,
        session: createMockSession(),
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      })

      // Rerender to pick up new user
      rerender()

      // Should reload settings for new user
      await waitFor(() => {
        expect(biometricLib.getBiometricSettings).toHaveBeenCalledWith(newUser.id)
      })
    })

    it('should handle disabled biometric settings', async () => {
      vi.mocked(biometricLib.getBiometricSettings).mockResolvedValue({
        ...mockSettings,
        enabled: false,
      })

      const { result } = renderHook(() => useBiometricAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false)
      })
    })
  })
})
