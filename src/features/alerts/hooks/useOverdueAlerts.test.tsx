/**
 * Tests for Overdue Alerts Hooks
 * Tests for dashboard alerts, overdue items tracking, and due soon items
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// =============================================
// Mock Setup
// =============================================

// Create mock query builder
const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

const mockFromFn = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFromFn(...args),
  },
}))

// Import after mocks
import {
  useOverdueRFIs,
  useOverdueSubmittals,
  useOverduePunchItems,
  useAllOverdueItems,
  useItemsDueSoon,
  OVERDUE_PRIORITY_COLORS,
  OVERDUE_TYPE_COLORS,
  type OverdueItem,
  type OverdueStats,
} from './useOverdueAlerts'

// =============================================
// Test Data
// =============================================

const today = new Date()
const pastDate = new Date(today)
pastDate.setDate(pastDate.getDate() - 10)

const mockOverdueRFI = {
  id: 'rfi-1',
  rfi_number: 1,
  subject: 'Clarification on Steel Details',
  project_id: 'project-1',
  date_required: pastDate.toISOString().split('T')[0],
  priority: 'high',
  ball_in_court: 'Architect',
  status: 'open',
  projects: { name: 'Test Project' },
}

const mockOverdueSubmittal = {
  id: 'sub-1',
  submittal_number: 'SUB-001',
  title: 'Shop Drawings - Structural Steel',
  project_id: 'project-1',
  required_date: pastDate.toISOString().split('T')[0],
  priority: 'medium',
  ball_in_court: 'Engineer',
  status: 'pending',
  projects: { name: 'Test Project' },
}

const mockOverduePunchItem = {
  id: 'punch-1',
  title: 'Touch up paint in lobby',
  project_id: 'project-1',
  due_date: pastDate.toISOString().split('T')[0],
  priority: 'low',
  status: 'open',
  assigned_to: 'user-123',
  projects: { name: 'Test Project' },
}

// =============================================
// Test Setup
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockFromFn.mockImplementation((table: string) => {
    switch (table) {
      case 'rfis':
        return createChainMock([mockOverdueRFI])
      case 'submittals':
        return createChainMock([mockOverdueSubmittal])
      case 'punch_list_items':
        return createChainMock([mockOverduePunchItem])
      default:
        return createChainMock([])
    }
  })
})

// =============================================
// Constants Tests
// =============================================

describe('OVERDUE_PRIORITY_COLORS', () => {
  it('should have colors for all priority levels', () => {
    expect(OVERDUE_PRIORITY_COLORS.critical).toBeDefined()
    expect(OVERDUE_PRIORITY_COLORS.high).toBeDefined()
    expect(OVERDUE_PRIORITY_COLORS.medium).toBeDefined()
    expect(OVERDUE_PRIORITY_COLORS.low).toBeDefined()
  })

  it('should have bg, text, and border properties', () => {
    const priorities = ['critical', 'high', 'medium', 'low'] as const
    priorities.forEach(priority => {
      expect(OVERDUE_PRIORITY_COLORS[priority]).toHaveProperty('bg')
      expect(OVERDUE_PRIORITY_COLORS[priority]).toHaveProperty('text')
      expect(OVERDUE_PRIORITY_COLORS[priority]).toHaveProperty('border')
    })
  })

  it('should use appropriate color classes', () => {
    expect(OVERDUE_PRIORITY_COLORS.critical.bg).toContain('red')
    expect(OVERDUE_PRIORITY_COLORS.high.bg).toContain('orange')
    expect(OVERDUE_PRIORITY_COLORS.medium.bg).toContain('yellow')
    expect(OVERDUE_PRIORITY_COLORS.low.bg).toContain('gray')
  })
})

describe('OVERDUE_TYPE_COLORS', () => {
  it('should have colors for all item types', () => {
    expect(OVERDUE_TYPE_COLORS.rfi).toBeDefined()
    expect(OVERDUE_TYPE_COLORS.submittal).toBeDefined()
    expect(OVERDUE_TYPE_COLORS.punch_item).toBeDefined()
    expect(OVERDUE_TYPE_COLORS.task).toBeDefined()
    expect(OVERDUE_TYPE_COLORS.inspection).toBeDefined()
  })

  it('should have bg and text properties', () => {
    const types = ['rfi', 'submittal', 'punch_item', 'task', 'inspection'] as const
    types.forEach(type => {
      expect(OVERDUE_TYPE_COLORS[type]).toHaveProperty('bg')
      expect(OVERDUE_TYPE_COLORS[type]).toHaveProperty('text')
    })
  })
})

// =============================================
// Type Tests
// =============================================

describe('OverdueItem type', () => {
  it('should accept valid overdue item', () => {
    const item: OverdueItem = {
      id: 'item-1',
      type: 'rfi',
      title: 'Test RFI',
      number: 'RFI-001',
      project_id: 'project-1',
      project_name: 'Test Project',
      due_date: '2024-01-01',
      days_overdue: 10,
      priority: 'high',
      assigned_to: 'user-123',
      ball_in_court: 'Architect',
      status: 'open',
      url: '/rfis-v2?id=item-1',
    }

    expect(item.type).toBe('rfi')
    expect(item.days_overdue).toBe(10)
  })

  it('should accept all type values', () => {
    const types: OverdueItem['type'][] = ['rfi', 'submittal', 'punch_item', 'task', 'inspection']
    expect(types).toHaveLength(5)
  })
})

describe('OverdueStats type', () => {
  it('should accept valid stats', () => {
    const stats: OverdueStats = {
      total: 10,
      critical: 2,
      high: 3,
      medium: 3,
      low: 2,
      by_type: {
        rfis: 4,
        submittals: 3,
        punch_items: 3,
        tasks: 0,
        inspections: 0,
      },
    }

    expect(stats.total).toBe(10)
    expect(stats.by_type.rfis).toBe(4)
  })
})

// =============================================
// Query Hook Tests
// =============================================

describe('useOverdueRFIs', () => {
  it('should fetch overdue RFIs', async () => {
    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(result.current.data).toHaveLength(1)
    expect(mockFromFn).toHaveBeenCalledWith('rfis')
  })

  it('should filter by project when projectId provided', async () => {
    const { result } = renderHook(() => useOverdueRFIs('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('rfis')
  })

  it('should transform RFI data to OverdueItem format', async () => {
    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data?.[0]
    expect(item).toMatchObject({
      id: 'rfi-1',
      type: 'rfi',
      title: 'Clarification on Steel Details',
      number: 'RFI-001',
      project_name: 'Test Project',
    })
  })

  it('should handle missing table gracefully', async () => {
    mockFromFn.mockReturnValue(createChainMock(null, { code: '42P01' }))

    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

describe('useOverdueSubmittals', () => {
  it('should fetch overdue submittals', async () => {
    const { result } = renderHook(() => useOverdueSubmittals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(mockFromFn).toHaveBeenCalledWith('submittals')
  })

  it('should transform submittal data correctly', async () => {
    const { result } = renderHook(() => useOverdueSubmittals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data?.[0]
    expect(item).toMatchObject({
      id: 'sub-1',
      type: 'submittal',
      title: 'Shop Drawings - Structural Steel',
    })
  })
})

describe('useOverduePunchItems', () => {
  it('should fetch overdue punch items', async () => {
    const { result } = renderHook(() => useOverduePunchItems(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(mockFromFn).toHaveBeenCalledWith('punch_list_items')
  })

  it('should transform punch item data correctly', async () => {
    const { result } = renderHook(() => useOverduePunchItems(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data?.[0]
    expect(item).toMatchObject({
      id: 'punch-1',
      type: 'punch_item',
      title: 'Touch up paint in lobby',
    })
  })
})

describe('useAllOverdueItems', () => {
  it('should combine all overdue items', async () => {
    const { result } = renderHook(() => useAllOverdueItems(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toBeDefined()
    expect(result.current.items.length).toBeGreaterThanOrEqual(3)
  })

  it('should calculate stats', async () => {
    const { result } = renderHook(() => useAllOverdueItems(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.stats).toBeDefined()
    expect(result.current.stats.total).toBeGreaterThanOrEqual(3)
    expect(result.current.stats.by_type.rfis).toBe(1)
    expect(result.current.stats.by_type.submittals).toBe(1)
    expect(result.current.stats.by_type.punch_items).toBe(1)
  })

  it('should sort items by days overdue', async () => {
    const { result } = renderHook(() => useAllOverdueItems(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const items = result.current.items
    for (let i = 1; i < items.length; i++) {
      // Items should be sorted with most overdue first
      expect(items[i - 1].days_overdue).toBeGreaterThanOrEqual(items[i].days_overdue)
    }
  })
})

describe('useItemsDueSoon', () => {
  it('should fetch items due within specified days', async () => {
    // Setup mock for due soon items
    const futureDateRFI = new Date()
    futureDateRFI.setDate(futureDateRFI.getDate() + 3)

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'rfis') {
        return createChainMock([{
          id: 'rfi-2',
          rfi_number: 2,
          subject: 'RFI Due Soon',
          project_id: 'project-1',
          date_required: futureDateRFI.toISOString().split('T')[0],
          priority: 'medium',
          status: 'open',
        }])
      }
      if (table === 'submittals') {
        return createChainMock([])
      }
      return createChainMock([])
    })

    const { result } = renderHook(() => useItemsDueSoon(undefined, 7), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
  })

  it('should default to 7 days ahead', async () => {
    mockFromFn.mockReturnValue(createChainMock([]))

    const { result } = renderHook(() => useItemsDueSoon(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Query should have been called
    expect(mockFromFn).toHaveBeenCalled()
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  it('should handle database errors', async () => {
    mockFromFn.mockReturnValue(createChainMock(null, { message: 'Database error' }))

    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// =============================================
// Days Overdue Calculation Tests
// =============================================

describe('Days Overdue Calculation', () => {
  it('should calculate positive days for past due items', async () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'rfis') {
        return createChainMock([{
          ...mockOverdueRFI,
          date_required: tenDaysAgo.toISOString().split('T')[0],
        }])
      }
      return createChainMock([])
    })

    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data?.[0]
    expect(item?.days_overdue).toBeGreaterThanOrEqual(9)
    expect(item?.days_overdue).toBeLessThanOrEqual(11)
  })
})

// =============================================
// Priority Calculation Tests
// =============================================

describe('Priority Determination', () => {
  it('should set critical priority for items overdue > 14 days', async () => {
    const twentyDaysAgo = new Date()
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20)

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'rfis') {
        return createChainMock([{
          ...mockOverdueRFI,
          date_required: twentyDaysAgo.toISOString().split('T')[0],
          priority: 'medium', // Original priority doesn't matter if very overdue
        }])
      }
      return createChainMock([])
    })

    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data?.[0]
    expect(item?.priority).toBe('critical')
  })

  it('should preserve critical priority from source', async () => {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'rfis') {
        return createChainMock([{
          ...mockOverdueRFI,
          date_required: fiveDaysAgo.toISOString().split('T')[0],
          priority: 'critical', // Source says critical
        }])
      }
      return createChainMock([])
    })

    const { result } = renderHook(() => useOverdueRFIs(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data?.[0]
    expect(item?.priority).toBe('critical')
  })
})
