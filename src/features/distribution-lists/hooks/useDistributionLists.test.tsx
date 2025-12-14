/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockFrom = vi.fn()
const mockRpc = vi.fn()

const mockUser = { id: 'user-1', email: 'test@example.com' }
const mockUserProfile = { id: 'profile-1', company_id: 'company-1' }
const mockUseAuth = vi.fn(() => ({ user: mockUser, userProfile: mockUserProfile }))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  distributionListKeys,
  useDistributionLists,
  useProjectDistributionLists,
  useDistributionList,
  useDistributionListMembers,
  useExpandDistribution,
  useCreateDistributionList,
  useUpdateDistributionList,
  useDeleteDistributionList,
  useAddDistributionListMember,
  useUpdateDistributionListMember,
  useRemoveDistributionListMember,
  useDefaultDistributionList,
} from './useDistributionLists'

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

// Helper to create chainable mock
function createChainMock(data: any = [], error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: any) => resolve({ data, error }),
  }
  return chain
}

// Sample test data
const mockDistributionList = {
  id: 'list-1',
  company_id: 'company-1',
  project_id: null,
  name: 'Project Team',
  description: 'Default project team distribution list',
  list_type: 'general',
  is_default: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  created_by: 'user-1',
}

const mockListWithCount = {
  ...mockDistributionList,
  members: [{ count: 5 }],
}

const mockListMember = {
  id: 'member-1',
  list_id: 'list-1',
  user_id: 'user-2',
  external_email: null,
  external_name: null,
  external_company: null,
  member_role: 'to',
  notify_email: true,
  notify_in_app: true,
  created_at: '2025-01-01T00:00:00Z',
  added_by: 'user-1',
}

const mockListMemberWithUser = {
  ...mockListMember,
  user: {
    id: 'user-2',
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    avatar_url: null,
  },
}

const mockExpandedRecipient = {
  user_id: 'user-2',
  email: 'jane@example.com',
  name: 'Jane Doe',
  source: 'list-1',
}

