/**
 * Unit Tests for useRealtimeSubscription Hook
 *
 * Tests the generic Supabase Realtime subscription hook for:
 * - Subscribing to table changes via realtimeManager
 * - Handling insert/update/delete callbacks
 * - Respecting enabled flag
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtimeSubscription, useRealtimeConnectionState } from '../useRealtimeSubscription'

// Mock the realtime manager
const mockUnsubscribe = vi.fn()
const mockSubscribeToTable = vi.fn(() => mockUnsubscribe)
const mockOnConnectionChange = vi.fn((callback: (state: string) => void) => {
  // Return cleanup function
  return () => {}
})

vi.mock('@/lib/realtime', () => ({
  realtimeManager: {
    subscribeToTable: (options: any) => mockSubscribeToTable(options),
    getConnectionState: vi.fn(() => 'connected'),
    onConnectionChange: (callback: any) => mockOnConnectionChange(callback),
  },
}))

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should subscribe to table when enabled', () => {
    const onInsert = vi.fn()
    const onUpdate = vi.fn()
    const onDelete = vi.fn()

    renderHook(() =>
      useRealtimeSubscription({
        table: 'daily_reports',
        onInsert,
        onUpdate,
        onDelete,
      })
    )

    expect(mockSubscribeToTable).toHaveBeenCalledTimes(1)
    expect(mockSubscribeToTable).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'daily_reports',
        schema: 'public',
      })
    )
  })

  it('should not subscribe when enabled is false', () => {
    renderHook(() =>
      useRealtimeSubscription({
        table: 'daily_reports',
        enabled: false,
      })
    )

    expect(mockSubscribeToTable).not.toHaveBeenCalled()
  })

  it('should include filter in subscription options', () => {
    renderHook(() =>
      useRealtimeSubscription({
        table: 'daily_reports',
        filter: 'project_id=eq.123',
      })
    )

    expect(mockSubscribeToTable).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'daily_reports',
        filter: 'project_id=eq.123',
      })
    )
  })

  it('should include custom schema in subscription options', () => {
    renderHook(() =>
      useRealtimeSubscription({
        table: 'custom_table',
        schema: 'custom_schema',
      })
    )

    expect(mockSubscribeToTable).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'custom_table',
        schema: 'custom_schema',
      })
    )
  })

  it('should call unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useRealtimeSubscription({
        table: 'daily_reports',
      })
    )

    expect(mockUnsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('should resubscribe when table changes', () => {
    const { rerender } = renderHook(
      ({ table }) =>
        useRealtimeSubscription({
          table,
        }),
      { initialProps: { table: 'daily_reports' } }
    )

    expect(mockSubscribeToTable).toHaveBeenCalledTimes(1)

    rerender({ table: 'workflow_items' })

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribeToTable).toHaveBeenCalledTimes(2)
  })

  it('should resubscribe when filter changes', () => {
    const { rerender } = renderHook(
      ({ filter }) =>
        useRealtimeSubscription({
          table: 'daily_reports',
          filter,
        }),
      { initialProps: { filter: 'id=eq.1' } }
    )

    expect(mockSubscribeToTable).toHaveBeenCalledTimes(1)

    rerender({ filter: 'id=eq.2' })

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    expect(mockSubscribeToTable).toHaveBeenCalledTimes(2)
  })

  it('should not resubscribe when only callbacks change', () => {
    const { rerender } = renderHook(
      ({ onInsert }) =>
        useRealtimeSubscription({
          table: 'daily_reports',
          onInsert,
        }),
      { initialProps: { onInsert: vi.fn() } }
    )

    expect(mockSubscribeToTable).toHaveBeenCalledTimes(1)

    rerender({ onInsert: vi.fn() })

    // Should NOT unsubscribe/resubscribe since callbacks use refs
    expect(mockSubscribeToTable).toHaveBeenCalledTimes(1)
  })

  it('should subscribe/unsubscribe when enabled toggles', () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useRealtimeSubscription({
          table: 'daily_reports',
          enabled,
        }),
      { initialProps: { enabled: true } }
    )

    expect(mockSubscribeToTable).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)

    rerender({ enabled: true })

    expect(mockSubscribeToTable).toHaveBeenCalledTimes(2)
  })
})

describe('useRealtimeConnectionState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return current connection state', () => {
    const { result } = renderHook(() => useRealtimeConnectionState())

    expect(result.current).toBe('connected')
  })

  it('should subscribe to connection state changes', () => {
    renderHook(() => useRealtimeConnectionState())

    expect(mockOnConnectionChange).toHaveBeenCalledWith(expect.any(Function))
  })
})
