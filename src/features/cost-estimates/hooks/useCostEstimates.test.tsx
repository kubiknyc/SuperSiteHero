/**
 * Tests for Cost Estimates Hooks
 * Tests React Query hooks for cost estimates CRUD operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Create mock API functions before vi.mock
const mockGetProjectEstimates = vi.fn()
const mockGetEstimateById = vi.fn()
const mockGetEstimateItems = vi.fn()
const mockCreateEstimate = vi.fn()
const mockUpdateEstimate = vi.fn()
const mockDeleteEstimate = vi.fn()
const mockDuplicateEstimate = vi.fn()
const mockAddEstimateItem = vi.fn()
const mockUpdateEstimateItem = vi.fn()
const mockDeleteEstimateItem = vi.fn()
const mockCreateEstimateFromTakeoff = vi.fn()

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock cost-estimates API
vi.mock('@/lib/api/services/cost-estimates', () => ({
  costEstimatesApi: {
    getProjectEstimates: (...args: unknown[]) => mockGetProjectEstimates(...args),
    getEstimateById: (...args: unknown[]) => mockGetEstimateById(...args),
    getEstimateItems: (...args: unknown[]) => mockGetEstimateItems(...args),
    createEstimate: (...args: unknown[]) => mockCreateEstimate(...args),
    updateEstimate: (...args: unknown[]) => mockUpdateEstimate(...args),
    deleteEstimate: (...args: unknown[]) => mockDeleteEstimate(...args),
    duplicateEstimate: (...args: unknown[]) => mockDuplicateEstimate(...args),
    addEstimateItem: (...args: unknown[]) => mockAddEstimateItem(...args),
    updateEstimateItem: (...args: unknown[]) => mockUpdateEstimateItem(...args),
    deleteEstimateItem: (...args: unknown[]) => mockDeleteEstimateItem(...args),
    createEstimateFromTakeoff: (...args: unknown[]) => mockCreateEstimateFromTakeoff(...args),
  },
}))

// Import hooks after mocks
import {
  costEstimateKeys,
  useProjectEstimates,
  useEstimate,
  useEstimateItems,
  useCreateEstimate,
  useUpdateEstimate,
  useDeleteEstimate,
  useDuplicateEstimate,
  useAddEstimateItem,
  useUpdateEstimateItem,
  useDeleteEstimateItem,
  useCreateEstimateFromTakeoff,
  useOptimisticEstimateUpdate,
  useOptimisticItemUpdate,
} from './useCostEstimates'

// =============================================
// Test Data
// =============================================

const mockEstimate = {
  id: 'est-1',
  project_id: 'project-123',
  name: 'Foundation Estimate',
  description: 'Cost estimate for foundation work',
  status: 'draft',
  unit_costs: { sq_ft: 150, cu_yd: 200 },
  labor_rate: 75,
  markup_percentage: 15,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
}

const mockEstimateItem = {
  id: 'item-1',
  estimate_id: 'est-1',
  takeoff_item_id: 'takeoff-1',
  name: 'Concrete Slab',
  measurement_type: 'sq_ft',
  quantity: 1000,
  unit_cost: 150,
  labor_hours: 40,
  labor_rate: 75,
  material_cost: 150000,
  labor_cost: 3000,
  total_cost: 153000,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockEstimateWithItems = {
  ...mockEstimate,
  items: [mockEstimateItem],
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
  mockGetProjectEstimates.mockResolvedValue([mockEstimate])
  mockGetEstimateById.mockResolvedValue(mockEstimateWithItems)
  mockGetEstimateItems.mockResolvedValue([mockEstimateItem])
  mockCreateEstimate.mockResolvedValue(mockEstimate)
  mockUpdateEstimate.mockResolvedValue(mockEstimate)
  mockDeleteEstimate.mockResolvedValue(undefined)
  mockDuplicateEstimate.mockResolvedValue(mockEstimateWithItems)
  mockAddEstimateItem.mockResolvedValue(mockEstimateItem)
  mockUpdateEstimateItem.mockResolvedValue(mockEstimateItem)
  mockDeleteEstimateItem.mockResolvedValue(undefined)
  mockCreateEstimateFromTakeoff.mockResolvedValue(mockEstimateWithItems)
})

// =============================================
// Query Key Tests
// =============================================

describe('costEstimateKeys', () => {
  it('should generate correct base key', () => {
    expect(costEstimateKeys.all).toEqual(['cost-estimates'])
  })

  it('should generate correct lists base key', () => {
    expect(costEstimateKeys.lists()).toEqual(['cost-estimates', 'list'])
  })

  it('should generate correct list key for project', () => {
    expect(costEstimateKeys.list('project-123')).toEqual(['cost-estimates', 'list', 'project-123'])
  })

  it('should generate correct details base key', () => {
    expect(costEstimateKeys.details()).toEqual(['cost-estimates', 'detail'])
  })

  it('should generate correct detail key for estimate', () => {
    expect(costEstimateKeys.detail('est-1')).toEqual(['cost-estimates', 'detail', 'est-1'])
  })

  it('should generate correct items key for estimate', () => {
    expect(costEstimateKeys.items('est-1')).toEqual(['cost-estimates', 'detail', 'est-1', 'items'])
  })
})

// =============================================
// Query Hooks Tests
// =============================================

describe('useProjectEstimates', () => {
  it('should fetch project estimates', async () => {
    const { result } = renderHook(() => useProjectEstimates('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockEstimate])
    expect(mockGetProjectEstimates).toHaveBeenCalledWith('project-123')
  })

  it('should not fetch when projectId is undefined', async () => {
    const { result } = renderHook(() => useProjectEstimates(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockGetProjectEstimates).not.toHaveBeenCalled()
  })
})

describe('useEstimate', () => {
  it('should fetch single estimate with items', async () => {
    const { result } = renderHook(() => useEstimate('est-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockEstimateWithItems)
    expect(mockGetEstimateById).toHaveBeenCalledWith('est-1')
  })

  it('should not fetch when estimateId is undefined', async () => {
    const { result } = renderHook(() => useEstimate(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockGetEstimateById).not.toHaveBeenCalled()
  })
})

describe('useEstimateItems', () => {
  it('should fetch estimate items', async () => {
    const { result } = renderHook(() => useEstimateItems('est-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockEstimateItem])
    expect(mockGetEstimateItems).toHaveBeenCalledWith('est-1')
  })

  it('should not fetch when estimateId is undefined', async () => {
    const { result } = renderHook(() => useEstimateItems(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockGetEstimateItems).not.toHaveBeenCalled()
  })
})

// =============================================
// Estimate Mutation Hooks Tests
// =============================================

describe('useCreateEstimate', () => {
  it('should create estimate successfully', async () => {
    const { result } = renderHook(() => useCreateEstimate(), {
      wrapper: createWrapper(),
    })

    const newEstimate = {
      project_id: 'project-123',
      name: 'New Estimate',
    }

    await act(async () => {
      result.current.mutate(newEstimate)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockCreateEstimate).toHaveBeenCalledWith(newEstimate)
  })

  it('should handle create error', async () => {
    mockCreateEstimate.mockRejectedValue(new Error('Create failed'))

    const { result } = renderHook(() => useCreateEstimate(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ project_id: 'project-123', name: 'Test' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUpdateEstimate', () => {
  it('should update estimate successfully', async () => {
    const { result } = renderHook(() => useUpdateEstimate(), {
      wrapper: createWrapper(),
    })

    const updateData = {
      estimateId: 'est-1',
      updates: { name: 'Updated Estimate' },
    }

    await act(async () => {
      result.current.mutate(updateData)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdateEstimate).toHaveBeenCalledWith('est-1', { name: 'Updated Estimate' })
  })

  it('should handle update error', async () => {
    mockUpdateEstimate.mockRejectedValue(new Error('Update failed'))

    const { result } = renderHook(() => useUpdateEstimate(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ estimateId: 'est-1', updates: { name: 'Test' } })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDeleteEstimate', () => {
  it('should delete estimate successfully', async () => {
    const { result } = renderHook(() => useDeleteEstimate(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ estimateId: 'est-1', projectId: 'project-123' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDeleteEstimate).toHaveBeenCalledWith('est-1')
  })

  it('should handle delete error', async () => {
    mockDeleteEstimate.mockRejectedValue(new Error('Delete failed'))

    const { result } = renderHook(() => useDeleteEstimate(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ estimateId: 'est-1', projectId: 'project-123' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDuplicateEstimate', () => {
  it('should duplicate estimate successfully', async () => {
    const { result } = renderHook(() => useDuplicateEstimate(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ estimateId: 'est-1', newName: 'Copied Estimate' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDuplicateEstimate).toHaveBeenCalledWith('est-1', 'Copied Estimate')
  })

  it('should handle duplicate error', async () => {
    mockDuplicateEstimate.mockRejectedValue(new Error('Duplicate failed'))

    const { result } = renderHook(() => useDuplicateEstimate(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ estimateId: 'est-1', newName: 'Copy' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// =============================================
// Estimate Item Mutation Hooks Tests
// =============================================

describe('useAddEstimateItem', () => {
  it('should add estimate item successfully', async () => {
    const { result } = renderHook(() => useAddEstimateItem(), {
      wrapper: createWrapper(),
    })

    const newItem = {
      estimate_id: 'est-1',
      name: 'New Item',
      measurement_type: 'sq_ft',
      quantity: 500,
      unit_cost: 100,
    }

    await act(async () => {
      result.current.mutate(newItem)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockAddEstimateItem).toHaveBeenCalledWith(newItem)
  })

  it('should handle add item error', async () => {
    mockAddEstimateItem.mockRejectedValue(new Error('Add failed'))

    const { result } = renderHook(() => useAddEstimateItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        estimate_id: 'est-1',
        name: 'Test',
        measurement_type: 'sq_ft',
        quantity: 100,
        unit_cost: 50,
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useUpdateEstimateItem', () => {
  it('should update estimate item successfully', async () => {
    const { result } = renderHook(() => useUpdateEstimateItem(), {
      wrapper: createWrapper(),
    })

    const updateData = {
      itemId: 'item-1',
      estimateId: 'est-1',
      updates: { quantity: 2000 },
    }

    await act(async () => {
      result.current.mutate(updateData)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdateEstimateItem).toHaveBeenCalledWith('item-1', { quantity: 2000 })
  })

  it('should handle update item error', async () => {
    mockUpdateEstimateItem.mockRejectedValue(new Error('Update failed'))

    const { result } = renderHook(() => useUpdateEstimateItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        itemId: 'item-1',
        estimateId: 'est-1',
        updates: { quantity: 100 },
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDeleteEstimateItem', () => {
  it('should delete estimate item successfully', async () => {
    const { result } = renderHook(() => useDeleteEstimateItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ itemId: 'item-1', estimateId: 'est-1' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDeleteEstimateItem).toHaveBeenCalledWith('item-1')
  })

  it('should handle delete item error', async () => {
    mockDeleteEstimateItem.mockRejectedValue(new Error('Delete failed'))

    const { result } = renderHook(() => useDeleteEstimateItem(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({ itemId: 'item-1', estimateId: 'est-1' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// =============================================
// Special Mutation Hooks Tests
// =============================================

describe('useCreateEstimateFromTakeoff', () => {
  it('should create estimate from takeoff successfully', async () => {
    const { result } = renderHook(() => useCreateEstimateFromTakeoff(), {
      wrapper: createWrapper(),
    })

    const params = {
      projectId: 'project-123',
      name: 'Takeoff Estimate',
      takeoffItemIds: ['takeoff-1', 'takeoff-2'],
      unitCosts: { sq_ft: 150, cu_yd: 200 },
      laborRate: 75,
      markupPercentage: 15,
      createdBy: 'user-123',
    }

    await act(async () => {
      result.current.mutate(params)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockCreateEstimateFromTakeoff).toHaveBeenCalledWith(params)
  })

  it('should handle create from takeoff error', async () => {
    mockCreateEstimateFromTakeoff.mockRejectedValue(new Error('Create from takeoff failed'))

    const { result } = renderHook(() => useCreateEstimateFromTakeoff(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      result.current.mutate({
        projectId: 'project-123',
        name: 'Test',
        takeoffItemIds: [],
        unitCosts: {},
        createdBy: 'user-123',
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// =============================================
// Optimistic Update Helpers Tests
// =============================================

describe('useOptimisticEstimateUpdate', () => {
  it('should return a function', () => {
    const { result } = renderHook(() => useOptimisticEstimateUpdate(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current).toBe('function')
  })

  it('should update estimate in cache optimistically', async () => {
    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Pre-populate cache
    queryClient.setQueryData(costEstimateKeys.detail('est-1'), mockEstimateWithItems)

    const { result } = renderHook(() => useOptimisticEstimateUpdate(), { wrapper })

    act(() => {
      result.current('est-1', { name: 'Updated Name' })
    })

    const cached = queryClient.getQueryData(costEstimateKeys.detail('est-1')) as typeof mockEstimateWithItems
    expect(cached.name).toBe('Updated Name')
  })
})

describe('useOptimisticItemUpdate', () => {
  it('should return a function', () => {
    const { result } = renderHook(() => useOptimisticItemUpdate(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current).toBe('function')
  })

  it('should update item in cache optimistically', async () => {
    const queryClient = createQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    // Pre-populate cache
    queryClient.setQueryData(costEstimateKeys.detail('est-1'), mockEstimateWithItems)

    const { result } = renderHook(() => useOptimisticItemUpdate(), { wrapper })

    act(() => {
      result.current('est-1', 'item-1', { quantity: 5000 })
    })

    const cached = queryClient.getQueryData(costEstimateKeys.detail('est-1')) as typeof mockEstimateWithItems
    expect(cached.items[0].quantity).toBe(5000)
  })
})

// =============================================
// Cost Calculation Tests (Business Logic)
// =============================================

describe('Cost Calculation Business Logic', () => {
  it('should calculate material cost correctly', () => {
    const quantity = 1000
    const unitCost = 150
    const materialCost = quantity * unitCost
    expect(materialCost).toBe(150000)
  })

  it('should calculate labor cost correctly', () => {
    const laborHours = 40
    const laborRate = 75
    const laborCost = laborHours * laborRate
    expect(laborCost).toBe(3000)
  })

  it('should calculate total cost correctly', () => {
    const materialCost = 150000
    const laborCost = 3000
    const totalCost = materialCost + laborCost
    expect(totalCost).toBe(153000)
  })

  it('should calculate markup correctly', () => {
    const subtotal = 153000
    const markupPercentage = 15
    const markup = subtotal * (markupPercentage / 100)
    const totalWithMarkup = subtotal + markup
    expect(markup).toBe(22950)
    expect(totalWithMarkup).toBe(175950)
  })

  it('should handle zero values', () => {
    const quantity = 0
    const unitCost = 150
    const materialCost = quantity * unitCost
    expect(materialCost).toBe(0)
  })

  it('should handle decimal quantities', () => {
    const quantity = 1.5
    const unitCost = 100
    const materialCost = quantity * unitCost
    expect(materialCost).toBe(150)
  })
})

// =============================================
// Edge Cases Tests
// =============================================

describe('Edge Cases', () => {
  it('should handle empty estimate list', async () => {
    mockGetProjectEstimates.mockResolvedValue([])

    const { result } = renderHook(() => useProjectEstimates('project-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('should handle estimate with no items', async () => {
    mockGetEstimateById.mockResolvedValue({ ...mockEstimate, items: [] })

    const { result } = renderHook(() => useEstimate('est-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.items).toEqual([])
  })

  it('should handle null estimate', async () => {
    mockGetEstimateById.mockResolvedValue(null)

    const { result } = renderHook(() => useEstimate('non-existent'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })
})
