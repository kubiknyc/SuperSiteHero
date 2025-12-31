/**
 * Unit Tests for useEditConflictDetection Hook
 *
 * Tests the conflict detection hook's configuration and resolution methods.
 * For callback-based conflict detection, we verify that the hook sets up
 * subscriptions correctly and that resolution methods work as expected.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Track the options passed to useRealtimeSubscription
type SubscriptionOptions = {
  table: string
  filter?: string
  enabled?: boolean
  onUpdate?: (newRecord: any, oldRecord: any) => void
}

let lastSubscriptionOptions: SubscriptionOptions | null = null

// Mock useRealtimeSubscription - capture the options
vi.mock('../useRealtimeSubscription', () => ({
  useRealtimeSubscription: vi.fn((options: SubscriptionOptions) => {
    lastSubscriptionOptions = options
  }),
}))

// Mock useAuth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'current-user-id' },
  }),
}))

import { useEditConflictDetection } from '../useEditConflictDetection'

describe('useEditConflictDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastSubscriptionOptions = null
  })

  afterEach(() => {
    vi.clearAllMocks()
    lastSubscriptionOptions = null
  })

  describe('initial state', () => {
    it('should not have conflict initially', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
        })
      )

      expect(result.current.hasConflict).toBe(false)
      expect(result.current.conflict).toBeNull()
    })

    it('should provide resolution methods', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
        })
      )

      expect(typeof result.current.dismissConflict).toBe('function')
      expect(typeof result.current.acceptServerChanges).toBe('function')
      expect(typeof result.current.resolveWithLocalChanges).toBe('function')
    })
  })

  describe('subscription setup', () => {
    it('should pass correct table and filter to subscription', () => {
      renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
        })
      )

      expect(lastSubscriptionOptions).not.toBeNull()
      expect(lastSubscriptionOptions?.table).toBe('daily_reports')
      expect(lastSubscriptionOptions?.filter).toBe('id=eq.record-123')
    })

    it('should be enabled when recordId is provided', () => {
      renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          enabled: true,
        })
      )

      expect(lastSubscriptionOptions?.enabled).toBe(true)
    })

    it('should be disabled when recordId is undefined', () => {
      renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: undefined,
          enabled: true,
        })
      )

      expect(lastSubscriptionOptions?.enabled).toBe(false)
    })

    it('should be disabled when enabled option is false', () => {
      renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          enabled: false,
        })
      )

      expect(lastSubscriptionOptions?.enabled).toBe(false)
    })

    it('should provide an onUpdate callback', () => {
      renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
        })
      )

      expect(lastSubscriptionOptions?.onUpdate).toBeDefined()
      expect(typeof lastSubscriptionOptions?.onUpdate).toBe('function')
    })
  })

  describe('onUpdate callback behavior', () => {
    it('should set conflict when another user updates record', () => {
      const onConflict = vi.fn()

      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
          onConflict,
        })
      )

      // Invoke the onUpdate callback directly
      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(true)
      expect(onConflict).toHaveBeenCalled()
      expect(result.current.conflict?.serverData).toEqual(
        expect.objectContaining({ title: 'Updated' })
      )
    })

    it('should not set conflict when current user updates record', () => {
      const onConflict = vi.fn()

      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
          onConflict,
        })
      )

      // Invoke with current user's ID
      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'current-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(false)
      expect(onConflict).not.toHaveBeenCalled()
    })

    it('should set conflict when updated_by is undefined', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
        })
      )

      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(true)
    })

    it('should include detectedAt timestamp', () => {
      const beforeTime = Date.now()

      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
        })
      )

      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      const afterTime = Date.now()

      expect(result.current.conflict?.detectedAt).toBeGreaterThanOrEqual(beforeTime)
      expect(result.current.conflict?.detectedAt).toBeLessThanOrEqual(afterTime)
    })

    it('should not set conflict when localData is not provided', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          // No localData provided
        })
      )

      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      // Without localData, detectChanges returns false
      expect(result.current.hasConflict).toBe(false)
    })
  })

  describe('conflict resolution methods', () => {
    it('should clear conflict when dismissConflict is called', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
        })
      )

      // Create conflict
      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(true)

      // Dismiss
      act(() => {
        result.current.dismissConflict()
      })

      expect(result.current.hasConflict).toBe(false)
      expect(result.current.conflict).toBeNull()
    })

    it('should return server data when acceptServerChanges is called', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
        })
      )

      // Create conflict
      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Server Data', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(true)

      let serverData: any
      act(() => {
        serverData = result.current.acceptServerChanges()
      })

      expect(serverData).toEqual(expect.objectContaining({ title: 'Server Data' }))
      expect(result.current.hasConflict).toBe(false)
    })

    it('should return null when acceptServerChanges is called without conflict', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
        })
      )

      let serverData: any
      act(() => {
        serverData = result.current.acceptServerChanges()
      })

      expect(serverData).toBeNull()
    })

    it('should clear conflict when resolveWithLocalChanges is called', () => {
      const { result } = renderHook(() =>
        useEditConflictDetection({
          table: 'daily_reports',
          recordId: 'record-123',
          localData: { id: 'record-123', title: 'Original' },
        })
      )

      // Create conflict
      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(true)

      act(() => {
        result.current.resolveWithLocalChanges()
      })

      expect(result.current.hasConflict).toBe(false)
    })
  })

  describe('enabled/disabled transitions', () => {
    it('should reset conflict when disabled', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useEditConflictDetection({
            table: 'daily_reports',
            recordId: 'record-123',
            localData: { id: 'record-123', title: 'Original' },
            enabled,
          }),
        { initialProps: { enabled: true } }
      )

      // Create conflict
      act(() => {
        lastSubscriptionOptions?.onUpdate?.(
          { id: 'record-123', title: 'Updated', updated_by: 'other-user-id' },
          { id: 'record-123', title: 'Original' }
        )
      })

      expect(result.current.hasConflict).toBe(true)

      // Disable
      rerender({ enabled: false })

      expect(result.current.hasConflict).toBe(false)
    })

    it('should update subscription filter when recordId changes', () => {
      const { rerender } = renderHook(
        ({ recordId }) =>
          useEditConflictDetection({
            table: 'daily_reports',
            recordId,
            localData: { id: recordId, title: 'Original' },
          }),
        { initialProps: { recordId: 'record-123' } }
      )

      expect(lastSubscriptionOptions?.filter).toBe('id=eq.record-123')

      // Change recordId
      rerender({ recordId: 'record-456' })

      expect(lastSubscriptionOptions?.filter).toBe('id=eq.record-456')
    })
  })
})
