/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockGetPreferences = vi.fn()
const mockUpdatePreferences = vi.fn()
const mockResetToDefaults = vi.fn()
const mockEnableAllEmail = vi.fn()
const mockDisableAllEmail = vi.fn()
const mockUpdateQuietHours = vi.fn()

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockUseAuth = vi.fn(() => ({ user: mockUser }))

// Mock toast and logger
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock the API service
vi.mock('@/lib/api/services/notification-preferences', () => ({
  notificationPreferencesApi: {
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
    updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
    resetToDefaults: (...args: unknown[]) => mockResetToDefaults(...args),
    enableAllEmail: (...args: unknown[]) => mockEnableAllEmail(...args),
    disableAllEmail: (...args: unknown[]) => mockDisableAllEmail(...args),
    updateQuietHours: (...args: unknown[]) => mockUpdateQuietHours(...args),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  preferencesKeys,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useResetNotificationPreferences,
  useEnableAllEmailNotifications,
  useDisableAllEmailNotifications,
  useUpdateQuietHours,
} from './useNotificationPreferences'

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Sample test data
const mockPreferences = {
  id: 'prefs-1',
  user_id: 'user-1',
  email_daily_reports: true,
  email_rfi_updates: true,
  email_submittal_updates: true,
  email_change_orders: true,
  email_safety_alerts: true,
  email_schedule_updates: false,
  email_project_invites: true,
  email_mentions: true,
  push_enabled: true,
  push_daily_reports: false,
  push_rfi_updates: true,
  push_submittal_updates: true,
  push_change_orders: true,
  push_safety_alerts: true,
  push_schedule_updates: true,
  push_project_invites: true,
  push_mentions: true,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
    timezone: 'America/New_York',
  },
  digest_frequency: 'daily',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
}

const mockDefaultPreferences = {
  ...mockPreferences,
  email_daily_reports: true,
  email_rfi_updates: true,
  email_submittal_updates: true,
  email_change_orders: true,
  email_safety_alerts: true,
  email_schedule_updates: true,
  email_project_invites: true,
  email_mentions: true,
  push_enabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
    timezone: 'America/New_York',
  },
}

describe('preferencesKeys', () => {
  it('should generate correct query keys', () => {
    expect(preferencesKeys.all).toEqual(['notification-preferences'])
    expect(preferencesKeys.user('user-1')).toEqual(['notification-preferences', 'user-1'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser })
  })

  describe('useNotificationPreferences', () => {
    it('should fetch notification preferences', async () => {
      mockGetPreferences.mockResolvedValue(mockPreferences)

      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockPreferences)
      expect(mockGetPreferences).toHaveBeenCalledWith('user-1')
    })

    it('should not fetch when user not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGetPreferences).not.toHaveBeenCalled()
    })

    it('should handle API error', async () => {
      mockGetPreferences.mockRejectedValue(new Error('Failed to fetch preferences'))

      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Failed to fetch preferences')
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser })
  })

  describe('useUpdateNotificationPreferences', () => {
    it('should update preferences successfully', async () => {
      const updatedPreferences = { ...mockPreferences, email_schedule_updates: true }
      mockUpdatePreferences.mockResolvedValue(updatedPreferences)

      const { result } = renderHook(() => useUpdateNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ email_schedule_updates: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdatePreferences).toHaveBeenCalledWith('user-1', { email_schedule_updates: true })
    })

    it('should update multiple preferences', async () => {
      const updates = {
        email_daily_reports: false,
        email_rfi_updates: false,
        push_enabled: false,
      }
      mockUpdatePreferences.mockResolvedValue({ ...mockPreferences, ...updates })

      const { result } = renderHook(() => useUpdateNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(updates)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdatePreferences).toHaveBeenCalledWith('user-1', updates)
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useUpdateNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ email_daily_reports: true })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('User not authenticated')
    })

    it('should handle update error', async () => {
      mockUpdatePreferences.mockRejectedValue(new Error('Update failed'))

      const { result } = renderHook(() => useUpdateNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ email_daily_reports: false })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useResetNotificationPreferences', () => {
    it('should reset preferences to defaults', async () => {
      mockResetToDefaults.mockResolvedValue(mockDefaultPreferences)

      const { result } = renderHook(() => useResetNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockResetToDefaults).toHaveBeenCalledWith('user-1')
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useResetNotificationPreferences(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('User not authenticated')
    })
  })

  describe('useEnableAllEmailNotifications', () => {
    it('should enable all email notifications', async () => {
      const allEnabled = {
        ...mockPreferences,
        email_daily_reports: true,
        email_rfi_updates: true,
        email_submittal_updates: true,
        email_change_orders: true,
        email_safety_alerts: true,
        email_schedule_updates: true,
        email_project_invites: true,
        email_mentions: true,
      }
      mockEnableAllEmail.mockResolvedValue(allEnabled)

      const { result } = renderHook(() => useEnableAllEmailNotifications(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockEnableAllEmail).toHaveBeenCalledWith('user-1')
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useEnableAllEmailNotifications(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDisableAllEmailNotifications', () => {
    it('should disable all email notifications', async () => {
      const allDisabled = {
        ...mockPreferences,
        email_daily_reports: false,
        email_rfi_updates: false,
        email_submittal_updates: false,
        email_change_orders: false,
        email_safety_alerts: false,
        email_schedule_updates: false,
        email_project_invites: false,
        email_mentions: false,
      }
      mockDisableAllEmail.mockResolvedValue(allDisabled)

      const { result } = renderHook(() => useDisableAllEmailNotifications(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDisableAllEmail).toHaveBeenCalledWith('user-1')
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useDisableAllEmailNotifications(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateQuietHours', () => {
    it('should update quiet hours settings', async () => {
      const updatedQuietHours = {
        enabled: true,
        start: '21:00',
        end: '08:00',
        timezone: 'America/Los_Angeles',
      }
      mockUpdateQuietHours.mockResolvedValue({
        ...mockPreferences,
        quietHours: updatedQuietHours,
      })

      const { result } = renderHook(() => useUpdateQuietHours(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(updatedQuietHours)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateQuietHours).toHaveBeenCalledWith('user-1', updatedQuietHours)
    })

    it('should disable quiet hours', async () => {
      const disabledQuietHours = {
        enabled: false,
        start: '22:00',
        end: '07:00',
        timezone: 'America/New_York',
      }
      mockUpdateQuietHours.mockResolvedValue({
        ...mockPreferences,
        quietHours: disabledQuietHours,
      })

      const { result } = renderHook(() => useUpdateQuietHours(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(disabledQuietHours)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null })

      const { result } = renderHook(() => useUpdateQuietHours(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        enabled: true,
        start: '22:00',
        end: '07:00',
        timezone: 'America/New_York',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })

    it('should handle update error', async () => {
      mockUpdateQuietHours.mockRejectedValue(new Error('Invalid time format'))

      const { result } = renderHook(() => useUpdateQuietHours(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        enabled: true,
        start: 'invalid',
        end: '07:00',
        timezone: 'America/New_York',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})