describe('distributionListKeys', () => {
  it('should generate correct query keys', () => {
    expect(distributionListKeys.all).toEqual(['distribution-lists'])
    expect(distributionListKeys.lists()).toEqual(['distribution-lists', 'list', undefined])
    expect(distributionListKeys.lists({ isActive: true })).toEqual([
      'distribution-lists',
      'list',
      { isActive: true },
    ])
    expect(distributionListKeys.list('list-1')).toEqual(['distribution-lists', 'detail', 'list-1'])
    expect(distributionListKeys.members('list-1')).toEqual(['distribution-lists', 'members', 'list-1'])
    expect(distributionListKeys.forProject('project-1', 'daily_report')).toEqual([
      'distribution-lists',
      'project',
      'project-1',
      'daily_report',
    ])
    expect(distributionListKeys.expand(['list-1'], ['user-2'])).toEqual([
      'distribution-lists',
      'expand',
      ['list-1'],
      ['user-2'],
    ])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useDistributionLists', () => {
    it('should fetch distribution lists for company', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useDistributionLists(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      // The hook keeps original members array and adds member_count
      expect(result.current.data).toEqual([{ ...mockListWithCount, member_count: 5 }])
      expect(mockFrom).toHaveBeenCalledWith('distribution_lists')
    })

    it('should fetch with isActive filter', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      renderHook(() => useDistributionLists({ isActive: false }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(chain.eq).toHaveBeenCalledWith('is_active', false))
    })

    it('should fetch with projectId filter', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      renderHook(() => useDistributionLists({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(chain.or).toHaveBeenCalled())
    })

    it('should fetch with listType filter', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      renderHook(() => useDistributionLists({ listType: 'daily_report' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(chain.eq).toHaveBeenCalledWith('list_type', 'daily_report'))
    })

    it('should fetch with search filter', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      renderHook(() => useDistributionLists({ search: 'team' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(chain.ilike).toHaveBeenCalledWith('name', '%team%'))
    })

    it('should not fetch when user not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null, userProfile: null })

      const { result } = renderHook(() => useDistributionLists(), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useProjectDistributionLists', () => {
    it('should fetch distribution lists for a project', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useProjectDistributionLists('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFrom).toHaveBeenCalledWith('distribution_lists')
    })

    it('should filter by list type', async () => {
      const chain = createChainMock([mockListWithCount])
      mockFrom.mockReturnValue(chain)

      renderHook(() => useProjectDistributionLists('project-1', 'daily_report'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(chain.or).toHaveBeenCalled())
    })
  })

  describe('useDistributionList', () => {
    it('should fetch a single distribution list with members', async () => {
      const listWithMembers = {
        ...mockDistributionList,
        members: [mockListMemberWithUser],
        created_by_user: { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
        project: null,
      }
      const chain = createChainMock(listWithMembers)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useDistributionList('list-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(chain.single).toHaveBeenCalled()
    })

    it('should not fetch when listId is empty', () => {
      const { result } = renderHook(() => useDistributionList(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useDistributionListMembers', () => {
    it('should fetch members of a distribution list', async () => {
      const chain = createChainMock([mockListMemberWithUser])
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useDistributionListMembers('list-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFrom).toHaveBeenCalledWith('distribution_list_members')
    })
  })

  describe('useExpandDistribution', () => {
    it('should expand distribution lists to recipients', async () => {
      mockRpc.mockResolvedValue({ data: [mockExpandedRecipient], error: null })

      const { result } = renderHook(() => useExpandDistribution(['list-1'], ['user-2']), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockRpc).toHaveBeenCalledWith('expand_distribution', {
        p_list_ids: ['list-1'],
        p_additional_user_ids: ['user-2'],
      })
    })

    it('should not fetch when no list ids or user ids', () => {
      const { result } = renderHook(() => useExpandDistribution([], []), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useDefaultDistributionList', () => {
    it('should fetch project-specific default list', async () => {
      const chain = createChainMock(mockDistributionList)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useDefaultDistributionList('project-1', 'daily_report'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(chain.maybeSingle).toHaveBeenCalled()
    })

    it('should fallback to company-wide default if no project default', async () => {
      // First call returns null (no project default)
      const chain = createChainMock(null)
      mockFrom.mockReturnValue(chain)

      renderHook(() => useDefaultDistributionList('project-1', 'daily_report'), {
        wrapper: createWrapper(),
      })

      // The hook should make a second query for company-wide default
      await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useCreateDistributionList', () => {
    it('should create a distribution list', async () => {
      const chain = createChainMock(mockDistributionList)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useCreateDistributionList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: 'New List',
        list_type: 'general',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFrom).toHaveBeenCalledWith('distribution_lists')
      expect(chain.insert).toHaveBeenCalled()
    })

    it('should create list with members', async () => {
      const chain = createChainMock(mockDistributionList)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useCreateDistributionList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        name: 'New List',
        list_type: 'general',
        members: [{ user_id: 'user-2', member_role: 'to' }],
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should throw error when user not authenticated', async () => {
      mockUseAuth.mockReturnValue({ user: null, userProfile: null })

      const { result } = renderHook(() => useCreateDistributionList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Test List', list_type: 'general' })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('No company context')
    })
  })

  describe('useUpdateDistributionList', () => {
    it('should update a distribution list', async () => {
      const updatedList = { ...mockDistributionList, name: 'Updated Name' }
      const chain = createChainMock(updatedList)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useUpdateDistributionList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'list-1',
        name: 'Updated Name',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(chain.update).toHaveBeenCalled()
    })
  })

  describe('useDeleteDistributionList', () => {
    it('should delete a distribution list', async () => {
      const chain = createChainMock(null)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useDeleteDistributionList(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('list-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFrom).toHaveBeenCalledWith('distribution_lists')
      expect(chain.delete).toHaveBeenCalled()
    })
  })

  describe('useAddDistributionListMember', () => {
    it('should add a member to a distribution list', async () => {
      const chain = createChainMock(mockListMember)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useAddDistributionListMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        list_id: 'list-1',
        user_id: 'user-3',
        member_role: 'cc',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFrom).toHaveBeenCalledWith('distribution_list_members')
      expect(chain.insert).toHaveBeenCalled()
    })

    it('should add external member', async () => {
      const externalMember = {
        ...mockListMember,
        user_id: null,
        external_email: 'external@example.com',
        external_name: 'External Person',
        external_company: 'External Co',
      }
      const chain = createChainMock(externalMember)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useAddDistributionListMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        list_id: 'list-1',
        external_email: 'external@example.com',
        external_name: 'External Person',
        external_company: 'External Co',
        member_role: 'cc',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useUpdateDistributionListMember', () => {
    it('should update a distribution list member', async () => {
      const updatedMember = { ...mockListMember, member_role: 'cc' }
      const chain = createChainMock(updatedMember)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useUpdateDistributionListMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'member-1',
        listId: 'list-1',
        member_role: 'cc',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(chain.update).toHaveBeenCalled()
    })

    it('should update notification preferences', async () => {
      const updatedMember = { ...mockListMember, notify_email: false }
      const chain = createChainMock(updatedMember)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useUpdateDistributionListMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'member-1',
        listId: 'list-1',
        notify_email: false,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useRemoveDistributionListMember', () => {
    it('should remove a member from a distribution list', async () => {
      const chain = createChainMock(null)
      mockFrom.mockReturnValue(chain)

      const { result } = renderHook(() => useRemoveDistributionListMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        memberId: 'member-1',
        listId: 'list-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFrom).toHaveBeenCalledWith('distribution_list_members')
      expect(chain.delete).toHaveBeenCalled()
    })
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  it('should handle database error in useDistributionLists', async () => {
    const chain = createChainMock(null, new Error('Database error'))
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() => useDistributionLists(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should handle database error in useDistributionList', async () => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error('Not found')),
    }
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() => useDistributionList('invalid-id'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('should handle RPC error in useExpandDistribution', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })

    const { result } = renderHook(() => useExpandDistribution(['list-1'], []), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
