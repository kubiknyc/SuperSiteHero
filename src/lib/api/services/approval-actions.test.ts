/**
 * Approval Actions API Service Tests
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { approvalActionsApi } from './approval-actions'
import { supabase } from '@/lib/supabase'

// Mock Supabase chain
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
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

describe('approvalActionsApi', () => {
  const mockRequest = {
    id: 'req-1',
    workflow_id: 'wf-1',
    entity_type: 'document',
    entity_id: 'doc-1',
    current_step: 1,
    status: 'pending',
    initiated_by: 'user-2',
    project_id: 'proj-1',
    workflow: {
      id: 'wf-1',
      name: 'Doc Approval',
      steps: [
        {
          id: 'step-1',
          workflow_id: 'wf-1',
          step_order: 1,
          name: 'Review',
          approver_ids: ['user-1'],
          required_approvals: 1,
        },
        {
          id: 'step-2',
          workflow_id: 'wf-1',
          step_order: 2,
          name: 'Final',
          approver_ids: ['user-3'],
          required_approvals: 1,
        },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.in.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.order.mockResolvedValue({ data: [], error: null })
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

  describe('approve', () => {
    it('should approve and move to next step', async () => {
      // First call: fetch request
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )
      // Second call: insert action
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      // Third call: update request
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      // Fourth call: fetch updated request
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { ...mockRequest, current_step: 2 }, error: null }).then(onFulfilled)
      )

      const result = await approvalActionsApi.approve('req-1')

      expect(result.current_step).toBe(2)
    })

    it('should complete workflow on last step approval', async () => {
      const lastStepRequest = {
        ...mockRequest,
        current_step: 2, // On the last step
        workflow: {
          ...mockRequest.workflow,
          steps: mockRequest.workflow.steps,
        },
      }

      // User-1 is not an approver for step 2, mock user-3
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-3' } },
        error: null,
      })

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: lastStepRequest, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { ...lastStepRequest, status: 'approved', completed_at: expect.any(String) }, error: null }).then(onFulfilled)
      )

      const result = await approvalActionsApi.approve('req-1')

      expect(result.status).toBe('approved')
    })

    it('should throw error if not authorized', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'unauthorized-user' } },
        error: null,
      })
      mockSupabaseChain.single.mockResolvedValueOnce({ data: mockRequest, error: null })

      await expect(approvalActionsApi.approve('req-1'))
        .rejects.toThrow('You are not authorized to approve this step')
    })

    it('should throw error if request is not pending', async () => {
      mockSupabaseChain.single.mockResolvedValueOnce({
        data: {
          ...mockRequest,
          status: 'approved',
          workflow: mockRequest.workflow
        },
        error: null,
      })

      await expect(approvalActionsApi.approve('req-1'))
        .rejects.toThrow('This request is no longer pending')
    })
  })

  describe('approveWithConditions', () => {
    it('should approve with conditions', async () => {
      const singleStepRequest = {
        ...mockRequest,
        workflow: {
          ...mockRequest.workflow,
          steps: [mockRequest.workflow.steps[0]], // Only one step
        },
      }

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: singleStepRequest, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({
          data: {
            ...singleStepRequest,
            status: 'approved_with_conditions',
            conditions: 'Must fix minor issues',
          },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalActionsApi.approveWithConditions(
        'req-1',
        'Must fix minor issues',
        'Overall good work'
      )

      expect(result.status).toBe('approved_with_conditions')
    })

    it('should throw error for missing conditions', async () => {
      await expect(approvalActionsApi.approveWithConditions('req-1', ''))
        .rejects.toThrow('Conditions are required for approval with conditions')
    })
  })

  describe('reject', () => {
    it('should reject the request', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { ...mockRequest, status: 'rejected' }, error: null }).then(onFulfilled)
      )

      const result = await approvalActionsApi.reject('req-1', 'Does not meet requirements')

      expect(result.status).toBe('rejected')
    })

    it('should throw error for missing comment', async () => {
      await expect(approvalActionsApi.reject('req-1', ''))
        .rejects.toThrow('A comment is required when rejecting')
    })
  })

  describe('delegate', () => {
    it('should delegate to another user', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )

      const result = await approvalActionsApi.delegate('req-1', 'user-4', 'Please review')

      expect(result).toBeDefined()
    })

    it('should throw error for missing delegate user', async () => {
      await expect(approvalActionsApi.delegate('req-1', ''))
        .rejects.toThrow('A user to delegate to is required')
    })
  })

  describe('addComment', () => {
    it('should add a comment to the request', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({
          data: {
            id: 'action-1',
            request_id: 'req-1',
            action: 'comment',
            comment: 'Need more info',
            user: { id: 'user-1', full_name: 'John' },
          },
          error: null,
        }).then(onFulfilled)
      )

      const result = await approvalActionsApi.addComment('req-1', 'Need more info')

      expect(result.action).toBe('comment')
      expect(result.comment).toBe('Need more info')
    })

    it('should throw error for empty comment', async () => {
      await expect(approvalActionsApi.addComment('req-1', ''))
        .rejects.toThrow('Comment text is required')
    })

    it('should throw error for missing request ID', async () => {
      await expect(approvalActionsApi.addComment('', 'Test'))
        .rejects.toThrow('Request ID is required')
    })
  })

  describe('getHistory', () => {
    const mockActions = [
      {
        id: 'action-1',
        request_id: 'req-1',
        step_id: 'step-1',
        user_id: 'user-1',
        action: 'approve',
        comment: 'Looks good',
        created_at: '2025-01-01T00:00:00Z',
        user: { id: 'user-1', full_name: 'John', email: 'john@test.com' },
      },
    ]

    it('should fetch action history', async () => {
      mockSupabaseChain.order.mockResolvedValue({ data: mockActions, error: null })

      const result = await approvalActionsApi.getHistory('req-1')

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe('approve')
    })

    it('should throw error for missing request ID', async () => {
      await expect(approvalActionsApi.getHistory(''))
        .rejects.toThrow('Request ID is required')
    })
  })

  describe('_performAction', () => {
    it('should throw error for missing request ID', async () => {
      await expect(approvalActionsApi._performAction('', 'approve'))
        .rejects.toThrow('Request ID is required')
    })

    it('should throw error if not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null })

      await expect(approvalActionsApi._performAction('req-1', 'approve'))
        .rejects.toThrow('You must be logged in to perform this action')
    })

    it('should throw error if request not found', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(approvalActionsApi._performAction('req-1', 'approve'))
        .rejects.toThrow('Approval request not found')
    })

    it('should throw error if step not found', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({
          data: {
            ...mockRequest,
            current_step: 99, // Non-existent step
            workflow: mockRequest.workflow
          },
          error: null,
        }).then(onFulfilled)
      )

      await expect(approvalActionsApi._performAction('req-1', 'approve'))
        .rejects.toThrow('Current approval step not found')
    })
  })
})
