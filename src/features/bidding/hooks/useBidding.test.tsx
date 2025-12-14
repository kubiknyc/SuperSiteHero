/**
 * Bidding Hooks Tests
 * Tests for bidding React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import {
  bidPackageKeys,
  useBidPackages,
  useBidPackage,
  useBidPackageItems,
  useBidInvitations,
  useBidQuestions,
  useBidAddenda,
  useBidSubmissions,
  useBidSubmission,
  useCreateBidPackage,
  useUpdateBidPackage,
  usePublishBidPackage,
  useDeleteBidPackage,
  useSendBidInvitation,
  useAnswerBidQuestion,
  useCreateBidSubmission,
  useUpdateBidSubmissionStatus,
  useCreateAddendum,
  useAwardBid,
} from './useBidding'

// Mock user profile
const mockUserProfile = {
  id: 'user-1',
  company_id: 'company-1',
  email: 'test@example.com',
}

// Mock useAuth
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Create mock Supabase chain helpers
const mockSupabaseFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  },
}))

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockBidPackage = {
  id: 'pkg-1',
  project_id: 'project-1',
  company_id: 'company-1',
  package_number: 'BP-001',
  name: 'Electrical Package',
  description: 'Complete electrical work',
  division: '26',
  estimated_value: 150000,
  bid_due_date: '2024-02-15',
  bid_due_time: '14:00',
  bid_type: 'lump_sum',
  is_public: false,
  status: 'draft',
  requires_prequalification: false,
  requires_bid_bond: true,
  bid_bond_percent: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  project: { id: 'project-1', name: 'Office Building', project_number: 'P-001' },
}

const mockBidItem = {
  id: 'item-1',
  bid_package_id: 'pkg-1',
  item_number: '1',
  description: 'Main electrical panel',
  unit: 'ea',
  quantity: 1,
  is_required: true,
  is_alternate: false,
  sort_order: 1,
  created_at: '2024-01-01T00:00:00Z',
}

const mockInvitation = {
  id: 'inv-1',
  bid_package_id: 'pkg-1',
  subcontractor_id: 'sub-1',
  company_name: 'ABC Electric',
  contact_name: 'John Doe',
  contact_email: 'john@abcelectric.com',
  invited_at: '2024-01-10T00:00:00Z',
  invitation_method: 'email',
  response_status: 'pending',
  prequalification_status: 'not_required',
}

const mockQuestion = {
  id: 'q-1',
  bid_package_id: 'pkg-1',
  question_number: 1,
  question: 'What is the panel amperage?',
  submitted_at: '2024-01-11T00:00:00Z',
  status: 'pending',
  is_published: false,
}

const mockAddendum = {
  id: 'add-1',
  bid_package_id: 'pkg-1',
  addendum_number: 1,
  title: 'Clarification 1',
  issue_date: '2024-01-12',
  extends_bid_date: false,
}

const mockSubmission = {
  id: 'sub-1',
  bid_package_id: 'pkg-1',
  invitation_id: 'inv-1',
  bidder_company_name: 'ABC Electric',
  base_bid_amount: 145000,
  alternates_total: 5000,
  total_bid_amount: 150000,
  submitted_at: '2024-02-14T10:00:00Z',
  submission_method: 'portal',
  is_late: false,
  status: 'received',
  is_awarded: false,
  created_at: '2024-02-14T10:00:00Z',
  updated_at: '2024-02-14T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// QUERY KEYS TESTS
// ============================================================================

describe('bidPackageKeys', () => {
  it('should have all key as base', () => {
    expect(bidPackageKeys.all).toEqual(['bidPackages'])
  })

  it('should generate lists key', () => {
    expect(bidPackageKeys.lists()).toEqual(['bidPackages', 'list'])
  })

  it('should generate list with filters key', () => {
    const filters = { projectId: 'project-1', status: 'draft' as const }
    expect(bidPackageKeys.list(filters)).toEqual(['bidPackages', 'list', filters])
  })

  it('should generate detail key', () => {
    expect(bidPackageKeys.detail('pkg-1')).toEqual(['bidPackages', 'detail', 'pkg-1'])
  })

  it('should generate stats key', () => {
    expect(bidPackageKeys.stats('pkg-1')).toEqual(['bidPackages', 'stats', 'pkg-1'])
  })

  it('should generate items key', () => {
    expect(bidPackageKeys.items('pkg-1')).toEqual(['bidPackages', 'items', 'pkg-1'])
  })

  it('should generate invitations key', () => {
    expect(bidPackageKeys.invitations('pkg-1')).toEqual(['bidPackages', 'invitations', 'pkg-1'])
  })

  it('should generate questions key', () => {
    expect(bidPackageKeys.questions('pkg-1')).toEqual(['bidPackages', 'questions', 'pkg-1'])
  })

  it('should generate addenda key', () => {
    expect(bidPackageKeys.addenda('pkg-1')).toEqual(['bidPackages', 'addenda', 'pkg-1'])
  })

  it('should generate submissions key', () => {
    expect(bidPackageKeys.submissions('pkg-1')).toEqual(['bidPackages', 'submissions', 'pkg-1'])
  })

  it('should generate comparison key', () => {
    expect(bidPackageKeys.comparison('pkg-1')).toEqual(['bidPackages', 'comparison', 'pkg-1'])
  })
})

// ============================================================================
// BID PACKAGE QUERY HOOKS TESTS
// ============================================================================

describe('Bid Package Query Hooks', () => {
  describe('useBidPackages', () => {
    it('should fetch bid packages with filters', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockBidPackage], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidPackages({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('bid_packages')
    })
  })

  describe('useBidPackage', () => {
    it('should fetch single bid package', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockBidPackage, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidPackage('pkg-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useBidPackage(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useBidPackageItems', () => {
    it('should fetch bid package items', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockBidItem], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidPackageItems('pkg-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// BID INVITATION HOOKS TESTS
// ============================================================================

describe('Bid Invitation Hooks', () => {
  describe('useBidInvitations', () => {
    it('should fetch invitations', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockInvitation], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidInvitations('pkg-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockSupabaseFrom).toHaveBeenCalledWith('bid_invitations')
    })
  })

  describe('useSendBidInvitation', () => {
    it('should send invitation', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockInvitation, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useSendBidInvitation(), {
        wrapper: createWrapper(),
      })

      const dto = {
        bid_package_id: 'pkg-1',
        contact_email: 'contractor@example.com',
        company_name: 'Test Contractor',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// BID QUESTION HOOKS TESTS
// ============================================================================

describe('Bid Question Hooks', () => {
  describe('useBidQuestions', () => {
    it('should fetch questions', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockQuestion], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidQuestions('pkg-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useAnswerBidQuestion', () => {
    it('should answer question', async () => {
      const answeredQuestion = { ...mockQuestion, status: 'answered', answer: 'Panel is 200A' }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: answeredQuestion, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useAnswerBidQuestion(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        questionId: 'q-1',
        dto: { answer: 'Panel is 200A', is_published: true },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// BID ADDENDA HOOKS TESTS
// ============================================================================

describe('Bid Addenda Hooks', () => {
  describe('useBidAddenda', () => {
    it('should fetch addenda', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockAddendum], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidAddenda('pkg-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useCreateAddendum', () => {
    it('should create addendum', async () => {
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAddendum, error: null }),
      }

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'bid_addenda') {
          return mockSelectChain.select().eq ? mockSelectChain : mockInsertChain
        }
        return mockInsertChain
      })

      // For the first call (getting existing addenda count)
      mockSupabaseFrom.mockReturnValueOnce(mockSelectChain)
      // For the second call (inserting new addendum)
      mockSupabaseFrom.mockReturnValueOnce(mockInsertChain)

      const { result } = renderHook(() => useCreateAddendum(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        bid_package_id: 'pkg-1',
        title: 'Clarification 1',
        description: 'Updated electrical specs',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// BID SUBMISSION HOOKS TESTS
// ============================================================================

describe('Bid Submission Hooks', () => {
  describe('useBidSubmissions', () => {
    it('should fetch submissions', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockSubmission], error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidSubmissions('pkg-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useBidSubmission', () => {
    it('should fetch single submission', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useBidSubmission('sub-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useCreateBidSubmission', () => {
    it('should create submission', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCreateBidSubmission(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        bid_package_id: 'pkg-1',
        bidder_company_name: 'ABC Electric',
        base_bid_amount: 145000,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useUpdateBidSubmissionStatus', () => {
    it('should update submission status', async () => {
      const updatedSubmission = { ...mockSubmission, status: 'qualified' }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedSubmission, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useUpdateBidSubmissionStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'sub-1', status: 'qualified' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle disqualification with reason', async () => {
      const disqualifiedSubmission = {
        ...mockSubmission,
        status: 'disqualified',
        disqualification_reason: 'Missing bid bond',
      }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: disqualifiedSubmission, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useUpdateBidSubmissionStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'sub-1', status: 'disqualified', reason: 'Missing bid bond' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// BID PACKAGE MUTATION HOOKS TESTS
// ============================================================================

describe('Bid Package Mutation Hooks', () => {
  describe('useCreateBidPackage', () => {
    it('should create bid package', async () => {
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockBidPackage, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useCreateBidPackage(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        project_id: 'project-1',
        package_number: 'BP-001',
        name: 'Electrical Package',
        bid_due_date: '2024-02-15',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useUpdateBidPackage', () => {
    it('should update bid package', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockBidPackage, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useUpdateBidPackage(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'pkg-1', dto: { name: 'Updated Electrical Package' } })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('usePublishBidPackage', () => {
    it('should publish bid package', async () => {
      const publishedPackage = { ...mockBidPackage, status: 'published' }
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: publishedPackage, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => usePublishBidPackage(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('pkg-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useDeleteBidPackage', () => {
    it('should soft delete bid package', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      const { result } = renderHook(() => useDeleteBidPackage(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('pkg-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useAwardBid', () => {
    it('should award bid', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockUpdateChain)

      const { result } = renderHook(() => useAwardBid(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        packageId: 'pkg-1',
        dto: {
          submission_id: 'sub-1',
          award_amount: 145000,
          award_notes: 'Best value',
        },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  it('should handle fetch error', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
    }
    mockSupabaseFrom.mockReturnValue(mockChain)

    const { result } = renderHook(() => useBidPackages(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
