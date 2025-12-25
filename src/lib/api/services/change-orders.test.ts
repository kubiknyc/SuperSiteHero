/**
 * Change Orders API Service Tests
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { changeOrdersApi } from './change-orders'

// Mock Supabase
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  // Make the chain thenable (promise-like) so it can be awaited
  then: vi.fn(function(this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('changeOrdersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain - all methods return 'this' for chaining
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.delete.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.ilike.mockReturnThis()
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.order.mockReturnThis()
    mockSupabaseChain.limit.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.from.mockReturnThis()
    // Reset the thenable to resolve with empty data
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
  })

  describe('getChangeOrderWorkflowType', () => {
    const mockWorkflowType = {
      id: 'workflow-type-1',
      name_singular: 'Change Order',
      prefix: 'CO',
    }

    it('should fetch change order workflow type for a company', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowType, error: null }).then(onFulfilled)
      )

      const result = await changeOrdersApi.getChangeOrderWorkflowType('company-1')

      expect(result.id).toBe('workflow-type-1')
      expect(result.name_singular).toBe('Change Order')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(mockSupabaseChain.ilike).toHaveBeenCalledWith('name_singular', '%change%order%')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.getChangeOrderWorkflowType('company-1')).rejects.toThrow()
    })
  })

  describe('getProjectChangeOrders', () => {
    const mockWorkflowType = {
      id: 'workflow-type-1',
      name_singular: 'Change Order',
      prefix: 'CO',
    }

    const mockChangeOrders = [
      {
        id: 'co-1',
        project_id: 'proj-1',
        workflow_type_id: 'workflow-type-1',
        title: 'Foundation Change',
        status: 'draft',
        workflow_type: {
          name_singular: 'Change Order',
          prefix: 'CO',
        },
        raised_by_user: {
          first_name: 'John',
          last_name: 'Doe',
        },
        bids: [],
      },
    ]

    it('should fetch all change orders for a project', async () => {
      // First call returns workflow type
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockWorkflowType, error: null }).then(onFulfilled)
        )
        // Second call returns change orders
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockChangeOrders, error: null }).then(onFulfilled)
        )

      const result = await changeOrdersApi.getProjectChangeOrders('proj-1', 'company-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('co-1')
      expect(result[0].title).toBe('Foundation Change')
    })

    it('should throw error when workflow type not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(
        changeOrdersApi.getProjectChangeOrders('proj-1', 'company-1')
      ).rejects.toThrow('Change order workflow type not found')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(
        changeOrdersApi.getProjectChangeOrders('proj-1', 'company-1')
      ).rejects.toThrow()
    })
  })

  describe('getChangeOrder', () => {
    const mockChangeOrder = {
      id: 'co-1',
      project_id: 'proj-1',
      title: 'Foundation Change',
      status: 'draft',
      workflow_type: {
        name_singular: 'Change Order',
        prefix: 'CO',
        statuses: ['draft', 'submitted', 'approved'],
        priorities: ['low', 'normal', 'high'],
      },
      raised_by_user: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      },
      created_by_user: {
        first_name: 'Jane',
        last_name: 'Smith',
      },
      comments: [],
      bids: [],
    }

    it('should fetch a single change order by ID', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockChangeOrder, error: null }).then(onFulfilled)
      )

      const result = await changeOrdersApi.getChangeOrder('co-1')

      expect(result.id).toBe('co-1')
      expect(result.title).toBe('Foundation Change')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'co-1')
    })

    it('should handle missing change order', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Not found' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.getChangeOrder('nonexistent')).rejects.toThrow()
    })
  })

  describe('createChangeOrder', () => {
    const createInput = {
      title: 'New Foundation Change',
      description: 'Additional concrete required',
      priority: 'high',
      cost_impact: 5000,
      schedule_impact: 3,
      assignees: ['user-1', 'user-2'],
    }

    const createdChangeOrder = {
      id: 'co-new',
      project_id: 'proj-1',
      workflow_type_id: 'workflow-type-1',
      title: createInput.title,
      description: createInput.description,
      priority: createInput.priority,
      cost_impact: createInput.cost_impact,
      schedule_impact: createInput.schedule_impact,
      assignees: createInput.assignees,
      number: 1,
      status: 'draft',
      created_by: 'user-1',
      raised_by: 'user-1',
      created_at: '2025-01-27T10:00:00Z',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should create a new change order', async () => {
      // First call gets last item number
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled)
        )
        // Second call inserts new item
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: createdChangeOrder, error: null }).then(onFulfilled)
        )

      const result = await changeOrdersApi.createChangeOrder(
        'proj-1',
        'workflow-type-1',
        'user-1',
        createInput
      )

      expect(result.id).toBe('co-new')
      expect(result.title).toBe(createInput.title)
      expect(result.number).toBe(1)
      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })

    it('should increment number based on last item', async () => {
      const lastItem = { number: 5 }

      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: lastItem, error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({
            data: { ...createdChangeOrder, number: 6 },
            error: null
          }).then(onFulfilled)
        )

      const result = await changeOrdersApi.createChangeOrder(
        'proj-1',
        'workflow-type-1',
        'user-1',
        createInput
      )

      expect(result.number).toBe(6)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(
        changeOrdersApi.createChangeOrder('proj-1', 'workflow-type-1', 'user-1', createInput)
      ).rejects.toThrow()
    })
  })

  describe('updateChangeOrder', () => {
    it('should update a change order', async () => {
      const updatedChangeOrder = {
        id: 'co-1',
        title: 'Updated Foundation Change',
        status: 'submitted',
        priority: 'critical',
      }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedChangeOrder, error: null }).then(onFulfilled)
      )

      const result = await changeOrdersApi.updateChangeOrder('co-1', {
        title: 'Updated Foundation Change',
        priority: 'critical',
      })

      expect(result.title).toBe('Updated Foundation Change')
      expect(result.priority).toBe('critical')
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'co-1')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.updateChangeOrder('co-1', {})).rejects.toThrow()
    })
  })

  describe('deleteChangeOrder', () => {
    it('should soft delete a change order', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await changeOrdersApi.deleteChangeOrder('co-1')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'co-1')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.deleteChangeOrder('co-1')).rejects.toThrow()
    })
  })

  describe('addComment', () => {
    const mockComment = {
      id: 'comment-1',
      workflow_item_id: 'co-1',
      comment: 'This is a test comment',
      created_by: 'user-1',
      mentioned_users: [],
      created_at: '2025-01-27T10:00:00Z',
    }

    it('should add a comment to a change order', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockComment, error: null }).then(onFulfilled)
      )

      const result = await changeOrdersApi.addComment('co-1', 'user-1', 'This is a test comment')

      expect(result.id).toBe('comment-1')
      expect(result.comment).toBe('This is a test comment')
      expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_item_id: 'co-1',
          comment: 'This is a test comment',
          created_by: 'user-1',
          mentioned_users: [],
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.addComment('co-1', 'user-1', 'Test')).rejects.toThrow()
    })
  })

  describe('requestBids', () => {
    const mockBids = [
      {
        id: 'bid-1',
        workflow_item_id: 'co-1',
        project_id: 'proj-1',
        subcontractor_id: 'sub-1',
        bid_status: 'requested',
        is_awarded: false,
        submitted_by: 'user-1',
      },
      {
        id: 'bid-2',
        workflow_item_id: 'co-1',
        project_id: 'proj-1',
        subcontractor_id: 'sub-2',
        bid_status: 'requested',
        is_awarded: false,
        submitted_by: 'user-1',
      },
    ]

    it('should request bids from multiple subcontractors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockBids, error: null }).then(onFulfilled)
      )

      const result = await changeOrdersApi.requestBids(
        'co-1',
        'proj-1',
        ['sub-1', 'sub-2'],
        'user-1'
      )

      expect(result).toHaveLength(2)
      expect(result[0].bid_status).toBe('requested')
      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(
        changeOrdersApi.requestBids('co-1', 'proj-1', ['sub-1'], 'user-1')
      ).rejects.toThrow()
    })
  })

  describe('awardBid', () => {
    const mockBid = {
      id: 'bid-1',
      workflow_item_id: 'co-1',
      is_awarded: true,
      bid_status: 'awarded',
      awarded_at: '2025-01-27T10:00:00Z',
      awarded_by: 'user-1',
    }

    it('should award a bid', async () => {
      // First call gets the bid
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({
            data: { workflow_item_id: 'co-1' },
            error: null
          }).then(onFulfilled)
        )
        // Second call updates other bids
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ error: null }).then(onFulfilled)
        )
        // Third call awards this bid
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: mockBid, error: null }).then(onFulfilled)
        )

      const result = await changeOrdersApi.awardBid('bid-1', 'user-1')

      expect(result.is_awarded).toBe(true)
      expect(result.bid_status).toBe('awarded')
      expect(result.awarded_by).toBe('user-1')
    })

    it('should throw error when bid not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(changeOrdersApi.awardBid('nonexistent', 'user-1')).rejects.toThrow(
        'Bid not found'
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.awardBid('bid-1', 'user-1')).rejects.toThrow()
    })
  })

  describe('changeStatus', () => {
    it('should change change order status', async () => {
      const updatedChangeOrder = {
        id: 'co-1',
        status: 'approved',
      }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedChangeOrder, error: null }).then(onFulfilled)
      )

      const result = await changeOrdersApi.changeStatus('co-1', 'approved')

      expect(result.status).toBe('approved')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(changeOrdersApi.changeStatus('co-1', 'approved')).rejects.toThrow()
    })
  })
})