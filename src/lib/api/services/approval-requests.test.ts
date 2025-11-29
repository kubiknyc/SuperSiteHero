/**
 * Approval Requests API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { approvalRequestsApi } from './approval-requests'
import { supabase } from '@/lib/supabase'

// Mock Supabase chain
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),  // Return this to keep chain alive for filters
  // Make the chain thenable (promise-like) so it can be awaited
  then: vi.fn(function(this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  },
}))

describe('approvalRequestsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.in.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.maybeSingle.mockReturnThis()
    mockSupabaseChain.limit.mockReturnThis()
    mockSupabaseChain.order.mockReturnThis()
    // Reset the thenable to resolve with empty data
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
    // Reset auth mock
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  describe('getRequests', () => {
    const mockRequests = [
      {
        id: 'req-1',
        workflow_id: 'wf-1',
        entity_type: 'document',
        entity_id: 'doc-1',
        current_step: 1,
        status: 'pending',
        initiated_by: 'user-1',
        initiated_at: '2025-01-01T00:00:00Z',
        completed_at: null,
        project_id: 'proj-1',
        workflow: {
          id: 'wf-1',
          name: 'Doc Approval',
          workflow_type: 'document',
          steps: [
            {
              id: 'step-1',
              step_order: 1,
              name: 'Review',
              approver_ids: ['user-2'],
            },
          ],
        },
        initiator: {
          id: 'user-1',
          full_name: 'John Doe',
          email: 'john@example.com',
        },
      },
    ]

    it('should fetch all requests', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getRequests()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('req-1')
    })

    it('should filter by status', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
      )

      await approvalRequestsApi.getRequests({ status: 'pending' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should filter by multiple statuses', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
      )

      await approvalRequestsApi.getRequests({ status: ['pending', 'approved'] })

      expect(mockSupabaseChain.in).toHaveBeenCalledWith('status', ['pending', 'approved'])
    })

    it('should filter by entity_type', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
      )

      await approvalRequestsApi.getRequests({ entity_type: 'document' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('entity_type', 'document')
    })

    it('should filter by project_id', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
      )

      await approvalRequestsApi.getRequests({ project_id: 'proj-1' })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    })

    it('should filter by pending_for_user', async () => {
      const requestsWithApprover = [
        {
          ...mockRequests[0],
          workflow: {
            ...mockRequests[0].workflow,
            steps: [
              { id: 'step-1', step_order: 1, name: 'Review', approver_ids: ['user-2'] },
            ],
          },
        },
      ]
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: requestsWithApprover, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getRequests({
        status: 'pending',
        pending_for_user: 'user-2',
      })

      expect(result).toHaveLength(1)
    })

    it('should filter out non-pending requests when filtering by pending_for_user', async () => {
      const nonPendingRequest = {
        ...mockRequests[0],
        status: 'approved',
      }
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [nonPendingRequest], error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getRequests({
        pending_for_user: 'user-2',
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('getRequest', () => {
    const mockRequest = {
      id: 'req-1',
      workflow_id: 'wf-1',
      entity_type: 'document',
      entity_id: 'doc-1',
      current_step: 1,
      status: 'pending',
      initiated_by: 'user-1',
      initiated_at: '2025-01-01T00:00:00Z',
      project_id: 'proj-1',
      workflow: {
        id: 'wf-1',
        name: 'Doc Approval',
        steps: [
          { id: 'step-1', step_order: 1, name: 'Review' },
        ],
      },
      actions: [
        { id: 'action-1', created_at: '2025-01-02T00:00:00Z' },
        { id: 'action-2', created_at: '2025-01-01T00:00:00Z' },
      ],
    }

    it('should fetch a single request', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getRequest('req-1')

      expect(result.id).toBe('req-1')
    })

    it('should sort actions by created_at', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getRequest('req-1')

      expect(result.actions![0].id).toBe('action-2') // Earlier date first
    })

    it('should throw error for missing request ID', async () => {
      await expect(approvalRequestsApi.getRequest(''))
        .rejects.toThrow('Request ID is required')
    })

    it('should throw error when request not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(approvalRequestsApi.getRequest('non-existent'))
        .rejects.toThrow('Approval request not found')
    })
  })

  describe('getPendingForUser', () => {
    it('should return pending approvals summary', async () => {
      const mockPendingRequests = [
        {
          id: 'req-1',
          entity_type: 'document',
          status: 'pending',
          current_step: 1,
          workflow: {
            steps: [{ step_order: 1, approver_ids: ['user-1'] }],
          },
        },
        {
          id: 'req-2',
          entity_type: 'rfi',
          status: 'pending',
          current_step: 1,
          workflow: {
            steps: [{ step_order: 1, approver_ids: ['user-1'] }],
          },
        },
      ]
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockPendingRequests, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getPendingForUser('user-1')

      expect(result.total).toBe(2)
      expect(result.by_type.document).toBe(1)
      expect(result.by_type.rfi).toBe(1)
    })

    it('should throw error for missing user ID', async () => {
      await expect(approvalRequestsApi.getPendingForUser(''))
        .rejects.toThrow('User ID is required')
    })
  })

  describe('createRequest', () => {
    const createInput = {
      workflow_id: 'wf-1',
      entity_type: 'document' as const,
      entity_id: 'doc-1',
      project_id: 'proj-1',
    }

    it('should create a new request', async () => {
      // Mock getEntityStatus to return no existing request
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      // Mock insert
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { id: 'req-new' }, error: null }).then(onFulfilled)
      )
      // Mock getRequest for return value
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({
          data: {
            id: 'req-new',
            ...createInput,
            status: 'pending',
            current_step: 1,
          },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.createRequest(createInput)

      expect(result.id).toBe('req-new')
    })

    it('should throw error for missing workflow ID', async () => {
      await expect(approvalRequestsApi.createRequest({
        ...createInput,
        workflow_id: '',
      })).rejects.toThrow('Workflow ID is required')
    })

    it('should throw error for missing entity type', async () => {
      await expect(approvalRequestsApi.createRequest({
        ...createInput,
        entity_type: '' as any,
      })).rejects.toThrow('Entity type is required')
    })

    it('should throw error for missing entity ID', async () => {
      await expect(approvalRequestsApi.createRequest({
        ...createInput,
        entity_id: '',
      })).rejects.toThrow('Entity ID is required')
    })

    it('should throw error for missing project ID', async () => {
      await expect(approvalRequestsApi.createRequest({
        ...createInput,
        project_id: '',
      })).rejects.toThrow('Project ID is required')
    })

    it('should throw error if request already exists', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: { id: 'existing', status: 'pending' },
          error: null,
        }).then(onFulfilled)
      )

      await expect(approvalRequestsApi.createRequest(createInput))
        .rejects.toThrow('An approval request already exists for this item')
    })
  })

  describe('cancelRequest', () => {
    const mockRequest = {
      id: 'req-1',
      initiated_by: 'user-1',
      status: 'pending',
      workflow: { steps: [] },
    }

    it('should cancel a pending request', async () => {
      // First call: getRequest (inside cancelRequest)
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )
      // Second call: update status
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      // Third call: getRequest (return updated request)
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { ...mockRequest, status: 'cancelled' }, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.cancelRequest('req-1')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      )
    })

    it('should throw error for missing request ID', async () => {
      await expect(approvalRequestsApi.cancelRequest(''))
        .rejects.toThrow('Request ID is required')
    })

    it('should throw error if user is not initiator', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'other-user' } },
        error: null,
      })
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )

      await expect(approvalRequestsApi.cancelRequest('req-1'))
        .rejects.toThrow('Only the initiator can cancel this request')
    })

    it('should throw error if request is not pending', async () => {
      // Reset auth to original user (initiator)
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: { ...mockRequest, status: 'approved' },
          error: null,
        }).then(onFulfilled)
      )

      await expect(approvalRequestsApi.cancelRequest('req-1'))
        .rejects.toThrow('Only pending requests can be cancelled')
    })
  })

  describe('getEntityStatus', () => {
    it('should return status for entity with active request', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: {
            id: 'req-1',
            status: 'pending',
            entity_type: 'document',
            entity_id: 'doc-1',
          },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getEntityStatus('document', 'doc-1')

      expect(result.has_active_request).toBe(true)
      expect(result.status).toBe('pending')
      expect(result.can_submit).toBe(false)
    })

    it('should return can_submit=true for entity with no request', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getEntityStatus('document', 'doc-1')

      expect(result.has_active_request).toBe(false)
      expect(result.status).toBeNull()
      expect(result.can_submit).toBe(true)
    })

    it('should return can_submit=false for approved entity', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: { status: 'approved' },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.getEntityStatus('document', 'doc-1')

      expect(result.can_submit).toBe(false)
    })

    it('should throw error for missing params', async () => {
      // @ts-expect-error Testing invalid input
      await expect(approvalRequestsApi.getEntityStatus('', 'doc-1'))
        .rejects.toThrow('Entity type and ID are required')

      await expect(approvalRequestsApi.getEntityStatus('document', ''))
        .rejects.toThrow('Entity type and ID are required')
    })
  })

  describe('canUserApprove', () => {
    it('should return true if user is approver for current step', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: {
            id: 'req-1',
            status: 'pending',
            current_step: 1,
            workflow: {
              steps: [{ step_order: 1, approver_ids: ['user-1'] }],
            },
          },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.canUserApprove('req-1', 'user-1')

      expect(result).toBe(true)
    })

    it('should return false if user is not approver', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: {
            id: 'req-1',
            status: 'pending',
            current_step: 1,
            workflow: {
              steps: [{ step_order: 1, approver_ids: ['other-user'] }],
            },
          },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.canUserApprove('req-1', 'user-1')

      expect(result).toBe(false)
    })

    it('should return false for non-pending request', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: { status: 'approved' },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalRequestsApi.canUserApprove('req-1', 'user-1')

      expect(result).toBe(false)
    })

    it('should return false for missing params', async () => {
      const result = await approvalRequestsApi.canUserApprove('', 'user-1')
      expect(result).toBe(false)
    })
  })
})
