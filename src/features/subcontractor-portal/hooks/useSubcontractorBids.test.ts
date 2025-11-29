/**
 * Subcontractor Bids Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useSubcontractorBids,
  usePendingBids,
  useSubcontractorBid,
  useSubmitBid,
  useDeclineBid,
  bidKeys,
} from './useSubcontractorBids'
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
    getPendingBids: vi.fn().mockResolvedValue([]),
    getBid: vi.fn().mockResolvedValue(null),
    submitBid: vi.fn().mockResolvedValue({}),
    declineBid: vi.fn().mockResolvedValue({}),
  },
}))

// Mock toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('bidKeys', () => {
  it('should generate correct query keys', () => {
    expect(bidKeys.all).toEqual(['subcontractor', 'bids'])
    expect(bidKeys.list()).toEqual(['subcontractor', 'bids', 'list', undefined])
    expect(bidKeys.list({ status: 'pending' })).toEqual([
      'subcontractor',
      'bids',
      'list',
      { status: 'pending' },
    ])
    expect(bidKeys.pending()).toEqual(['subcontractor', 'bids', 'pending'])
    expect(bidKeys.detail('bid-1')).toEqual(['subcontractor', 'bids', 'detail', 'bid-1'])
  })
})

describe('useSubcontractorBids', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch bids without filter', () => {
    const { result } = renderHook(() => useSubcontractorBids(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })

  it('should fetch bids with status filter', () => {
    const { result } = renderHook(
      () => useSubcontractorBids({ status: 'pending' }),
      { wrapper: createWrapper() }
    )

    expect(result.current).toBeDefined()
  })
})

describe('usePendingBids', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use correct filter', () => {
    const { result } = renderHook(() => usePendingBids(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})

describe('useSubcontractorBid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be disabled when bidId is empty', () => {
    const { result } = renderHook(() => useSubcontractorBid(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.isPending).toBe(true)
  })

  it('should fetch when bidId is provided', () => {
    const { result } = renderHook(() => useSubcontractorBid('bid-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})

describe('useSubmitBid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useSubmitBid(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })
})

describe('useDeclineBid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useDeclineBid(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })
})
