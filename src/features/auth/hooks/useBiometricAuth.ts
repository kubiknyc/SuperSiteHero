/**
 * Biometric Authentication Hook
 *
 * Provides biometric authentication state and operations.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  getBiometricSettings,
  authenticateWithBiometric,
  registerBiometricCredential,
  deleteBiometricCredential,
  updateBiometricSettings,
  isReauthenticationNeeded,
  getLastBiometricAuthTime,
  setLastBiometricAuthTime,
  clearBiometricAuthSession,
  type BiometricSettings,
  type BiometricCredential,
  type ReauthInterval,
} from '@/lib/auth/biometric'
import { logger } from '../../../lib/utils/logger';


interface UseBiometricAuthReturn {
  // State
  isSupported: boolean
  isAvailable: boolean
  isEnabled: boolean
  isLoading: boolean
  settings: BiometricSettings | null
  credentials: BiometricCredential[]
  error: string | null

  // Actions
  registerDevice: (deviceName?: string) => Promise<BiometricCredential>
  removeDevice: (credentialId: string) => Promise<boolean>
  authenticate: () => Promise<boolean>
  toggleEnabled: (enabled: boolean) => Promise<void>
  setReauthInterval: (interval: ReauthInterval) => Promise<void>
  needsReauth: () => boolean
  refreshSettings: () => Promise<void>
  clearSession: () => void
}

export function useBiometricAuth(): UseBiometricAuthReturn {
  const { user } = useAuth()

  const [isSupported, setIsSupported] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<BiometricSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check browser support
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isWebAuthnSupported()
      setIsSupported(supported)

      if (supported) {
        const available = await isPlatformAuthenticatorAvailable()
        setIsAvailable(available)
      }
    }

    checkSupport()
  }, [])

  // Load settings when user is available
  const loadSettings = useCallback(async () => {
    if (!user?.id) {
      setSettings(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const biometricSettings = await getBiometricSettings(user.id)
      setSettings(biometricSettings)
    } catch (err) {
      setError('Failed to load biometric settings')
      logger.error('Error loading biometric settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Register a new device
  const registerDevice = useCallback(
    async (deviceName?: string): Promise<BiometricCredential> => {
      if (!user?.id || !user?.email) {
        throw new Error('User not authenticated')
      }

      if (!isAvailable) {
        throw new Error('Biometric authentication not available')
      }

      setError(null)

      try {
        const credential = await registerBiometricCredential(user.id, user.email, deviceName)
        await loadSettings() // Refresh settings after registration
        return credential
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to register device'
        setError(message)
        throw err
      }
    },
    [user?.id, user?.email, isAvailable, loadSettings]
  )

  // Remove a device
  const removeDevice = useCallback(
    async (credentialId: string): Promise<boolean> => {
      setError(null)

      try {
        const success = await deleteBiometricCredential(credentialId)
        if (success) {
          await loadSettings() // Refresh settings after removal
        }
        return success
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove device'
        setError(message)
        return false
      }
    },
    [loadSettings]
  )

  // Perform biometric authentication
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated')
      return false
    }

    if (!isAvailable) {
      setError('Biometric authentication not available')
      return false
    }

    setError(null)

    try {
      await authenticateWithBiometric(user.id)
      setLastBiometricAuthTime()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
      return false
    }
  }, [user?.id, isAvailable])

  // Toggle biometric enabled
  const toggleEnabled = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      setError(null)

      try {
        await updateBiometricSettings(user.id, { enabled })
        setSettings((prev) => (prev ? { ...prev, enabled } : null))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update settings'
        setError(message)
        throw err
      }
    },
    [user?.id]
  )

  // Set re-authentication interval
  const setReauthInterval = useCallback(
    async (interval: ReauthInterval): Promise<void> => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      setError(null)

      try {
        await updateBiometricSettings(user.id, { reauthInterval: interval })
        setSettings((prev) => (prev ? { ...prev, reauthInterval: interval } : null))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update settings'
        setError(message)
        throw err
      }
    },
    [user?.id]
  )

  // Check if re-authentication is needed
  const needsReauth = useCallback((): boolean => {
    if (!settings?.enabled) {
      return false
    }

    const lastAuthTime = getLastBiometricAuthTime()
    if (!lastAuthTime) {
      return true
    }

    return isReauthenticationNeeded(lastAuthTime, settings.reauthInterval)
  }, [settings?.enabled, settings?.reauthInterval])

  // Clear biometric session
  const clearSession = useCallback(() => {
    clearBiometricAuthSession()
  }, [])

  return {
    isSupported,
    isAvailable,
    isEnabled: settings?.enabled ?? false,
    isLoading,
    settings,
    credentials: settings?.credentials ?? [],
    error,
    registerDevice,
    removeDevice,
    authenticate,
    toggleEnabled,
    setReauthInterval,
    needsReauth,
    refreshSettings: loadSettings,
    clearSession,
  }
}
