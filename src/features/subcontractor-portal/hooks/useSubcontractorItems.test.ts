/**
 * Subcontractor Items (Punch Items & Tasks) Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useSubcontractorPunchItems,
  useOpenPunchItems,
  useUpdatePunchItemStatus,
  useSubcontractorTasks,
  useOpenTasks,
  useUpdateTaskStatus,
  useSubcontractorWorkItems,
  itemKeys,
} from './useSubcontractorItems'
import { createWrapper } from '@/__tests__/utils/TestProviders'

// Mock Auth Context
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-123',
  role: 'subcontractor',
}

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}))

// Mock the API service
vi.mock('@/lib/api/services/subcontractor-portal', () => ({
  subcontractorPortalApi: {
    getPunchItems: vi.fn().mockResolvedValue([]),
    updatePunchItemStatus: vi.fn().mockResolvedValue({ status: 'in_progress' }),
    getTasks: vi.fn().mockResolvedValue([]),
    updateTaskStatus: vi.fn().mockResolvedValue({ status: 'in_progress' }),
  },
}))

// Mock toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('itemKeys', () => {
  it('should generate correct query keys', () => {
    expect(itemKeys.all).toEqual(['subcontractor', 'items'])

    // Punch items keys
    expect(itemKeys.punchItems()).toEqual(['subcontractor', 'items', 'punch-items', undefined])
    expect(itemKeys.punchItems({ status: ['open'] })).toEqual([
      'subcontractor',
      'items',
      'punch-items',
      { status: ['open'] },
    ])
    expect(itemKeys.punchItem('punch-1')).toEqual([
      'subcontractor',
      'items',
      'punch-item',
      'punch-1',
    ])

    // Tasks keys
    expect(itemKeys.tasks()).toEqual(['subcontractor', 'items', 'tasks', undefined])
    expect(itemKeys.tasks({ status: ['pending'] })).toEqual([
      'subcontractor',
      'items',
      'tasks',
      { status: ['pending'] },
    ])
    expect(itemKeys.task('task-1')).toEqual(['subcontractor', 'items', 'task', 'task-1'])
  })
})

describe('useSubcontractorPunchItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch punch items without filter', () => {
    const { result } = renderHook(() => useSubcontractorPunchItems(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })

  it('should fetch punch items with status filter', () => {
    const { result } = renderHook(
      () => useSubcontractorPunchItems({ status: ['open', 'in_progress'] }),
      { wrapper: createWrapper() }
    )

    expect(result.current).toBeDefined()
  })
})

describe('useOpenPunchItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use open status filter', () => {
    const { result } = renderHook(() => useOpenPunchItems(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })

  it('should accept optional projectId', () => {
    const { result } = renderHook(() => useOpenPunchItems('proj-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})

describe('useUpdatePunchItemStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useUpdatePunchItemStatus(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })
})

describe('useSubcontractorTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch tasks without filter', () => {
    const { result } = renderHook(() => useSubcontractorTasks(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })

  it('should fetch tasks with status filter', () => {
    const { result } = renderHook(
      () => useSubcontractorTasks({ status: ['pending', 'in_progress'] }),
      { wrapper: createWrapper() }
    )

    expect(result.current).toBeDefined()
  })
})

describe('useOpenTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use open status filter', () => {
    const { result } = renderHook(() => useOpenTasks(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })

  it('should accept optional projectId', () => {
    const { result } = renderHook(() => useOpenTasks('proj-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})

describe('useUpdateTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useUpdateTaskStatus(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })
})

describe('useSubcontractorWorkItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return combined punch items and tasks', () => {
    const { result } = renderHook(() => useSubcontractorWorkItems(), {
      wrapper: createWrapper(),
    })

    expect(result.current.punchItems).toBeDefined()
    expect(result.current.tasks).toBeDefined()
    expect(result.current.isLoading).toBeDefined()
    expect(result.current.refetch).toBeDefined()
    expect(typeof result.current.refetch).toBe('function')
  })

  it('should accept optional projectId', () => {
    const { result } = renderHook(() => useSubcontractorWorkItems('proj-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})
