/**
 * Tests for Approval Hooks
 * CRITICAL for workflow authorization - ensures approval queries and mutations work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type {
  ApprovalRequest,
  ApprovalWorkflow,
  ApprovalActionRecord,
  PendingApprovalsSummary,
  EntityApprovalStatus,
} from '@/types/approval-workflow'

// =============================================
// Mock Setup
// =============================================

// Create mock functions before vi.mock
const mockGetRequests = vi.fn()
const mockGetRequest = vi.fn()
const mockGetPendingForUser = vi.fn()
const mockGetEntityStatus = vi.fn()
const mockCanUserApprove = vi.fn()
const mockCreateRequest = vi.fn()
const mockCancelRequest = vi.fn()

const mockGetHistory = vi.fn()
const mockApprove = vi.fn()
const mockApproveWithConditions = vi.fn()
const mockReject = vi.fn()
const mockDelegate = vi.fn()
const mockAddComment = vi.fn()

const mockGetWorkflows = vi.fn()
const mockGetWorkflow = vi.fn()
const mockGetActiveWorkflowsByType = vi.fn()
const mockCreateWorkflow = vi.fn()
const mockUpdateWorkflow = vi.fn()
const mockDeleteWorkflow = vi.fn()
const mockDuplicateWorkflow = vi.fn()

// Mock approval-requests API
vi.mock('@/lib/api/services/approval-requests', () => ({
  approvalRequestsApi: {
    getRequests: (...args: unknown[]) => mockGetRequests(...args),
    getRequest: (...args: unknown[]) => mockGetRequest(...args),
    getPendingForUser: (...args: unknown[]) => mockGetPendingForUser(...args),
    getEntityStatus: (...args: unknown[]) => mockGetEntityStatus(...args),
    canUserApprove: (...args: unknown[]) => mockCanUserApprove(...args),
    createRequest: (...args: unknown[]) => mockCreateRequest(...args),
    cancelRequest: (...args: unknown[]) => mockCancelRequest(...args),
  },
}))

// Mock approval-actions API
vi.mock('@/lib/api/services/approval-actions', () => ({
  approvalActionsApi: {
    getHistory: (...args: unknown[]) => mockGetHistory(...args),
    approve: (...args: unknown[]) => mockApprove(...args),
    approveWithConditions: (...args: unknown[]) => mockApproveWithConditions(...args),
    reject: (...args: unknown[]) => mockReject(...args),
    delegate: (...args: unknown[]) => mockDelegate(...args),
    addComment: (...args: unknown[]) => mockAddComment(...args),
  },
}))

// Mock approval-workflows API
vi.mock('@/lib/api/services/approval-workflows', () => ({
  approvalWorkflowsApi: {
    getWorkflows: (...args: unknown[]) => mockGetWorkflows(...args),
    getWorkflow: (...args: unknown[]) => mockGetWorkflow(...args),
    getActiveWorkflowsByType: (...args: unknown[]) => mockGetActiveWorkflowsByType(...args),
    createWorkflow: (...args: unknown[]) => mockCreateWorkflow(...args),
    updateWorkflow: (...args: unknown[]) => mockUpdateWorkflow(...args),
    deleteWorkflow: (...args: unknown[]) => mockDeleteWorkflow(...args),
    duplicateWorkflow: (...args: unknown[]) => mockDuplicateWorkflow(...args),
  },
}))

// Import hooks after mocks
import {
  useApprovalRequests,
  useApprovalRequest,
  usePendingApprovals,
  useEntityApprovalStatus,
  useCanUserApprove,
  useCreateApprovalRequest,
  useCancelApprovalRequest,
} from './useApprovalRequests'

import {
  useApprovalHistory,
  useApproveRequest,
  useApproveWithConditions,
  useRejectRequest,
  useDelegateRequest,
  useAddApprovalComment,
} from './useApprovalActions'

import {
  useApprovalWorkflows,
  useActiveWorkflowsByType,
  useApprovalWorkflow,
  useCreateApprovalWorkflow,
  useUpdateApprovalWorkflow,
  useDeleteApprovalWorkflow,
  useDuplicateApprovalWorkflow,
} from './useApprovalWorkflows'

// =============================================
// Test Data
// =============================================

const mockApprovalRequest: ApprovalRequest = {
  id: 'req-123',
  workflow_id: 'wf-456',
  entity_type: 'document',
  entity_id: 'doc-789',
  current_step: 1,
  status: 'pending',
  conditions: null,
  initiated_by: 'user-123',
  initiated_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  project_id: 'project-456',
}

const mockApprovalRequests: ApprovalRequest[] = [
  mockApprovalRequest,
  {
    ...mockApprovalRequest,
    id: 'req-124',
    entity_id: 'doc-790',
    status: 'approved',
    completed_at: '2024-01-02T00:00:00Z',
  },
  {
    ...mockApprovalRequest,
    id: 'req-125',
    entity_type: 'submittal',
    entity_id: 'sub-123',
  },
]

const mockPendingSummary: PendingApprovalsSummary = {
  total: 5,
  by_type: {
    document: 2,
    submittal: 1,
    rfi: 1,
    change_order: 1,
  },
  requests: [mockApprovalRequest],
}

const mockEntityStatus: EntityApprovalStatus = {
  has_active_request: true,
  request: mockApprovalRequest,
  status: 'pending',
  can_submit: false,
}

const mockWorkflow: ApprovalWorkflow = {
  id: 'wf-456',
  name: 'Document Review',
  description: 'Standard document approval process',
  company_id: 'company-123',
  workflow_type: 'document',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  steps: [
    {
      id: 'step-1',
      workflow_id: 'wf-456',
      step_order: 1,
      name: 'Manager Review',
      approver_type: 'user',
      approver_ids: ['user-manager'],
      required_approvals: 1,
      allow_delegation: true,
      auto_approve_after_days: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
}

const mockWorkflows: ApprovalWorkflow[] = [
  mockWorkflow,
  {
    ...mockWorkflow,
    id: 'wf-457',
    name: 'Submittal Review',
    workflow_type: 'submittal',
  },
]

const mockActionRecord: ApprovalActionRecord = {
  id: 'action-123',
  request_id: 'req-123',
  step_id: 'step-1',
  user_id: 'user-manager',
  action: 'approve',
  comment: 'Looks good',
  conditions: null,
  delegated_to: null,
  created_at: '2024-01-01T12:00:00Z',
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
  mockGetRequests.mockResolvedValue(mockApprovalRequests)
  mockGetRequest.mockResolvedValue(mockApprovalRequest)
  mockGetPendingForUser.mockResolvedValue(mockPendingSummary)
  mockGetEntityStatus.mockResolvedValue(mockEntityStatus)
  mockCanUserApprove.mockResolvedValue(true)
  mockCreateRequest.mockResolvedValue(mockApprovalRequest)
  mockCancelRequest.mockResolvedValue({ ...mockApprovalRequest, status: 'cancelled' })

  mockGetHistory.mockResolvedValue([mockActionRecord])
  mockApprove.mockResolvedValue({ ...mockApprovalRequest, status: 'approved' })
  mockApproveWithConditions.mockResolvedValue({
    ...mockApprovalRequest,
    status: 'approved_with_conditions',
    conditions: 'Submit revised drawings',
  })
  mockReject.mockResolvedValue({ ...mockApprovalRequest, status: 'rejected' })
  mockDelegate.mockResolvedValue(mockApprovalRequest)
  mockAddComment.mockResolvedValue(mockActionRecord)

  mockGetWorkflows.mockResolvedValue(mockWorkflows)
  mockGetWorkflow.mockResolvedValue(mockWorkflow)
  mockGetActiveWorkflowsByType.mockResolvedValue([mockWorkflow])
  mockCreateWorkflow.mockResolvedValue(mockWorkflow)
  mockUpdateWorkflow.mockResolvedValue(mockWorkflow)
  mockDeleteWorkflow.mockResolvedValue(undefined)
  mockDuplicateWorkflow.mockResolvedValue({ ...mockWorkflow, id: 'wf-458', name: 'Copy of Document Review' })
})

// =============================================
// useApprovalRequests Tests
// =============================================

describe('useApprovalRequests', () => {
  it('should fetch approval requests', async () => {
    const { result } = renderHook(() => useApprovalRequests(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockApprovalRequests)
    expect(mockGetRequests).toHaveBeenCalled()
  })

  it('should fetch requests with filters', async () => {
    const filters = { status: 'pending' as const, entity_type: 'document' as const }
    const { result } = renderHook(() => useApprovalRequests(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetRequests).toHaveBeenCalledWith(filters)
  })

  it('should return empty array on error', async () => {
    mockGetRequests.mockRejectedValueOnce(new Error('DB error'))

    const { result } = renderHook(() => useApprovalRequests(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

describe('useApprovalRequest', () => {
  it('should fetch single request', async () => {
    const { result } = renderHook(() => useApprovalRequest('req-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockApprovalRequest)
    expect(mockGetRequest).toHaveBeenCalledWith('req-123')
  })

  it('should not fetch when requestId is undefined', () => {
    const { result } = renderHook(() => useApprovalRequest(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockGetRequest).not.toHaveBeenCalled()
  })
})

describe('usePendingApprovals', () => {
  it('should fetch pending approvals for user', async () => {
    const { result } = renderHook(() => usePendingApprovals('user-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPendingSummary)
    expect(mockGetPendingForUser).toHaveBeenCalledWith('user-123')
  })

  it('should not fetch when userId is undefined', () => {
    const { result } = renderHook(() => usePendingApprovals(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(mockGetPendingForUser).not.toHaveBeenCalled()
  })

  it('should return empty summary on error', async () => {
    mockGetPendingForUser.mockRejectedValueOnce(new Error('DB error'))

    const { result } = renderHook(() => usePendingApprovals('user-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.total).toBe(0)
    expect(result.current.data?.requests).toEqual([])
  })
})

describe('useEntityApprovalStatus', () => {
  it('should fetch entity status', async () => {
    const { result } = renderHook(
      () => useEntityApprovalStatus('document', 'doc-789'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockEntityStatus)
    expect(mockGetEntityStatus).toHaveBeenCalledWith('document', 'doc-789')
  })

  it('should not fetch when entityType is undefined', () => {
    const { result } = renderHook(
      () => useEntityApprovalStatus(undefined, 'doc-789'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })

  it('should not fetch when entityId is undefined', () => {
    const { result } = renderHook(
      () => useEntityApprovalStatus('document', undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useCanUserApprove', () => {
  it('should check if user can approve', async () => {
    const { result } = renderHook(
      () => useCanUserApprove('req-123', 'user-manager'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(true)
    expect(mockCanUserApprove).toHaveBeenCalledWith('req-123', 'user-manager')
  })

  it('should return false when params are missing', async () => {
    const { result } = renderHook(
      () => useCanUserApprove(undefined, 'user-manager'),
      { wrapper: createWrapper() }
    )

    // The query is disabled so it won't fetch
    expect(result.current.isFetching).toBe(false)
  })
})

// =============================================
// useApprovalRequest Mutations Tests
// =============================================

describe('useCreateApprovalRequest', () => {
  it('should create approval request', async () => {
    const { result } = renderHook(() => useCreateApprovalRequest(), {
      wrapper: createWrapper(),
    })

    const input = {
      workflow_id: 'wf-456',
      entity_type: 'document' as const,
      entity_id: 'doc-new',
      project_id: 'project-456',
    }

    await result.current.mutateAsync(input)

    expect(mockCreateRequest).toHaveBeenCalledWith(input)
  })
})

describe('useCancelApprovalRequest', () => {
  it('should cancel approval request', async () => {
    const { result } = renderHook(() => useCancelApprovalRequest(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('req-123')

    expect(mockCancelRequest).toHaveBeenCalledWith('req-123')
  })
})

// =============================================
// useApprovalActions Tests
// =============================================

describe('useApprovalHistory', () => {
  it('should fetch approval history', async () => {
    const { result } = renderHook(() => useApprovalHistory('req-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockActionRecord])
    expect(mockGetHistory).toHaveBeenCalledWith('req-123')
  })

  it('should not fetch when requestId is undefined', () => {
    const { result } = renderHook(() => useApprovalHistory(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useApproveRequest', () => {
  it('should approve request', async () => {
    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({ requestId: 'req-123', comment: 'Approved' })

    expect(mockApprove).toHaveBeenCalledWith('req-123', 'Approved')
  })

  it('should approve request without comment', async () => {
    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({ requestId: 'req-123' })

    expect(mockApprove).toHaveBeenCalledWith('req-123', undefined)
  })
})

describe('useApproveWithConditions', () => {
  it('should approve with conditions', async () => {
    const { result } = renderHook(() => useApproveWithConditions(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      requestId: 'req-123',
      conditions: 'Submit revised drawings',
      comment: 'See conditions',
    })

    expect(mockApproveWithConditions).toHaveBeenCalledWith(
      'req-123',
      'Submit revised drawings',
      'See conditions'
    )
  })
})

describe('useRejectRequest', () => {
  it('should reject request with comment', async () => {
    const { result } = renderHook(() => useRejectRequest(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      requestId: 'req-123',
      comment: 'Does not meet requirements',
    })

    expect(mockReject).toHaveBeenCalledWith('req-123', 'Does not meet requirements')
  })
})

describe('useDelegateRequest', () => {
  it('should delegate request', async () => {
    const { result } = renderHook(() => useDelegateRequest(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      requestId: 'req-123',
      toUserId: 'user-delegate',
      comment: 'Please review',
    })

    expect(mockDelegate).toHaveBeenCalledWith('req-123', 'user-delegate', 'Please review')
  })
})

describe('useAddApprovalComment', () => {
  it('should add comment', async () => {
    const { result } = renderHook(() => useAddApprovalComment(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      requestId: 'req-123',
      comment: 'Need more information',
    })

    expect(mockAddComment).toHaveBeenCalledWith('req-123', 'Need more information')
  })
})

// =============================================
// useApprovalWorkflows Tests
// =============================================

describe('useApprovalWorkflows', () => {
  it('should fetch workflows for company', async () => {
    const { result } = renderHook(
      () => useApprovalWorkflows('company-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockWorkflows)
    expect(mockGetWorkflows).toHaveBeenCalledWith({
      company_id: 'company-123',
      workflow_type: undefined,
      is_active: undefined,
    })
  })

  it('should fetch workflows with type filter', async () => {
    const { result } = renderHook(
      () => useApprovalWorkflows('company-123', 'document', true),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetWorkflows).toHaveBeenCalledWith({
      company_id: 'company-123',
      workflow_type: 'document',
      is_active: true,
    })
  })

  it('should not fetch when companyId is undefined', () => {
    const { result } = renderHook(
      () => useApprovalWorkflows(undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useActiveWorkflowsByType', () => {
  it('should fetch active workflows by type', async () => {
    const { result } = renderHook(
      () => useActiveWorkflowsByType('company-123', 'document'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([mockWorkflow])
    expect(mockGetActiveWorkflowsByType).toHaveBeenCalledWith('company-123', 'document')
  })

  it('should not fetch when companyId is undefined', () => {
    const { result } = renderHook(
      () => useActiveWorkflowsByType(undefined, 'document'),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })

  it('should not fetch when workflowType is undefined', () => {
    const { result } = renderHook(
      () => useActiveWorkflowsByType('company-123', undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })
})

describe('useApprovalWorkflow', () => {
  it('should fetch single workflow', async () => {
    const { result } = renderHook(
      () => useApprovalWorkflow('wf-456'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockWorkflow)
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-456')
  })

  it('should not fetch when workflowId is undefined', () => {
    const { result } = renderHook(
      () => useApprovalWorkflow(undefined),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })
})

// =============================================
// Workflow Mutations Tests
// =============================================

describe('useCreateApprovalWorkflow', () => {
  it('should create workflow', async () => {
    const { result } = renderHook(() => useCreateApprovalWorkflow(), {
      wrapper: createWrapper(),
    })

    const input = {
      name: 'New Workflow',
      company_id: 'company-123',
      workflow_type: 'document' as const,
      steps: [
        {
          step_order: 1,
          name: 'Review',
          approver_ids: ['user-1'],
        },
      ],
    }

    await result.current.mutateAsync(input)

    expect(mockCreateWorkflow).toHaveBeenCalledWith(input)
  })
})

describe('useUpdateApprovalWorkflow', () => {
  it('should update workflow', async () => {
    const { result } = renderHook(() => useUpdateApprovalWorkflow(), {
      wrapper: createWrapper(),
    })

    const input = {
      name: 'Updated Workflow',
      is_active: false,
    }

    await result.current.mutateAsync({ workflowId: 'wf-456', input })

    expect(mockUpdateWorkflow).toHaveBeenCalledWith('wf-456', input)
  })
})

describe('useDeleteApprovalWorkflow', () => {
  it('should delete workflow', async () => {
    const { result } = renderHook(() => useDeleteApprovalWorkflow(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync('wf-456')

    expect(mockDeleteWorkflow).toHaveBeenCalledWith('wf-456')
  })
})

describe('useDuplicateApprovalWorkflow', () => {
  it('should duplicate workflow', async () => {
    const { result } = renderHook(() => useDuplicateApprovalWorkflow(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      workflowId: 'wf-456',
      newName: 'Copy of Document Review',
    })

    expect(mockDuplicateWorkflow).toHaveBeenCalledWith('wf-456', 'Copy of Document Review')
  })
})

// =============================================
// Security-Critical Tests
// =============================================

describe('Approval Security Tests', () => {
  it('should check user authorization before approving', async () => {
    mockCanUserApprove.mockResolvedValueOnce(false)

    const { result } = renderHook(
      () => useCanUserApprove('req-123', 'unauthorized-user'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe(false)
  })

  it('should track entity approval status', async () => {
    const { result } = renderHook(
      () => useEntityApprovalStatus('document', 'doc-789'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.has_active_request).toBe(true)
    expect(result.current.data?.can_submit).toBe(false)
  })

  it('should provide pending count for badge display', async () => {
    const { result } = renderHook(
      () => usePendingApprovals('user-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.total).toBe(5)
    expect(result.current.data?.by_type.document).toBe(2)
  })

  it('should require comment when rejecting', async () => {
    const { result } = renderHook(() => useRejectRequest(), {
      wrapper: createWrapper(),
    })

    // The mutation requires a comment
    await result.current.mutateAsync({
      requestId: 'req-123',
      comment: 'Required rejection reason',
    })

    expect(mockReject).toHaveBeenCalledWith('req-123', 'Required rejection reason')
  })

  it('should track delegation chain', async () => {
    const { result } = renderHook(() => useDelegateRequest(), {
      wrapper: createWrapper(),
    })

    await result.current.mutateAsync({
      requestId: 'req-123',
      toUserId: 'user-delegate',
      comment: 'Out of office',
    })

    expect(mockDelegate).toHaveBeenCalledWith('req-123', 'user-delegate', 'Out of office')
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Approval Error Handling', () => {
  it('should handle API errors gracefully for requests', async () => {
    mockGetRequests.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useApprovalRequests(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should return empty array on error
    expect(result.current.data).toEqual([])
  })

  it('should handle mutation errors', async () => {
    mockApprove.mockRejectedValueOnce(new Error('Unauthorized'))

    const { result } = renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(),
    })

    await expect(
      result.current.mutateAsync({ requestId: 'req-123' })
    ).rejects.toThrow('Unauthorized')
  })
})
