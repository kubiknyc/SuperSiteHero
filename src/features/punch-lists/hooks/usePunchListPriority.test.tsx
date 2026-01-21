/**
 * Punch List Priority Management Hook Tests
 *
 * Tests for punch list priority hooks including:
 * - Priority level constants and helpers
 * - Priority calculations and escalation logic
 * - Query hooks for priority-based filtering
 * - Priority statistics aggregation
 * - Priority update mutations
 * - Batch priority escalation
 * - Edge cases and validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import {
  PRIORITY_LEVELS,
  PRIORITY_OPTIONS,
  getPriorityLevel,
  getPriorityColor,
  getPriorityBgColor,
  getPriorityLabel,
  sortByPriority,
  calculateDaysOpen,
  isOverdue,
  shouldEscalatePriority,
  usePunchItemsWithPriority,
  usePunchItemsByPriority,
  usePunchListPriorityStats,
  usePunchItemsNeedingEscalation,
  useUpdatePunchItemPriority,
  useBatchEscalatePunchItemPriorities,
} from './usePunchListPriority'

// Mock user profile
const mockUserProfile = {
  id: 'user-1',
  company_id: 'company-1',
  email: 'test@example.com',
}

// Create mock function for useAuth that can be controlled per-test
const mockUseAuth = vi.fn()

// Mock useAuth
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock Supabase
const mockSupabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

// Test wrapper
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

// Mock data
const mockPunchItem = {
  id: 'punch-1',
  project_id: 'project-1',
  title: 'Fix electrical outlet',
  trade: 'Electrical',
  priority: 'normal',
  status: 'open',
  created_at: '2024-01-01T00:00:00Z',
  due_date: '2024-02-15',
  deleted_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  // Set default return value for useAuth mock
  mockUseAuth.mockReturnValue({ userProfile: mockUserProfile })
})

// ============================================================================
// Priority Level Constants Tests
// ============================================================================

describe('Priority Level Constants', () => {
  it('should define all priority levels', () => {
    expect(PRIORITY_LEVELS.critical).toBeDefined()
    expect(PRIORITY_LEVELS.high).toBeDefined()
    expect(PRIORITY_LEVELS.normal).toBeDefined()
    expect(PRIORITY_LEVELS.low).toBeDefined()
  })

  it('should have correct sort order for priorities', () => {
    expect(PRIORITY_LEVELS.critical.sortOrder).toBe(1)
    expect(PRIORITY_LEVELS.high.sortOrder).toBe(2)
    expect(PRIORITY_LEVELS.normal.sortOrder).toBe(3)
    expect(PRIORITY_LEVELS.low.sortOrder).toBe(4)
  })

  it('should have escalation days defined', () => {
    expect(PRIORITY_LEVELS.critical.escalationDays).toBe(1)
    expect(PRIORITY_LEVELS.high.escalationDays).toBe(3)
    expect(PRIORITY_LEVELS.normal.escalationDays).toBe(7)
    expect(PRIORITY_LEVELS.low.escalationDays).toBe(14)
  })

  it('should have PRIORITY_OPTIONS sorted by sortOrder', () => {
    expect(PRIORITY_OPTIONS).toHaveLength(4)
    expect(PRIORITY_OPTIONS[0].value).toBe('critical')
    expect(PRIORITY_OPTIONS[1].value).toBe('high')
    expect(PRIORITY_OPTIONS[2].value).toBe('normal')
    expect(PRIORITY_OPTIONS[3].value).toBe('low')
  })
})

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('Helper Functions', () => {
  describe('getPriorityLevel', () => {
    it('should return correct priority level for valid priority', () => {
      expect(getPriorityLevel('critical').value).toBe('critical')
      expect(getPriorityLevel('high').value).toBe('high')
      expect(getPriorityLevel('normal').value).toBe('normal')
      expect(getPriorityLevel('low').value).toBe('low')
    })

    it('should return normal for null priority', () => {
      expect(getPriorityLevel(null).value).toBe('normal')
    })

    it('should return normal for invalid priority', () => {
      expect(getPriorityLevel('invalid').value).toBe('normal')
    })

    it('should handle case insensitive input', () => {
      expect(getPriorityLevel('CRITICAL').value).toBe('critical')
      expect(getPriorityLevel('High').value).toBe('high')
    })
  })

  describe('getPriorityColor', () => {
    it('should return correct color class for each priority', () => {
      expect(getPriorityColor('critical')).toBe('text-red-700')
      expect(getPriorityColor('high')).toBe('text-orange-700')
      expect(getPriorityColor('normal')).toBe('text-blue-700')
      expect(getPriorityColor('low')).toBe('text-gray-600')
    })
  })

  describe('getPriorityBgColor', () => {
    it('should return correct background color for each priority', () => {
      expect(getPriorityBgColor('critical')).toBe('bg-red-100')
      expect(getPriorityBgColor('high')).toBe('bg-orange-100')
      expect(getPriorityBgColor('normal')).toBe('bg-blue-100')
      expect(getPriorityBgColor('low')).toBe('bg-gray-100')
    })
  })

  describe('getPriorityLabel', () => {
    it('should return correct label for each priority', () => {
      expect(getPriorityLabel('critical')).toBe('Critical')
      expect(getPriorityLabel('high')).toBe('High')
      expect(getPriorityLabel('normal')).toBe('Normal')
      expect(getPriorityLabel('low')).toBe('Low')
    })
  })

  describe('sortByPriority', () => {
    it('should sort items by priority level', () => {
      const items = [
        { ...mockPunchItem, id: '1', priority: 'low' as any },
        { ...mockPunchItem, id: '2', priority: 'critical' as any },
        { ...mockPunchItem, id: '3', priority: 'normal' as any },
        { ...mockPunchItem, id: '4', priority: 'high' as any },
      ]

      const sorted = sortByPriority(items)

      expect(sorted[0].priority).toBe('critical')
      expect(sorted[1].priority).toBe('high')
      expect(sorted[2].priority).toBe('normal')
      expect(sorted[3].priority).toBe('low')
    })

    it('should not mutate original array', () => {
      const items = [
        { ...mockPunchItem, id: '1', priority: 'low' as any },
        { ...mockPunchItem, id: '2', priority: 'critical' as any },
      ]

      const original = [...items]
      sortByPriority(items)

      expect(items).toEqual(original)
    })
  })

  describe('calculateDaysOpen', () => {
    it('should calculate days between created date and now', () => {
      const daysAgo = 5
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - daysAgo)
      const createdAt = pastDate.toISOString()

      const result = calculateDaysOpen(createdAt)

      expect(result).toBeGreaterThanOrEqual(daysAgo)
      expect(result).toBeLessThanOrEqual(daysAgo + 1) // Account for time of day
    })

    it('should return 0 for null date', () => {
      expect(calculateDaysOpen(null)).toBe(0)
    })
  })

  describe('isOverdue', () => {
    it('should return true for past due dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isOverdue(yesterday.toISOString())).toBe(true)
    })

    it('should return false for future due dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isOverdue(tomorrow.toISOString())).toBe(false)
    })

    it('should return false for null due date', () => {
      expect(isOverdue(null)).toBe(false)
    })
  })

  describe('shouldEscalatePriority', () => {
    it('should return true when days exceed escalation threshold', () => {
      expect(shouldEscalatePriority('normal', 8, 'open')).toBe(true) // 8 days > 7 threshold
      expect(shouldEscalatePriority('high', 4, 'open')).toBe(true) // 4 days > 3 threshold
    })

    it('should return false when days are within threshold', () => {
      expect(shouldEscalatePriority('normal', 5, 'open')).toBe(false) // 5 days < 7 threshold
      expect(shouldEscalatePriority('high', 2, 'open')).toBe(false) // 2 days < 3 threshold
    })

    it('should return false for critical priority (already highest)', () => {
      expect(shouldEscalatePriority('critical', 10, 'open')).toBe(false)
    })

    it('should return false for completed items', () => {
      expect(shouldEscalatePriority('normal', 10, 'completed')).toBe(false)
    })

    it('should return false for verified items', () => {
      expect(shouldEscalatePriority('high', 5, 'verified')).toBe(false)
    })
  })
})

// ============================================================================
// Query Hooks Tests
// ============================================================================

describe('Query Hooks', () => {
  describe('usePunchItemsWithPriority', () => {
    it('should fetch and enhance punch items with priority info', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockPunchItem], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => usePunchItemsWithPriority('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('punch_items')
      expect(result.current.data).toBeDefined()
      expect(result.current.data?.[0]).toHaveProperty('daysOpen')
      expect(result.current.data?.[0]).toHaveProperty('isOverdue')
      expect(result.current.data?.[0]).toHaveProperty('shouldEscalate')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => usePunchItemsWithPriority(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => usePunchItemsWithPriority('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('usePunchItemsByPriority', () => {
    it('should fetch punch items filtered by priority', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockPunchItem], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => usePunchItemsByPriority('project-1', 'high'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('punch_items')
      expect(mockChain.eq).toHaveBeenCalledWith('priority', 'high')
    })
  })

  describe('usePunchListPriorityStats', () => {
    it('should calculate priority statistics from items', async () => {
      const mockItems = [
        { ...mockPunchItem, id: '1', priority: 'critical' as any },
        { ...mockPunchItem, id: '2', priority: 'high' as any },
        { ...mockPunchItem, id: '3', priority: 'normal' as any },
        { ...mockPunchItem, id: '4', priority: 'low' as any },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => usePunchListPriorityStats('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.total).toBe(4)
        expect(result.current.critical).toBe(1)
        expect(result.current.high).toBe(1)
        expect(result.current.normal).toBe(1)
        expect(result.current.low).toBe(1)
      })
    })
  })

  describe('usePunchItemsNeedingEscalation', () => {
    it('should return items that need escalation', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 10) // 10 days old

      const mockItems = [
        { ...mockPunchItem, id: '1', priority: 'normal', created_at: oldDate.toISOString() },
        { ...mockPunchItem, id: '2', priority: 'high', created_at: new Date().toISOString() },
      ]

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => usePunchItemsNeedingEscalation('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
        expect(result.current.count).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================================
// Mutation Hooks Tests
// ============================================================================

describe('Mutation Hooks', () => {
  describe('useUpdatePunchItemPriority', () => {
    it('should update punch item priority', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { priority: 'normal', project_id: 'project-1' },
          error: null,
        }),
      }

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockPunchItem, priority: 'high' },
          error: null,
        }),
      }

      mockSupabaseFrom.mockReturnValueOnce(mockSelectChain).mockReturnValueOnce(mockUpdateChain)

      const { result } = renderHook(() => useUpdatePunchItemPriority(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        punchItemId: 'punch-1',
        priority: 'high',
        reason: 'Safety concern',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
        })
      )
    })

    it('should throw error when user not authenticated', async () => {
      // Override the mock for this test to return null userProfile
      mockUseAuth.mockReturnValue({ userProfile: null })

      const { result } = renderHook(() => useUpdatePunchItemPriority(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        punchItemId: 'punch-1',
        priority: 'high',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      // Note: No need to restore - beforeEach handles this
    })
  })

  describe('useBatchEscalatePunchItemPriorities', () => {
    it('should escalate multiple items in batch', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockUpdateChain)

      const { result } = renderHook(() => useBatchEscalatePunchItemPriorities(), {
        wrapper: createWrapper(),
      })

      result.current.mutate([
        { punchItemId: 'punch-1', currentPriority: 'normal' },
        { punchItemId: 'punch-2', currentPriority: 'low' },
      ])

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(
        expect.objectContaining({
          total: 2,
          successful: 2,
          failed: 0,
        })
      )
    })

    it('should skip items already at critical priority', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockUpdateChain)

      const { result } = renderHook(() => useBatchEscalatePunchItemPriorities(), {
        wrapper: createWrapper(),
      })

      result.current.mutate([{ punchItemId: 'punch-1', currentPriority: 'critical' }])

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Should not call update for critical items
      expect(mockUpdateChain.update).not.toHaveBeenCalled()
    })

    it('should handle partial failures gracefully', async () => {
      let callCount = 0
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({ error: null })
          } else {
            return Promise.resolve({ error: new Error('Update failed') })
          }
        }),
      }
      mockSupabaseFrom.mockReturnValue(mockUpdateChain)

      const { result } = renderHook(() => useBatchEscalatePunchItemPriorities(), {
        wrapper: createWrapper(),
      })

      result.current.mutate([
        { punchItemId: 'punch-1', currentPriority: 'normal' },
        { punchItemId: 'punch-2', currentPriority: 'low' },
      ])

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.failed).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle items with null priority', async () => {
    const itemWithNullPriority = { ...mockPunchItem, priority: null }
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [itemWithNullPriority], error: null }),
    }
    mockSupabaseFrom.mockReturnValue(mockChain)

    const { result } = renderHook(() => usePunchItemsWithPriority('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.[0].priority).toBe('normal') // Should default to normal
  })

  it('should handle items with invalid priority values', () => {
    const level = getPriorityLevel('invalid-priority')
    expect(level.value).toBe('normal')
  })

  it('should handle empty punch items list', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockSupabaseFrom.mockReturnValue(mockChain)

    const { result } = renderHook(() => usePunchListPriorityStats('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.total).toBe(0)
      expect(result.current.critical).toBe(0)
    })
  })
})
