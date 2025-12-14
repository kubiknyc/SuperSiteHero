/**
 * Tests for Transmittals Hooks
 * Tests for document transmittal management hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// =============================================
// Mock Setup
// =============================================

// Mock user profile
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-456',
      full_name: 'Test User',
      email: 'test@example.com',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

// Create mock functions that we can control
const mockRpcFn = vi.fn()
const mockFromFn = vi.fn()
const mockStorageFn = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFromFn(...args),
    rpc: (...args: unknown[]) => mockRpcFn(...args),
    storage: {
      from: () => ({
        upload: mockStorageFn,
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  },
}))

// Import hooks after mocks
import {
  transmittalKeys,
  useTransmittals,
  useTransmittal,
  useTransmittalItems,
  useTransmittalAttachments,
  useNextTransmittalNumber,
  useCreateTransmittal,
  useUpdateTransmittal,
  useSendTransmittal,
  useReceiveTransmittal,
  useAcknowledgeTransmittal,
  useVoidTransmittal,
  useDeleteTransmittal,
  useAddTransmittalItem,
  useUpdateTransmittalItem,
  useRemoveTransmittalItem,
  useTransmittalStats,
} from './useTransmittals'

// =============================================
// Test Data
// =============================================

const mockTransmittal = {
  id: 'trans-1',
  company_id: 'company-456',
  project_id: 'project-1',
  transmittal_number: 'T-001',
  date_sent: '2024-01-15',
  date_due: '2024-01-30',
  from_company: 'Acme Construction',
  from_contact: 'John Doe',
  from_email: 'john@acme.com',
  to_company: 'Client Corp',
  to_contact: 'Jane Smith',
  to_email: 'jane@client.com',
  subject: 'Shop Drawings for Review',
  remarks: 'Please review attached shop drawings',
  status: 'draft',
  response_required: true,
  created_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  project: { id: 'project-1', name: 'Test Project', project_number: 'P-001' },
  items: [{ count: 3 }],
}

const mockTransmittalItem = {
  id: 'item-1',
  transmittal_id: 'trans-1',
  item_number: 1,
  item_type: 'shop_drawing',
  description: 'Structural Steel Shop Drawings',
  copies: 2,
  format: 'pdf',
  action_required: 'for_approval',
  created_at: '2024-01-01T00:00:00Z',
}

const mockTransmittalAttachment = {
  id: 'attach-1',
  transmittal_id: 'trans-1',
  file_name: 'shop_drawings.pdf',
  file_path: 'transmittals/trans-1/shop_drawings.pdf',
  file_size: 1024000,
  file_type: 'application/pdf',
  uploaded_at: '2024-01-01T00:00:00Z',
}

// =============================================
// Test Setup
// =============================================

const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

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
      case 'transmittals':
        return createChainMock([{ ...mockTransmittal, item_count: 3 }])
      case 'transmittal_items':
        return createChainMock([mockTransmittalItem])
      case 'transmittal_attachments':
        return createChainMock([mockTransmittalAttachment])
      default:
        return createChainMock([])
    }
  })

  mockRpcFn.mockResolvedValue({ data: 'T-002', error: null })
  mockStorageFn.mockResolvedValue({ data: { path: 'test/path.pdf' }, error: null })
})

// =============================================
// Query Key Tests
// =============================================

describe('transmittalKeys', () => {
  it('should generate correct base key', () => {
    expect(transmittalKeys.all).toEqual(['transmittals'])
  })

  it('should generate correct lists key', () => {
    expect(transmittalKeys.lists()).toEqual(['transmittals', 'list', undefined])
    expect(transmittalKeys.lists({ projectId: 'p-1' })).toEqual([
      'transmittals',
      'list',
      { projectId: 'p-1' },
    ])
  })

  it('should generate correct list key (detail)', () => {
    expect(transmittalKeys.list('trans-1')).toEqual([
      'transmittals',
      'detail',
      'trans-1',
    ])
  })

  it('should generate correct items key', () => {
    expect(transmittalKeys.items('trans-1')).toEqual([
      'transmittals',
      'items',
      'trans-1',
    ])
  })

  it('should generate correct attachments key', () => {
    expect(transmittalKeys.attachments('trans-1')).toEqual([
      'transmittals',
      'attachments',
      'trans-1',
    ])
  })

  it('should generate correct next number key', () => {
    expect(transmittalKeys.nextNumber('project-1')).toEqual([
      'transmittals',
      'next-number',
      'project-1',
    ])
  })
})

// =============================================
// Query Hook Tests
// =============================================

describe('useTransmittals', () => {
  it('should fetch transmittals list', async () => {
    const { result } = renderHook(() => useTransmittals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })

  it('should apply project filter', async () => {
    const { result } = renderHook(
      () => useTransmittals({ projectId: 'project-1' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })

  it('should apply status filter', async () => {
    const { result } = renderHook(
      () => useTransmittals({ status: 'sent' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useTransmittal', () => {
  it('should fetch single transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock(mockTransmittal))

    const { result } = renderHook(() => useTransmittal('trans-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject({
      id: 'trans-1',
      transmittal_number: 'T-001',
    })
  })

  it('should not fetch when id is empty', () => {
    const { result } = renderHook(() => useTransmittal(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useTransmittalItems', () => {
  it('should fetch items for transmittal', async () => {
    const { result } = renderHook(() => useTransmittalItems('trans-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(mockFromFn).toHaveBeenCalledWith('transmittal_items')
  })

  it('should not fetch when transmittal id is empty', () => {
    const { result } = renderHook(() => useTransmittalItems(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useTransmittalAttachments', () => {
  it('should fetch attachments for transmittal', async () => {
    const { result } = renderHook(() => useTransmittalAttachments('trans-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(mockFromFn).toHaveBeenCalledWith('transmittal_attachments')
  })
})

describe('useNextTransmittalNumber', () => {
  it('should fetch next transmittal number via RPC', async () => {
    const { result } = renderHook(() => useNextTransmittalNumber('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe('T-002')
    expect(mockRpcFn).toHaveBeenCalledWith('get_next_transmittal_number', {
      p_company_id: 'company-456',
      p_project_id: 'project-1',
    })
  })

  it('should not fetch when project id is empty', () => {
    const { result } = renderHook(() => useNextTransmittalNumber(''), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useTransmittalStats', () => {
  it('should calculate stats from transmittals', async () => {
    mockFromFn.mockReturnValue(
      createChainMock([
        { status: 'draft' },
        { status: 'draft' },
        { status: 'sent' },
        { status: 'received' },
        { status: 'acknowledged' },
      ])
    )

    const { result } = renderHook(() => useTransmittalStats('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject({
      total: 5,
      draft: 2,
      sent: 1,
      received: 1,
      acknowledged: 1,
      void: 0,
    })
  })
})

// =============================================
// Mutation Hook Tests
// =============================================

describe('useCreateTransmittal', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCreateTransmittal(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })

  it('should create transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock(mockTransmittal))

    const { result } = renderHook(() => useCreateTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      project_id: 'project-1',
      from_company: 'Acme Construction',
      to_company: 'Client Corp',
      subject: 'New Transmittal',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useUpdateTransmittal', () => {
  it('should update transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock(mockTransmittal))

    const { result } = renderHook(() => useUpdateTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'trans-1',
      subject: 'Updated Subject',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useSendTransmittal', () => {
  it('should send transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'sent' }))

    const { result } = renderHook(() => useSendTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('trans-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useReceiveTransmittal', () => {
  it('should mark transmittal as received', async () => {
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'received' }))

    const { result } = renderHook(() => useReceiveTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'trans-1',
      receivedBy: 'Jane Smith',
      receivedDate: '2024-01-20',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useAcknowledgeTransmittal', () => {
  it('should acknowledge transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'acknowledged' }))

    const { result } = renderHook(() => useAcknowledgeTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'trans-1',
      notes: 'Reviewed and acknowledged',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useVoidTransmittal', () => {
  it('should void transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'void' }))

    const { result } = renderHook(() => useVoidTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('trans-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

describe('useDeleteTransmittal', () => {
  it('should delete draft transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock(null))

    const { result } = renderHook(() => useDeleteTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('trans-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})

// =============================================
// Item Mutation Tests
// =============================================

describe('useAddTransmittalItem', () => {
  it('should add item to transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock(mockTransmittalItem))

    const { result } = renderHook(() => useAddTransmittalItem(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      transmittal_id: 'trans-1',
      item_type: 'shop_drawing',
      description: 'New Shop Drawing',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittal_items')
  })
})

describe('useUpdateTransmittalItem', () => {
  it('should update transmittal item', async () => {
    mockFromFn.mockReturnValue(createChainMock(mockTransmittalItem))

    const { result } = renderHook(() => useUpdateTransmittalItem(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'item-1',
      transmittal_id: 'trans-1',
      description: 'Updated Description',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittal_items')
  })
})

describe('useRemoveTransmittalItem', () => {
  it('should remove item from transmittal', async () => {
    mockFromFn.mockReturnValue(createChainMock(null))

    const { result } = renderHook(() => useRemoveTransmittalItem(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      itemId: 'item-1',
      transmittalId: 'trans-1',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittal_items')
  })
})

// =============================================
// Transmittal Status Workflow Tests
// =============================================

describe('Transmittal Status Workflow', () => {
  it('should support draft -> sent transition', async () => {
    // First create a draft
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'draft' }))

    const createHook = renderHook(() => useCreateTransmittal(), {
      wrapper: createWrapper(),
    })

    // Then send it
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'sent' }))

    const sendHook = renderHook(() => useSendTransmittal(), {
      wrapper: createWrapper(),
    })

    sendHook.result.current.mutate('trans-1')

    await waitFor(() => expect(sendHook.result.current.isSuccess).toBe(true))
  })

  it('should support sent -> received transition', async () => {
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'received' }))

    const { result } = renderHook(() => useReceiveTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'trans-1',
      receivedBy: 'Receiver',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('should support received -> acknowledged transition', async () => {
    mockFromFn.mockReturnValue(createChainMock({ ...mockTransmittal, status: 'acknowledged' }))

    const { result } = renderHook(() => useAcknowledgeTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      id: 'trans-1',
      notes: 'Acknowledged receipt',
      signature: 'John Doe',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  it('should handle fetch error', async () => {
    mockFromFn.mockReturnValue(
      createChainMock(null, { message: 'Database error' })
    )

    const { result } = renderHook(() => useTransmittals(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should handle mutation error', async () => {
    mockFromFn.mockReturnValue(
      createChainMock(null, { message: 'Insert error' })
    )

    const { result } = renderHook(() => useCreateTransmittal(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      project_id: 'project-1',
      from_company: 'Test',
      to_company: 'Test',
      subject: 'Test',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// =============================================
// Filter Tests
// =============================================

describe('Transmittal Filters', () => {
  it('should support date range filters', async () => {
    const { result } = renderHook(
      () =>
        useTransmittals({
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })

  it('should support search filter', async () => {
    const { result } = renderHook(
      () => useTransmittals({ search: 'shop drawings' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })

  it('should support response required filter', async () => {
    const { result } = renderHook(
      () => useTransmittals({ responseRequired: true }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })

  it('should support to company filter', async () => {
    const { result } = renderHook(
      () => useTransmittals({ toCompany: 'Client Corp' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFromFn).toHaveBeenCalledWith('transmittals')
  })
})
